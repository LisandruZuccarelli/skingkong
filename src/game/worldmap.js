// Carte des mondes : sélection des niveaux, progression et déblocages.
import { Background } from './background.js';
import { levelShort } from './labels.js';
import { Weather } from './weather.js';
import { THEMES } from './themes.js';
import { MIX } from '../engine/music.js';
import { drawText } from '../engine/font.js';
import { formatTime, damp } from '../engine/util.js';
import { panel } from './hud.js';
import { WORLDS, LEVELS, isUnlocked, worldUnlocked } from '../levels/index.js';


export class WorldMapScene {
  constructor(game, { levelId } = {}) {
    this.game = game;
    this.sprites = game.sprites;
    const save = game.save;
    const start = levelId || save.lastLevel || '1-1';
    const lv = LEVELS.find((l) => l.id === start) || LEVELS[0];
    this.world = lv.world;
    this.index = WORLDS[this.world - 1].levels.indexOf(lv.id);
    this.bgs = {};
    this.weathers = {};
    this.cam = { x: 0, y: 160 };
    this.t = 0;
    this.kongX = 0; this.kongY = 0; this.placed = false;
    this.shakeT = 0;
    this.switchT = 0;
    // Transition horizontale entre mondes : sortie par un bord, entrée par l'autre
    this.slide = null; // { dir, t, swapped }
    this.playMusic();
  }

  get w() { return WORLDS[this.world - 1]; }
  get theme() { return this.w.theme; }
  get levelId() { return this.w.levels[this.index]; }

  bg() { return this.bgs[this.theme] || (this.bgs[this.theme] = new Background(this.theme)); }
  weather() { const th = THEMES[this.theme]; return this.weathers[this.theme] || (this.weathers[this.theme] = new Weather(th.weather, th.wind)); }
  playMusic() { this.game.music.play(THEMES[this.theme].music, MIX.map); }

  /** Position des nœuds sur l'écran (chemin sinueux). */
  nodePos(i, v) {
    const n = this.w.levels.length;
    const x0 = 60, x1 = v.w - 60;
    const x = x0 + (x1 - x0) * (i / (n - 1));
    const y = v.h * 0.56 + Math.sin(i * 1.7 + this.world) * 26;
    return { x, y };
  }

  update(dt) {
    const g = this.game, inp = g.input, save = g.save;
    this.t += dt;
    this.bg().update(dt);
    this.weather().update(dt, this.cam, g.view);
    this.cam.x += 12 * dt;
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.switchT = Math.max(0, this.switchT - dt);
    const n = this.w.levels.length;
    if (this.slide) { this.updateSlide(dt); return; }
    // ←/→ : niveau précédent / suivant ; au-delà du dernier niveau, on glisse vers le monde suivant
    const move = (d) => {
      const ni = this.index + d;
      if (ni < 0 || ni >= n) {
        const nw = this.world + d;
        if (nw < 1 || nw > WORLDS.length) { this.shakeT = 0.25; g.audio.play('locked'); return; }
        if (!worldUnlocked(nw, save)) { this.shakeT = 0.25; g.audio.play('locked'); return; }
        this.slide = { dir: d, t: 0, swapped: false };
        g.audio.play('select');
        return;
      }
      if (!isUnlocked(this.w.levels[ni], save)) { this.shakeT = 0.25; g.audio.play('locked'); return; }
      this.index = ni; g.audio.play('move');
    };
    if (inp.pressed.right) move(1);
    if (inp.pressed.left) move(-1);
    // Touche/clic : sur un nœud = le sélectionner puis jouer ; flèches des bords = changer de monde
    for (const tap of inp.taps) {
      const v = g.view;
      for (let i = 0; i < n; i++) {
        const p = this.nodePos(i, v);
        if (Math.hypot(tap.x - p.x, tap.y - p.y) < 16) {
          if (i === this.index) return this.play();
          if (isUnlocked(this.w.levels[i], save)) { this.index = i; g.audio.play('move'); }
        }
      }
      const ay = this.nodePos(0, v).y;
      if (Math.abs(tap.y - ay) < 40 && tap.x > v.w - 28) { this.index = n - 1; move(1); }
      if (Math.abs(tap.y - ay) < 40 && tap.x < 28) { this.index = 0; move(-1); }
    }
    // Lancer : SAUT, ENTRÉE (ou bouton A de la manette) ou clic
    if (inp.pressed.confirm || inp.pressed.jump) return this.play();
    if (inp.pressed.pause) { g.audio.play('select'); g.gotoTitle(); }

    const p = this.nodePos(this.index, g.view);
    if (!this.placed) { this.kongX = p.x; this.kongY = p.y; this.placed = true; }
    this.kongX = damp(this.kongX, p.x, 12, dt);
    this.kongY = damp(this.kongY, p.y, 12, dt);
  }

