// Menu des modes bonus et écran de préparation du mode Défi.
import { drawText } from '../engine/font.js';
import { formatTime } from '../engine/util.js';
import { panel } from './hud.js';
import { MenuScene, drawIcon } from './menus.js';
import { WORLDS, LEVELS } from '../levels/index.js';
import { levelLong } from './labels.js';
import { startSpeedrun, startInfinite, startDaily, startChallenge, speedrunUnlocked, MODS, challengeReward } from '../modes/modes.js';
import { utcDay } from '../online/rules.js';

const INK = '#0a0d24';

export class BonusScene extends MenuScene {
  constructor(game) {
    super(game, 'MODES BONUS', 'night');
    this.index = game.bonusIndex || 0;
    this.world = 1;
  }
  get b() { return this.game.save.bonus || {}; }
  items() {
    const g = this.game, b = this.b;
    const sr = (b.speedrun || {})[this.world];
    const open = speedrunUnlocked(g, this.world);
    const daily = b.daily && b.daily.day === utcDay() ? b.daily : null;
    return [
      { name: 'NIVEAU DU JOUR', icon: 'flag', desc: 'Une piste generee, la meme pour tout le monde, nouvelle chaque jour. Classement du jour.', info: daily ? `TON TEMPS AUJOURD'HUI : ${formatTime(daily.time)}` : 'PAS ENCORE JOUE AUJOURD\'HUI', run: () => startDaily(g) },
      { name: 'INFINI', icon: 'flame', desc: 'Une piste sans fin, une avalanche qui accelere, une seule vie. Jusqu\'ou iras-tu ?', info: `RECORD : ${b.infinite || 0} M`, run: () => startInfinite(g) },
      { name: `SPEEDRUN : < MONDE ${this.world} >`, icon: 'trophy', desc: 'Les 6 niveaux du monde d\'affilee, chrono cumule et temps intermediaires. Ton meilleur passage s\'affiche en fantome.', info: open ? (sr ? `RECORD : ${formatTime(sr.total)}` : 'PAS ENCORE DE RECORD') : 'TERMINE LES 6 NIVEAUX DE CE MONDE POUR DEBLOQUER', locked: !open, adj: (d) => { this.world = ((this.world - 1 + d + WORLDS.length) % WORLDS.length) + 1; }, run: () => open && startSpeedrun(g, this.world) },
      { name: 'DEFI', icon: 'lock', desc: 'Rejoue un niveau termine avec des contraintes : une vie, sans double saut, nuit noire, turbo. Plus c\'est dur, plus ca rapporte.', info: `DEFIS REUSSIS : ${(g.save.stats || {}).challengeWins || 0}`, run: () => g.goto(() => new ChallengeSetupScene(g)) },
      { name: 'EDITEUR DE NIVEAUX', icon: 'coin', desc: 'Construis ta propre piste, teste-la, et partage-la avec un code a copier-coller.', info: 'TES NIVEAUX RESTENT SUR CET APPAREIL', run: () => g.gotoEditor() },
    ];
  }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const g = this.game, inp = g.input, items = this.items(), v = g.view;
    if (inp.pressed.down) { this.index = (this.index + 1) % items.length; g.audio.play('move'); }
    if (inp.pressed.up && !inp.pressed.confirm) { this.index = (this.index + items.length - 1) % items.length; g.audio.play('move'); }
    const it = items[this.index];
    if (it.adj && (inp.pressed.left || inp.pressed.right)) { it.adj(inp.pressed.right ? 1 : -1); g.audio.play('move'); }
    let chosen = -1;
    if (inp.pressed.confirm || (inp.pressed.jump && !inp.held.up)) chosen = this.index;
    const L = this.layout();
    items.forEach((_, i) => { if (inp.tapIn(L.x, L.y + i * L.h, L.w, L.h - 3)) { if (i === this.index) chosen = i; else this.index = i; } });
    if (chosen >= 0) {
      const c = items[chosen];
      if (c.locked) { g.audio.play('bonk'); return; }
      g.bonusIndex = chosen;
      g.audio.play('select');
      c.run();
    }
    void v;
  }
  layout() { const v = this.game.view; const w = Math.min(420, v.w - 16); return { x: v.w / 2 - w / 2, y: 30, w, h: 41 }; }
  render(ctx) {
    const g = this.game;
    this.drawFrame(ctx, { keys: '↑/↓ : CHOISIR   ←/→ : MONDE (SPEEDRUN)   SAUT/ENTREE : JOUER   ECHAP : RETOUR', touch: 'TOUCHE UN MODE DEUX FOIS POUR JOUER' });
    const L = this.layout();
    this.items().forEach((it, i) => {
      const y = L.y + i * L.h, sel = i === this.index;
      panel(ctx, L.x, y, L.w, L.h - 3, sel ? 'rgba(126,232,255,0.2)' : 'rgba(10,13,36,0.8)', sel ? '#7ee8ff' : it.locked ? '#2a3060' : '#545e94');
      drawIcon(ctx, it.icon, L.x + 8, y + 6, !it.locked);
      drawText(ctx, it.name, L.x + 24, y + 5, { color: it.locked ? '#7f8cc8' : sel ? '#ffd23f' : '#ffffff' });
      const words = it.desc.toUpperCase();
      const max = Math.floor((L.w - 32) / 6);
      const l1 = words.length > max ? words.slice(0, words.lastIndexOf(' ', max)) : words;
      const l2 = words.slice(l1.length).trim();
      drawText(ctx, l1, L.x + 24, y + 15, { color: '#9fb2ea' });
      if (l2) drawText(ctx, l2.length > max ? l2.slice(0, max - 3) + '...' : l2, L.x + 24, y + 23, { color: '#9fb2ea' });
      drawText(ctx, it.info, L.x + L.w - 8, y + 5, { align: 'right', color: it.locked ? '#ff8a9a' : '#7ee8ff' });
    });
    void g; void INK;
  }
}

