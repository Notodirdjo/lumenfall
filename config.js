// LUMENFALL — every number the game runs on lives in this file: the field,
// the path, the towers, the enemies, the twelve waves and the economy.
// Balance was tuned by auto-playing full games (see sim.js) until a sensible
// build wins with a little room to spare and a careless one loses.

// ---- field ----
export const CELL = 60;
export const COLS = 16;
export const ROWS = 12;
export const FIELD_W = COLS * CELL; // 960
export const FIELD_H = ROWS * CELL; // 720

// The Gloom's road, as waypoints in pixels. It snakes down the field and
// ends at the lighthouse door.
export const PATH = [
  { x: -30, y: 90 },
  { x: 810, y: 90 },
  { x: 810, y: 270 },
  { x: 150, y: 270 },
  { x: 150, y: 450 },
  { x: 810, y: 450 },
  { x: 810, y: 630 },
  { x: 930, y: 630 },
];

export const LIGHTHOUSE = { x: 915, y: 630, radius: 34, maxHp: 20 };

// Cells the road runs through, computed by sampling the polyline. A tower
// can only be built on a cell that is neither road nor lighthouse ground.
function computePathCells() {
  const cells = new Set();
  const key = (c, r) => `${c},${r}`;
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i];
    const b = PATH[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.ceil(len / 8);
    for (let s = 0; s <= steps; s++) {
      const x = a.x + ((b.x - a.x) * s) / steps;
      const y = a.y + ((b.y - a.y) * s) / steps;
      const c = Math.floor(x / CELL);
      const r = Math.floor(y / CELL);
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) cells.add(key(c, r));
    }
  }
  return cells;
}
export const PATH_CELLS = computePathCells();
export const LIGHTHOUSE_CELLS = new Set(['14,9', '15,9', '14,10', '15,10']);

export function isPathCell(c, r) {
  return PATH_CELLS.has(`${c},${r}`);
}
export function isLighthouseCell(c, r) {
  return LIGHTHOUSE_CELLS.has(`${c},${r}`);
}
export function isBuildable(c, r) {
  return (
    c >= 0 && c < COLS && r >= 0 && r < ROWS &&
    !isPathCell(c, r) && !isLighthouseCell(c, r)
  );
}
export function cellCenter(c, r) {
  return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
}

// ---- towers ----
// rate = shots per second. up2/up3 = upgrade cost to that level.
// Frost chills: slow is the fraction of speed removed, slowDur seconds,
// chillRadius splashes the chill around the hit enemy.
export const TOWERS = {
  prism: {
    name: 'Prism', cost: 50, range: 135, damage: 12, rate: 2.0,
    projSpeed: 460, color: '#37e0ff', up2: 40, up3: 70,
    desc: 'Rapid bolts of light.',
  },
  frost: {
    name: 'Frost', cost: 70, range: 125, damage: 7, rate: 1.2,
    projSpeed: 380, slow: 0.45, slowDur: 1.6, chillRadius: 55,
    color: '#8fd8ff', up2: 55, up3: 95,
    desc: 'Chills and slows the pack.',
  },
  pulse: {
    name: 'Pulse', cost: 100, range: 145, damage: 24, rate: 0.8,
    projSpeed: 340, splash: 75, color: '#ff5ea8', up2: 80, up3: 140,
    desc: 'Explosive splash damage.',
  },
  lance: {
    name: 'Lance', cost: 120, range: 250, damage: 58, rate: 0.55,
    projSpeed: 720, color: '#ffd166', up2: 95, up3: 165,
    desc: 'Long-range heavy bolt.',
  },
};
export const TOWER_ORDER = ['prism', 'frost', 'pulse', 'lance'];

// Multipliers applied to the base stats at each level.
export const UPGRADE = {
  2: { damage: 1.6, range: 1.15, rate: 1.15 },
  3: { damage: 2.6, range: 1.3, rate: 1.3 },
};

// Overcharge: a tower's temporary surge. 8s of double fire rate and
// 1.5x damage, then a 22s cooldown on that tower.
export const OVERCHARGE = { duration: 8, rateMult: 2, damageMult: 1.5, cooldown: 22 };

