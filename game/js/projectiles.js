// Projectiles: the bolts towers fire. They home in on their target's
// current position; when the target is already gone they fly on to where
// it was last seen and fizzle out.

import { damageEnemy } from './enemies.js';
import { spawnBurst, spawnRing } from './particles.js';

export class Projectile {
  constructor({ x, y, target, speed, damage, kind, color, splash, slow, slowDur, chillRadius }) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.lastX = target.x;
    this.lastY = target.y;
    this.speed = speed;
    this.damage = damage;
    this.kind = kind;
    this.color = color;
    this.splash = splash || 0;
    this.slow = slow || 0;
    this.slowDur = slowDur || 0;
    this.chillRadius = chillRadius || 0;
    this.alive = true;
    this.trail = [];
  }

  update(dt, G) {
    if (!this.alive) return;
    if (this.target.alive) {
      this.lastX = this.target.x;
      this.lastY = this.target.y;
    }
    const dx = this.lastX - this.x;
    const dy = this.lastY - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();
    if (d <= Math.max(step, 6)) {
      this.alive = false;
      this.impact(G);
      return;
    }
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    // Out of the field without ever arriving: it fizzles.
    if (this.x < -20 || this.x > 980 || this.y < -20 || this.y > 740) {
      this.alive = false;
    }
  }

  impact(G) {
    const hx = this.lastX;
    const hy = this.lastY;
    if (this.splash > 0) {
      spawnRing(G, hx, hy, this.color);
      spawnBurst(G, hx, hy, this.color, 10, 110);
      for (const e of G.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - hx, e.y - hy) <= this.splash + e.radius) {
          damageEnemy(G, e, this.damage);
        }
      }
    } else if (this.target.alive) {
      spawnBurst(G, hx, hy, this.color, 5, 80);
      damageEnemy(G, this.target, this.damage);
    }
    if (this.slow > 0) {
      const radius = this.chillRadius || 0;
      for (const e of G.enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - hx, e.y - hy);
        if (e === this.target || d <= radius + e.radius) {
          e.applySlow(this.slow, this.slowDur, G.time);
        }
      }
    }
    if (G.sfx) G.sfx.hit();
  }
}

export function updateProjectiles(dt, G) {
  for (const p of G.projectiles) p.update(dt, G);
  G.projectiles = G.projectiles.filter((p) => p.alive);
}