export class ChallengeSetupScene extends MenuScene {
  constructor(game) {
    super(game, 'DEFI', 'storm');
    this.levels = LEVELS.filter((l) => game.save.best[l.id]).map((l) => l.id);
    this.lvl = Math.max(0, this.levels.indexOf(game.save.lastLevel));
    this.mods = new Set(game.lastMods || ['onelife']);
    this.index = 0;
  }
  back() { this.game.audio.play('pause'); this.game.gotoBonus(); }
  rows() {
    const g = this.game;
    if (!this.levels.length) return [{ label: 'TERMINE D\'ABORD UN NIVEAU DE L\'AVENTURE', act: () => this.back() }];
    const id = this.levels[this.lvl];
    const L = LEVELS.find((l) => l.id === id);
    return [
      { label: `< ${levelLong(id)} : ${L.name.toUpperCase()} >`, adj: (d) => { this.lvl = (this.lvl + d + this.levels.length) % this.levels.length; }, act: () => { this.lvl = (this.lvl + 1) % this.levels.length; } },
      ...MODS.map((m) => ({ label: `[${this.mods.has(m.id) ? 'X' : ' '}] ${m.name}`, sub: m.desc.toUpperCase(), act: () => { if (this.mods.has(m.id)) this.mods.delete(m.id); else this.mods.add(m.id); } })),
      { label: `LANCER LE DEFI  (+${challengeReward([...this.mods])} FORFAITS + BONUS)`, go: true, act: () => { g.lastMods = [...this.mods]; startChallenge(g, id, [...this.mods]); } },
    ];
  }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const g = this.game, inp = g.input, rows = this.rows();
    if (inp.pressed.down) { this.index = (this.index + 1) % rows.length; g.audio.play('move'); }
    if (inp.pressed.up && !inp.pressed.confirm) { this.index = (this.index + rows.length - 1) % rows.length; g.audio.play('move'); }
    const r = rows[this.index];
    if (r && r.adj && (inp.pressed.left || inp.pressed.right)) { r.adj(inp.pressed.right ? 1 : -1); g.audio.play('move'); }
    let chosen = -1;
    if (inp.pressed.confirm || (inp.pressed.jump && !inp.held.up)) chosen = this.index;
    rows.forEach((_, i) => { if (inp.tapIn(g.view.w / 2 - 150, this.rowY(i) - 3, 300, 14)) { if (i === this.index) chosen = i; else this.index = i; } });
    if (chosen >= 0 && rows[chosen]) { g.audio.play('select'); rows[chosen].act(); }
    this.index = Math.min(this.index, rows.length - 1);
  }
  rowY(i) { return 40 + i * 24 + (i > MODS.length ? 6 : 0); }
  render(ctx) {
    const g = this.game, v = g.view;
    this.drawFrame(ctx, { keys: '↑/↓ : CHOISIR   ←/→ : NIVEAU   SAUT/ENTREE : COCHER / LANCER   ECHAP : RETOUR', touch: 'TOUCHE UNE LIGNE' });
    const rows = this.rows();
    rows.forEach((r, i) => {
      const y = this.rowY(i), sel = i === this.index;
      panel(ctx, v.w / 2 - 150, y - 4, 300, r.sub ? 22 : 14, sel ? 'rgba(126,232,255,0.22)' : r.go ? 'rgba(255,200,61,0.18)' : 'rgba(10,13,36,0.78)', sel ? '#7ee8ff' : r.go ? '#ffc83d' : '#2a3060');
      drawText(ctx, r.label, v.w / 2, y, { align: 'center', color: r.go ? '#ffd23f' : sel ? '#ffffff' : '#cfe0ff' });
      if (r.sub) drawText(ctx, r.sub, v.w / 2, y + 9, { align: 'center', color: '#7f8cc8' });
    });
  }
}
