# Migration status — Web App

## Implemented

- Svelte 5 + TypeScript + Carbon Design System web app (Vite).
- Corrected Yo-Yo IR1 protocol table (91 repetitions / 3640 m).
- Protocol-driven Beep Test table.
- Athlete warning/elimination logic, including consecutive Beep Test misses.
- Natural test completion finalizes active athletes.
- Yo-Yo bundled MP3 used as the protocol clock.
- Beep Test cues synthesized from the protocol schedule so media-file drift cannot change the test timing.
- Pause/resume and mute behavior without pausing the protocol clock when muting.
- Persistent roster/settings/history via `localStorage`.
- Results, history, protocol table, CSV export, and responsive UI.
- Test type persisted with each session.

## Verification

- `npm test`: protocol/state tests via Node's built-in runner.
- `npm run check`: Svelte + TypeScript type checking.
- `npm run build`: Vite production build to `dist/`.