  updateSlide(dt) {
    const sl = this.slide, v = this.game.view;
    sl.t += dt / 0.7;
    if (!sl.swapped && sl.t >= 0.5) {
      sl.swapped = true;
      this.world += sl.dir;
      const lv = WORLDS[this.world - 1].levels;
      if (sl.dir > 0) this.index = 0;
      else { let i = 0; while (i + 1 < lv.length && isUnlocked(lv[i + 1], this.game.save)) i++; this.index = i; }
      this.playMusic();
      const p = this.nodePos(this.index, v);
      this.kongX = p.x - sl.dir * v.w * 0.5; this.kongY = p.y;
    }
    if (!sl.swapped) { this.kongX += sl.dir * 260 * dt; }
    else { const p = this.nodePos(this.index, v); this.kongX += (p.x - this.kongX) * Math.min(1, dt * 10); this.kongY = p.y; }
    if (sl.t >= 1) this.slide = null;
  }

  /** Décalage horizontal du décor de la carte pendant la transition. */
  slideOffset() {
    const sl = this.slide;
    if (!sl) return 0;
    const w = this.game.view.w;
    const e = (k) => k * k * (3 - 2 * k);
    return sl.t < 0.5 ? -sl.dir * w * e(sl.t * 2) : sl.dir * w * (1 - e((sl.t - 0.5) * 2));
  }

  play() {
    const g = this.game;
    g.audio.unlock();
    g.audio.play('select');
    g.save.lastLevel = this.levelId;
    g.persist();
    g.startLevel(this.levelId);
  }

