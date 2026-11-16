// Everything the eye sees on the field canvas: the night sky, the road,
// the lighthouse and its sweeping beam, the towers, the Gloom and the
// flashes and rings of the fight. DOM (sidebar, screens) lives in ui.js.

import {
  CELL, COLS, ROWS, FIELD_W, FIELD_H, PATH, LIGHTHOUSE,
  COLORS, isPathCell, isBuildable,
} from './config.js';
import { drawParticles, drawTexts } from './particles.js';

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function glowCircle(ctx, x, y, radius, color, alpha) {
  const c = hexToRgb(color);
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${alpha})`);
  grad.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackground(ctx, G) {
  const grad = ctx.createLinearGradient(0, 0, 0, FIELD_H);
  grad.addColorStop(0, '#0d1126');
  grad.addColorStop(0.55, COLORS.bg);
  grad.addColorStop(1, COLORS.bgEdge);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  // Stars, fixed since the game started, twinkling gently.
  for (const s of G.stars) {
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(G.time * s.twinkle + s.phase);
    ctx.fillStyle = '#cdd6ff';
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
  // Faint grid.
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < COLS; c++) {
    ctx.moveTo(c * CELL, 0);
    ctx.lineTo(c * CELL, FIELD_H);
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(FIELD_W, r * CELL);
  }
  ctx.stroke();
}

function tracePath(ctx) {
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
}

function drawPath(ctx, G) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  tracePath(ctx);
  ctx.strokeStyle = COLORS.pathEdge;
  ctx.lineWidth = 50;
  ctx.stroke();
  tracePath(ctx);
  ctx.strokeStyle = COLORS.path;
  ctx.lineWidth = 44;
  ctx.stroke();
  // Marching dashes: the road feels alive, crawling toward the light.
  tracePath(ctx);
  ctx.strokeStyle = COLORS.pathDash;
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 22]);
  ctx.lineDashOffset = -G.time * 36;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawLighthouse(ctx, G) {
  const { x, y } = LIGHTHOUSE;
  const hpFrac = Math.max(0, G.hp / LIGHTHOUSE.maxHp);
  // Halo.
  glowCircle(ctx, x, y, 120, '#ffe9a3', 0.16 + 0.05 * Math.sin(G.time * 2));
  // Sweeping beam.
  const beamAngle = G.time * 0.45;
  ctx.save();
  ctx.translate(x, y - 18);
  ctx.rotate(beamAngle);
  const beam = ctx.createLinearGradient(0, 0, 210, 0);
  beam.addColorStop(0, 'rgba(255, 233, 163, 0.34)');
  beam.addColorStop(1, 'rgba(255, 233, 163, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(210, -26);
  ctx.lineTo(210, 26);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Stone base.
  ctx.fillStyle = '#2a2f4a';
  ctx.beginPath();
  ctx.arc(x, y + 8, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3d4370';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Tower body: white bands on deep blue.
  ctx.fillStyle = '#dfe6ff';
  ctx.beginPath();
  ctx.moveTo(x - 13, y + 8);
  ctx.lineTo(x - 9, y - 34);
  ctx.lineTo(x + 9, y - 34);
  ctx.lineTo(x + 13, y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e5484d';
  ctx.fillRect(x - 11.5, y - 22, 23, 7);
  ctx.fillRect(x - 10, y - 8, 20, 6);
  // The lamp.
  ctx.fillStyle = '#2a2f4a';
  ctx.beginPath();
  ctx.arc(x, y - 40, 11, 0, Math.PI * 2);
  ctx.fill();
  glowCircle(ctx, x, y - 40, 30, '#ffe9a3', 0.85);
  ctx.fillStyle = '#fff6c9';
  ctx.beginPath();
  ctx.arc(x, y - 40, 6.5, 0, Math.PI * 2);
  ctx.fill();
  // HP arc above the lamp.
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y - 40, 20, -Math.PI * 0.85, Math.PI * 0.85);
  ctx.stroke();
  ctx.strokeStyle = hpFrac > 0.35 ? '#7ee787' : '#e5484d';
  ctx.beginPath();
  ctx.arc(x, y - 40, 20, -Math.PI * 0.85, -Math.PI * 0.85 + Math.PI * 1.7 * hpFrac);
  ctx.stroke();
}

function drawTowerBody(ctx, tower, now) {
  const { x, y } = tower;
  const over = tower.isOvercharged(now);
  // Base.
  ctx.fillStyle = '#20263f';
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = over ? '#ffe9a3' : tower.color;
  ctx.lineWidth = over ? 3 : 1.5;
  ctx.globalAlpha = over ? 0.9 + 0.1 * Math.sin(now * 10) : 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;
  glowCircle(ctx, x, y, 30, tower.color, 0.22);
  ctx.fillStyle = tower.color;
  if (tower.type === 'prism') {
    // A diamond gem.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-8, -8, 16, 16);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (tower.type === 'frost') {
    // A six-armed snowflake.
    ctx.strokeStyle = tower.color;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (tower.type === 'pulse') {
    // Concentric rings, the middle one pulsing.
    for (const r of [12, 8, 4]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(11,14,26,0.55)';
    }
    ctx.fillStyle = tower.color;
    ctx.beginPath();
    ctx.arc(x, y, 3 + Math.sin(now * 5) * 1, 0, Math.PI * 2);
    ctx.fill();
  } else if (tower.type === 'lance') {
    // A long barrel that tracks its target.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tower.angle);
    ctx.fillRect(0, -3.5, 24, 7);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(18, -2, 8, 4);
    ctx.restore();
    ctx.fillStyle = tower.color;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Level pips.
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < tower.level; i++) {
    ctx.beginPath();
    ctx.arc(x - 8 + i * 8, y + 27, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTowers(ctx, G) {
  for (const t of G.towers) drawTowerBody(ctx, t, G.time);
}

function enemyHeading(e) {
  const next = PATH[e.seg + 1];
  if (!next) return 0;
  return Math.atan2(next.y + e.offY - e.y, next.x + e.offX - e.x);
}

function drawEnemy(ctx, e, now) {
  const wob = Math.sin(now * e.wobbleSpeed + e.wobble) * 2;
  const x = e.x;
  const y = e.y + wob;
  const slowed = now < e.slowUntil;
  glowCircle(ctx, x, y, e.radius * 2.1, slowed ? '#8fd8ff' : e.color, 0.3);
  ctx.fillStyle = e.color;
  if (e.type === 'wisp' || e.type === 'mini') {
    ctx.beginPath();
    ctx.arc(x, y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(x - e.radius * 0.3, y - e.radius * 0.3, e.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'swift') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(enemyHeading(e));
    ctx.beginPath();
    ctx.moveTo(e.radius + 4, 0);
    ctx.lineTo(-e.radius, -e.radius * 0.8);
    ctx.lineTo(-e.radius * 0.5, 0);
    ctx.lineTo(-e.radius, e.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (e.type === 'bulwark') {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + Math.PI / 6;
      const px = x + Math.cos(a) * e.radius;
      const py = y + Math.sin(a) * e.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(11,14,26,0.6)';
    ctx.beginPath();
    ctx.arc(x, y, e.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'splitter') {
    ctx.beginPath();
    ctx.arc(x - e.radius * 0.45, y, e.radius * 0.7, 0, Math.PI * 2);
    ctx.arc(x + e.radius * 0.45, y, e.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.arc(x, y - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'titan') {
    // Rings and spikes: the boss reads as danger from across the field.
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, e.radius + 6 + Math.sin(now * 3) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + now * 0.4;
      const px = x + Math.cos(a) * (e.radius + 8);
      const py = y + Math.sin(a) * (e.radius + 8);
      const qx = x + Math.cos(a + 0.22) * e.radius;
      const qy = y + Math.sin(a + 0.22) * e.radius;
      ctx.moveTo(px, py);
      ctx.lineTo(qx, qy);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(x - 8, y - 4, 4, 0, Math.PI * 2);
    ctx.arc(x + 8, y - 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (e.flash > 0) {
    ctx.globalAlpha = Math.min(1, e.flash / 0.09) * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // HP bar, only once hurt.
  if (e.hp < e.maxHp) {
    const w = Math.max(26, e.radius * 2);
    const frac = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - w / 2, y - e.radius - 12, w, 5);
    ctx.fillStyle = frac > 0.4 ? '#7ee787' : '#e5484d';
    ctx.fillRect(x - w / 2, y - e.radius - 12, w * frac, 5);
  }
}

function drawEnemies(ctx, G) {
  for (const e of G.enemies) {
    if (e.alive) drawEnemy(ctx, e, G.time);
  }
}

function drawProjectiles(ctx, G) {
  for (const p of G.projectiles) {
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      if (i === 0) ctx.moveTo(t.x, t.y);
      else ctx.lineTo(t.x, t.y);
    }
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    glowCircle(ctx, p.x, p.y, 10, p.color, 0.55);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlacement(ctx, G) {
  const hover = G.hover;
  if (!hover) return;
  const { col, row } = hover;
  const cx = col * CELL + CELL / 2;
  const cy = row * CELL + CELL / 2;
  if (G.buildType) {
    const ok = isBuildable(col, row) && !G.towers.some((t) => t.col === col && t.row === row);
    ctx.fillStyle = ok ? 'rgba(126,231,135,0.18)' : 'rgba(229,72,77,0.25)';
    ctx.fillRect(col * CELL + 2, row * CELL + 2, CELL - 4, CELL - 4);
    ctx.strokeStyle = ok ? '#7ee787' : '#e5484d';
    ctx.lineWidth = 2;
    ctx.strokeRect(col * CELL + 2, row * CELL + 2, CELL - 4, CELL - 4);
    const range = G.buildTypeDef.range;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.arc(cx, cy, range, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Ghost of the tower itself.
    ctx.globalAlpha = 0.65;
    drawTowerBody(ctx, {
      x: cx, y: cy, type: G.buildType, color: G.buildTypeDef.color,
      level: 1, angle: -Math.PI / 2, isOvercharged: () => false,
    }, G.time);
    ctx.globalAlpha = 1;
  } else if (G.selected) {
    const s = G.selected.stats(G.time);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.arc(G.selected.x, G.selected.y, s.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawBanner(ctx, G) {
  if (!G.banner || G.time > G.banner.until) return;
  const age = G.banner.until - G.time;
  const alpha = age > 1.8 ? (2.2 - age) / 0.4 : Math.min(1, age / 0.6);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 54px Inter, system-ui, sans-serif';
  ctx.fillText(G.banner.text, FIELD_W / 2, 120);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '500 18px Inter, system-ui, sans-serif';
  ctx.fillText(G.banner.sub, FIELD_W / 2, 152);
  ctx.globalAlpha = 1;
}

// The one call the loop makes each frame.
export function draw(G) {
  const ctx = G.ctx;
  drawBackground(ctx, G);
  drawPath(ctx, G);
  drawLighthouse(ctx, G);
  drawTowers(ctx, G);
  drawEnemies(ctx, G);
  drawProjectiles(ctx, G);
  drawParticles(ctx, G);
  drawTexts(ctx, G);
  drawPlacement(ctx, G);
  drawBanner(ctx, G);
  if (G.dawnFlash > 0) {
    ctx.fillStyle = `rgba(255, 240, 190, ${Math.min(0.55, G.dawnFlash)})`;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  }
}
