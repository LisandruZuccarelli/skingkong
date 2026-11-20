// Écrans de menu : boutique, succès, défis et série, options (volumes, effets, commandes remappables).
import { Background } from './background.js';
import { drawText, measure, wrap } from '../engine/font.js';
import { panel } from './hud.js';
import { CATEGORIES, SKINS, drawHatRows, findItem } from './catalog.js';
import { ACHIEVEMENTS, dayIndex, streakReward } from './progress.js';
import { buildKong } from '../engine/sprites.js';
import { DEFAULT_BINDINGS } from '../engine/input.js';
import { Particles } from '../engine/particles.js';

const INK = '#0a0d24';
const kongCache = new Map();
export function kongFor(skinId) {
  if (!kongCache.has(skinId)) kongCache.set(skinId, buildKong((SKINS.find((s) => s.id === skinId) || SKINS[0]).pal));
  return kongCache.get(skinId);
}

/** Petite icône pixel (trophée, drapeau, flamme, forfait, cadenas) */
export function drawIcon(ctx, kind, x, y, on = true) {
  const c = on ? '#ffd23f' : '#545e94', d = on ? '#b07a10' : '#3a3f70';
  const R = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x + a), Math.round(y + b), w, h); };
  if (kind === 'trophy') { R(1, 0, 8, 1, INK); R(0, 1, 10, 4, INK); R(1, 1, 8, 3, c); R(3, 4, 4, 2, INK); R(4, 4, 2, 2, d); R(2, 6, 6, 2, INK); R(3, 6, 4, 1, c); R(2, 1, 1, 2, '#ffffff'); }
  else if (kind === 'flag') { R(1, 0, 1, 9, INK); R(2, 0, 6, 5, INK); R(2, 1, 5, 3, on ? '#ff4f5e' : c); }
  else if (kind === 'flame') { R(3, 0, 2, 2, '#ffd23f'); R(2, 2, 4, 3, '#ff8a2a'); R(1, 4, 6, 4, '#ff4f5e'); R(3, 5, 2, 2, '#ffd23f'); }
  else if (kind === 'lock') { R(2, 0, 5, 1, '#7f8cc8'); R(1, 1, 1, 3, '#7f8cc8'); R(7, 1, 1, 3, '#7f8cc8'); R(0, 4, 9, 5, INK); R(1, 5, 7, 3, '#7f8cc8'); R(4, 6, 1, 1, INK); }
  else if (kind === 'coin') { R(0, 1, 10, 7, INK); R(1, 2, 8, 5, '#ffc83d'); R(2, 3, 3, 3, '#ffffff'); R(6, 3, 2, 1, '#2f6bff'); }
}