  render(ctx) {
    const g = this.game, v = g.view, save = g.save;
    ctx.setTransform(v.scale, 0, 0, v.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    this.bg().draw(ctx, this.cam, v);
    ctx.fillStyle = 'rgba(5,8,30,0.35)';
    ctx.fillRect(0, 0, v.w, v.h);

    const w = this.w, n = w.levels.length;
    const ox = Math.round(this.slideOffset());
    ctx.save(); ctx.translate(ox, 0);
    // Chemin
    ctx.lineWidth = 3;
    for (let i = 0; i + 1 < n; i++) {
      const a = this.nodePos(i, v), b = this.nodePos(i + 1, v);
      const open = isUnlocked(w.levels[i + 1], save);
      for (let s = 0; s <= 1; s += 0.08) {
        const x = a.x + (b.x - a.x) * s, y = a.y + (b.y - a.y) * s;
        ctx.fillStyle = '#0a0d24'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
        ctx.fillStyle = open ? '#ffc83d' : '#545e94'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
      }
    }
    // Nœuds
    for (let i = 0; i < n; i++) {
      const id = w.levels[i];
      const p = this.nodePos(i, v);
      const open = isUnlocked(id, save);
      const best = save.best[id];
      const sel = i === this.index;
      const isBoss = id.endsWith('-B');
      const r = (sel ? 11 + Math.sin(this.t * 6) : 9) + (isBoss ? 3 : 0);
      if (isBoss) {
        // cornes du boss
        for (const d of [-1, 1]) {
          ctx.fillStyle = '#0a0d24'; ctx.beginPath(); ctx.moveTo(p.x + d * (r - 6), p.y - r + 3); ctx.lineTo(p.x + d * (r + 3), p.y - r - 9); ctx.lineTo(p.x + d * (r - 1), p.y - r + 7); ctx.fill();
          ctx.fillStyle = open ? '#ffe9c9' : '#7f8cc8'; ctx.beginPath(); ctx.moveTo(p.x + d * (r - 5), p.y - r + 4); ctx.lineTo(p.x + d * (r + 2), p.y - r - 6); ctx.lineTo(p.x + d * (r - 2), p.y - r + 6); ctx.fill();
        }
      }
      ctx.fillStyle = '#0a0d24';
      ctx.beginPath(); ctx.arc(p.x, p.y, r + 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = !open ? '#3a3f70' : best ? (best.rating >= 3 ? '#ffc83d' : '#1767ff') : isBoss ? '#8a2be2' : '#ff4f5e';
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(p.x - r * 0.3, p.y - r * 0.35, r * 0.4, 0, Math.PI * 2); ctx.fill();
      drawText(ctx, open ? (isBoss ? '!' : String(i + 1)) : 'X', p.x + 1, p.y - 3, { align: 'center', color: open ? '#ffffff' : '#7f8cc8' });
      if (best) for (let s = 0; s < 3; s++) {
        const img = s < best.rating ? this.sprites.star : this.sprites.starGrey;
        ctx.drawImage(img, Math.round(p.x - 13 + s * 9), Math.round(p.y + r + 4));
      }
    }
    // Flèches de sortie vers les mondes voisins, au bout du chemin
    const arrowA = 0.5 + Math.sin(this.t * 5) * 0.5;
    const edge = (side) => {
      const nw = this.world + side;
      if (nw < 1 || nw > WORLDS.length) return;
      const open = worldUnlocked(nw, save);
      const p = this.nodePos(side > 0 ? n - 1 : 0, v);
      const x = side > 0 ? v.w - 20 : 20, y = p.y;
      const bob = Math.round(arrowA * 2) * side;
      drawText(ctx, side > 0 ? '→' : '←', x + bob, y - 3, { align: 'center', scale: 2, color: open ? '#ffc83d' : '#545e94', outline: '#0a0d24' });
      drawText(ctx, 'MONDE', x, y - 30, { align: 'center', color: open ? '#ffffff' : '#7f8cc8', outline: '#0a0d24' });
      drawText(ctx, String(nw), x, y - 20, { align: 'center', color: open ? '#ffffff' : '#7f8cc8', outline: '#0a0d24' });
      if (!open) drawText(ctx, 'X', x, y + 14, { align: 'center', color: '#7f8cc8', outline: '#0a0d24' });
    };
    edge(-1); edge(1);
    ctx.restore();

    // Kong
    const sh = this.shakeT > 0 ? Math.sin(this.t * 60) * 2 : 0;
    const k = this.sprites.kong.idle;
    const bob = Math.abs(Math.sin(this.t * 4)) * 2;
    ctx.drawImage(k, Math.round(this.kongX - k.width / 2 + sh), Math.round(this.kongY - 13 - k.height - bob));

    this.weather().draw(ctx, v, g.settings.reduceFx);

    // En-tête monde
    const th = THEMES[w.theme];
    panel(ctx, 70, 6, v.w - 140, 30, 'rgba(10,13,36,0.85)', '#7ee8ff');
    drawText(ctx, `MONDE ${this.world}`, v.w / 2, 11, { align: 'center', color: '#7ee8ff' });
    drawText(ctx, w.name.toUpperCase(), v.w / 2, 22, { align: 'center', scale: 1, color: '#ffffff' });
    void th;

    // Fiche du niveau
    const lv = LEVELS.find((l) => l.id === this.levelId);
    const best = save.best[lv.id];
    const pw = 250, ph = 58, px = v.w / 2 - pw / 2, py = v.h - ph - 8;
    panel(ctx, px, py, pw, ph, 'rgba(14,22,80,0.92)', '#ffc83d');
    drawText(ctx, `${levelShort(lv.id)} : ${lv.name.toUpperCase()}`, v.w / 2, py + 6, { align: 'center', color: '#ffc83d' });
    if (best) {
      drawText(ctx, `RECORD ${formatTime(best.time)}`, px + 10, py + 20, { color: '#ffffff' });
      drawText(ctx, `CIBLE ${formatTime(lv.parTime).slice(0, 4)}`, px + pw - 10, py + 20, { align: 'right', color: best.time <= lv.parTime ? '#ffc83d' : '#9fb2ea' });
      const st = (best.stars || []).filter(Boolean).length;
      if (lv.boss) drawText(ctx, `VAINCU !   NOTE ${best.rating}/3`, px + 10, py + 31, { color: '#cfe0ff' });
      else drawText(ctx, `ETOILES ${st}/3   FORFAITS ${best.coins}`, px + 10, py + 31, { color: '#cfe0ff' });
    } else {
      drawText(ctx, lv.boss ? 'A VAINCRE POUR OUVRIR LE MONDE SUIVANT' : 'JAMAIS TERMINE', v.w / 2, py + 22, { align: 'center', color: lv.boss ? '#ff9aa5' : '#9fb2ea' });
    }
    const blink = Math.sin(this.t * 6) > -0.3;
    if (blink) drawText(ctx, g.input.touchMode ? 'TOUCHE LE NIVEAU POUR JOUER' : 'SAUT / ENTREE : JOUER     ECHAP : TITRE', v.w / 2, py + ph - 13, { align: 'center', color: '#ffffff' });
    if (this.slide) { const k = Math.max(0, 1 - Math.abs(this.slide.t - 0.5) * 5); if (k > 0) { ctx.fillStyle = `rgba(5,8,30,${k})`; ctx.fillRect(0, 0, v.w, v.h); } }
    if (this.switchT > 0) { ctx.fillStyle = `rgba(255,255,255,${this.switchT})`; ctx.fillRect(0, 0, v.w, v.h); }
  }
}
