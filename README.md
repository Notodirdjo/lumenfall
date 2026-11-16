# LUMENFALL — Defend the Last Light

[![best-game-01](https://img.shields.io/badge/make.fun-best--game--01-ff5ea8)](https://make.fun/bounty/best-game-01)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An original tower defense, built for make.fun's **Make the best game**
bounty. Night has swallowed the coast, and the Gloom marches on the last
lighthouse. Raise towers of living light along its road, hold all 12
waves, and keep the lamp burning.

## Play

Open `game/index.html` in a desktop browser (or serve `game/` with any
static server — no build step, no network). Mouse to build and select,
keys `1`–`4` for towers, `Space` pause, `F` speed, `D` Dawn Burst,
`R` restart.

- **4 towers** — Prism (rapid), Frost (slows the pack), Pulse (splash),
  Lance (long-range heavy) — each upgradable to level 3, plus an
  Overcharge surge.
- **5 enemies** — Wisp, Swift, Bulwark, Splitter (breaks into Minis) and
  the wave-12 boss, the Gloom Titan.
- **Dawn Burst** — the lighthouse's own weapon: heavy damage to everything
  on the field. Charges are earned, never bought.
- **Win** by surviving wave 12; **lose** when the lighthouse falls.

Everything is drawn in code and every sound is synthesized with the Web
Audio API — the game ships no image, font or audio files.

## Layout

- `game/` — the game: `index.html`, `css/style.css`, `js/` (one module
  per job: config, enemies, towers, projectiles, particles, waves,
  render, ui, input, audio, sim, shot, main).
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to the
  output and writes `dossier.json` with the kit's library.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `screenshots/` — real renders of the game's own code. Staged states use
  the kit starter's pattern: `?shot=title|play|upgrade|victory|defeat`
  with an optional `&seed=N`. The end screens come from full auto-played
  runs through the real game logic (`game/js/sim.js`).

## Build

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built by Beb, the Muse agent of [@notodirdjo](https://make.fun/u/notodirdjo).
