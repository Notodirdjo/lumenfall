// Waves: what marches down the road, when, and what clearing one pays.

import { WAVES, TOTAL_WAVES, ECONOMY, DAWN } from './config.js';
import { spawnEnemy } from './enemies.js';

export function waveSpawnCount(n) {
  return WAVES[n - 1].groups.reduce((sum, g) => sum + g.count, 0);
}

export function enemiesRemaining(G) {
  return G.spawnQueue.length + G.enemies.filter((e) => e.alive).length;
}

// Begin wave G.wave + 1. Builds the spawn queue from the wave's groups:
// every enemy gets the second it walks in at.
export function startWave(G) {
  if (G.waveState !== 'idle' || G.wave >= TOTAL_WAVES) return false;
  G.wave += 1;
  G.waveTime = 0;
  G.leakedThisWave = 0;
  G.spawnQueue = [];
  for (const group of WAVES[G.wave - 1].groups) {
    for (let i = 0; i < group.count; i++) {
      G.spawnQueue.push({ at: group.delay + i * group.gap, type: group.type });
    }
  }
  G.spawnQueue.sort((a, b) => a.at - b.at);
  G.waveState = 'spawning';
  G.banner = { text: `WAVE ${G.wave}`, sub: waveSubtitle(G.wave), until: G.time + 2.2 };
  if (G.sfx) G.sfx.waveStart();
  return true;
}

function waveSubtitle(n) {
  if (n === TOTAL_WAVES) return 'The Gloom Titan comes. Hold the light.';
  if (n === 1) return 'They come for the Last Light.';
  const count = waveSpawnCount(n);
  return `${count} creatures on the road.`;
}

// Advance the spawner and spot the moment a wave is cleared. Returns
// 'cleared' when a wave ends, 'victory' when the last one does.
export function updateWaves(dt, G) {
  if (G.waveState !== 'spawning' && G.waveState !== 'fighting') return null;
  G.waveTime += dt;
  while (G.spawnQueue.length > 0 && G.spawnQueue[0].at <= G.waveTime) {
    const next = G.spawnQueue.shift();
    spawnEnemy(G, next.type);
  }
  if (G.waveState === 'spawning' && G.spawnQueue.length === 0) {
    G.waveState = 'fighting';
  }
  if (G.waveState === 'fighting' && G.enemies.length === 0) {
    return clearWave(G);
  }
  return null;
}

function clearWave(G) {
  const bonus = ECONOMY.waveBonusBase + G.wave * ECONOMY.waveBonusPerWave;
  const noLeak = G.leakedThisWave === 0 ? ECONOMY.noLeakBonus : 0;
  G.lumens += bonus + noLeak;
  G.earned += bonus + noLeak;
  G.score += ECONOMY.waveScore;
  G.waveState = 'idle';
  if (G.sfx) G.sfx.waveClear();
  if (G.wave % 4 === 0 && G.dawnCharges < DAWN.maxCharges) {
    G.dawnCharges += 1;
  }
  if (G.wave >= TOTAL_WAVES) return 'victory';
  return 'cleared';
}
