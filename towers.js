// Towers: the player's pieces. Placement, upgrades, selling, overcharge,
// and the per-frame work of aiming and firing at the Gloom.

import {
  TOWERS, TOWER_ORDER, UPGRADE, OVERCHARGE, ECONOMY,
  isBuildable, cellCenter,
} from './config.js';
import { Projectile } from './projectiles.js';

export class Tower {
  constructor(type, col, row) {
    const def = TOWERS[type];
    this.type = type;
    this.name = def.name;
    this.color = def.color;
    this.col = col;
    this.row = row;
    const c = cellCenter(col, row);
    this.x = c.x;
    this.y = c.y;
    this.level = 1;
    this.invested = def.cost;
    this.cooldown = 0; // seconds until the next shot
    this.angle = -Math.PI / 2; // barrel direction, for drawing
    this.overchargeUntil = 0;
    this.overchargeReadyAt = 0;
    this.shotsFired = 0;
  }

  def() {
    return TOWERS[this.type];
  }

  // Stats after the level multipliers (and overcharge, while it lasts).
  stats(now) {
    const base = this.def();
    const mult = UPGRADE[this.level] || { damage: 1, range: 1, rate: 1 };
    const over = now < this.overchargeUntil;
    return {
      range: base.range * mult.range,
      damage: base.damage * mult.damage * (over ? OVERCHARGE.damageMult : 1),
      rate: base.rate * mult.rate * (over ? OVERCHARGE.rateMult : 1),
      projSpeed: base.projSpeed,
      splash: base.splash || 0,
      slow: base.slow || 0,
      slowDur: base.slowDur || 0,
      chillRadius: base.chillRadius || 0,
    };
  }

  upgradeCost() {
    if (this.level >= 3) return null;
    return this.def()[this.level === 1 ? 'up2' : 'up3'];
  }

  sellValue() {
    return Math.floor(this.invested * ECONOMY.sellRate);
  }

  isOvercharged(now) {
    return now < this.overchargeUntil;
  }

  overchargeCooldownLeft(now) {
    return Math.max(0, this.overchargeReadyAt - now);
  }
}

export function towerAt(G, col, row) {
  return G.towers.find((t) => t.col === col && t.row === row) || null;
}

export function canPlace(G, type, col, row) {
  if (!isBuildable(col, row)) return { ok: false, why: 'Nothing grows on the road.' };
  if (towerAt(G, col, row)) return { ok: false, why: 'A tower already stands there.' };
  if (G.lumens < TOWERS[type].cost) return { ok: false, why: 'Not enough lumens.' };
  return { ok: true };
}

export function placeTower(G, type, col, row) {
  const check = canPlace(G, type, col, row);
  if (!check.ok) return { tower: null, why: check.why };
  G.lumens -= TOWERS[type].cost;
  const tower = new Tower(type, col, row);
  G.towers.push(tower);
  return { tower, why: null };
}

export function upgradeTower(G, tower) {
  const cost = tower.upgradeCost();
  if (cost === null) return { ok: false, why: 'Already at full power.' };
  if (G.lumens < cost) return { ok: false, why: 'Not enough lumens.' };
  G.lumens -= cost;
  tower.invested += cost;
  tower.level += 1;
  return { ok: true };
}

export function sellTower(G, tower) {
  const value = tower.sellValue();
  G.lumens += value;
  G.towers = G.towers.filter((t) => t !== tower);
  if (G.selected === tower) G.selected = null;
  return value;
}

export function overchargeTower(G, tower) {
  if (tower.isOvercharged(G.time)) return { ok: false, why: 'Already surging.' };
  if (tower.overchargeCooldownLeft(G.time) > 0) {
    return { ok: false, why: 'Overcharge is recharging.' };
  }
  tower.overchargeUntil = G.time + OVERCHARGE.duration;
  tower.overchargeReadyAt = G.time + OVERCHARGE.duration + OVERCHARGE.cooldown;
  return { ok: true };
}

// Pick a target: the living enemy in range that has travelled furthest
// along the road (the one closest to the lighthouse).
function pickTarget(G, tower, range) {
  let best = null;
  let bestDist = -1;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - tower.x, e.y - tower.y);
    if (d > range + e.radius) continue;
    if (e.dist > bestDist) {
      bestDist = e.dist;
      best = e;
    }
  }
  return best;
}

export function updateTowers(dt, G) {
  for (const tower of G.towers) {
    const s = tower.stats(G.time);
    tower.cooldown -= dt;
    const target = pickTarget(G, tower, s.range);
    if (target) {
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    }
    if (target && tower.cooldown <= 0) {
      tower.cooldown = 1 / s.rate;
      tower.shotsFired += 1;
      G.projectiles.push(
        new Projectile({
          x: tower.x,
          y: tower.y,
          target,
          speed: s.projSpeed,
          damage: s.damage,
          kind: tower.type,
          color: tower.color,
          splash: s.splash,
          slow: s.slow,
          slowDur: s.slowDur,
          chillRadius: s.chillRadius,
        }),
      );
      if (G.sfx) G.sfx.shoot(tower.type);
    }
  }
}

export { TOWER_ORDER };
