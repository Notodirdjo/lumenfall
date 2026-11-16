// LUMENFALL — the game itself: state, the loop, and every action the
// player (or the auto-player) can take. Modules do the pieces; this file
// is the glue and the referee.

import {
  CELL, COLS, ROWS, FIELD_W, FIELD_H, LIGHTHOUSE, TOWERS,
  ECONOMY, DAWN, TOTAL_WAVES,
} from './config.js';
import { Rng } from './rng.js';
import { SoundFX } from './audio.js';
import { damageEnemy } from './enemies.js';
import {
  placeTower, upgradeTower, sellTower, overchargeTower, towerAt,
  updateTowers,
} from './towers.js';
import { updateProjectiles } from './projectiles.js';
import { updateParticles, spawnRing, spawnBurst } from './particles.js';
import { startWave, updateWaves } from './waves.js';
import { draw } from './render.js';
import { UI } from './ui.js';
import { bindInput } from './input.js';
import { applyShotParams } from './shot.js';

const BEST_KEY = 'lumenfall-best';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sfx = new SoundFX();
    this.G = null;
    this.reset(this.seedFromUrl());
    this.ui = new UI(this);
    this.ui.setMuted(this.sfx.muted);
    bindInput(this);
    this.lastFrame = 0;
    this.raf = 0;
  }

  seedFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('seed') || `play-${Date.now().toString(36)}`;
  }

  freshState(seedText) {
    const rng = new Rng(seedText);
    const stars = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: rng.range(0, FIELD_W),
        y: rng.range(0, FIELD_H),
        size: rng.range(1, 2.2),
        twinkle: rng.range(0.5, 2),
        phase: rng.range(0, Math.PI * 2),
      });
    }
    return {
      canvas: this.canvas,
      ctx: this.ctx,
      rng,
      sfx: this.sfx,
      seedText,
      time: 0,
      state: 'title',
      stars,
      towers: [],
      enemies: [],
      projectiles: [],
      particles: [],
      rings: [],
      texts: [],
      lumens: ECONOMY.startLumens,
      score: 0,
      hp: LIGHTHOUSE.maxHp,
      maxHp: LIGHTHOUSE.maxHp,
      wave: 0,
      waveState: 'idle',
      waveTime: 0,
      spawnQueue: [],
      leakedThisWave: 0,
      kills: 0,
      leaked: 0,
      earned: 0,
      dawnCharges: DAWN.startCharges,
      dawnCooldown: 0,
      dawnFlash: 0,
      selected: null,
      buildType: null,
      buildTypeDef: null,
      hover: null,
      speed: 1,
      banner: null,
      best: this.loadBest(),
    };
  }

  loadBest() {
    try {
      return Number(window.localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch {
      return 0;
    }
  }

  saveBest() {
    try {
      window.localStorage.setItem(BEST_KEY, String(this.G.best));
    } catch {
      // Storage unavailable: the best score just won't persist.
    }
  }

  reset(seedText) {
    this.G = this.freshState(seedText);
  }

  // Begin a run without touching audio (used by the simulator).
  beginRun(seedText) {
    this.reset(seedText || this.seedFromUrl());
    this.G.state = 'playing';
    if (this.ui) {
      this.ui.hideScreens();
      this.ui.panelFor = null;
    }
  }

  startGame() {
    this.sfx.unlock();
    this.sfx.click();
    this.beginRun();
    this.ui.log('Build towers, then start wave 1. Good luck, Keeper.');
  }

  restart() {
    this.sfx.unlock();
    this.sfx.click();
    this.beginRun();
  }

  soundClick() {
    this.sfx.unlock();
    this.sfx.click();
  }

  togglePause() {
    const G = this.G;
    if (G.state === 'playing') {
      G.state = 'paused';
      this.ui.showScreen('pause');
    } else if (G.state === 'paused') {
      G.state = 'playing';
      this.ui.hideScreens();
    }
    this.sfx.click();
  }

  toggleSpeed() {
    const G = this.G;
    G.speed = G.speed === 1 ? 2 : 1;
    this.sfx.click();
  }

  toggleMute() {
    this.sfx.setMuted(!this.sfx.muted);
    this.ui.setMuted(this.sfx.muted);
  }

  startWave() {
    const G = this.G;
    if (G.state !== 'playing') return;
    if (startWave(G)) {
      this.ui.update();
    }
  }

  fireDawn() {
    const G = this.G;
    if (G.state !== 'playing') return;
    if (G.dawnCharges <= 0) {
      this.ui.log('No Dawn charges left. Clear every fourth wave to earn one.');
      this.sfx.deny();
      return;
    }
    if (G.dawnCooldown > 0) {
      this.ui.log('The Dawn is still gathering.');
      this.sfx.deny();
      return;
    }
    if (G.enemies.length === 0) {
      this.ui.log('No enemies on the field. Save it for the swarm.');
      this.sfx.deny();
      return;
    }
    G.dawnCharges -= 1;
    G.dawnCooldown = DAWN.cooldown;
    G.dawnFlash = 1;
    spawnRing(G, LIGHTHOUSE.x, LIGHTHOUSE.y - 20, '#ffe9a3');
    for (const e of [...G.enemies]) {
      if (!e.alive) continue;
      e.applySlow(DAWN.slow, DAWN.slowDur, G.time);
      damageEnemy(G, e, DAWN.damage);
    }
    this.sfx.dawn();
    this.ui.log('Dawn Burst! The light answers.');
  }

  selectBuild(type) {
    const G = this.G;
    G.buildType = type;
    G.buildTypeDef = type ? TOWERS[type] : null;
    if (type) G.selected = null;
  }

  selectTower(tower) {
    this.G.selected = tower;
  }

  selectAt(col, row) {
    const tower = towerAt(this.G, col, row);
    this.selectTower(tower);
    if (tower) this.sfx.click();
  }

  tryPlace(type, col, row) {
    const G = this.G;
    const { tower, why } = placeTower(G, type, col, row);
    if (!tower) {
      this.ui.log(why);
      this.sfx.deny();
      return;
    }
    spawnBurst(G, tower.x, tower.y, tower.color, 10, 90);
    this.sfx.place();
    if (G.lumens < TOWERS[type].cost) this.selectBuild(null);
  }

  upgradeSelected() {
    const G = this.G;
    if (!G.selected) return;
    const { ok, why } = upgradeTower(G, G.selected);
    if (ok) {
      this.sfx.upgrade();
      spawnBurst(G, G.selected.x, G.selected.y, '#ffd166', 12, 100);
      this.ui.panelFor = null; // rebuild the panel with the new level
    } else {
      this.ui.log(why);
      this.sfx.deny();
    }
  }

  sellSelected() {
    const G = this.G;
    if (!G.selected) return;
    const value = sellTower(G, G.selected);
    this.sfx.sell();
    this.ui.log(`Sold for ${value} lumens.`);
    this.ui.panelFor = null;
  }

  overchargeSelected() {
    const G = this.G;
    if (!G.selected) return;
    const { ok, why } = overchargeTower(G, G.selected);
    if (ok) {
      this.sfx.upgrade();
      spawnRing(G, G.selected.x, G.selected.y, '#ffe9a3');
    } else {
      this.ui.log(why);
      this.sfx.deny();
    }
  }

  endGame(won) {
    const G = this.G;
    if (won) {
      G.score += ECONOMY.victoryScore + G.hp * ECONOMY.victoryHpScore;
      G.state = 'victory';
      this.sfx.victory();
      this.ui.log('Victory! The Last Light burns on.');
    } else {
      G.state = 'defeat';
      this.sfx.defeat();
      this.ui.log('The light has gone out.');
    }
    if (G.score > G.best) {
      G.best = G.score;
      this.saveBest();
    }
    this.ui.fillEndScreens();
    this.ui.showScreen(won ? 'victory' : 'defeat');
  }

  update(dt) {
    const G = this.G;
    G.time += dt;
    G.dawnCooldown = Math.max(0, G.dawnCooldown - dt);
    G.dawnFlash = Math.max(0, G.dawnFlash - dt * 1.6);
    const waveResult = updateWaves(dt, G);
    if (waveResult === 'cleared') {
      const bonus = ECONOMY.waveBonusBase + G.wave * ECONOMY.waveBonusPerWave;
      const noLeak = G.leakedThisWave === 0 ? ECONOMY.noLeakBonus : 0;
      this.ui.log(`Wave ${G.wave} cleared! +${bonus + noLeak} lumens.`);
    } else if (waveResult === 'victory') {
      this.endGame(true);
      return;
    }
    updateTowers(dt, G);
    updateProjectiles(dt, G);
    for (const e of G.enemies) e.update(dt, G);
    // Leaks: whatever reaches the lighthouse door hurts it.
    for (const e of G.enemies) {
      if (e.leaked) {
        G.hp -= e.damage;
        G.leaked += 1;
        G.leakedThisWave += 1;
        spawnBurst(G, LIGHTHOUSE.x, LIGHTHOUSE.y, '#e5484d', 16, 140);
        this.sfx.leak();
        this.ui.log(`${e.name} slipped through! The light dims.`);
      }
    }
    G.enemies = G.enemies.filter((e) => e.alive);
    updateParticles(dt, G);
    if (G.hp <= 0) {
      G.hp = 0;
      this.endGame(false);
    }
  }

  frame(now) {
    const dtMs = Math.min(50, now - (this.lastFrame || now));
    this.lastFrame = now;
    const G = this.G;
    if (G.state === 'playing') {
      this.update((dtMs / 1000) * G.speed);
    }
    draw(G);
    this.ui.update();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  start() {
    this.ui.fillEndScreens();
    // Staged states (?shot=) already set their screen; only show the title
    // when the game actually starts on it.
    if (this.G.state === 'title') {
      this.ui.showScreen('title');
    } else if (this.G.state === 'playing') {
      this.ui.hideScreens();
    }
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }
}

// Boot: the game, its staged screenshot states, then the loop.
const canvas = document.getElementById('field');
canvas.width = FIELD_W;
canvas.height = FIELD_H;
const game = new Game(canvas);
window.__lumenfall = game; // for play-testing and screenshots
applyShotParams(game);
game.start();
