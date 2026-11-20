// Pré-rendu des tuiles statiques du niveau dans un grand canvas (zéro coût par frame, pas de joints).
import { T } from './tilemap.js';
import { makeCanvas, hash2 } from '../engine/util.js';

export const TILE_PAL = {
  dawn: { rock: '#1f2a6e', rockL: '#2a3a8f', rockD: '#151c4f', edge: '#0b1036', snow: '#eef6ff', snowS: '#b9cdf5', snowH: '#ffffff', ice: 'rgba(126,232,255,0.55)', iceL: '#c8f6ff' },
  storm: { rock: '#27324a', rockL: '#344262', rockD: '#1b2336', edge: '#0d121e', snow: '#e4ecf5', snowS: '#a9b8cc', snowH: '#ffffff', ice: 'rgba(150,200,230,0.5)', iceL: '#dff0fa' },
  glacier: { rock: '#2a6fa8', rockL: '#4f9fd6', rockD: '#1d4f7d', edge: '#0f2c4d', snow: '#f4fbff', snowS: '#bfe3fa', snowH: '#ffffff', ice: 'rgba(140,240,255,0.5)', iceL: '#e6fdff', crystal: true },
  night: { rock: '#2a1d4f', rockL: '#3d2a6e', rockD: '#1a1238', edge: '#0b0820', snow: '#d9e2ff', snowS: '#8f97d8', snowH: '#ffffff', ice: 'rgba(190,140,255,0.45)', iceL: '#f0dcff', neon: '#ff4fd8' },
};

function speckle(g, x, y, tx, ty, p, mask) {
  for (let i = 0; i < 9; i++) {
    const r1 = hash2(tx * 7 + i, ty * 13 + i * 3);
    const r2 = hash2(tx * 11 + i * 5, ty * 3 + i);
    const px = (r1 * 16) | 0, py = (r2 * 16) | 0;
    if (mask && !mask(px, py)) continue;
    g.fillStyle = i % 3 === 0 ? p.rockD : p.rockL;
    g.fillRect(x + px, y + py, i % 4 === 0 ? 2 : 1, 1);
  }
}

function drawGround(g, map, tx, ty, p) {
  const x = tx * T, y = ty * T;
  g.fillStyle = p.rock; g.fillRect(x, y, T, T);
  // roche gelée : plaques irrégulières plutôt que des briques
  const r = hash2(tx, ty);
  g.fillStyle = p.rockL;
  g.fillRect(x + ((r * 9) | 0), y + 3 + ((r * 7) | 0) % 5, 5, 1);
  g.fillRect(x + ((r * 13) | 0) % 11, y + 10, 4, 1);
  g.fillStyle = p.rockD;
  g.fillRect(x + ((r * 5) | 0), y + 4 + ((r * 7) | 0) % 5, 5, 1);
  g.fillRect(x + ((r * 13) | 0) % 11, y + 11, 4, 1);
  if (r > 0.5) { g.fillRect(x + 2 + ((r * 31) | 0) % 10, y + 13, 3, 1); }
  speckle(g, x, y, tx, ty, p);
  const up = map.filled(tx, ty - 1) || map.get(tx, ty - 1) === 'w', left = map.filled(tx - 1, ty), right = map.filled(tx + 1, ty), down = map.filled(tx, ty + 1);
  if (p.crystal && hash2(tx * 3, ty * 7) > 0.8) {
    const cx = x + 3 + ((hash2(tx, ty * 5) * 9) | 0), cy = y + 6 + ((hash2(tx * 9, ty) * 6) | 0);
    g.fillStyle = '#c9f6ff'; g.fillRect(cx, cy, 1, 3); g.fillRect(cx - 1, cy + 1, 3, 1);
  }
  g.fillStyle = p.neon || p.edge;
  if (!left) g.fillRect(x, y, 1, T);
  if (!right) g.fillRect(x + T - 1, y, 1, T);
  if (!down) g.fillRect(x, y + T - 1, T, 1);
  if (!up) {
    g.fillStyle = p.snow; g.fillRect(x, y, T, 5);
    g.fillStyle = p.snowH; g.fillRect(x, y, T, 1);
    g.fillStyle = p.snowS; g.fillRect(x, y + 5, T, 1);
    for (let i = 0; i < T; i++) {
      const d = hash2(tx * 16 + i, ty * 5);
      if (d > 0.62) { g.fillStyle = p.snow; g.fillRect(x + i, y + 5, 1, d > 0.85 ? 3 : 2); g.fillStyle = p.snowS; g.fillRect(x + i, y + (d > 0.85 ? 8 : 7), 1, 1); }
    }
    if (!left) { g.fillStyle = p.snow; g.fillRect(x - 1, y, 1, 4); }
    if (!right) { g.fillStyle = p.snow; g.fillRect(x + T, y, 1, 4); }
  }
}

