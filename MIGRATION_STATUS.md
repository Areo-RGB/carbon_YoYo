# Migration status

## Implemented

- Tauri 2 shell for Android/mobile builds.
- React + TypeScript UI and application state.
- Corrected Yo-Yo IR1 protocol table (91 repetitions / 3640 m).
- Protocol-driven Beep Test table.
- Athlete warning/elimination logic, including consecutive Beep Test misses.
- Natural test completion finalizes active athletes.
- Yo-Yo bundled MP3 used as the protocol clock.
- Beep Test cues synthesized from the protocol schedule so media-file drift cannot change the test timing.
- Pause/resume and mute behavior without intentionally pausing the protocol clock when muting.
- Persistent roster/settings/history using Tauri Store, with browser localStorage fallback for development.
- Results, history, protocol table, CSV export, and responsive UI.
- Test type persisted with each session.

## Minimal Rust surface

Rust is limited to Tauri startup and plugin registration in `src-tauri/src/lib.rs`. Protocol logic, athlete state, timing, ranking, and UI live in TypeScript.

## Native Android work still required

The Flutter project's Google Nearby Connections remote-controller feature is intentionally not reimplemented as fake web functionality. It requires an Android-native Tauri mobile plugin (Kotlin) with a thin Rust registration layer. The current Settings screen marks this feature as requiring the native bridge.

## Verification completed in this environment

- `npm test`: 8/8 core protocol/state tests passing.
- Static TypeScript source check with local temporary declaration shims: passed after fixing one DOM typing issue.

## Verification not possible in this environment

The current execution image does not provide the Rust/Cargo, Flutter, or Android SDK toolchains. Therefore these were not claimed as passing:

- Cargo check
- Full dependency-backed TypeScript/Vite build
- `tauri android init`
- Android debug/release APK/AAB build
- On-device audio latency / lifecycle tests
- Nearby Connections integration tests
