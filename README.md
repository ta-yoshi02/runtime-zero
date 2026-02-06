# Runtime: Zero

`Runtime: Zero` is an original 2D side-scrolling action platformer prototype built with **Phaser 3 + TypeScript + Vite**.

The current state focuses on core gameplay and architecture:

- Scene flow: `Title -> Main Menu -> Stage Select -> Ingame -> Result`
- 8 stages unlocked from the start
- Difficulty presets: `Chill / Standard / Mean`
- Mirror mode
- Player movement tech: variable jump, jump buffer, coyote time, wall jump, slide, ground pound
- Core metaphors and systems: Raw Data / Encapsulated, Sudo Mode, Debug Shot, Cycles, Null Pointer, Port/Socket
- Tuning UI with localStorage persistence
- Controls remapping with localStorage persistence

All current visuals/audio are original in-project placeholders generated at runtime.

## Story Terms

- World: **The Legacy**
- Protagonist: **Patch**
- Enemies: **Glitch**
- Goal: reach **Kernel** and execute **Reboot**

## Tech Stack

- Node.js + npm
- Vite
- TypeScript
- Phaser 3

## Local Development

Install dependencies:

```bash
npm ci
```

Run dev server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Smoke test:

```bash
npm test
```

Optional Playwright test command (requires Playwright availability/network):

```bash
npm run test:playwright
```

## Controls (Default)

- Move: `A/D` or `Left/Right`
- Jump: `Space`
- Run/Dash: `Shift` or `X`
- Debug Shot (when Compiler acquired): `Z` or `J`
- Pause: `P` or `Esc`
- Restart stage: `R`
- Open tuning: `F1`

## Options

- `Options -> Tuning`: movement/camera/combat tuning sliders
- `Options -> Controls`: key remapping

Data is persisted in localStorage:

- `runtime-zero:tuning-overrides:v1`
- `runtime-zero:keybinds:v1`

## GitHub Pages and Vite base

This repo is intended for Pages at:

`https://<user>.github.io/runtime-zero/`

`vite.config.ts` supports environment-driven base switching:

- `VITE_BASE_PATH` (highest priority)
- `VITE_USE_GH_PAGES_BASE=1`
- `GITHUB_PAGES=true`
- `GITHUB_ACTIONS=true`

Examples:

```bash
# Local root base
npm run build

# Force Pages base (/runtime-zero/)
VITE_USE_GH_PAGES_BASE=1 npm run build
```

If you rename the repository, update `pagesBase` in `vite.config.ts` from `/runtime-zero/` to the new repo path.

## GitHub Actions (CI + Pages deploy)

Workflow file: `.github/workflows/pages.yml`

What it does:

- On push/PR: `npm ci`, `npm run build`, `npm test`
- On push to `main`: upload `dist/` and deploy to GitHub Pages

Repository settings required once:

1. Go to **Settings -> Pages**.
2. Set source to **GitHub Actions**.
3. Push to `main` and wait for workflow completion.

## Project Structure

```text
src/
  game/
    core/         # scene keys, session store, tuning/keybind persistence, browser hooks
    data/         # stage data + movement presets
    scenes/       # boot/title/menu/options/stage/result
    systems/      # input, player controller, audio
    types.ts      # shared gameplay types
```

## License and Asset Policy

- Code license: MIT (`LICENSE`)
- Placeholder visuals/audio: generated in this repository runtime code for prototype use
- Rule: do not import character names, copyrighted assets, music, SFX, UI, or proper nouns from existing game IPs

## Current Scope Notes

- Playwright-based auto-play verification is scaffolded, but may require network-enabled environment to install/resolve Playwright.
- This prototype prioritizes gameplay systems and expandable scene/data architecture before final art/audio polish.
