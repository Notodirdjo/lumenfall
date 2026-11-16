// Particles, shockwave rings and floating text: the juice. Everything here
// is cosmetic, pooled and capped so a busy wave never slows the game down.

const MAX_PARTICLES = 400;
const MAX_TEXTS = 40;
const MAX_RINGS = 24;

export function spawnBurst(G, x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    if (G.particles.length >= MAX_PARTICLES) return;
    const a = G.rng.range(0, Math.PI * 2);
    const v = G.rng.range(speed * 0.3, speed);
    G.particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: G.rng.range(0.3, 0.7),
      maxLife: 0.7,
      size: G.rng.range(2, 4.5),
      color,
    });
  }
}

export function spawnRing(G, x, y, color) {
  if (G.rings.length >= MAX_RINGS) return;
  G.rings.push({ x, y, r: 6, maxR: 70, life: 0.35, maxLife: 0.35, color });
}

export function spawnText(G, x, y, text, color) {
  if (G.texts.length >= MAX_TEXTS) G.texts.shift();
  G.texts.push({ x, y, vy: -34, life: 0.9, maxLife: 0.9, text, color });
}

export function updateParticles(dt, G) {
  for (const p of G.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.4 * dt;
    p.vy *= 1 - 2.4 * dt;
  }
  G.particles = G.particles.filter((p) => p.life > 0);
  for (const r of G.rings) {
    r.life -= dt;
    r.r += (r.maxR - r.r) * Math.min(1, dt * 14);
  }
  G.rings = G.rings.filter((r) => r.life > 0);
  for (const t of G.texts) {
    t.life -= dt;
    t.y += t.vy * dt;
  }
  G.texts = G.texts.filter((t) => t.life > 0);
}

export function drawParticles(ctx, G) {
  for (const p of G.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const r of G.rings) {
    ctx.globalAlpha = Math.max(0, r.life / r.maxLife) * 0.8;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawTexts(ctx, G) {
  ctx.textAlign = 'center';
  ctx.font = '700 13px Inter, system-ui, sans-serif';
  for (const t of G.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