// ---- enemies ----
export const ENEMIES = {
  wisp: {
    name: 'Wisp', hp: 30, speed: 56, bounty: 8, damage: 1,
    radius: 13, color: '#b388ff',
  },
  swift: {
    name: 'Swift', hp: 24, speed: 98, bounty: 10, damage: 1,
    radius: 11, color: '#ff8a5c',
  },
  bulwark: {
    name: 'Bulwark', hp: 150, speed: 33, bounty: 22, damage: 3,
    radius: 20, color: '#7ee787',
  },
  splitter: {
    name: 'Splitter', hp: 65, speed: 48, bounty: 14, damage: 2,
    radius: 16, color: '#f778ba', splits: 2,
  },
  mini: {
    name: 'Mini', hp: 16, speed: 72, bounty: 3, damage: 1,
    radius: 9, color: '#f778ba',
  },
  titan: {
    name: 'Gloom Titan', hp: 1500, speed: 27, bounty: 200, damage: 10,
    radius: 30, color: '#e5484d',
  },
};
export const HP_GROWTH = 0.21; // +21% max HP per wave after the first
export const SPEED_GROWTH = 0.015; // +1.5% speed per wave after the first

// ---- waves ----
// Each wave is a list of groups. A group spawns `count` enemies of `type`,
// `gap` seconds apart, starting `delay` seconds after the wave begins.
export const WAVES = [
  { groups: [{ type: 'wisp', count: 8, gap: 0.9, delay: 0 }] },
  { groups: [{ type: 'wisp', count: 12, gap: 0.7, delay: 0 }] },
  {
    groups: [
      { type: 'wisp', count: 8, gap: 0.7, delay: 0 },
      { type: 'swift', count: 6, gap: 0.6, delay: 4 },
    ],
  },
  {
    groups: [
      { type: 'swift', count: 14, gap: 0.6, delay: 0 },
      { type: 'wisp', count: 4, gap: 0.8, delay: 5 },
    ],
  },
  {
    groups: [
      { type: 'bulwark', count: 6, gap: 1.6, delay: 0 },
      { type: 'wisp', count: 10, gap: 0.6, delay: 3 },
    ],
  },
  {
    groups: [
      { type: 'splitter', count: 8, gap: 1.2, delay: 0 },
      { type: 'swift', count: 8, gap: 0.55, delay: 4 },
    ],
  },
  {
    groups: [
      { type: 'swift', count: 16, gap: 0.45, delay: 0 },
      { type: 'bulwark', count: 6, gap: 1.4, delay: 5 },
    ],
  },
  {
    groups: [
      { type: 'splitter', count: 10, gap: 0.9, delay: 0 },
      { type: 'wisp', count: 12, gap: 0.5, delay: 3 },
    ],
  },
  {
    groups: [
      { type: 'bulwark', count: 10, gap: 1.1, delay: 0 },
      { type: 'swift', count: 10, gap: 0.5, delay: 4 },
    ],
  },
  {
    groups: [
      { type: 'splitter', count: 14, gap: 0.7, delay: 0 },
      { type: 'bulwark', count: 8, gap: 1.2, delay: 6 },
    ],
  },
  {
    groups: [
      { type: 'swift', count: 20, gap: 0.4, delay: 0 },
      { type: 'splitter', count: 10, gap: 0.8, delay: 3 },
      { type: 'bulwark', count: 6, gap: 1.3, delay: 8 },
    ],
  },
  {
    groups: [
      { type: 'titan', count: 1, gap: 1, delay: 0 },
      { type: 'swift', count: 8, gap: 0.5, delay: 6 },
      { type: 'splitter', count: 6, gap: 0.9, delay: 12 },
      { type: 'bulwark', count: 4, gap: 1.4, delay: 18 },
    ],
  },
];
export const TOTAL_WAVES = WAVES.length;

// ---- economy + scoring ----
export const ECONOMY = {
  startLumens: 220,
  waveBonusBase: 30, // + wave * waveBonusPerWave on clearing a wave
  waveBonusPerWave: 8,
  noLeakBonus: 15, // extra when a wave ends with no leaks
  sellRate: 0.7, // 70% of everything invested in the tower
  killScore: 10,
  waveScore: 100,
  victoryScore: 500,
  victoryHpScore: 25, // per lighthouse HP left at victory
};

// Dawn Burst: the lighthouse's own weapon. Heavy damage to every enemy on
// the field, plus a brief slow. Charges start at 2 (max 3); clearing every
// fourth wave restores one. A 40s cooldown separates uses.
export const DAWN = { damage: 260, slow: 0.5, slowDur: 2, cooldown: 40, startCharges: 2, maxCharges: 3 };

// ---- palette ----
export const COLORS = {
  bg: '#0b0e1a',
  bgEdge: '#070912',
  grid: 'rgba(120, 140, 255, 0.07)',
  plot: 'rgba(120, 160, 255, 0.05)',
  path: '#171c33',
  pathEdge: 'rgba(150, 170, 255, 0.16)',
  pathDash: 'rgba(190, 150, 255, 0.35)',
  lighthouseGlow: '#ffe9a3',
  text: '#e8ecff',
  muted: '#9aa3c7',
};
