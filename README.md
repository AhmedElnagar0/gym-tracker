# Gym Tracker

A personal, local-only workout tracker for iPhone, built with Expo (SDK 57) and run in
**Expo Go**. No backend, no accounts, no cloud sync: all data lives in SQLite on the phone.

- Plan and milestones: [docs/PLAN.md](docs/PLAN.md)
- Gym-launch test (M0 gate): [docs/GATE-TEST.md](docs/GATE-TEST.md)
- Deliberately postponed ideas: [LATER.md](LATER.md)

## Run it on your iPhone

You need Node.js, Expo Go from the App Store, and a free **personal** Expo account
(Expo Go and the CLI must be signed in to the same account).

```bash
npm install
npx expo login
npm run phone
```

Scan the QR code with the iPhone Camera app.

`npm run phone` is `expo start --tunnel --port 8083`:
- **Tunnel:** on restricted networks (workplace or guest Wi-Fi) the phone can't reach the
  laptop directly, and scanning just times out. Expo relays the connection through ngrok
  (`@expo/ngrok`, a dev dependency).
- **Port 8083:** the default 8081 is taken by another application on the development machine.

On a home network where phone and laptop share the same Wi-Fi, plain `npx expo start` is faster.

## Checks (run all four before calling anything done)

| Command | What it checks |
|---|---|
| `npm run typecheck` | TypeScript types |
| `npm run lint` | ESLint (Expo config) |
| `npm test` | Jest: pure logic, seed data, and the repo layer against real SQLite (sql.js) |
| `npm run check:db` | Applies the real migrations to a real SQLite engine and tests every constraint |

## Data conventions

Changing any of these later silently changes the meaning of existing history.

| Topic | Rule |
|---|---|
| Units | kg only. `weight_kg` stores exactly what was typed; it is never rounded on save. |
| Load basis | Set by the exercise's equipment and shown next to the input. Barbell, EZ bar, trap bar, Smith machine, plate-loaded machine: **kg per side, plates only, bar excluded**. Dumbbell, kettlebell: kg per implement. Machine (pin stack), cable: the stack number. Bodyweight: added load, 0 = bodyweight only. See `src/domain/conventions.ts`. |
| Locked equipment | An exercise's equipment can't change once it has logged sets. |
| Unilateral | Reps are per side. |
| Timestamps | Unix **seconds**. Use `nowUnix()` from `src/domain/time.ts`, never raw `Date.now()` (milliseconds). |
| IDs | Text UUID v4 via `newId()` (`src/db/ids.ts`). Seed exercises have fixed IDs. |
| Variants | One level deep. Parents can be logged directly. Variants inherit muscle group and mechanic. |

## Changing the database schema

1. Edit `src/db/schema.ts`, the only schema definition.
2. `npm run db:generate` creates a new `drizzle/NNNN_*.sql` migration.
3. Read the generated SQL. Watch for table rebuilds (`__new_` tables) and for index
   expressions containing commas (drizzle-kit splits them and writes broken SQL).
4. `npm run check:db`, and add checks for the new constraints to `scripts/check-migrations.mjs`.

Never edit or delete a migration that has already run on the phone. At startup the app
snapshots the database before migrating, migrates with foreign keys off, verifies with
`PRAGMA foreign_key_check`, then switches foreign keys on (`src/db/init.ts`).

## Layout

```
src/app/      screens (Expo Router; every file is a route)
src/db/       schema, connection, startup, seed data
src/repo/     all reads and writes; screens never run SQL directly
src/routes.ts every in-app link
src/test-utils/  test-only helpers (in-memory SQLite built from the real migrations)
src/domain/   pure TypeScript logic, unit-tested
src/components, src/hooks, src/theme.ts
drizzle/      generated migrations (never hand-edit)
scripts/      check-migrations.mjs
```
