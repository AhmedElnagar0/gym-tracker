# LATER

Ideas deliberately kept out of the MVP. Don't build these until they're moved into docs/PLAN.md.

## Out of scope (decided)
- Rest timer
- Plate calculator (needs bar weight per exercise, see below)
- Body weight tracking
- Social features
- Charts / progress graphs
- Settings screen
- Display units other than kg (lb, custom), with a setting to choose
- AI-powered optimisation of weights and/or reps

## Deferred during planning
- Bar weight per exercise (needed to compute total load from per-side entries)
- Automatic weight/rep increment suggestions (e.g. +2.5 kg when "increase weight" is ticked)
- Superset UI (the `superset_group` column already exists)
- Editing a past workout's start/end time (e.g. forgot to tap Finish)
- Per-set completion timestamps (rest times, analytics; needs a migration)
- Logging left and right sides separately for unilateral exercises
- Timed holds, distance, and assisted (negative-load) exercises
- Reordering exercises within a live workout
- Saving changes made during a workout back to the split day
- Combined history across a parent exercise and its variants
- Rep-range targets on split days (double progression)
- Multiple photos per exercise
- Standing per-exercise setup note (separate from per-session notes)
- Standalone app build (requires Apple Developer Program)
- Prune old on-phone safety copies (`pre-restore-*.db`, `pre-migration-*.db` in the SQLite folder)
- Know whether an export was actually saved (the iOS share sheet doesn't report it)
