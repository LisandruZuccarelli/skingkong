// Éditeur de niveaux : grille de tuiles, palette, test immédiat, 3 emplacements, partage par code.
import { drawText } from '../engine/font.js';
import { panel } from '../game/hud.js';
import { MenuScene } from '../game/menus.js';
import { THEME_ORDER, getTheme } from '../game/themes.js';
import { openForm } from '../online/form.js';
import { browserStorage } from '../online/local.js';
import { startCustom } from './modes.js';
import { PALETTE, EDITOR_H, encodeLevel, decodeLevel, checkLevel, toLevelData, blankLevel } from './editor-format.js';

const INK = '#0a0d24';

export class EditorScene extends MenuScene {
  constructor(game) {
    super(game, 'EDITEUR', 'dawn');
    this.st = browserStorage();
    this.lv = this.st.get('editor.current') || blankLevel();
    this.cx = 4; this.cy = 12; this.tool = 0;
    this.scroll = 0; this.repeat = 0;
    this.menu = null; this.msg = 'T : TESTER   ECHAP : MENU'; this.msgT = 4;
    this.prevKeys = new Set();
    this.painting = false;
  }
  get W() { return this.lv.rows[0].length; }
  save() { this.st.set('editor.current', this.lv); }
  say(m) { this.msg = m.toUpperCase(); this.msgT = 3; }
  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.W || y >= EDITOR_H) return;
    const r = this.lv.rows;
    if (r[y][x] === c) return;
    if (c === 'P') for (let j = 0; j < EDITOR_H; j++) r[j] = r[j].replace(/P/g, '.'); // un seul départ
    r[y] = r[y].slice(0, x) + c + r[y].slice(x + 1);
    this.dirty = true;
  }
  resize(d) {
    const w = Math.max(30, Math.min(400, this.W + d));
    this.lv.rows = this.lv.rows.map((r, y) => (w > r.length ? r + (y >= 15 ? '#' : '.').repeat(w - r.length) : r.slice(0, w)));
    this.cx = Math.min(this.cx, w - 1);
    this.say(`largeur : ${w} tuiles`);
    this.save();
  }
  layout() {
    const v = this.game.view;
    const ts = Math.max(8, Math.floor((v.h - 54) / EDITOR_H));
    const cols = Math.floor((v.w - 8) / ts);
    return { ts, cols, x0: Math.floor((v.w - cols * ts) / 2), y0: 26, barY: 26 + EDITOR_H * ts + 4 };
  }
  test() {
    const err = checkLevel(this.lv);
    if (err) { this.say(err); this.game.audio.play('bonk'); return; }
    this.save();
    const g = this.game;
    startCustom(g, toLevelData(this.lv), () => g.gotoEditor());
  }
  menuItems() {
    const g = this.game;
    const slots = this.st.get('editor.slots') || [];
    const items = [
      { label: 'TESTER LE NIVEAU (T)', act: () => this.test() },
      { label: `NOM : ${this.lv.name.toUpperCase()}`, act: () => openForm(g, { title: 'Nom du niveau', fields: [{ name: 'n', label: 'Nom', max: 24 }], submit: 'OK', onSubmit: async (v) => { this.lv.name = v.n.trim() || 'Ma piste'; this.save(); } }) },
      { label: `DECOR : ${getTheme(this.lv.theme).name || this.lv.theme.toUpperCase()}`, act: () => { this.lv.theme = THEME_ORDER[(THEME_ORDER.indexOf(this.lv.theme) + 1) % THEME_ORDER.length]; this.save(); } },
      { label: `LARGEUR : ${this.W}  (←/→ : -10 / +10)`, adj: (d) => this.resize(d * 10), act: () => this.resize(10) },
      ...[0, 1, 2].map((i) => ({ label: `ENREGISTRER DANS L'EMPLACEMENT ${i + 1}${slots[i] ? ' (' + slots[i].name.toUpperCase() + ')' : ' (VIDE)'}`, act: () => { slots[i] = JSON.parse(JSON.stringify(this.lv)); this.st.set('editor.slots', slots); this.say(`enregistre dans l'emplacement ${i + 1}`); } })),
      ...[0, 1, 2].filter((i) => slots[i]).map((i) => ({ label: `CHARGER L'EMPLACEMENT ${i + 1} : ${slots[i].name.toUpperCase()}`, act: () => { this.lv = JSON.parse(JSON.stringify(slots[i])); this.save(); this.say('niveau charge'); } })),
      { label: 'PARTAGER (COPIER LE CODE)', act: () => this.share() },
      { label: 'IMPORTER UN CODE', act: () => openForm(g, { title: 'Importer un niveau', intro: 'Colle le code commencant par SK1: recu d\'un ami.', fields: [{ name: 'code', label: 'Code', max: 20000 }], submit: 'Importer', onSubmit: async (v) => { this.lv = decodeLevel(v.code); this.save(); this.say('niveau importe : ' + this.lv.name); } }) },
      { label: 'NOUVEAU NIVEAU (EFFACE LA GRILLE)', act: () => { if (this.confirmNew) { this.lv = blankLevel(); this.save(); this.confirmNew = false; this.say('nouvelle grille'); } else { this.confirmNew = true; this.say('encore une fois pour tout effacer'); } } },
      { label: 'QUITTER L\'EDITEUR', act: () => { this.save(); g.gotoBonus(); } },
    ];
    return items;
  }
  share() {
    const err = checkLevel(this.lv);
    if (err) { this.say(err); return; }
    const code = encodeLevel(this.lv);
    const done = () => this.say(`code copie (${code.length} caracteres) : envoie-le a un ami !`);
    try { navigator.clipboard.writeText(code).then(done, () => this.showCode(code)); } catch (_) { this.showCode(code); }
  }
  showCode(code) {
    const f = openForm(this.game, { title: 'Code du niveau', intro: 'Copie ce code et envoie-le : ton ami le colle dans IMPORTER UN CODE.', fields: [{ name: 'code', label: 'Code', max: 20000 }], submit: 'Fermer', onSubmit: async () => {} });
    if (f) setTimeout(() => { const el = document.getElementById('skf-code'); if (el) { el.value = code; el.select(); } }, 40);
  }
  back() {
    if (this.menu !== null) { this.menu = null; return; }
    this.menu = 0; this.game.audio.play('pause');
  }
  keyHit(code) { return this.game.input.keys.has(code) && !this.prevKeys.has(code); }
  update(dt) {
    const g = this.game, inp = g.input, v = g.view;
    this.t += dt; this.msgT -= dt;
    if (inp.blocked) return;
    if (inp.pressed.pause || inp.tapIn(4, 4, 70, 22)) { this.back(); this.prevKeys = new Set(inp.keys); return; }
    if (this.menu !== null) {
      const items = this.menuItems();
      if (inp.pressed.down) { this.menu = (this.menu + 1) % items.length; g.audio.play('move'); }
      if (inp.pressed.up && !inp.pressed.confirm) { this.menu = (this.menu + items.length - 1) % items.length; g.audio.play('move'); }
      const it = items[this.menu];
      if (it && it.adj && (inp.pressed.left || inp.pressed.right)) it.adj(inp.pressed.right ? 1 : -1);
      let chosen = -1;
      if (inp.pressed.confirm || (inp.pressed.jump && !inp.held.up && !inp.pressed.up)) chosen = this.menu;
      items.forEach((_, i) => { if (inp.tapIn(v.w / 2 - 150, this.menuY(i) - 3, 300, 12)) { if (i === this.menu) chosen = i; else this.menu = i; } });
      if (chosen >= 0 && items[chosen]) { g.audio.play('select'); const keep = items[chosen].label.startsWith('NOUVEAU'); if (!keep) this.confirmNew = false; items[chosen].act(); if (!items[chosen].adj && !keep && !items[chosen].label.startsWith('DECOR')) this.menu = null; }
      this.prevKeys = new Set(inp.keys);
      return;
    }
    const L = this.layout();
    // curseur au clavier (répétition quand on maintient)
    const dx = (inp.held.right ? 1 : 0) - (inp.held.left ? 1 : 0);
    const dy = (inp.held.down ? 1 : 0) - (inp.held.up ? 1 : 0);
    const first = inp.pressed.left || inp.pressed.right || inp.pressed.down || inp.pressed.up;
    this.repeat -= dt;
    if ((dx || dy) && (first || this.repeat <= 0)) {
      this.cx = Math.max(0, Math.min(this.W - 1, this.cx + dx));
      this.cy = Math.max(0, Math.min(EDITOR_H - 1, this.cy + dy));
      this.repeat = first ? 0.28 : 0.05;
    }
    // palette : Tab / chiffres / molette
    if (this.keyHit('Tab')) this.tool = (this.tool + (inp.keys.has('ShiftLeft') ? PALETTE.length - 1 : 1)) % PALETTE.length;
    for (let i = 1; i <= 9; i++) if (this.keyHit('Digit' + i)) this.tool = i - 1;
    if (this.keyHit('Digit0')) this.tool = PALETTE.length - 1;
    if (inp.wheel) { this.tool = (this.tool + inp.wheel + PALETTE.length * 4) % PALETTE.length; inp.wheel = 0; }
    if (this.keyHit('KeyT')) { this.prevKeys = new Set(inp.keys); this.test(); return; }
    // souris : survol = curseur, clic maintenu = peinture ; tap sur la palette = choix d'outil
    const toCell = (p) => ({ x: Math.floor((p.x - L.x0) / L.ts) + this.scroll, y: Math.floor((p.y - L.y0) / L.ts) });
    if (inp.mouse && inp.mouse.y < L.y0 + EDITOR_H * L.ts && inp.mouse.y >= L.y0) { const c = toCell(inp.mouse); this.cx = Math.max(0, Math.min(this.W - 1, c.x)); this.cy = c.y; }
    const pw = this.palW();
    for (const t of inp.taps) if (t.y >= L.barY && t.y < L.barY + 14) { const i = Math.floor((t.x - (v.w / 2 - (PALETTE.length * pw) / 2)) / pw); if (i >= 0 && i < PALETTE.length) this.tool = i; }
    let paint = inp.keys.has('Space') || inp.keys.has('Enter') || inp.keys.has('NumpadEnter');
    for (const p of inp.pointers.values()) if (p.y >= L.y0 && p.y < L.y0 + EDITOR_H * L.ts) { const c = toCell(p); if (c.x >= 0 && c.x < this.W) { this.cx = c.x; this.cy = c.y; paint = true; } }
    if (paint) this.set(this.cx, this.cy, PALETTE[this.tool].ch);
    if (this.dirty && !paint) { this.dirty = false; this.save(); }
    // défilement : le curseur reste visible
    if (this.cx < this.scroll + 3) this.scroll = Math.max(0, this.cx - 3);
    if (this.cx > this.scroll + L.cols - 4) this.scroll = Math.min(Math.max(0, this.W - L.cols), this.cx - L.cols + 4);
    this.prevKeys = new Set(inp.keys);
  }
  palW() { return Math.min(18, Math.floor((this.game.view.w - 8) / PALETTE.length)); }
  menuY(i) { return 34 + i * 13; }
  render(ctx) {
    const g = this.game, v = g.view, L = this.layout();
    this.drawFrame(ctx, { keys: 'FLECHES : CURSEUR  SAUT : POSER  TAB / 1-9 / MOLETTE : OUTIL  T : TESTER  ECHAP : MENU', touch: 'TOUCHE LA GRILLE POUR POSER, LA BARRE POUR CHOISIR' });
    const th = getTheme(this.lv.theme);
    void th;
    ctx.fillStyle = 'rgba(10,13,36,0.88)';
    ctx.fillRect(L.x0, L.y0, L.cols * L.ts, EDITOR_H * L.ts);
    const ts = L.ts;
    for (let y = 0; y < EDITOR_H; y++) {
      const row = this.lv.rows[y];
      for (let i = 0; i < L.cols; i++) {
        const x = i + this.scroll;
        if (x >= this.W) break;
        const c = row[x];
        const px = L.x0 + i * ts, py = L.y0 + y * ts;
        if (c === '.') { if ((x + y) % 2 === 0) { ctx.fillStyle = 'rgba(126,232,255,0.04)'; ctx.fillRect(px, py, ts, ts); } continue; }
        this.drawCell(ctx, c, px, py, ts);
      }
    }
    // fin de la piste
    if (this.W - this.scroll < L.cols) { ctx.fillStyle = 'rgba(255,79,94,0.5)'; ctx.fillRect(L.x0 + (this.W - this.scroll) * ts, L.y0, 2, EDITOR_H * ts); }
    // curseur
    if (this.menu === null) {
      const px = L.x0 + (this.cx - this.scroll) * ts, py = L.y0 + this.cy * ts;
      ctx.globalAlpha = 0.6; this.drawCell(ctx, PALETTE[this.tool].ch, px, py, ts); ctx.globalAlpha = 1;
      ctx.strokeStyle = Math.sin(this.t * 8) > 0 ? '#ffffff' : '#7ee8ff'; ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
    }
    // barre de défilement
    const sw = L.cols * ts;
    ctx.fillStyle = '#2a3060'; ctx.fillRect(L.x0, L.y0 + EDITOR_H * ts, sw, 2);
    ctx.fillStyle = '#7ee8ff'; ctx.fillRect(L.x0 + (this.scroll / this.W) * sw, L.y0 + EDITOR_H * ts, Math.max(4, (L.cols / this.W) * sw), 2);
    // palette
    const pw = this.palW(), px0 = v.w / 2 - (PALETTE.length * pw) / 2;
    PALETTE.forEach((p, i) => {
      const x = px0 + i * pw;
      panel(ctx, x, L.barY, pw - 2, 14, i === this.tool ? 'rgba(255,200,61,0.35)' : 'rgba(10,13,36,0.85)', i === this.tool ? '#ffc83d' : '#2a3060');
      this.drawCell(ctx, p.ch, x + (pw - 2) / 2 - 5, L.barY + 2, 10);
    });
    drawText(ctx, `${PALETTE[this.tool].name}   ${this.lv.name.toUpperCase()}   X ${this.cx}`, v.w / 2, L.barY + 17, { align: 'center', color: '#cfe0ff', outline: INK });
    if (this.msgT > 0) drawText(ctx, this.msg, v.w / 2, 29, { align: 'center', color: '#ffd23f', outline: INK });
    if (this.menu !== null) {
      const items = this.menuItems();
      ctx.fillStyle = 'rgba(8,10,30,0.85)'; ctx.fillRect(0, 0, v.w, v.h);
      drawText(ctx, 'MENU DE L\'EDITEUR', v.w / 2, 18, { align: 'center', color: '#ffc83d', scale: 1 });
      items.forEach((it, i) => {
        const y = this.menuY(i), sel = i === this.menu;
        if (sel) { ctx.fillStyle = 'rgba(126,232,255,0.2)'; ctx.fillRect(v.w / 2 - 150, y - 3, 300, 12); }
        drawText(ctx, (sel ? '> ' : '') + it.label, v.w / 2, y, { align: 'center', color: sel ? '#ffffff' : '#9fb2ea' });
      });
      if (this.msgT > 0) drawText(ctx, this.msg, v.w / 2, v.h - 22, { align: 'center', color: '#ffd23f', outline: INK });
    }
  }
  drawCell(ctx, c, x, y, s) {
    const p = PALETTE.find((q) => q.ch === c);
    const col = p ? p.col : '#ff00ff';
    const R = (a, b, w, h, cc) => { ctx.fillStyle = cc; ctx.fillRect(Math.round(x + a * s), Math.round(y + b * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))); };
    if ('#=wHx'.includes(c)) {
      R(0, 0, 1, 1, col);
      if (c === '#') R(0, 0, 1, 0.2, '#dfe7ff');
      if (c === 'x') { R(0.2, 0.3, 0.6, 0.1, '#5fb8e0'); R(0.45, 0.3, 0.1, 0.5, '#5fb8e0'); }
      if (c === 'H') R(0.3, 0.3, 0.4, 0.4, '#545e94');
      return;
    }
    if (c === '/' || c === '\\') {
      ctx.fillStyle = col; ctx.beginPath();
      if (c === '/') { ctx.moveTo(x, y + s); ctx.lineTo(x + s, y); ctx.lineTo(x + s, y + s); } else { ctx.moveTo(x, y); ctx.lineTo(x + s, y + s); ctx.lineTo(x, y + s); }
      ctx.fill(); return;
    }
    if (c === '-') { R(0, 0, 1, 0.3, col); R(0, 0.3, 1, 0.1, '#a07000'); return; }
    if (c === '.') { R(0.2, 0.45, 0.6, 0.1, col); return; }
    if (c === '^') { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x + s / 4, y + s * 0.3); ctx.lineTo(x + s / 2, y + s); ctx.lineTo(x + s * 0.75, y + s * 0.3); ctx.lineTo(x + s, y + s); ctx.fill(); return; }
    if (c === '$') { R(0.15, 0.25, 0.7, 0.5, col); R(0.3, 0.4, 0.2, 0.2, '#ffffff'); return; }
    // entités : pastille colorée + lettre
    R(0.1, 0.1, 0.8, 0.8, INK); R(0.2, 0.2, 0.6, 0.6, col);
    if (s >= 10) drawText(ctx, c.toUpperCase(), x + s / 2, y + s / 2 - 3, { align: 'center', color: INK });
  }
}
