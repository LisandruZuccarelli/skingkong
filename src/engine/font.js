// Police bitmap 5x7 générée par code (aucun asset externe).
import { makeCanvas } from './util.js';

const RAW = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110', D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110', J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 10001 11001 10101 10011 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111', 3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110', 9: '01110 10001 10001 01111 00001 00010 01100',
  '.': '00000 00000 00000 00000 00000 01100 01100', ',': '00000 00000 00000 00000 01100 00100 01000',
  '!': '00100 00100 00100 00100 00100 00000 00100', '?': '01110 10001 00001 00010 00100 00000 00100',
  ':': '00000 01100 01100 00000 01100 01100 00000', "'": '00100 00100 01000 00000 00000 00000 00000',
  '-': '00000 00000 00000 11111 00000 00000 00000', '+': '00000 00100 00100 11111 00100 00100 00000',
  '/': '00001 00010 00010 00100 01000 01000 10000', '(': '00010 00100 01000 01000 01000 00100 00010',
  ')': '01000 00100 00010 00010 00010 00100 01000', '=': '00000 00000 11111 00000 11111 00000 00000',
  '*': '00000 00100 10101 01110 10101 00100 00000', '<': '00010 00100 01000 10000 01000 00100 00010',
  '>': '01000 00100 00010 00001 00010 00100 01000', '%': '11001 11010 00010 00100 01000 01011 10011',
  '#': '01010 11111 01010 01010 11111 01010 00000', '|': '00100 00100 00100 00100 00100 00100 00100',
  '_': '00000 00000 00000 00000 00000 00000 11111', '"': '01010 01010 00000 00000 00000 00000 00000',
  '←': '00000 00100 01000 11111 01000 00100 00000', '→': '00000 00100 00010 11111 00010 00100 00000',
  '↑': '00100 01110 10101 00100 00100 00100 00000', '↓': '00000 00100 00100 00100 10101 01110 00100',
  '★': '00100 00100 11111 01110 01110 11011 00000', '♥': '00000 01010 11111 11111 01110 00100 00000',
  '·': '00000 00000 00000 00100 00000 00000 00000', '&': '01100 10010 10100 01000 10101 10010 01101', 'x': '00000 00000 10001 01010 00100 01010 10001',
};
const GLYPHS = {};
for (const [ch, s] of Object.entries(RAW)) GLYPHS[ch] = s.split(' ').map((r) => [...r].map((b) => b === '1'));

/** Vrai si tous les caractères (après normalisation) ont un dessin dans la police. */
export function missingGlyphs(text) { return [...new Set([...normalize(text)].filter((c) => c !== ' ' && !GLYPHS[c]))]; }

export const CHAR_W = 6;
export const LINE_H = 9;

export function normalize(text) {
  return String(text)
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE').replace(/ß/g, 'ss')
    .replace(/[«»“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...').replace(/[–—]/g, '-')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[a-wyz]/g, (c) => c.toUpperCase());
}

export function measure(text, scale = 1) {
  const t = normalize(text);
  return Math.max(0, t.length * CHAR_W - 1) * scale;
}

const cache = new Map();
function render(text, color, shadow) {
  const key = text + '\u0000' + color + '\u0000' + shadow;
  let c = cache.get(key);
  if (c) return c;
  const t = normalize(text);
  const [cv, g] = makeCanvas(Math.max(1, t.length * CHAR_W), 8);
  const paint = (col, oy) => {
    g.fillStyle = col;
    for (let i = 0; i < t.length; i++) {
      const gl = GLYPHS[t[i]];
      if (!gl) continue;
      for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (gl[y][x]) g.fillRect(i * CHAR_W + x, y + oy, 1, 1);
    }
  };
  if (shadow) paint(shadow, 1);
  paint(color, 0);
  if (cache.size > 400) cache.clear();
  cache.set(key, cv);
  return cv;
}

/**
 * Dessine du texte pixel. opts: scale, color, shadow, align ('left'|'center'|'right'), alpha, outline
 */
export function drawText(ctx, text, x, y, opts = {}) {
  const { scale = 1, color = '#ffffff', shadow = '#0a0d24', align = 'left', alpha = 1, outline = null } = opts;
  const ow = opts.outlineWidth ?? scale;
  if (text === '' || text == null) return 0;
  const w = measure(text, scale);
  let dx = x;
  if (align === 'center') dx = x - w / 2;
  else if (align === 'right') dx = x - w;
  dx = Math.round(dx);
  const dy = Math.round(y);
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  if (outline) {
    const o = render(text, outline, null);
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]])
      ctx.drawImage(o, dx + ox * ow, dy + oy * ow, o.width * scale, o.height * scale);
  }
  const c = render(text, color, outline ? null : shadow);
  ctx.drawImage(c, dx, dy, c.width * scale, c.height * scale);
  ctx.globalAlpha = prev;
  return w;
}

/** Découpe un texte en lignes de maxChars caractères. */
export function wrap(text, maxChars) {
  const words = normalize(text).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}
