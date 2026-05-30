# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start static server at http://localhost:5173 serving `src/` (uses `npx serve src -l 5173`).
- `npm run lint` — ESLint flat config across `**/*.{js,jsx}`.
- `npm run build` / `npm run preview` — Vite build/preview. **Currently broken** (see Architecture).

Teacher login password lives in `src/store.jsx` as `TEACHER_PASSWORD` constant (`alohomora`).

## Architecture

Single-page app for a school house-points scoreboard (Thai UI). Two setups co-exist in the repo; **only the browser-Babel setup runs**:

- **Active (src/):** `src/index.html` loads React 18 UMD + Babel-standalone from CDN, then loads each `.jsx` via `<script type="text/babel" src="...">`. Files are transpiled in-browser at runtime — **no bundler step**.
- **Inactive (root):** Vite scaffold (`index.html`, `src/main.jsx`, `vite.config.js`). Broken: `main.jsx` imports `./App.jsx` (case mismatch with `app.jsx`), and component files use the browser-globals pattern, not ESM. Do not run `vite dev`; fix `npm run dev` script if you need to revive Vite.

### Cross-file contract (browser globals)

Components don't `import`/`export`. They register on `window` and read off it. Load order in `src/index.html` matters:

1. `store.jsx` — sets `window.Kru4Store` (actions), `window.useStore` (hook), `window.useWindowWidth`, `window.KRU4`.
2. `particles.jsx` — IIFE drawing on `<canvas id="particles">`.
3. `scoreboard.jsx` — sets `window.Scoreboard`, `window.kru4Helpers` ({hexA, shade}).
4. `teacher.jsx` — sets `window.TeacherPanel`, `window.kru4TimeAgo`. Depends on `kru4Helpers`.
5. `canva.jsx` — sets `window.CanvaLibrary`. Depends on `kru4Helpers`.
6. `app.jsx` — final file; reads all globals, calls `ReactDOM.createRoot(...).render(<App/>)`.

When adding a component, follow the same pattern: define inside the file, assign to `window`, reference from `app.jsx`.

### State store (`src/store.jsx`)

IIFE-scoped store with subscribe/emit. Persists to `localStorage` key `kru4_state_v5`. Cross-tab sync via `BroadcastChannel("kru4_sync")` + `storage` event. On load, static house fields (crest path, colors, motto) come from `DEFAULT_HOUSES`; only `score` is merged from storage — so editing defaults in code propagates to existing users. History is capped at 200 entries.

Actions: `addScore(houseId, delta, reason)`, `undoEntry(id)`, `addCanva(card)`, `removeCanva(id)`, `resetAll()`, `checkPassword(pw)`.

### Assets

`src/assets/crests/{renovia,barocca,impressa,novara}.jpg` referenced by relative path `assets/crests/*.jpg` in `DEFAULT_HOUSES`. Server root must be `src/` for these to resolve.

### Styling

All styling is inline-style objects + CSS custom properties defined in `src/index.html` `<style>` block (`--gold`, `--ink`, `--panel`, etc.). No CSS modules, no Tailwind. Fonts loaded from Google Fonts CDN.
