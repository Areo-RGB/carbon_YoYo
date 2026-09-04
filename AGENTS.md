# Agent Guidelines: Yo-Yo Tauri Mobile App

## Architecture
- **Framework**: Svelte 5 (`$props()`, `$state()`, `$derived()`) with Vite
- **UI System**: IBM Carbon Design System via `carbon-components-svelte` and `carbon-icons-svelte`
- **Native Container**: Tauri v2 (`@tauri-apps/api`, `@tauri-apps/plugin-store`) targeting Android and Desktop
- **Audio Clock**: Web Audio API synchronized with protocol schedules (`services/audioClock.ts`)

## Directory Layout
- `src/domain/`: Pure TypeScript logic and domain definitions (`protocol.ts`, `runtime.ts`, `athleteRules.ts`, `models.ts`, `avatar.ts`). Kept independent of UI.
- `src/lib/components/`: Reusable Svelte 5 components (`AthleteAvatar.svelte`, `AthleteCard.svelte`, `DistanceMeter.svelte`, etc.).
- `src/lib/screens/`: Top-level screens (`RosterScreen.svelte`, `LiveScreen.svelte`, `ResultsScreen.svelte`, `HistoryScreen.svelte`, etc.).
- `public/assets/avatars/`: Headshot PNG avatars for roster athletes.
- `tests/`: Node native tests (`node --experimental-strip-types --test`).

## Commands
- Run tests: `npm test`
- Svelte check: `npm run check`
- Build app: `npm run build`
- Dev server: `npm run dev`

## Athlete Avatars
- Avatar photos are located in `/assets/avatars/*.png` (served from `public/assets/avatars`).
- Matching logic resides in `src/domain/avatar.ts` (`getAthleteAvatar()`, `getAthleteFullName()`, `getAthleteInitials()`, `getAvatarColor()`).
- All 16 default athletes (`DEFAULT_ATHLETES`) have corresponding avatar images.
- When an avatar image is unavailable or fails to load, `AthleteAvatar.svelte` falls back to initials with a deterministic Carbon palette background color.
