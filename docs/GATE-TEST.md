# M0 checkpoint and gym-launch gate

Two parts. Part 1 checks the app and database on your phone through the laptop.
Part 2 decides whether Expo Go can be the app you use at the gym (docs/PLAN.md §1).

Use your personal Expo account for both parts.

## Part 1: app and database (laptop running)

```bash
npm install
npx expo login
npm run phone
```

(`npm run phone` uses tunnel mode on port 8083. See the README for why.)

Sign in to the same account in Expo Go on the iPhone, then scan the QR code with the Camera app.

Expected:
1. Four tabs: Today, History, Exercises, Splits.
2. On Today, a green line: `DB ok · FK on · 32 exercises · 0 workouts · 0 sets · migrations 1/1`.
   Red text, or "FK OFF", means something is wrong; send me a screenshot.
3. Force-quit Expo Go (swipe it away), reopen the project: still **32** exercises, not 64.

## Part 2: gym-launch test (laptop off)

This publishes the app's code (code only, no data) to Expo's servers so Expo Go can load it
without the laptop.

```bash
npx eas-cli@latest init
npx eas-cli@latest update:configure
```

`init` creates the project on expo.dev under your account. `update:configure` adds
`expo-updates` and writes `runtimeVersion` and `updates.url` into app.json. Then, in **app.json**,
make sure `runtimeVersion` reads `{ "policy": "sdkVersion" }`. As far as I know, that's the
runtime Expo Go matches updates against, but current Expo docs don't confirm it; this test does.

```bash
npx eas-cli@latest update --channel main --message "M0 gate test" --environment production
```

Open the update on the phone. Either:
- Expo Go → Home: your project should be listed under your account; open its `main` branch, or
- open the "Website link" that `eas update` prints, and scan the preview QR code on that page.

If Expo Go refuses with a runtime mismatch, tell me the exact message (the runtime policy
is the likely cause).

Then record the results:

| Test | How | Result |
|---|---|---|
| (a) Laptop off, mobile data on | Close the dev server and shut the laptop lid. Wi-Fi off, mobile data on. Force-quit Expo Go, reopen the project from Expo Go's Home. | ☐ opens ☐ fails |
| (b) No network at all | After (a) succeeded: airplane mode on. Force-quit Expo Go, reopen the project. | ☐ opens ☐ fails |
| (c) Same data? | Compare the debug line in the published copy and the dev-server copy. Do they show the same database? (They may be separate; that's fine, just note it.) | ☐ same ☐ separate |

**Results (2026-10-20):** (a) opens. (b) opens via Recently opened → "use cached version".
(c) not yet checked. Decision: Path A confirmed.

**Decision:**
- (a) fails → we switch to the static web app before any feature code (PLAN §9).
- (a) passes, (b) fails → Path A works whenever the gym has mobile signal. Your call.
- Both pass → Path A confirmed. On to M1.
