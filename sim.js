// The auto-player: a scripted strategist that plays LUMENFALL through the
// same actions a person has — place, upgrade, start wave, Dawn Burst —
// with no peeking at internals it could not see. It exists for two honest
// jobs: proving the game is winnable (balance), and producing the real
// victory and defeat screens the screenshots show (?shot=).

import { TOWERS } from './config.js';
import { placeTower, upgradeTower, towerAt } from './towers.js';
import { startWave } from './waves.js';

// Where the strategist builds, in order. The early cells sit where the
// road bends twice, so one tower covers two stretches of it.
const BUILD_ORDER = [
  { type: 'prism', col: 12, row: 2 },
  { type: 'prism', col: 3, row: 5 },
  { type: 'frost', col: 12, row: 3 },
  { type: 'pulse', col: 12, row: 6 },
  { type: 'prism', col: 4, row: 6 },
  { type: 'frost', col: 3, row: 6 },
  { type: 'lance', col: 11, row: 2 },
  { type: 'pulse', col: 6, row: 6 },
  { type: 'prism', col: 11, row: 5 },
  { type: 'lance', col: 12, row: 10 },
  { type: 'pulse', col: 4, row: 3 },
  { type: 'frost', col: 12, row: 9 },
];

// Which towers get upgraded first, by their cell.
const UPGRADE_ORDER = [
  [12, 6], [11, 2], [12, 2], [6, 6], [3, 5], [12, 3],
  [4, 6], [3, 6], [11, 5], [12, 10], [4, 3], [12, 9],
];

function spend(G) {
  // Finish the build order first.
  for (const spot of BUILD_ORDER) {
    if (towerAt(G, spot.col, spot.row)) continue;
    if (G.lumens < TOWERS[spot.type].cost) return; // save up
    placeTower(G, spot.type, spot.col, spot.row);
    return; // one action per tick, like a person
  }
  // Then upgrades, in order, cheapest first pass to level 2, then 3.
  for (const level of [2, 3]) {
    for (const [col, row] of UPGRADE_ORDER) {
      const t = towerAt(G, col, row);
      if (!t || t.level !== level - 1) continue;
      const cost = t.upgradeCost();
      if (cost === null || G.lumens < cost) continue;
      upgradeTower(G, t);
      return;
    }
  }
}

// One decision tick. Called between simulation steps.
function decide(game) {
  const G = game.G;
  if (G.state !== 'playing') return;
  // Dawn Burst when the lighthouse is hurting and the field is crowded.
  if (
    G.hp <= 8 && G.dawnCharges > 0 && G.dawnCooldown <= 0 &&
    G.enemies.length >= 6
  ) {
    game.fireDawn();
    return;
  }
  spend(G);
  if (G.waveState === 'idle' && G.wave < 12) {
    // Start the next wave once the planned build for this stage is done,
    // or when nothing affordable is left to buy.
    const next = BUILD_ORDER.find((s) => !towerAt(G, s.col, s.row));
    const blocked = next && G.lumens < TOWERS[next.type].cost;
    if (!next || blocked) startWave(G);
  }
}

// Play a whole game fast, stepping the real update loop. `mode` is 'win'
// (the strategist plays) or 'lose' (nothing is ever built: the Gloom walks
// in untouched). Returns the outcome with the final stats.
export function runSimulation(game, seedText, mode = 'win') {
  game.beginRun(seedText || 'lumenfall-sim');
  const G = game.G;
  const dt = 0.1; // 100ms steps: fine-grained enough to stay true
  const maxSteps = 12000; // 20 game-minutes, far past any real run
  let steps = 0;
  while (G.state === 'playing' && steps < maxSteps) {
    if (mode === 'win') decide(game);
    else if (G.waveState === 'idle' && G.wave < 12) startWave(G);
    game.update(dt);
    steps += 1;
  }
  return {
    won: G.state === 'victory',
    state: G.state,
    wave: G.wave,
    hp: G.hp,
    score: G.score,
    kills: G.kills,
    leaked: G.leaked,
    lumens: G.lumens,
    towers: G.towers.length,
    steps,
    gameSeconds: G.time,
  };
}
