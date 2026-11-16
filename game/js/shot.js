// Staged screenshot states, the kit starter's own pattern (?shot=...):
// the game loads straight into a real, playable state so its screenshots
// can be taken without a human playing first. Every staged state is the
// game's own code running — the play states are live games, and the end
// screens come from full auto-played runs (see sim.js).
//
//   ?shot=title            the title screen (the default)
//   ?shot=play&seed=N      a live mid-game: wave 6, towers placed, fighting
//   ?shot=upgrade&seed=N   the same, with a tower selected and its panel open
//   ?shot=victory&seed=N   the real victory screen after a won run
//   ?shot=defeat&seed=N    the real defeat screen after a lost run

import { TOWERS } from './config.js';
import { placeTower, upgradeTower, towerAt } from './towers.js';
import { startWave } from './waves.js';
import { runSimulation } from './sim.js';

// A believable mid-game setup: six towers, two of them upgraded, on the
// cells a good player would have taken by wave 6.
const STAGED_TOWERS = [
  { type: 'prism', col: 12, row: 2, level: 2 },
  { type: 'frost', col: 12, row: 3, level: 1 },
  { type: 'pulse', col: 12, row: 6, level: 2 },
  { type: 'lance', col: 11, row: 2, level: 1 },
  { type: 'prism', col: 3, row: 5, level: 2 },
  { type: 'frost', col: 3, row: 6, level: 1 },
];

function stageMidGame(game, seedText, select) {
  game.beginRun(seedText);
  const G = game.G;
  G.lumens = 10000; // staging funds: the setup is what matters, not the cost
  for (const spot of STAGED_TOWERS) {
    placeTower(G, spot.type, spot.col, spot.row);
    const t = towerAt(G, spot.col, spot.row);
    while (t && t.level < spot.level) upgradeTower(G, t);
  }
  G.lumens = 340;
  G.score = 1250;
  G.hp = 17;
  G.kills = 96;
  G.earned = 880;
  G.wave = 5;
  G.waveState = 'idle';
  startWave(G); // wave 6 begins at once, live
  // Fast-forward 18 game-seconds through the real update loop so the shot
  // catches the fight mid-swing: enemies inside tower range, bolts flying.
  for (let i = 0; i < 180; i++) {
    if (G.state !== 'playing') break;
    game.update(0.1);
  }
  if (select) {
    const t = towerAt(G, 12, 6);
    if (t) game.selectTower(t);
  }
}

export function applyShotParams(game) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot || shot === 'title') return;
  const seed = params.get('seed') || 'lumenfall-1';
  if (shot === 'play') {
    stageMidGame(game, seed, false);
  } else if (shot === 'upgrade') {
    stageMidGame(game, seed, true);
  } else if (shot === 'victory') {
    const result = runSimulation(game, seed, 'win');
    if (!result.won) {
      // The strategist lost: fall back to the staged mid-game rather than
      // showing a defeat screen under a victory name.
      stageMidGame(game, seed, false);
    }
  } else if (shot === 'defeat') {
    runSimulation(game, seed, 'lose');
  }
}
