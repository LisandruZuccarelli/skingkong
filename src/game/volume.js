// Réglage du son (menu pause et options) : une ligne par canal avec bouton ON/OFF, « - », jauge et « + ».
// Clavier / manette : ←/→ baissent ou montent (sans retour à 0), SAUT/ENTREE coupe ou rallume.
// Tactile / souris : toucher le nom ou ON/OFF coupe, « - » / « + » règlent, toucher la jauge place le niveau.
import { drawText } from '../engine/font.js';

const ON_KEY = { musicVol: 'musicOn', sfxVol: 'sfxOn' };
const SEG = 10, SEG_W = 4;
const BAR_W = SEG * (SEG_W + 1) - 1;

export const soundOn = (s, key) => s[ON_KEY[key]] !== false;

function feedback(g, key) { g.audio.play(key === 'sfxVol' ? 'coin' : 'move'); }

/** Monte ou baisse d'un cran (bornes 0 et 100 %, pas de retour à 0). Monter rallume un canal coupé. */
export function stepVolume(g, key, d) {
  const s = g.settings;
  if (d > 0 && !soundOn(s, key)) s[ON_KEY[key]] = true;
  s[key] = Math.min(1, Math.max(0, Math.round((s[key] + d * 0.1) * 10) / 10));
  if (d > 0 && s[key] === 0) s[key] = 0.1;
  g.applyVolumes(); g.persist(); feedback(g, key);
}

export function setVolume(g, key, v) {
  const s = g.settings;
  s[key] = Math.min(1, Math.max(0, Math.round(v * 10) / 10));
  s[ON_KEY[key]] = s[key] > 0;
  g.applyVolumes(); g.persist(); feedback(g, key);
}

/** Coupe / rallume le canal (le niveau réglé est gardé). */
export function toggleSound(g, key) {
  const s = g.settings;
  s[ON_KEY[key]] = !soundOn(s, key);
  if (soundOn(s, key) && s[key] === 0) s[key] = 0.5;
  g.applyVolumes(); g.persist();
  if (soundOn(s, key)) feedback(g, key);
}

function zones(x, w, y) {
  const plus = x + w - 12, bar = plus - 3 - BAR_W, minus = bar - 13, chip = minus - 28;
  return { chip: [chip, y - 3, 26, 13], minus: [minus, y - 3, 12, 13], bar: [bar, y - 3, BAR_W, 13], plus: [plus, y - 3, 12, 13], label: [x, y - 3, chip - x, 13] };
}

/** Dessine la ligne ; x, w : bord gauche et largeur de la zone de sélection. */
export function drawVolumeRow(ctx, g, key, label, x, w, y, sel) {
  const s = g.settings, on = soundOn(s, key), z = zones(x, w, y);
  const dim = sel ? '#ffffff' : '#9fb2ea';
  drawText(ctx, (sel ? '> ' : '') + label, x + 4, y, { color: dim, outline: '#0a0d24' });
  // ON / OFF
  const [cx, cy, cw, ch] = z.chip;
  ctx.fillStyle = on ? '#2e9e5b' : '#7a2638';
  ctx.fillRect(cx, cy + 1, cw, ch - 2);
  drawText(ctx, on ? 'ON' : 'OFF', cx + cw / 2, y, { align: 'center', color: '#ffffff', shadow: null });
  // - jauge +
  drawText(ctx, '-', z.minus[0] + 6, y, { align: 'center', color: on && s[key] > 0 ? dim : '#545e94' });
  drawText(ctx, '+', z.plus[0] + 6, y, { align: 'center', color: s[key] < 1 || !on ? dim : '#545e94' });
  const n = Math.round(s[key] * SEG);
  for (let i = 0; i < SEG; i++) {
    ctx.fillStyle = i < n ? (on ? '#ffc83d' : '#545e94') : 'rgba(159,178,234,0.25)';
    const hgt = 3 + Math.round(i * 0.5);
    ctx.fillRect(z.bar[0] + i * (SEG_W + 1), y + 7 - hgt, SEG_W, hgt);
  }
}

/** Gère les taps sur la ligne ; renvoie vrai si un tap l'a touchée. */
export function tapVolumeRow(g, key, x, w, y) {
  const inp = g.input, z = zones(x, w, y);
  const hit = (r) => inp.tapIn(r[0], r[1], r[2], r[3]);
  if (hit(z.minus)) stepVolume(g, key, -1);
  else if (hit(z.plus)) stepVolume(g, key, 1);
  else if (hit(z.bar)) {
    const t = inp.taps.find((p) => p.x >= z.bar[0] && p.x <= z.bar[0] + z.bar[2]);
    setVolume(g, key, Math.min(SEG, Math.floor((t.x - z.bar[0]) / (SEG_W + 1)) + 1) / SEG);
  } else if (hit(z.chip) || hit(z.label)) toggleSound(g, key);
  else return false;
  return true;
}
