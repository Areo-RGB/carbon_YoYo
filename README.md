# Yo-Yo Fitness Tracker — Web App

Svelte 5 + TypeScript + Carbon Design System. Runs as a pure web app via Vite — no native wrapper.

## Architecture

- **Framework:** Svelte 5 (`$props()`, `$state()`, `$derived()`) with Vite
- **UI:** IBM Carbon Design System (`carbon-components-svelte`, `carbon-icons-svelte`)
- **Protocol engine, athlete state, timing, UI, exports:** TypeScript
- **Audio clock:** HTMLMediaElement + WebAudio gain — audio stays running when muted, preventing timer drift
- **Persistence:** `localStorage` (`yoyo-web-state-v1`)

## Protocol fixes

1. Corrected Yo-Yo IR1 progression: 5/10.0, 9/12.0, 11/13.0, 12/13.5, 13/14.0, then +0.5 km/h through level 23.
2. Beep Test warning logic modeled as consecutive misses.
3. Natural end-of-protocol completion finalizes all still-running selected athletes.
4. Muting changes gain to zero instead of pausing protocol audio.
5. Saved sessions persist their `testType`.
6. Result level stored once as `level.shuttle`.

## Development

```bash
npm install
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # Production build -> dist/
npm run preview  # Preview production build
npm run check    # svelte-check
npm test         # Node native tests (no install needed beyond npm install)
```

## Verification

- `npm test` — protocol/state unit tests via Node's built-in runner
- `npm run check` — Svelte + TypeScript type checking
- `npm run build` — Vite production build