/** Base commune : fond animé, en-tête, porte-monnaie, bouton retour, aide en bas. */
export class MenuScene {
  constructor(game, title, theme = 'night') {
    this.game = game;
    this.title = title;
    this.bg = new Background(theme);
    this.cam = { x: 0, y: 160 };
    this.t = 0;
    game.music.play('title');
  }
  back() { this.game.audio.play('pause'); this.game.gotoTitle(); }
  baseUpdate(dt) {
    const g = this.game, inp = g.input;
    this.t += dt;
    this.cam.x += 14 * dt;
    this.bg.update(dt);
    if (inp.pressed.pause || inp.tapIn(4, 4, 70, 22)) { this.back(); return false; }
    return true;
  }
  drawFrame(ctx, help) {
    const g = this.game, v = g.view;
    ctx.setTransform(v.scale, 0, 0, v.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    this.bg.draw(ctx, this.cam, v);
    ctx.fillStyle = 'rgba(8,10,30,0.55)'; ctx.fillRect(0, 0, v.w, v.h);
    panel(ctx, 4, 4, 70, 18, 'rgba(10,13,36,0.85)', '#7ee8ff');
    drawText(ctx, '< RETOUR', 39, 9, { align: 'center', color: '#ffffff' });
    drawText(ctx, this.title, v.w / 2, 8, { align: 'center', scale: 2, color: '#ffc83d', outline: INK });
    const w = g.progress.wallet;
    const txt = String(w);
    const pw = measure(txt) + 30;
    panel(ctx, v.w - pw - 4, 4, pw, 18, 'rgba(10,13,36,0.85)', '#ffc83d');
    drawIcon(ctx, 'coin', v.w - pw + 2, 8);
    drawText(ctx, txt, v.w - 10, 9, { align: 'right', color: '#ffc83d' });
    if (help) drawText(ctx, g.input.touchMode ? help.touch : help.keys, v.w / 2, v.h - 11, { align: 'center', color: '#9fb2ea', outline: INK });
  }
}

// ---------------------------------------------------------------------------
// Boutique
// ---------------------------------------------------------------------------
export class ShopScene extends MenuScene {
  constructor(game) {
    super(game, 'BOUTIQUE', 'dawn');
    this.cat = 0; this.index = 0; this.scroll = 0;
    this.confirm = false; this.flashT = 0; this.msg = null;
    this.parts = new Particles(200);
    this.fxT = 0;
    this.selectEquipped();
  }
  get category() { return CATEGORIES[this.cat]; }
  get item() { return this.category.items[this.index]; }
  selectEquipped() {
    const eq = this.game.progress.save.equip[this.category.id];
    this.index = Math.max(0, this.category.items.findIndex((i) => i.id === eq));
    this.scroll = Math.max(0, this.index - 3);
  }
  layout() {
    const v = this.game.view;
    const listX = Math.max(v.w * 0.42, 190), listW = Math.min(250, v.w - listX - 8);
    const rowH = 18, top = 52, rows = Math.max(3, Math.floor((v.h - top - 64) / rowH));
    return { listX, listW, rowH, top, rows, prevX: listX / 2, tabY: 28 };
  }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const g = this.game, inp = g.input, pr = g.progress;
    this.flashT = Math.max(0, this.flashT - dt);
    if (this.msg) { this.msg.t -= dt; if (this.msg.t <= 0) this.msg = null; }
    this.parts.update(dt);
    const L = this.layout();
    const n = this.category.items.length;
    const move = (d) => { this.index = (this.index + d + n) % n; this.confirm = false; g.audio.play('move'); };
    const tab = (d) => { this.cat = (this.cat + d + CATEGORIES.length) % CATEGORIES.length; this.confirm = false; this.selectEquipped(); g.audio.play('move'); };
    if (inp.pressed.down) move(1);
    if (inp.pressed.up && !inp.pressed.confirm) move(-1);
    if (inp.pressed.right) tab(1);
    if (inp.pressed.left) tab(-1);
    // tactile : onglets, lignes, bouton d'action
    const tabs = this.tabRects();
    tabs.forEach((r, i) => { if (inp.tapIn(r.x, r.y, r.w, r.h) && i !== this.cat) { this.cat = i; this.confirm = false; this.selectEquipped(); g.audio.play('move'); } });
    let act = inp.pressed.confirm || (inp.pressed.jump && !inp.held.up);
    for (let r = 0; r < L.rows; r++) {
      const i = this.scroll + r;
      if (i >= n) break;
      if (inp.tapIn(L.listX, L.top + r * L.rowH, L.listW, L.rowH - 2)) { if (i === this.index) act = true; else { this.index = i; this.confirm = false; g.audio.play('move'); } }
    }
    const btn = this.buttonRect();
    if (inp.tapIn(btn.x, btn.y, btn.w, btn.h)) act = true;
    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + L.rows) this.scroll = this.index - L.rows + 1;
    if (act) this.activate();
    // aperçu de l'effet de saut
    this.fxT -= dt;
    if (this.category.id === 'effect' && this.fxT <= 0) { this.fxT = 0.9; this.burstPreview(); }
  }
  activate() {
    const g = this.game, pr = g.progress, c = this.category.id, it = this.item;
    if (pr.owns(c, it.id)) {
      if (pr.save.equip[c] !== it.id) { pr.equip(c, it.id); g.applyLook(); g.audio.play('select'); this.flashT = 0.3; }
      return;
    }
    if (pr.wallet < it.price) { g.audio.play('locked'); this.msg = { text: `IL TE MANQUE ${it.price - pr.wallet} FORFAITS`, t: 1.6, color: '#ff9aa5' }; return; }
    if (!this.confirm) { this.confirm = true; g.audio.play('sign'); return; }
    pr.buy(c, it.id);
    g.applyLook();
    this.confirm = false;
    g.audio.play('powerup');
    this.flashT = 0.5;
    this.msg = { text: 'ACHETE ET EQUIPE !', t: 1.6, color: '#5cff8a' };
    const L = this.layout();
    this.parts.burst(L.prevX, 150, 30, { color: ['#ffd23f', '#ffffff', '#7ee8ff'], speed: 140, life: 0.8, size: 3, shape: 'spark', additive: true, drag: 3 });
  }
  burstPreview() {
    const L = this.layout();
    const e = this.item;
    const y = this.previewY() + 2;
    this.parts.burst(L.prevX, y, 16, { color: e.colors, speed: 90, angle: -Math.PI / 2, spread: Math.PI * 0.9, g: e.g ?? 200, life: 0.6, size: 3, shape: e.shape, additive: e.additive, drag: 2 });
    if (e.ring) this.parts.spawn(L.prevX, y, 0, 0, 0.4, 2, e.ring, { shape: 'ring', grow: 70, shrink: false });
  }
  previewY() { return this.game.view.h * 0.7; }
  tabRects() {
    const v = this.game.view;
    const ws = CATEGORIES.map((c) => measure(c.name) + 14);
    const total = ws.reduce((a, b) => a + b, 0) + (ws.length - 1) * 4;
    let x = v.w / 2 - total / 2;
    return ws.map((w) => { const r = { x, y: 28, w, h: 16 }; x += w + 4; return r; });
  }
  buttonRect() { const L = this.layout(); return { x: L.prevX - 60, y: this.game.view.h - 50, w: 120, h: 18 }; }
  render(ctx) {
    const g = this.game, v = g.view, pr = g.progress;
    this.drawFrame(ctx, { keys: '←/→ : RAYON   ↑/↓ : CHOISIR   SAUT/ENTREE : ACHETER / EQUIPER   ECHAP : RETOUR', touch: 'TOUCHE UN OBJET, PUIS LE BOUTON' });
    const L = this.layout();
    // onglets
    this.tabRects().forEach((r, i) => {
      const sel = i === this.cat;
      panel(ctx, r.x, r.y, r.w, r.h, sel ? 'rgba(255,200,61,0.25)' : 'rgba(10,13,36,0.8)', sel ? '#ffc83d' : '#545e94');
      drawText(ctx, CATEGORIES[i].name, r.x + r.w / 2, r.y + 4, { align: 'center', color: sel ? '#ffffff' : '#9fb2ea' });
    });
    // aperçu
    const eq = pr.save.equip;
    const look = { ...eq, [this.category.id]: this.item.id };
    const py = this.previewY();
    panel(ctx, L.prevX - 80, 52, 160, v.h - 108, 'rgba(10,13,36,0.6)', '#545e94');
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(L.prevX - 50, py + 1, 100, 3);
    const k = kongFor(look.skin);
    const sc = 4;
    const hop = Math.abs(Math.sin(this.t * 3)) * (this.category.id === 'effect' ? 0 : 6);
    const frame = (this.t % 2.4) > 2.0 ? k.jump : k.idle;
    // traînée en démonstration
    const trail = findItem('trail', look.trail);
    if (trail && trail.colors.length) {
      for (let i = 4; i >= 1; i--) {
        const gk = g.trailGhost(trail, i);
        ctx.globalAlpha = (trail.stripes ? 0.16 : 0.12) * (5 - i);
        ctx.drawImage(gk.idle, Math.round(L.prevX - 8 * sc - i * 9), Math.round(py - hop - (frame.height + 1) * sc), 16 * sc, frame.height * sc);
      }
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.translate(Math.round(L.prevX), Math.round(py - hop));
    ctx.fillStyle = INK; ctx.fillRect(-13 * sc, -2 * sc, 26 * sc, 3 * sc);
    ctx.fillStyle = k.ski; ctx.fillRect(-12 * sc, -2 * sc, 24 * sc, sc);
    ctx.fillStyle = k.skiD; ctx.fillRect(-12 * sc, -sc, 24 * sc, sc);
    ctx.drawImage(frame, -8 * sc, -(frame.height + 1) * sc, 16 * sc, frame.height * sc);
    drawHatRows(ctx, findItem('hat', look.hat), -8 * sc, -(frame.height + 1) * sc, sc);
    ctx.restore();
    this.parts.draw(ctx, { x: -1e4, y: -1e4, w: 2e4, h: 2e4 });
    if (this.flashT > 0) { ctx.globalAlpha = this.flashT; ctx.fillStyle = '#ffffff'; ctx.fillRect(L.prevX - 79, 53, 158, v.h - 110); ctx.globalAlpha = 1; }
    // fiche de l'objet
    const it = this.item, c = this.category.id;
    drawText(ctx, it.name.toUpperCase(), L.prevX, 60, { align: 'center', color: '#ffffff' });
    wrap(it.desc, 24).slice(0, 3).forEach((line, j) => drawText(ctx, line, L.prevX, 72 + j * 9, { align: 'center', color: '#9fb2ea' }));
    const owned = pr.owns(c, it.id), equipped = eq[c] === it.id;
    const b = this.buttonRect();
    const can = owned || pr.wallet >= it.price;
    const label = equipped ? 'EQUIPE' : owned ? 'EQUIPER' : this.confirm ? `CONFIRMER ? (${it.price})` : `ACHETER : ${it.price}`;
    panel(ctx, b.x, b.y, b.w, b.h, equipped ? 'rgba(92,255,138,0.2)' : can ? 'rgba(255,200,61,0.3)' : 'rgba(60,60,90,0.6)', equipped ? '#5cff8a' : can ? '#ffc83d' : '#545e94');
    const pulse = this.confirm && Math.sin(this.t * 10) > 0;
    drawText(ctx, label, b.x + b.w / 2, b.y + 5, { align: 'center', color: pulse ? '#ffc83d' : '#ffffff' });
    if (this.msg) drawText(ctx, this.msg.text, L.prevX, b.y - 12, { align: 'center', color: this.msg.color, outline: INK });
    // liste
    const items = this.category.items;
    for (let r = 0; r < L.rows; r++) {
      const i = this.scroll + r;
      if (i >= items.length) break;
      const ii = items[i];
      const y = L.top + r * L.rowH;
      const sel = i === this.index;
      const own = pr.owns(c, ii.id), eqd = eq[c] === ii.id;
      panel(ctx, L.listX, y, L.listW, L.rowH - 2, sel ? 'rgba(126,232,255,0.22)' : 'rgba(10,13,36,0.75)', sel ? '#7ee8ff' : '#2a3060');
      if (c === 'skin') { const kk = kongFor(ii.id); ctx.drawImage(kk.idle, 0, 0, 16, 10, L.listX + 4, y + 3, 16, 10); }
      else if (c === 'trail') { ii.colors.forEach((col, j) => { ctx.fillStyle = col; ctx.fillRect(L.listX + 4 + j * 3, y + 4, 3, 8); }); if (!ii.colors.length) drawText(ctx, '-', L.listX + 8, y + 4, { color: '#545e94' }); }
      else if (c === 'effect') { ii.colors.forEach((col, j) => { ctx.fillStyle = col; ctx.fillRect(L.listX + 5 + (j % 3) * 4, y + 4 + Math.floor(j / 3) * 4, 3, 3); }); }
      else if (c === 'hat') { ctx.save(); ctx.translate(L.listX + 4, y + 9); drawHatRows(ctx, ii.rows ? { ...ii, dy: -ii.rows.length + 1 } : null, 0, 0, 1); ctx.restore(); }
      drawText(ctx, ii.name.toUpperCase(), L.listX + 26, y + 4, { color: sel ? '#ffffff' : '#cfe0ff' });
      const tag = eqd ? 'EQUIPE' : own ? 'A TOI' : String(ii.price);
      const tcol = eqd ? '#5cff8a' : own ? '#7ee8ff' : pr.wallet >= ii.price ? '#ffc83d' : '#ff9aa5';
      drawText(ctx, tag, L.listX + L.listW - 6, y + 4, { align: 'right', color: tcol });
      if (!own) drawIcon(ctx, 'coin', L.listX + L.listW - 18 - measure(tag), y + 3);
    }
    if (this.scroll > 0) drawText(ctx, '↑', L.listX + L.listW / 2, L.top - 9, { align: 'center', color: '#7ee8ff' });
    if (this.scroll + L.rows < items.length) drawText(ctx, '↓', L.listX + L.listW / 2, L.top + L.rows * L.rowH, { align: 'center', color: '#7ee8ff' });
  }
}