function drawSlope(g, tx, ty, c, p) {
  const x = tx * T, y = ty * T;
  const rising = c === '/';
  for (let i = 0; i < T; i++) {
    const h = rising ? i + 1 : T - i;
    g.fillStyle = p.rock; g.fillRect(x + i, y + T - h, 1, h);
  }
  speckle(g, x, y, tx, ty, p, (px, py) => (rising ? py > T - px : py > px));
  for (let i = 0; i < T; i++) {
    const top = rising ? T - 1 - i : i;
    g.fillStyle = p.snowH; g.fillRect(x + i, y + top, 1, 1);
    g.fillStyle = p.snow; g.fillRect(x + i, y + top + 1, 1, 3);
    g.fillStyle = p.snowS; g.fillRect(x + i, y + top + 4, 1, 1);
  }
}

function drawIce(g, map, tx, ty, p) {
  const x = tx * T, y = ty * T;
  g.fillStyle = p.ice; g.fillRect(x, y, T, T);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 1, y + 1, T - 2, T - 2);
  g.fillStyle = p.iceL;
  for (let i = 0; i < 6; i++) g.fillRect(x + 3 + i, y + 9 - i, 1, 1);
  for (let i = 0; i < 3; i++) g.fillRect(x + 9 + i, y + 12 - i, 1, 1);
  if (!map.filled(tx, ty - 1)) { g.fillStyle = '#ffffff'; g.fillRect(x, y, T, 2); }
  g.fillStyle = 'rgba(10,13,36,0.5)';
  if (!map.filled(tx - 1, ty) || map.get(tx - 1, ty) !== '=') g.fillRect(x, y, 1, T);
  if (!map.filled(tx + 1, ty) || map.get(tx + 1, ty) !== '=') g.fillRect(x + T - 1, y, 1, T);
}

function drawGirder(g, tx, ty) {
  const x = tx * T, y = ty * T;
  g.fillStyle = '#0a0d24'; g.fillRect(x, y, T, 7);
  g.fillStyle = '#c23a4f'; g.fillRect(x, y, T, 6);
  g.fillStyle = '#e2566a'; g.fillRect(x, y, T, 1);
  g.fillStyle = '#7c1f30';
  for (let i = 0; i < 4; i++) { g.fillRect(x + i, y + 2 + i % 4, 1, 1); g.fillRect(x + 7 - i, y + 2 + i % 4, 1, 1); g.fillRect(x + 8 + i, y + 2 + i % 4, 1, 1); g.fillRect(x + 15 - i, y + 2 + i % 4, 1, 1); }
}

export function buildTileCanvas(map, theme = 'dawn') {
  const p = TILE_PAL[theme] || TILE_PAL.dawn;
  const [c, g] = makeCanvas(map.w * T, map.h * T);
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      const ch = map.get(tx, ty);
      if (ch === '#') drawGround(g, map, tx, ty, p);
      else if (ch === '/' || ch === '\\') drawSlope(g, tx, ty, ch, p);
      else if (ch === '=') drawIce(g, map, tx, ty, p);
      else if (ch === '-') drawGirder(g, tx, ty);
    }
  }
  return c;
}

/** Sprite 16x16 d'une tuile de roche isolée (faux murs, blocs). */
export function buildLooseTiles(theme = 'dawn') {
  const p = TILE_PAL[theme] || TILE_PAL.dawn;
  const [rock, g] = makeCanvas(T, T);
  const fake = { filled: () => true, get: () => '#' };
  drawGround(g, fake, 3, 3, p);
  const [crumble, g2] = makeCanvas(T, T);
  g2.fillStyle = '#0a0d24'; g2.fillRect(0, 0, T, T);
  g2.fillStyle = '#9fe6ff'; g2.fillRect(1, 1, T - 2, T - 2);
  g2.fillStyle = '#d8f7ff'; g2.fillRect(1, 1, T - 2, 2);
  g2.fillStyle = '#5fb8e0';
  const cracks = [[4, 3], [5, 4], [5, 5], [6, 6], [7, 6], [8, 7], [8, 8], [9, 9], [11, 4], [10, 5], [10, 6], [3, 10], [4, 11], [5, 11], [6, 12], [12, 11], [11, 12]];
  for (const [cx, cy] of cracks) g2.fillRect(cx, cy, 1, 1);
  g2.fillStyle = '#5fb8e0'; g2.fillRect(1, T - 3, T - 2, 2);
  return { rock, crumble };
}
