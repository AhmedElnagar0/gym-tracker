# Gym Tracker — Implementation Plan (v2)

Status: M0 done on the iPhone, 2026-10-20. Checkpoint passed (`DB ok · FK on · 32 exercises`,
still 32 after force-quit). Gym-launch gate passed, so **Path A is confirmed** (results in §1).
M1 done: all nine checkpoint steps passed on the iPhone, 2026-10-20.
M2 done, 2026-10-20: export to iCloud Drive, restore round trip, wrong-file rejection, and
**delete Expo Go → reinstall → restore** all passed on the iPhone.
M3 done, 2026-10-21: all ten checkpoint steps passed; number pad size confirmed comfortable;
keyboard now hides on drag everywhere (user request).
M4 done, 2026-10-22: all checkpoint steps passed on the iPhone. Next: Add-exercise by muscle
group (user request), then M5 (history).
Decisions so far: Path A (Expo SDK 57 + App Store Expo Go), leaf-only rule relaxed,
export/restore in MVP, kg only, Zustand dropped.

---

## 1. Platform and the gym-launch gate

The project is on SDK 57, the version the App Store Expo Go on your iPhone supports
(checked on the phone, 2026-10-20; one Expo docs page still says "stops at 54", which is stale).
The SDK must not be upgraded until Expo Go on the phone supports the new version.
Expo Go loads the app's code from either the laptop's dev server or a published EAS Update.
At the gym there is no laptop, so the app is opened from a published EAS Update.

**Unverified:** whether Expo Go launches a cached EAS Update with *no* network.
Old Expo docs say it falls back to a cached bundle; a forum report says it doesn't.
With mobile data at the gym it should work either way, because the phone downloads the update.

**Gate in M0, passed 2026-10-20** (update on branch `main`, runtime `exposdk:57.0.0`):
- (a) Laptop off, mobile data → opens normally from Expo Go → Home → projects.
- (b) Airplane mode → projects aren't listed, but **Recently opened → Gym Tracker** offers the
  cached version; accepting it opens the app with a healthy database.

How this works in practice: with signal, open as normal. Without signal, use Recently opened and
accept the cached version. After a new update is published, open the app once with internet so
the cached copy refreshes.

## 2. Not losing data when Expo Go is deleted

Everything the app stores (database and photos) lives inside Expo Go's sandbox.
Deleting Expo Go deletes it, and iOS gives Expo Go apps no way to write outside that
sandbox automatically. (`pickDirectoryAsync` in expo-file-system is Android-only.)
So protection means getting a copy *off* the sandbox, with one tap from you:

1. **Export** (one button): `SQLite.backupDatabaseAsync` takes a consistent snapshot of the
   live DB. That snapshot, the `photos/` folder and a `manifest.json` (schema version, date,
   row counts) are zipped with `fflate` (pure JS, works in Expo Go). The zip goes to the
   iOS share sheet: choose **Save to Files → iCloud Drive**, and iCloud copies it off the phone.
   The `.db` inside opens directly in Python (`sqlite3` / `pandas`).
2. **Restore** (one button): pick a zip with expo-document-picker. The app validates the
   manifest and the SQLite header, and refuses backups from a *newer* schema. It takes an
   automatic safety snapshot of the current data first, copies the backup into the live DB
   with `backupDatabaseAsync`, replaces `photos/`, runs pending migrations, then remounts the app.
3. **Reminder:** you see "Last backup: N days ago" on the Today screen. After finishing a
   workout, if the last backup is more than 7 days old, a banner offers one-tap export.
4. **Pre-migration snapshot:** before any schema migration runs, the DB is copied to
   `backups/pre-migration-<ts>.db` inside the sandbox. This protects against a bad
   migration, not against deleting Expo Go.

Restore also fixes a second risk: the dev-server copy of the app and the published copy
may get separate databases in Expo Go (unverified). Backup/restore moves data between them.

The real test of this whole section happens in M2, with test data:
**export → delete Expo Go → reinstall → restore → everything is back.**

## 3. Data conventions (go into README; changing them later corrupts history)

