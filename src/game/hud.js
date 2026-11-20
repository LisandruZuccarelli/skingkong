// Interface : HUD, contrôles tactiles, bannières, bulles de panneaux, pause, résultats, debug.
import { drawText, wrap, measure } from '../engine/font.js';
import { levelShort, levelLong } from './labels.js';
import { formatTime } from '../engine/util.js';

const INK = '#0a0d24';

export function panel(ctx, x, y, w, h, fill = 'rgba(10,13,36,0.82)', border = '#7ee8ff') {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  ctx.fillStyle = INK;
  ctx.fillRect(x + 1, y - 1, w - 2, h + 2);
  ctx.fillRect(x - 1, y + 1, w + 2, h - 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = border;
  ctx.fillRect(x + 2, y, w - 4, 1);
  ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
  ctx.fillRect(x, y + 2, 1, h - 4);
  ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
}

function drawBossBar(ctx, lvl, v) {
  const b = lvl.boss;
  const w = 180, x = v.w / 2 - w / 2, y = v.h - 26;
  panel(ctx, x, y, w, 20, 'rgba(10,13,36,0.85)', b.vulnerable ? '#ffe066' : '#ff4f5e');
  drawText(ctx, b.name, v.w / 2, y + 3, { align: 'center', color: '#ffffff' });
  const seg = (w - 12) / b.maxHp;
  for (let i = 0; i < b.maxHp; i++) {
    const on = i < b.hp;
    const gap = (i + 1) % b.perPhase === 0 && i + 1 < b.maxHp ? 2 : 1;
    ctx.fillStyle = on ? (b.inv > 0 && Math.floor(lvl.game.time * 16) % 2 ? '#ffffff' : '#ff4f5e') : '#3a3f70';
    ctx.fillRect(Math.round(x + 6 + i * seg), y + 13, Math.max(1, Math.round(seg - gap)), 4);
  }
}

export function drawHUD(ctx, lvl, v) {
  const s = lvl.sprites;
  if (lvl.boss) {
    // boss : pas de forfaits à ramasser, mais la barre de vie du boss
    if (!lvl.boss.defeated || lvl.boss.stT < 1) drawBossBar(ctx, lvl, v);
    if (lvl.deaths > 0) { panel(ctx, 6, 6, 40, 18); drawText(ctx, `♥ ${lvl.deaths}`, 12, 10, { color: '#ff9aa5' }); }
  } else {
  panel(ctx, 6, 6, 74, 30);
  ctx.drawImage(s.pass, 11, 10);
  const pulse = lvl.comboT > 0.9 ? 2 : 1;
  const ctxt = lvl.data.endless ? `${lvl.coins}` : `${lvl.coins}/${lvl.totalCoins}`;
  drawText(ctx, ctxt, 25, 10, { color: !lvl.data.endless && lvl.coins >= lvl.totalCoins ? '#ffc83d' : '#ffffff', scale: 1 });
  if (pulse > 1) drawText(ctx, ctxt, 25, 10, { color: '#ffffff', alpha: 0.5 });
  for (let i = 0; i < lvl.totalStars; i++) {
    const img = lvl.stars[i] ? s.star : s.starGrey;
    ctx.drawImage(img, 11 + i * 14, 21);
  }
  }
  const tw = 70;
  panel(ctx, v.w - tw - 6, 6, tw, 30);
  const under = lvl.time <= lvl.data.parTime;
  drawText(ctx, formatTime(lvl.time), v.w - 11, 10, { align: 'right', color: lvl.timerOn ? (under ? '#ffffff' : '#ff9aa5') : '#9fb2ea' });
  if (lvl.assisted) drawText(ctx, 'ASSISTE', v.w - 11, 40, { align: 'right', color: '#7ee8ff', outline: '#0a0d24' });
  if (!lvl.data.endless) drawText(ctx, `CIBLE ${formatTime(lvl.data.parTime).slice(0, 4)}`, v.w - 11, 22, { align: 'right', color: '#7f8cc8' });
  if (lvl.deaths > 0 && !lvl.boss) drawText(ctx, `♥ ${lvl.deaths}`, 84, 10, { color: '#ff9aa5' });
  if (lvl.totalKeys) { ctx.drawImage(s.key, 84, 22); drawText(ctx, `X${lvl.keys}`, 98, 22, { color: '#ffd23f' }); }
}

export function touchLayout(v) {
  return [
    { action: 'left', x: 40, y: v.h - 40, r: 32, label: '←' },
    { action: 'right', x: 108, y: v.h - 40, r: 32, label: '→' },
    { action: 'down', x: 74, y: v.h - 96, r: 22, label: '↓' },
    { action: 'jump', x: v.w - 48, y: v.h - 46, r: 38, label: 'A' },
    { action: 'pause', x: v.w / 2, y: 16, r: 14, label: '||' },
  ];
}

export function drawTouchControls(ctx, btns, input) {
  for (const b of btns) {
    const on = input.held[b.action];
    ctx.globalAlpha = on ? 0.55 : 0.28;
    ctx.fillStyle = on ? '#7ee8ff' : '#0a0d24';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (b.action === 'pause' ? 1 : 0.82), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = on ? 0.9 : 0.5;
    ctx.strokeStyle = '#dbe8ff'; ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    drawText(ctx, b.label, b.x + 1, b.y - (b.action === 'jump' ? 7 : 3), { align: 'center', scale: b.action === 'jump' ? 2 : 1, color: '#ffffff' });
  }
  ctx.globalAlpha = 1;
}

export function drawBanners(ctx, lvl, v) {
  let y = 52;
  for (const b of lvl.banners) {
    const tin = Math.min(1, b.t / 0.25);
    const tout = Math.min(1, (b.dur - b.t) / 0.3);
    const k = Math.min(tin, tout);
    const ease = 1 - Math.pow(1 - k, 3);
    const scale = b.big ? 3 : 1;
    const w = Math.max(measure(b.title, scale), b.sub ? measure(b.sub, 1) : 0) + 24;
    const h = b.big ? 46 : b.sub ? 30 : 18;
    const x = v.w / 2 - w / 2;
    const yy = y - (1 - ease) * 30;
    ctx.globalAlpha = ease;
    panel(ctx, x, yy, w, h, 'rgba(10,13,36,0.85)', b.big ? '#ffc83d' : '#7ee8ff');
    drawText(ctx, b.title, v.w / 2, yy + 6, { align: 'center', scale, color: b.big ? '#ffc83d' : '#ffffff' });
    if (b.sub) drawText(ctx, b.sub, v.w / 2, yy + h - 13, { align: 'center', color: '#cfe0ff' });
    ctx.globalAlpha = 1;
    y += h + 6;
  }
}

export function drawSignBubble(ctx, sign) {
  const lines = wrap(sign.text, 26);
  const w = Math.max(...lines.map((l) => measure(l))) + 12;
  const h = lines.length * 9 + 9;
  const k = sign.show;
  const ease = 1 - Math.pow(1 - k, 3);
  const cx = sign.x + 7;
  const x = cx - w / 2;
  const y = sign.y - h - 10 + (1 - ease) * 6;
  ctx.globalAlpha = ease;
  panel(ctx, x, y, w, h, 'rgba(255,248,225,0.96)', '#ffc83d');
  ctx.fillStyle = INK;
  ctx.fillRect(Math.round(cx) - 3, Math.round(y + h), 7, 1);
  ctx.fillStyle = 'rgba(255,248,225,0.96)';
  ctx.fillRect(Math.round(cx) - 2, Math.round(y + h - 1), 5, 2);
  ctx.fillRect(Math.round(cx) - 1, Math.round(y + h + 1), 3, 2);
  lines.forEach((l, i) => drawText(ctx, l, cx, y + 5 + i * 9, { align: 'center', color: INK, shadow: null }));
  ctx.globalAlpha = 1;
}

/** Disposition du menu pause (partagée entre l'affichage et la détection tactile). */
export function pauseLayout(n, v) {
  const step = Math.min(18, Math.floor((v.h - 92) / n));
  const h = n * step + 62;
  const top = Math.round(v.h / 2 - h / 2);
  return { step, h, top, itemY: (i) => top + 52 + i * step };
}

export function drawPause(ctx, lvl, v) {
  ctx.fillStyle = 'rgba(10,13,36,0.65)';
  ctx.fillRect(0, 0, v.w, v.h);
  const items = lvl.pauseItems();
  // panneau centré verticalement, interligne resserré si l'écran est bas
  const { h, top, itemY } = pauseLayout(items.length, v);
  panel(ctx, v.w / 2 - 100, top, 200, h);
  drawText(ctx, 'PAUSE', v.w / 2, top + 8, { align: 'center', scale: 2, color: '#ffc83d' });
  // niveau en cours
  const d = lvl.data;
  const where = d.id ? levelLong(d.id) : '';
  drawText(ctx, where, v.w / 2, top + 26, { align: 'center', color: '#7ee8ff' });
  drawText(ctx, (d.name || '').toUpperCase(), v.w / 2, top + 36, { align: 'center', color: '#ffffff' });
  items.forEach((it, i) => {
    const y = itemY(i);
    const sel = i === lvl.pauseIndex;
    if (sel) { ctx.fillStyle = 'rgba(126,232,255,0.18)'; ctx.fillRect(v.w / 2 - 90, y - 4, 180, 15); }
    const bounce = sel ? Math.round(Math.sin(lvl.game.time * 8)) : 0;
    drawText(ctx, (sel ? '> ' : '') + it.label, v.w / 2 + bounce, y, { align: 'center', color: sel ? '#ffffff' : '#9fb2ea' });
  });
}

export function drawResults(ctx, lvl, v) {
  const r = lvl.results;
  const t = lvl.stateT - 1.4;
  const k = Math.min(1, t / 0.35);
  const ease = 1 - Math.pow(1 - k, 3);
  ctx.fillStyle = `rgba(10,13,36,${0.55 * ease})`;
  ctx.fillRect(0, 0, v.w, v.h);
  const prompt = lvl.game.input.touchMode ? 'TOUCHE : NIVEAU SUIVANT' : 'SAUT : SUITE   R : REJOUER   ECHAP : CARTE';
  // le cadre s'élargit toujours assez pour contenir la ligne d'aide
  const cprompt = r.prompt || (lvl.game.input.touchMode ? 'TOUCHE : CONTINUER' : 'SAUT : CONTINUER   R : REJOUER   ECHAP : MENU');
  // modes bonus : chaque ligne prend la hauteur de sa taille de texte, le cadre s'adapte au contenu
  const lineH = (sc) => (sc || 1) * 8 + 6;
  const body = r.custom ? (r.lines || []).reduce((a, l) => a + lineH(l[2]), 0) + (r.online ? 14 : 0) : 0;
  const titleText = r.title || (lvl.boss ? 'VICTOIRE !' : 'ARRIVEE !');
  const widest = r.custom ? Math.max(measure(cprompt), measure(titleText) * 2, measure(`${lvl.label} : ${lvl.data.name.toUpperCase()}`), ...(r.lines || []).map(([t, , sc]) => measure(t) * (sc || 1))) : measure(prompt);
  const w = Math.min(v.w - 8, Math.max(240, widest + 24)), h = r.custom ? Math.max(120, 44 + body + 26) : 176;
  const x = v.w / 2 - w / 2;
  const y = v.h / 2 - h / 2 + (1 - ease) * 40;
  ctx.globalAlpha = ease;
  panel(ctx, x, y, w, h, 'rgba(14,22,80,0.95)', '#ffc83d');
  drawText(ctx, titleText, v.w / 2, y + 8, { align: 'center', scale: 2, color: r.titleColor || '#ffc83d' });
  drawText(ctx, `${lvl.label} : ${lvl.data.name.toUpperCase()}`, v.w / 2, y + 26, { align: 'center', color: '#9fb2ea' });
  if (r.custom) {
    // modes bonus : lignes libres
    let yy = y + 42;
    for (const [txt, col, sc] of r.lines || []) { drawText(ctx, txt, v.w / 2, yy, { align: 'center', color: col || '#ffffff', scale: sc || 1 }); yy += lineH(sc); }
    if (r.online) drawText(ctx, r.online.msg, v.w / 2, yy + 2, { align: 'center', color: '#7ee8ff' });
    if (t > 0.6 && Math.sin(lvl.game.time * 6) > -0.3) drawText(ctx, cprompt, v.w / 2, y + h - 16, { align: 'center', color: '#ffffff' });
    drawShareButton(ctx, lvl, v, y + h + 5);
    ctx.globalAlpha = 1;
    return;
  }
  for (let i = 0; i < 3; i++) {
    const shown = i < lvl.ratingShown;
    const img = shown ? lvl.sprites.star : lvl.sprites.starGrey;
    const sx = v.w / 2 - 34 + i * 26;
    const pop = shown ? 2 : 2;
    ctx.drawImage(img, sx, y + 40, img.width * pop, img.height * pop);
  }
  const rows = lvl.boss ? [
    ['VAINCRE LE BOSS', true],
    ['SANS AUCUNE CHUTE', r.deaths === 0],
    [`TEMPS ${formatTime(r.time)} (CIBLE ${formatTime(lvl.data.parTime).slice(0, 4)})`, r.underPar],
  ] : [
    ['TERMINER LE NIVEAU', true],
    [`FORFAITS ${r.coins}/${lvl.totalCoins} + ETOILES ${lvl.stars.filter(Boolean).length}/${lvl.totalStars}`, r.allCoins && r.allStars],
    [`TEMPS ${formatTime(r.time)} (CIBLE ${formatTime(lvl.data.parTime).slice(0, 4)})`, r.underPar],
  ];
  rows.forEach(([label, done], i) => {
    const yy = y + 72 + i * 13;
    drawText(ctx, done ? '★' : '·', x + 14, yy, { color: done ? '#ffc83d' : '#545e94' });
    drawText(ctx, label, x + 26, yy, { color: done ? '#ffffff' : '#7f8cc8' });
  });
  drawText(ctx, `CHUTES : ${r.deaths}`, x + 26, y + 116, { color: '#cfe0ff' });
  if (r.earned !== undefined) drawText(ctx, `+${r.earned} FORFAITS  (TOTAL ${lvl.game.progress.wallet})`, x + w - 14, y + 116, { align: 'right', color: '#ffc83d' });
  if (r.newRecord && r.prevTime !== null) drawText(ctx, 'NOUVEAU RECORD !', v.w / 2, y + 132, { align: 'center', color: lvl.game.time % 0.5 < 0.25 ? '#ffc83d' : '#ffffff' });
  else if (r.prevTime !== null) drawText(ctx, `RECORD : ${formatTime(r.prevTime)}`, v.w / 2, y + 132, { align: 'center', color: '#9fb2ea' });
  if (r.online) drawText(ctx, r.online.msg, v.w / 2, y + 144, { align: 'center', color: r.online.rank === 1 ? '#ffd23f' : '#7ee8ff' });
  if (t > 0.6) {
    const blink = Math.sin(lvl.game.time * 6) > -0.3;
    if (blink) drawText(ctx, prompt, v.w / 2, y + h - 18, { align: 'center', color: '#ffffff' });
  }
  drawShareButton(ctx, lvl, v, y + h + 5);
  ctx.globalAlpha = 1;
}

/** Bouton « partager mon score » sous le cadre des résultats (la zone sert aussi au tactile). */
function drawShareButton(ctx, lvl, v, y) {
  if (!lvl.canShare()) { lvl.shareBtn = null; return; }
  const touch = lvl.game.input.touchMode;
  const label = lvl.shareMsg || (touch ? 'PARTAGER MON SCORE' : 'X : PARTAGER MON SCORE');
  const w = measure(label) + 20, h = 15;
  const by = Math.min(y, v.h - h - 3), x = v.w / 2 - w / 2;
  lvl.shareBtn = { x, y: by, w, h };
  panel(ctx, x, by, w, h, 'rgba(255,200,61,0.92)', '#0a0d24');
  drawText(ctx, label, v.w / 2, by + 4, { align: 'center', color: '#0a0d24', shadow: null });
}

/** Écran de chute : phrase « brainrot » (le SKI en couleurs) ; contre un boss, invite à relancer le combat. */
export function drawDeath(ctx, lvl, v) {
  const t = lvl.player.deadT;
  const text = lvl.deathPhrase;
  const k = Math.min(1, t / 0.18);
  ctx.fillStyle = `rgba(10,13,36,${(lvl.boss ? 0.45 : 0.25) * k})`;
  ctx.fillRect(0, 0, v.w, v.h);
  const scale = text.length > 16 ? 2 : 3;
  const pop = t < 0.18 ? 1 + (0.18 - t) * 3 : 1; // arrive en zoomant
  const sc = Math.round(scale * pop);
  const cw = 6 * sc;
  const w = text.length * cw;
  let x = Math.round(v.w / 2 - w / 2);
  const y = Math.round(v.h * 0.36 - 4 * sc + Math.sin(t * 10) * (t < 0.5 ? 2 : 0));
  const ski = text.indexOf('SKI');
  const RAINBOW = ['#ff4f5e', '#ffc83d', '#7ee8ff', '#ff4fd8', '#5cff8a'];
  for (let i = 0; i < text.length; i++) {
    const inSki = i >= ski && i < ski + 3;
    const color = inSki ? RAINBOW[(Math.floor(t * 12) + i) % RAINBOW.length] : '#ffffff';
    const wob = inSki ? Math.round(Math.sin(t * 14 + i) * sc * 0.6) : 0;
    drawText(ctx, text[i], x + cw / 2, y + wob, { align: 'center', scale: sc, color, outline: INK });
    x += cw;
  }
  if (lvl.boss && t > 0.7 && Math.sin(lvl.game.time * 6) > -0.3) {
    const msg = lvl.game.input.touchMode ? 'TOUCHE L\'ECRAN POUR REPRENDRE LE COMBAT' : 'SAUT / ENTREE : REPRENDRE LE COMBAT';
    drawText(ctx, msg, v.w / 2, y + 8 * sc + 14, { align: 'center', color: '#ffc83d', outline: INK });
  }
}

export function drawDebug(ctx, lvl, v) {
  const p = lvl.player;
  const g = lvl.game;
  const lines = [
    `FPS ${g.fps.toFixed(0)}  DT ${(g.lastDt * 1000).toFixed(1)}MS`,
    `POS ${p.x.toFixed(1)} ${p.y.toFixed(1)}  VEL ${p.vx.toFixed(0)} ${p.vy.toFixed(0)}`,
    `SOL ${p.grounded ? 1 : 0} PENTE ${p.slopeDir} MUR ${p.wallDir} GLACE ${p.onIce ? 1 : 0} GLISSE ${p.sliding ? 1 : 0}`,
    `COYOTE ${p.coyote.toFixed(2)} BUFFER ${p.buffer.toFixed(2)} 2X ${p.canDouble ? 1 : 0}`,
    `PARTICULES ${lvl.particles.count}  ENTITES ${lvl.entities.length}  ZOOM ${lvl.camera.zoom.toFixed(2)}`,
    'CLIC : TELEPORTATION   F3 : MASQUER',
  ];
  panel(ctx, 4, v.h - lines.length * 9 - 10, 250, lines.length * 9 + 6, 'rgba(0,0,0,0.75)', '#00ff88');
  lines.forEach((l, i) => drawText(ctx, l, 8, v.h - lines.length * 9 - 6 + i * 9, { color: '#00ff88' }));
}
