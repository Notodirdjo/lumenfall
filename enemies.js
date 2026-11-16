// The Gloom's creatures: what they are, how they walk the road, and what
// happens when a tower's bolt finds them.

import { ENEMIES, HP_GROWTH, SPEED_GROWTH, PATH, ECONOMY } from './config.js';
import { spawnBurst, spawnText } from './particles.js';

export class Enemy {
  constructor(type, wave, rng) {
    const def = ENEMIES[type];
    this.type = type;
    this.name = def.name;
    this.color = def.color;
    this.radius = def.radius;
    this.bounty = def.bounty;
    this.damage = def.damage;
    // Waves get tougher: later waves grow HP fast and speed a little.
    this.maxHp = Math.round(def.hp * (1 + HP_GROWTH * (wave - 1)));
    this.hp = this.maxHp;
    this.speed = def.speed * (1 + SPEED_GROWTH * (wave - 1));
    this.splits = def.splits || 0;
    // Position: the start of the road, with a small sideways offset so the
    // pack does not march in a single file line.
    this.x = PATH[0].x;
    this.y = PATH[0].y;
    this.offX = rng.range(-9, 9);
    this.offY = rng.range(-9, 9);
    this.seg = 0; // index of the waypoint being walked toward
    this.dist = 0; // pixels travelled along the road (towers aim at the max)
    this.wobble = rng.range(0, Math.PI * 2);
    this.wobbleSpeed = rng.range(2, 4);
    this.slowUntil = 0;
    this.slowFactor = 1;
    this.alive = true;
    this.leaked = false;
    this.flash = 0; // hit flash, seconds remaining
  }

  currentSpeed(now) {
    return this.speed * (now < this.slowUntil ? this.slowFactor : 1);
  }

  applySlow(factor, duration, now) {
    // factor is the fraction of speed REMOVED (0.45 = 45% slower).
    const mult = 1 - factor;
    if (mult < this.slowFactor || now >= this.slowUntil) {
      this.slowFactor = mult;
    }
    this.slowUntil = Math.max(this.slowUntil, now + duration);
  }

  update(dt, G) {
    if (!this.alive) return;
    this.flash = Math.max(0, this.flash - dt);
    const target = PATH[this.seg + 1];
    if (!target) {
      this.leaked = true;
      this.alive = false;
      return;
    }
    const tx = target.x + this.offX;
    const ty = target.y + this.offY;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.currentSpeed(G.time) * dt;
    if (d <= step) {
      this.x = tx;
      this.y = ty;
      this.dist += d;
      this.seg += 1;
    } else {
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
      this.dist += step;
    }
  }
}

export function spawnEnemy(G, type) {
  const enemy = new Enemy(type, G.wave, G.rng);
  G.enemies.push(enemy);
  return enemy;
}

// Deal damage to one enemy. Returns true when the hit killed it. A kill
// pays its bounty, adds score, bursts particles, and a Splitter breaks
// into Minis that keep marching from where it fell.
export function damageEnemy(G, enemy, amount) {
  if (!enemy.alive) return false;
  enemy.hp -= amount;
  enemy.flash = 0.09;
  if (enemy.hp > 0) return false;
  enemy.alive = false;
  G.kills += 1;
  G.lumens += enemy.bounty;
  G.earned += enemy.bounty;
  G.score += ECONOMY.killScore;
  spawnBurst(G, enemy.x, enemy.y, enemy.color, 14, 130);
  spawnText(G, enemy.x, enemy.y - enemy.radius - 6, `+${enemy.bounty}`, '#ffd166');
  if (G.sfx) G.sfx.kill();
  if (enemy.splits > 0) {
    for (let i = 0; i < enemy.splits; i++) {
      const mini = new Enemy('mini', G.wave, G.rng);
      // Minis continue from the spot their parent fell.
      mini.x = enemy.x + G.rng.range(-12, 12);
      mini.y = enemy.y + G.rng.range(-12, 12);
      mini.seg = enemy.seg;
      mini.dist = enemy.dist;
      G.enemies.push(mini);
    }
  }
  return true;
}