| Topic | Rule |
|---|---|
| Units | kg only. `weight_kg` is exactly what you typed; no rounding on store. |
| Load basis | Determined by the exercise's equipment, and shown next to the input: **barbell, EZ bar, trap bar, Smith machine, plate-loaded machine → kg per side, plates only, bar excluded**; dumbbell, kettlebell → kg per implement; machine (pin stack), cable → number on the stack; bodyweight → added load, 0 = bodyweight only. |
| Locking | An exercise's equipment can't be changed once it has logged sets, because that would silently change what old numbers mean. |
| Unilateral | Reps are per side. Left and right aren't logged separately. |
| Timestamps | Unix **seconds**, always via `nowUnix()`. JS `Date.now()` is milliseconds. |
| IDs | `Crypto.randomUUID()` from expo-crypto. Seed data uses fixed UUIDs. |
| Variants | One level deep. A parent can be logged directly (its standard version). Variants inherit the parent's muscle group and mechanic, so they always sit under the parent; equipment can differ. |
| Not supported | Timed holds, distance, assisted (negative) load → LATER.md. |

Consequence of per-side barbell storage: `weight_kg` is not total load. Total load
(2 × side + bar) needs a bar weight, which isn't stored yet; it's in LATER.md, next to the plate calculator.

## 4. Schema (complete, created by ONE initial migration in M0)

All IDs are text UUIDs. Every connection runs `PRAGMA foreign_keys = ON` (SQLite defaults to
OFF, and cascades silently do nothing without it) and `PRAGMA journal_mode = WAL`.

**exercises**
id · parent_id → exercises (RESTRICT) · name (unique, case-insensitive) · variant_label ·
muscle_group (fixed list) · mechanic ('compound'|'isolation') · equipment (fixed list) ·
is_unilateral · photo_file (nullable; *filename only*, relative to `photos/`, because iOS
absolute paths change) · archived_at (nullable)

**workouts**
id · started_at · ended_at (NULL = in progress; at most one) · notes ·
split_day_id → split_days (SET NULL: deleting a split keeps your history)

**workout_exercises**
id · workout_id → workouts (CASCADE) · exercise_id → exercises (RESTRICT) · order_index ·
superset_group (kept, no UI yet) · target_sets (copied from the split, nullable) ·
notes (your note for this exercise *in this session*) ·
next_increase_weight (0/1) · next_increase_reps (0/1)

**sets**
id · workout_exercise_id → workout_exercises (CASCADE) · set_index · weight_kg (≥ 0) ·
reps (≥ 0) · rpe (nullable, 1–10) · set_type ('warmup'|'working'|'dropset'|'failure')

**splits**
id · name · schedule_mode ('rotation'|'weekday') · is_active (at most one active)

**split_days**
id · split_id → splits (CASCADE) · name ("Push B") · order_index

**split_schedule** (weekday mode only)
split_id → splits (CASCADE) · weekday (0=Mon … 6=Sun) · split_day_id → split_days (CASCADE)
· primary key (split_id, weekday), so a weekday can only map to one day

**split_day_exercises**
id · split_day_id → split_days (CASCADE) · exercise_id → exercises (RESTRICT) ·
order_index · target_sets (≥ 1, default 3)

Notes:
- `order_index` and `set_index` are sort keys only; visible numbers come from position,
  so deletes leave harmless gaps.
- There are indexes on every foreign-key column, plus `workout_exercises(exercise_id)`
  for "last time" lookups.
- "Can't be a variant of a variant", "variant inherits muscle/mechanic" and
  "equipment locked after use" are cross-row rules SQLite CHECKs can't express. They're
  enforced in `src/repo/exercises.ts` and unit-tested.
- Premade splits are **not** stored in the DB. They're TypeScript constants that get
  *copied* into your tables when you pick one, so editing your copy never changes the template.

## 5. Behaviour of the new features

**Today screen.** If a split is active:
- *Rotation:* the suggested day is the one after the most recently finished workout from
  this split (wrapping round). It's derived from history, never stored, so editing or deleting
  a workout corrects it automatically. Doing a different day ("Choose another") just moves the
  rotation on from what you actually did.
- *Weekday:* today's weekday → its mapped day; no mapping → "Rest day".
- Buttons: **Start Push B** · Choose another day · Empty workout.

**Workout overview.** After you start, you see the exercises in split order, each with its
thumbnail, target sets and progress (e.g. 2/3). You can add or remove exercises for today only;
the split itself is untouched.