// ---------------------------------------------------------------------------
// Succès
// ---------------------------------------------------------------------------
export class AchievementsScene extends MenuScene {
  constructor(game) { super(game, 'SUCCES', 'glacier'); this.index = 0; this.scroll = 0; }
  layout() { const v = this.game.view; const rowH = 25, top = 44; return { rowH, top, rows: Math.max(3, Math.floor((v.h - top - 22) / rowH)), w: Math.min(420, v.w - 16) }; }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const inp = this.game.input, n = ACHIEVEMENTS.length, L = this.layout();
    if (inp.pressed.down) { this.index = Math.min(n - 1, this.index + 1); this.game.audio.play('move'); }
    if (inp.pressed.up) { this.index = Math.max(0, this.index - 1); this.game.audio.play('move'); }
    if (inp.pressed.right) this.index = Math.min(n - 1, this.index + L.rows);
    if (inp.pressed.left) this.index = Math.max(0, this.index - L.rows);
    // tactile : moitié haute / basse de la liste pour défiler
    for (const t of inp.taps) { if (t.y > 40 && t.y < this.game.view.h / 2) this.index = Math.max(0, this.index - L.rows); else if (t.y >= this.game.view.h / 2) this.index = Math.min(n - 1, this.index + L.rows); }
    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + L.rows) this.scroll = this.index - L.rows + 1;
  }
  render(ctx) {
    const g = this.game, v = g.view, pr = g.progress, L = this.layout();
    this.drawFrame(ctx, { keys: '↑/↓ : PARCOURIR   ←/→ : PAGE   ECHAP : RETOUR', touch: 'TOUCHE EN HAUT / EN BAS POUR DEFILER' });
    drawText(ctx, `${pr.unlockedCount} / ${ACHIEVEMENTS.length} DEBLOQUES`, v.w / 2, 29, { align: 'center', color: '#7ee8ff' });
    const x = v.w / 2 - L.w / 2;
    for (let r = 0; r < L.rows; r++) {
      const i = this.scroll + r;
      if (i >= ACHIEVEMENTS.length) break;
      const a = ACHIEVEMENTS[i];
      const y = L.top + r * L.rowH;
      const on = pr.isUnlocked(a.id), sel = i === this.index;
      panel(ctx, x, y, L.w, L.rowH - 2, sel ? 'rgba(126,232,255,0.2)' : on ? 'rgba(255,200,61,0.12)' : 'rgba(10,13,36,0.78)', sel ? '#7ee8ff' : on ? '#b07a10' : '#2a3060');
      drawIcon(ctx, on ? 'trophy' : 'lock', x + 6, y + 7, on);
      drawText(ctx, a.name.toUpperCase(), x + 22, y + 3, { color: on ? '#ffd23f' : '#cfe0ff' });
      drawText(ctx, a.desc.toUpperCase(), x + 22, y + 13, { color: on ? '#ffffff' : '#7f8cc8' });
      drawText(ctx, a.cat, x + L.w - 6, y + 3, { align: 'right', color: '#545e94' });
      if (on) drawText(ctx, 'OK  +' + a.reward, x + L.w - 6, y + 13, { align: 'right', color: '#5cff8a' });
      else {
        const p = pr.progressOf(a);
        if (p) {
          const bw = 50, bx = x + L.w - 6 - bw;
          ctx.fillStyle = '#2a3060'; ctx.fillRect(bx, y + 15, bw, 4);
          ctx.fillStyle = '#7ee8ff'; ctx.fillRect(bx, y + 15, Math.round(bw * p.value / p.goal), 4);
          drawText(ctx, `${p.value}/${p.goal}  +${a.reward}`, bx - 4, y + 13, { align: 'right', color: '#9fb2ea' });
        } else drawText(ctx, '+' + a.reward, x + L.w - 6, y + 13, { align: 'right', color: '#9fb2ea' });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Défis quotidiens / hebdomadaires et série de connexion
// ---------------------------------------------------------------------------
export class ChallengesScene extends MenuScene {
  constructor(game) { super(game, 'DEFIS', 'storm'); game.progress.refreshChallenges(); }
  update(dt) { this.baseUpdate(dt); }
  render(ctx) {
    const g = this.game, v = g.view, pr = g.progress, s = pr.save;
    this.drawFrame(ctx, { keys: 'LES DEFIS SE VALIDENT TOUT SEULS EN JOUANT   ECHAP : RETOUR', touch: 'LES DEFIS SE VALIDENT TOUT SEULS EN JOUANT' });
    const w = Math.min(400, v.w - 16), x = v.w / 2 - w / 2;
    // série
    panel(ctx, x, 30, w, 24, 'rgba(255,138,42,0.16)', '#ff8a2a');
    drawIcon(ctx, 'flame', x + 8, 37);
    drawText(ctx, `SERIE DE CONNEXION : ${s.streak || 0} JOUR${(s.streak || 0) > 1 ? 'S' : ''}`, x + 22, 34, { color: '#ffd23f' });
    drawText(ctx, `REVIENS DEMAIN : +${streakReward((s.streak || 0) + 1)} FORFAITS`, x + 22, 43, { color: '#ffffff' });
    const now = Date.now();
    const msLeft = (dayIndex(now) + 1) * 86400000 + new Date(now).getTimezoneOffset() * 60000 - now;
    const h = Math.floor(msLeft / 3600000), m = Math.floor((msLeft % 3600000) / 60000);
    const section = (group, title, y, sub) => {
      drawText(ctx, title, x, y, { color: '#7ee8ff', outline: INK });
      drawText(ctx, sub, x + w, y, { align: 'right', color: '#9fb2ea', outline: INK });
      s[group].list.forEach((ch, i) => {
        const yy = y + 11 + i * 24;
        const done = s[group].done.includes(i);
        const p = pr.challengeProgress(group, i);
        panel(ctx, x, yy, w, 22, done ? 'rgba(92,255,138,0.14)' : 'rgba(10,13,36,0.78)', done ? '#5cff8a' : '#2a3060');
        drawIcon(ctx, 'flag', x + 6, yy + 5, done);
        drawText(ctx, ch.label.toUpperCase(), x + 20, yy + 3, { color: done ? '#5cff8a' : '#ffffff' });
        const bw = 90;
        ctx.fillStyle = '#2a3060'; ctx.fillRect(x + 20, yy + 15, bw, 3);
        ctx.fillStyle = done ? '#5cff8a' : '#7ee8ff'; ctx.fillRect(x + 20, yy + 15, Math.round(bw * Math.max(0, p) / ch.goal), 3);
        const pv = ch.stat === 'playTime' ? `${Math.floor(Math.max(0, p) / 60)}/${ch.goal / 60} MIN` : `${Math.max(0, Math.floor(p))}/${ch.goal}`;
        drawText(ctx, pv, x + 26 + bw, yy + 13, { color: '#9fb2ea' });
        drawText(ctx, done ? 'GAGNE !' : `+${ch.reward}`, x + w - 6, yy + 8, { align: 'right', color: done ? '#5cff8a' : '#ffc83d' });
      });
    };
    section('daily', 'DEFIS DU JOUR', 60, `NOUVEAUX DANS ${h} H ${String(m).padStart(2, '0')}`);
    const daysLeft = 7 - ((dayIndex(now) + 3) % 7);
    section('weekly', 'DEFIS DE LA SEMAINE', 60 + 11 + 3 * 24 + 6, `ENCORE ${daysLeft} JOUR${daysLeft > 1 ? 'S' : ''}`);
  }
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------
const REMAP = [
  ['left', 'GAUCHE'], ['right', 'DROITE'], ['down', 'BAS / GLISSER'], ['jump', 'SAUTER'], ['pause', 'PAUSE'], ['restart', 'RECOMMENCER'],
];
export const keyName = (code) => {
  if (!code) return '-';
  const map = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'ESPACE', Escape: 'ECHAP', Enter: 'ENTREE', ShiftLeft: 'MAJ G', ShiftRight: 'MAJ D', ControlLeft: 'CTRL G', ControlRight: 'CTRL D', Backquote: '²', Tab: 'TAB' };
  if (map[code]) return map[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'PAV ' + code.slice(6).toUpperCase();
  return code.toUpperCase().slice(0, 8);
};

export class OptionsScene extends MenuScene {
  constructor(game) { super(game, 'OPTIONS', 'night'); this.index = 0; this.waiting = null; }
  speed(d) {
    const steps = [0.6, 0.7, 0.85, 1];
    const s = this.game.settings;
    const i = steps.indexOf(s.gameSpeed || 1);
    s.gameSpeed = steps[(i + d + steps.length) % steps.length];
    this.game.persist();
  }
  items() {
    const g = this.game, s = g.settings, b = g.input.bindings;
    const vol = (key, label) => ({ label: `${label} : ${Math.round(s[key] * 100)}%`, act: () => this.vol(key, 0.1, true), adj: (d) => this.vol(key, d * 0.1) });
    return [
      vol('musicVol', 'MUSIQUE'),
      vol('sfxVol', 'EFFETS SONORES'),
      { label: `EFFETS VISUELS REDUITS : ${s.reduceFx ? 'OUI' : 'NON'}`, act: () => { s.reduceFx = !s.reduceFx; g.persist(); } },
      { label: `VITESSE DU JEU : ${Math.round((s.gameSpeed || 1) * 100)}%${(s.gameSpeed || 1) < 1 ? ' (ASSISTE)' : ''}`, act: () => this.speed(1), adj: (d) => this.speed(d) },
      { label: `BOUCLIER (ASSISTE) : ${s.shield ? 'OUI' : 'NON'}`, act: () => { s.shield = !s.shield; g.persist(); } },
      { label: `FANTOME DU MEILLEUR TEMPS : ${s.ghost === false ? 'NON' : 'OUI'}`, act: () => { s.ghost = s.ghost === false; g.persist(); } },
      { label: 'PLEIN ECRAN', act: () => g.toggleFullscreen() },
      ...REMAP.map(([a, label]) => ({ label: `${label} : ${keyName(b[a][0])}${b[a][1] ? ' / ' + keyName(b[a][1]) : ''}`, act: () => { this.waiting = a; g.input.captureNext((code) => this.bind(a, code)); }, key: true })),
      { label: 'COMMANDES PAR DEFAUT', act: () => { g.input.bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS)); delete s.bindings; g.persist(); } },
    ];
  }
  vol(key, d, wrap = false) {
    const g = this.game;
    let v = Math.round((g.settings[key] + d) * 10) / 10;
    if (wrap && v > 1.001) v = 0;
    g.settings[key] = Math.min(1, Math.max(0, v));
    g.applyVolumes(); g.persist();
    g.audio.play(key === 'sfxVol' ? 'coin' : 'move');
  }
  bind(action, code) {
    const g = this.game;
    this.waiting = null;
    if (code === 'Escape' && action !== 'pause') return; // ÉCHAP annule
    const b = g.input.bindings;
    // la touche quitte les autres actions de jeu, puis devient la touche principale de celle-ci
    for (const [a] of REMAP) if (a !== action) { b[a] = b[a].filter((k) => k !== code); if (!b[a].length) b[a] = DEFAULT_BINDINGS[a].filter((k) => k !== code).slice(0, 1); }
    b[action] = [code, ...b[action].filter((k) => k !== code)].slice(0, 2);
    g.settings.bindings = b;
    g.persist();
    g.audio.play('select');
  }
  update(dt) {
    if (this.waiting) { this.t += dt; this.bg.update(dt); return; }
    if (!this.baseUpdate(dt)) return;
    const g = this.game, inp = g.input, items = this.items();
    if (inp.pressed.down) { this.index = (this.index + 1) % items.length; g.audio.play('move'); }
    if (inp.pressed.up && !inp.pressed.confirm) { this.index = (this.index + items.length - 1) % items.length; g.audio.play('move'); }
    const it = items[this.index];
    if (it.adj && (inp.pressed.left || inp.pressed.right)) it.adj(inp.pressed.right ? 1 : -1);
    let chosen = -1;
    if (inp.pressed.confirm || (inp.pressed.jump && !inp.held.up)) chosen = this.index;
    items.forEach((_, i) => { if (inp.tapIn(g.view.w / 2 - 130, this.rowY(i) - 3, 260, 12)) { if (i === this.index) chosen = i; else this.index = i; } });
    if (chosen >= 0) { g.audio.play('select'); items[chosen].act(); }
  }
  // réglages généraux, puis bloc des commandes (titre intercalé), puis « par défaut »
  get general() { return 7; }
  rowY(i) { const G = this.general; return 34 + i * 13 + (i >= G ? 16 : 0) + (i >= G + REMAP.length ? 6 : 0); }
  render(ctx) {
    const g = this.game, v = g.view;
    this.drawFrame(ctx, { keys: '↑/↓ : CHOISIR   ←/→ : REGLER   SAUT/ENTREE : MODIFIER   ECHAP : RETOUR', touch: 'TOUCHE UNE LIGNE POUR LA MODIFIER' });
    const items = this.items();
    drawText(ctx, 'COMMANDES (CLAVIER)', v.w / 2, this.rowY(this.general) - 14, { align: 'center', color: '#7ee8ff', outline: INK });
    items.forEach((it, i) => {
      const y = this.rowY(i), sel = i === this.index;
      if (sel) { ctx.fillStyle = 'rgba(126,232,255,0.18)'; ctx.fillRect(v.w / 2 - 130, y - 3, 260, 13); }
      const waiting = it.key && this.waiting && sel;
      const label = waiting ? (Math.sin(this.t * 8) > 0 ? 'APPUIE SUR UNE TOUCHE... (ECHAP : ANNULER)' : '') : (sel ? '> ' : '') + it.label;
      drawText(ctx, label, v.w / 2, y, { align: 'center', color: waiting ? '#ffc83d' : sel ? '#ffffff' : '#9fb2ea', outline: INK });
    });
    const assistHelp = /VITESSE DU JEU|BOUCLIER/.test((items[this.index] || {}).label || '');
    if (assistHelp) drawText(ctx, 'MODE ASSISTE : POUR TOUT LE MONDE ! LES TEMPS NE COMPTENT PAS AU CLASSEMENT.', v.w / 2, this.rowY(items.length - 1) + 16, { align: 'center', color: '#7ee8ff', outline: INK });
    else drawText(ctx, 'MANETTE : CROIX DIRECTIONNELLE + A/B (SAUT), START (PAUSE)', v.w / 2, this.rowY(items.length - 1) + 16, { align: 'center', color: '#545e94', outline: INK });
  }
}
