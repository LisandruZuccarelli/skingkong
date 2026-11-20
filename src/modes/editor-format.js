// Format des niveaux de l'éditeur (module pur, testé sous Node) : palette, code de partage, validation.
import { THEME_ORDER } from '../game/themes.js';
import { parseLevel } from '../game/tilemap.js';

export const EDITOR_H = 18;
export const PALETTE = [
  { ch: '#', name: 'SOL', col: '#4d6ad6' }, { ch: '=', name: 'GLACE', col: '#9fe8ff' }, { ch: '/', name: 'PENTE MONTANTE', col: '#4d6ad6' },
  { ch: '\\', name: 'PENTE DESCENDANTE', col: '#4d6ad6' }, { ch: '-', name: 'POUTRE', col: '#ffb020' }, { ch: 'x', name: 'GLACE FRIABLE', col: '#bff3ff' },
  { ch: 'w', name: 'EAU GLACEE', col: '#2f7fb0' }, { ch: 'H', name: 'FAUX MUR', col: '#3a4ab0' }, { ch: '$', name: 'FORFAIT', col: '#ffc83d' },
  { ch: '*', name: 'ETOILE', col: '#ffe066' }, { ch: '^', name: 'PICS', col: '#dfe6f2' }, { ch: 'S', name: 'RESSORT', col: '#ff4f5e' },
  { ch: 'e', name: 'BONHOMME DE NEIGE', col: '#ffffff' }, { ch: 'p', name: 'PINGOUIN', col: '#ff9a2a' }, { ch: 'o', name: 'HIBOU', col: '#c09070' },
  { ch: 'I', name: 'STALACTITE', col: '#bff3ff' }, { ch: 'C', name: 'DRAPEAU DE CONTROLE', col: '#5cff8a' }, { ch: 'L', name: 'LAMPADAIRE', col: '#fff3a0' },
  { ch: 'P', name: 'DEPART', col: '#7ee8ff' }, { ch: 'G', name: 'ARRIVEE', col: '#ffd23f' }, { ch: '.', name: 'GOMME', col: '#545e94' },
];
const ALLOWED = new Set(PALETTE.map((p) => p.ch));

// ---------- format de partage : SK1:<base64 de JSON avec lignes compressées> ----------
const rle = (row) => row.replace(/(.)\1{2,}/g, (m, c) => `${m.length}${c}`);
const unrle = (row) => row.replace(/(\d+)(\D)/g, (m, n, c) => c.repeat(+n));
export function encodeLevel(lv) {
  const json = JSON.stringify({ n: lv.name, t: lv.theme, r: lv.rows.map(rle) });
  return 'SK1:' + btoa(unescape(encodeURIComponent(json)));
}
export function decodeLevel(code) {
  const m = String(code || '').trim().match(/^SK1:([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error('code invalide (il doit commencer par SK1:)');
  let o;
  try { o = JSON.parse(decodeURIComponent(escape(atob(m[1])))); } catch (_) { throw new Error('code abime ou incomplet'); }
  const rows = (o.r || []).map(unrle);
  if (rows.length !== EDITOR_H) throw new Error('code invalide (hauteur)');
  const w = rows[0].length;
  if (w < 20 || w > 600 || rows.some((r) => r.length !== w)) throw new Error('code invalide (largeur)');
  if (rows.some((r) => [...r].some((c) => !ALLOWED.has(c)))) throw new Error('code invalide (tuile inconnue)');
  return { name: String(o.n || 'Niveau partage').slice(0, 24), theme: THEME_ORDER.includes(o.t) ? o.t : 'dawn', rows };
}
/** Problème bloquant pour tester / partager, ou null */
export function checkLevel(lv) {
  const all = lv.rows.join('');
  const p = (all.match(/P/g) || []).length;
  if (p !== 1) return p ? 'il faut un seul depart' : 'place un DEPART (P)';
  if (!all.includes('G')) return 'place une ARRIVEE (G)';
  try { parseLevel(toLevelData(lv)); } catch (e) { return e.message; }
  return null;
}
export function toLevelData(lv) {
  return { id: 'CUSTOM', label: 'MON NIVEAU', name: lv.name, theme: lv.theme, height: EDITOR_H, parTime: 60, chunks: [lv.rows.join('\n')], signs: [] };
}
export function blankLevel(w = 80) {
  const rows = [];
  for (let y = 0; y < EDITOR_H; y++) rows.push((y >= 15 ? '#' : '.').repeat(w));
  const set = (x, y, c) => { rows[y] = rows[y].slice(0, x) + c + rows[y].slice(x + 1); };
  set(2, 14, 'P'); set(w - 4, 14, 'G');
  return { name: 'Ma piste', theme: 'dawn', rows };
}