**Exercise logging screen** (tap an exercise):
- At the top: a large photo, if there is one; last time's note; last time's plan ("↑ weight").
- One row per set: **Last time `60 × 8`** (read-only, grey) | **This time `[ kg ] [ reps ]`**.
  The number of rows is the larger of the target sets and last time's set count; "+ Add set" adds more.
- This-time fields start **empty**, never copied from last time, so a repeat is a deliberate choice.
- If you planned to increase weight or reps and enter exactly last time's numbers,
  a non-blocking hint appears: "Same as last time — you planned ↑ weight."
- At the bottom: a note field, and "Next time: ☐ increase weight ☐ increase reps".
- "Last time" means the most recent *finished* workout containing this exact exercise
  (variants count as separate exercises).
- Input comes from a custom on-screen number pad with large keys. It allows one decimal point
  and shows the load basis label ("kg / side").

**Exercise detail.** Two segments, **Details** and **History**. History lists every session
with that exercise (date, sets, note), newest first.

**Catalogue grouping.** Muscle group → Compound / Isolation → exercise, with variants indented
under their parent. A search box filters it. The exercise picker uses the same grouping.

**Photos.** expo-image-picker (camera or library), resized to 1280 px on the longest side
and saved as JPEG at 0.7 quality (~150–300 KB) in `photos/<uuid>.jpg`. One photo per exercise,
which you can replace or delete. A variant with no photo shows its parent's. Shown as a
thumbnail in lists and the overview, large on the logging and detail screens, and full screen on tap.

**Premade splits:** Push/Pull/Legs (A/B, 6 days), Upper/Lower (A/B), Full Body (A/B/C),
all built from the seeded exercises.

## 6. Stack

