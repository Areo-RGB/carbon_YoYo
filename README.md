# Yo-Yo Fitness Tracker — Tauri 2 Android port

This is a React + TypeScript port of the Flutter Yo-Yo / Beep Test tracker, prepared for **Tauri 2 mobile / Android**.

## Architecture

- **Protocol engine, athlete state, timing, UI, exports:** TypeScript.
- **Audio clock:** HTMLMediaElement + WebAudio gain. The audio stays running when muted, preventing the Flutter app's audio/timer drift issue.
- **Persistence:** `@tauri-apps/plugin-store` (Android supported), with `localStorage` fallback when running as a normal browser/Vite app.
- **Rust:** only the Tauri mobile entry point and Store plugin registration.
- **Google Nearby controller:** intentionally isolated as a native-mobile boundary. The tracker is fully usable without it; parity with the Flutter remote controller requires a small Tauri Android plugin implemented in Kotlin using Google Nearby Connections.

## Protocol fixes included during the port

1. Corrected Yo-Yo IR1 progression: 5/10.0, 9/12.0, 11/13.0, 12/13.5, 13/14.0, then +0.5 km/h through level 23.
2. Beep Test warning logic is modeled as consecutive misses rather than two misses at arbitrary times.
3. Natural end-of-protocol completion finalizes all still-running selected athletes.
4. Muting changes gain to zero instead of pausing protocol audio.
5. Saved sessions persist their `testType`.
6. Result level is stored once as `level.shuttle`, avoiding duplicate formatting such as `14.3.3`.

## Run frontend tests without installing dependencies

The protocol tests use Node's built-in test runner and TypeScript stripping:

```bash
npm test
```

## Browser/Vite development

```bash
npm install
npm run dev
```

## Tauri desktop smoke test

Install Rust first, then:

```bash
npm install
npm run tauri dev
```

## Android setup

Tauri mobile generation is intentionally not committed because `src-tauri/gen/android` is generated for the local SDK/toolchain.

Install Android Studio, a current Android SDK/NDK, Java, Rust and the Android Rust targets, then run:

```bash
npm install
npm run android:init
npm run android:dev
```

For a release package:

```bash
npm run android:build
```

Configure a real Android release keystore in the generated Android project before distribution. Do not sign production builds with a debug key.

## Nearby remote controller

The original Flutter app uses `nearby_connections`, which is backed by Google Play Services and therefore is not a WebView-only feature. The recommended Tauri implementation is a **mobile plugin**:

- Kotlin: advertise/discover/connect/send/receive with `com.google.android.gms:play-services-nearby`.
- Rust: only plugin registration / generated bridge.
- TypeScript: keep the existing authority model and remote message codec.

That keeps test timing and athlete logic out of native code. It also means a Nearby implementation can be added or replaced without touching the protocol engine.

## Verification status

Verified in this environment:

- Golden protocol unit tests via Node.
- Static source inspection of the generated port.

Not executable in this environment because Rust/Android SDK tooling is not installed here:

- `cargo check`
- `tauri android init`
- Android emulator/device build

Those should be required before field use.

## Svelte UI scaffold

The React shell has been replaced with a Svelte 5 + TypeScript frontend while keeping the Tauri 2 Rust layer minimal.

Scaffolded screens:
- Dashboard / startup
- Athlete roster
- Live test
- Results / leaderboard
- Protocol table
- Test history
- Settings

Shared UI primitives live under `src/lib/components`, screen modules under `src/lib/screens`, and app-level UI state under `src/lib/state`.
The existing protocol/domain/services remain under `src/domain` and `src/services` for later wiring into the full-fidelity UI.

Verification in the migration environment:
- Protocol/domain tests: 8/8 passing.
- `npm install` could not complete within the execution environment timeout, so the Svelte bundle itself was not fully dependency-installed/built here. Run `npm install && npm run check && npm run build` on the development machine before Android packaging.