Expo SDK 57 · TypeScript strict · Expo Router (stable JS tabs) · expo-sqlite + Drizzle ORM
0.45.4 / drizzle-kit 0.31.11 (exact pins; the stable line, not the 1.0 release candidate)
· expo-crypto · expo-image · expo-image-picker · expo-image-manipulator · expo-file-system ·
expo-sharing · expo-document-picker · fflate · Jest (jest-expo) for pure logic.
No Zustand: SQLite is the single source of truth, and every edit is written immediately,
so force-quitting mid-workout loses nothing.
Install Expo packages only with `npx expo install` (ignore Drizzle docs' `expo-sqlite@next`).

Live data: Drizzle's `useLiveQuery` re-runs only when the query's **main table** changes
(it listens with `addDatabaseChangeListener` and compares one table name), and returns `[]`
before the first result. Single-table screens (catalogue) use it directly. M3's logging screens
join workouts, workout_exercises and sets, so they need a small hook that watches several tables.

Startup (`src/db/init.ts`): WAL on → foreign keys OFF → snapshot if migrations are pending →
migrate → `PRAGMA foreign_key_check` → foreign keys ON → seed once (tracked in
`PRAGMA user_version`, so deleted seed exercises are not re-created). Foreign keys must be off
while migrating because Drizzle migrates inside a transaction, where SQLite ignores the PRAGMA.

## 7. Folder structure

```
src/
  app/                                   # screens only, kept thin
    _layout.tsx                          # open DB, snapshot, migrate, seed; error screen on failure
    (tabs)/_layout.tsx                   # Today · History · Exercises · Splits
    (tabs)/index.tsx                     # Today: suggestion, start, resume, backup status
    (tabs)/history.tsx                   # finished workouts
    (tabs)/exercises.tsx                 # grouped catalogue
    (tabs)/splits.tsx                    # your splits + premade templates, active badge
    workout/[id]/index.tsx               # overview (live, past-view, past-edit)
    workout/[id]/add-exercise.tsx        # picker modal
    workout/[id]/exercise/[weId].tsx     # logging screen: last time | this time
    exercise/new.tsx                     # create (?parentId= → variant)
    exercise/[id]/index.tsx              # details, variants, edit, archive, delete (History: M5)
    exercise/[id]/edit.tsx               # edit form
    exercise/[id]/photo.tsx              # full-screen photo
    split/new.tsx                        # blank or from template
    split/[id]/index.tsx                 # days, schedule mode, weekday mapping, activate
    split/[id]/day/[dayId]/index.tsx     # ordered exercises, target sets, up/down reorder
    split/[id]/day/[dayId]/add-exercise.tsx
    backup.tsx                           # export, restore, last backup
  db/
    schema.ts                            # the only schema definition
    client.ts                            # open DB, PRAGMAs, drizzle()
    ids.ts                               # newId()
    init.ts                              # startup sequence (see §6)
    seed-data.ts · seed.ts               # 32 exercises, fixed UUIDs, seeded once
  repo/                                  # ALL reads/writes; screens never touch SQL
    exercises.ts · workouts.ts · workout-exercises.ts · sets.ts
    history.ts                           # last time, per-exercise history
    splits.ts                            # CRUD, copy template, activate
    photos.ts                            # save/resize/delete photo files
    backup.ts                            # export zip, validate, restore
  domain/                                # pure TypeScript, no React/Expo → unit-tested
    constants.ts                         # muscle groups, mechanics, equipment, set types
    conventions.ts                       # equipment → load basis + label
    rotation.ts                          # which split day is today
    progression.ts                       # "same as last time" hint logic
    grouping.ts                          # catalogue → muscle → mechanic → parent → variants
    keypad.ts · validation.ts · format.ts · time.ts (nowUnix)
    split-templates.ts                   # premade splits (data)
    manifest.ts                          # backup manifest type + validation
  components/
    ui/ (Button, Screen, Segmented, EmptyState)
    NumberPad · SetCompareRow · ExerciseThumb · ExerciseRow · ExerciseForm
    ExercisePicker (shared by workout + split day) · WorkoutExerciseCard · BackupBanner
  hooks/ useActiveWorkout · useTodaySuggestion · useLastTime
  theme.ts                                # tap-target minimum, colours, light/dark
drizzle/                                  # generated migrations, never hand-edited
scripts/check-migrations.mjs              # applies migrations to real SQLite, tests constraints
docs/PLAN.md · LATER.md · README.md (run + conventions) · AGENTS.md (+ project rules)
```

## 8. Milestones and checkpoints

For each milestone I run the type check, lint and unit tests and commit. You run the
checkpoint on your phone.

**M0 Foundations + gate.** Re-scaffold on SDK 57 (keeping `docs/` and `LATER.md`), strip the
template, install dependencies, write the full schema and first migration, the DB client,
snapshot, seed, and the README conventions. Then the EAS Update gym-launch test (section 1).
Step-by-step: docs/GATE-TEST.md.
- ✅ The phone shows the tabs and a debug line `DB ok · FK on · 32 exercises · …`.
- ✅ Force-quit and reopen → still 32.
- ✅ Gate tests (a) and (b) recorded → go/no-go on Path A.

**M1 Exercise catalogue.**
- ✅ The list is grouped Chest → Compound → Bench Press → (Incline, Close-Grip).
- ✅ Create "Cable Fly" (Chest, Isolation, Cable) → it appears under Chest → Isolation.
- ✅ Add a variant from a parent; a variant has no "Add variant" button; duplicate names are rejected.
- ✅ Search "row" finds every row. Edits survive a relaunch. Archive/unarchive works.

**M2 Backup and restore** (before any real data exists). Built: the export zip is a byte-level
snapshot of the database, switched out of WAL mode (verified: SQLite can't reopen a WAL-flagged
image), plus `manifest.json` and `photos/`. Restore checks the zip, manifest, schema history,
integrity and page size before changing anything, keeps a `pre-restore-<ts>.db` safety copy,
copies the backup in with SQLite's backup API, runs newer migrations, and puts the safety copy
back if any step fails. "Last backup" is stored per device in `expo-sqlite/kv-store`.
- ✅ Export → Save to Files → iCloud Drive; the zip is visible in the Files app.
- ✅ Delete a custom exercise, restore → it's back.
- ✅ **Delete Expo Go, reinstall, open the app, restore → catalogue intact.**
- ✅ Copy the zip to the laptop and open `gym.db` in Python.

**M3 Ad-hoc workout logging.** Built: Today → Start empty workout / Resume; workout overview;
add-exercise picker; logging screen with the number pad (weight up to 2 decimals, reps whole),
set type and optional RPE, edit/delete sets, a session note saved as you type, next-time switches,
and remove-from-workout. Decisions: within a session a new set starts with the previous set's
weight (reps always typed fresh; nothing is copied from last session). "Discard workout" is in M3
so test workouts can be cleared; "Finish" stays in M4. Multi-table screens use `useDbQuery`.
- ✅ Today → Empty workout → add Bench Press → overview → tap → log 3 sets with the number pad only.
- ✅ Add a note, tick "increase weight".
- ✅ Force-quit mid-workout → "Resume workout" appears with everything intact.
- ✅ The input label reads "kg / side" for barbell and "kg / dumbbell" for dumbbell.

**M4 Finish and persist.** Built: "Finish workout" (confirm, drops empty exercises, refuses a
workout with no sets) returns to Today and, if the last backup is 7+ days old or missing, offers
"Back up now" (an alert rather than a banner). The logging screen shows a "Last time" card (date,
note, the plan made then), last time's numbers under each logged set, dashed rows for sets done
last time but not yet today, and a non-blocking "Same as last time" hint in the number pad
panel. "Last time" = the latest finished workout that started before this one.
- ✅ Finish → confirm → Today resets; exercises with no sets are dropped; an empty workout offers Discard.
- ✅ Second workout: Bench Press shows **Last time 60 × 8** beside empty fields, last time's note,
  and the "↑ weight" plan. Entering 60 × 8 shows the hint.
- ✅ The backup banner appears when the last backup is more than 7 days old.

**M5 History.**
- ✅ The History tab lists workouts newest first with correct local dates and durations; the detail
  matches what you logged.
- ✅ Bench Press → History segment shows every session.

**M6 Edit and delete.**
- ✅ Edit a past set from 60 to 62.5 → History shows 62.5, and the next "last time" uses it.
- ✅ Delete a workout → its sets are gone (debug counts drop).
- ✅ Deleting a used exercise is blocked ("used in 4 workouts / split Push A — archive instead?").
- ✅ An exercise's equipment field is locked once it has history.

**M7 Splits.**
- ✅ Create "PPL" from the template → 6 days with exercises; edit Push B (reorder, set targets)
  without the template changing.
- ✅ Build your own split from blank. Weekday mode: map Mon/Wed/Fri. Only one split is active.

**M8 Today's workout.**
- ✅ Rotation: finish Push A → Today says **Push B**. Choose Legs A instead → the next suggestion follows Legs A.
- ✅ Deleting the last workout moves the suggestion back.
- ✅ Weekday mode shows the mapped day, or "Rest day".
- ✅ Start → the overview lists that day's exercises in order with targets.

**M9 Machine photos.**
- ✅ Take a photo of a machine → thumbnail in the catalogue and overview, large on the logging
  screen, full screen on tap.
- ✅ Replace and delete work. A variant without a photo shows its parent's.
- ✅ Export, then delete Expo Go, reinstall and restore → photos come back.

## 9. Alternative: static web app (PWA)

The same app could be built as a home-screen web app (Vite + React + TypeScript, SQLite compiled
to WebAssembly or IndexedDB, a service worker, hosted free on GitHub Pages).

| | Expo Go (Path A) | Static web app |
|---|---|---|
| Opens at the gym without the laptop | Via EAS Update; offline launch unverified | Yes. Offline via service worker is well established on iOS. |
| Data lost if… | Expo Go is deleted | The home-screen app is deleted, *or* iOS evicts its storage (rules murky; mitigated by `navigator.storage.persist()`) |
| Backup needed anyway | Yes | Yes (Web Share → Save to Files) |
| Native feel, camera, files | Good | Acceptable (file input for camera, no haptics) |
| Dev on a Windows laptop on a restricted network | Phone must reach the laptop; Expo account sign-in | Easiest: test in desktop Chrome, deploy, open on phone |
| SDK/runtime risk | Tied to whichever SDK the App Store Expo Go supports | None (Safari) |
| Becoming a real app later ($99 Apple account) | No rewrite | UI rewrite |

**Recommendation:** stay on Path A, but make M0's gym-launch test a hard gate. If Expo Go can't
open the app at your gym without the laptop, switch to the web app before writing any features.
Sections 2–5 and 8 carry over unchanged; only the stack (6) and folder layout (7) would change.
