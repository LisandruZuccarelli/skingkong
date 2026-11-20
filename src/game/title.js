// Écran titre : intro "Sking Kong présente", logo animé, Kong qui ski, cycle des 4 ambiances (aube → jour → tempête → nuit).
import { Background } from './background.js';
import { levelLong } from './labels.js';
import { Weather } from './weather.js';
import { THEMES } from './themes.js';
import { buildLogo, drawLogo } from './logo.js';
import { drawText } from '../engine/font.js';
import { panel } from './hud.js';
import { drawHatRows } from './catalog.js';
import { drawIcon } from './menus.js';
import { ACHIEVEMENTS } from './progress.js';
import { LEVELS, nextLevelId, isUnlocked } from '../levels/index.js';

const CYCLE = ['dawn', 'glacier', 'storm', 'night'];
const HOLD = 7, FADE = 1.6;
let logoCache = null;

// Logo officiel de la liste (image fournie), découpé en cercle pour supprimer le fond de la capture.
const BADGE = { cx: 186, cy: 164, r: 153 };
let badge = null;
function loadBadge() {
  if (badge) return badge;
  badge = { ready: false, canvas: null };
  const img = new Image();
  img.onload = () => {
    const d = BADGE.r * 2;
    const c = document.createElement('canvas');
    c.width = d; c.height = d;
    const g = c.getContext('2d');
    g.beginPath(); g.arc(BADGE.r, BADGE.r, BADGE.r, 0, Math.PI * 2); g.clip();
    g.drawImage(img, BADGE.cx - BADGE.r, BADGE.cy - BADGE.r, d, d, 0, 0, d, d);
    badge.canvas = c; badge.ready = true;
  };
  img.src = './logo-skingkong.png';
  return badge;
}

export class TitleScene {
  constructor(game, { skipIntro = false } = {}) {
    this.game = game;
    this.bgs = CYCLE.map((n) => new Background(n));
    this.weathers = CYCLE.map((n) => new Weather(THEMES[n].weather, THEMES[n].wind));
    this.logo = logoCache || (logoCache = buildLogo());
    this.badge = loadBadge();
    this.cam = { x: 0, y: 160 };
    this.t = 0;
    this.phase = skipIntro ? 'main' : 'intro';
    this.mainT = 0;
    this.started = false;
    this.flakes = [];
    this.menuIndex = 0;
    if (skipIntro) game.music.play('title');
  }

  cycleState() {
    const span = HOLD + FADE;
    const k = this.mainT % (span * CYCLE.length);
    const i = Math.floor(k / span);
    const local = k - i * span;
    const fade = local > HOLD ? (local - HOLD) / FADE : 0;
    return { i, next: (i + 1) % CYCLE.length, fade };
  }

  /** Avancée de la sauvegarde : niveaux terminés, étoiles, et niveau où reprendre. */
  progress() {
    const save = this.game.save;
    const best = save.best || {};
    const done = LEVELS.filter((l) => best[l.id]).length;
    const stars = LEVELS.reduce((n, l) => n + (best[l.id] ? (best[l.id].stars || []).filter(Boolean).length : 0), 0);
    // reprendre : le dernier niveau joué s'il n'est pas terminé, sinon le suivant (s'il est ouvert)
    let resume = null;
    const last = save.lastLevel && LEVELS.find((l) => l.id === save.lastLevel) ? save.lastLevel : null;
    if (last) {
      resume = last;
      if (best[last]) { const n = nextLevelId(last); if (n && isUnlocked(n, save)) resume = n; }
    } else if (done > 0) resume = (LEVELS.find((l) => !best[l.id] && isUnlocked(l.id, save)) || LEVELS[0]).id;
    return { done, total: LEVELS.length, stars, totalStars: LEVELS.filter((l) => !l.boss).length * 3, resume };
  }

  menuItems() {
    const g = this.game;
    const pr = this.progress();
    const P = g.progress;
    const dailyLeft = P.save.daily ? P.save.daily.list.length - P.save.daily.done.length : 0;
    const play = pr.resume
      ? [{ label: `CONTINUER : ${levelLong(pr.resume)}`, run: () => g.startLevel(pr.resume) }, { label: 'CARTE DES MONDES', run: () => g.gotoMap() }]
      : [{ label: 'JOUER', run: () => g.gotoMap() }];
    return [
      ...play,
      { label: 'BOUTIQUE', run: () => g.gotoShop() },
      { label: `SUCCES  ${P.unlockedCount}/${ACHIEVEMENTS.length}`, run: () => g.gotoAchievements() },
      { label: dailyLeft ? `DEFIS  (${dailyLeft} A FAIRE)` : 'DEFIS', run: () => g.gotoChallenges() },
      { label: 'MODES BONUS', run: () => g.gotoBonus() },
      { label: 'CLASSEMENTS', run: () => g.gotoLeaderboard() },
      { label: g.online.user ? `COMPTE : ${g.online.user.pseudo.toUpperCase()}` : 'COMPTE (CONNEXION)', run: () => g.gotoAccount() },
      { label: 'OPTIONS', run: () => g.gotoOptions() },
    ];
  }

  /** Position des lignes du menu (partagée entre l'affichage et le tactile). */
  menuY(i) { return 14 + this.logo.h * Math.min(2, Math.max(1, Math.floor((this.game.view.w - 20) / this.logo.w))) + 18 + i * 11; }

  update(dt) {
    const g = this.game;
    const inp = g.input;
    this.t += dt;
    if (inp.pressed.debug) g.debug = !g.debug;
    const pressed = inp.pressed.jump || inp.pressed.confirm || inp.taps.length > 0;
    if (this.phase === 'intro') {
      if (this.t > 2.6 || (pressed && this.t > 0.2)) {
        this.phase = 'main'; this.mainT = 0;
        g.music.play('title');
        return;
      }
      return;
    }
    this.mainT += dt;
    this.cam.x += 34 * dt;
    const { i, next, fade } = this.cycleState();
    this.bgs[i].update(dt); this.bgs[next].update(dt);
    const wi = fade > 0.5 ? next : i;
    this.weathers[wi].update(dt, this.cam, g.view);
    if (this.mainT <= 0.5 || this.started) return;
    const items = this.menuItems();
    // ↑ est aussi une touche de saut : il sert ici à naviguer, pas à valider
    if (inp.pressed.down) { this.menuIndex = (this.menuIndex + 1) % items.length; g.audio.unlock(); g.audio.play('move'); }
    if (inp.pressed.up && !inp.pressed.confirm) { this.menuIndex = (this.menuIndex + items.length - 1) % items.length; g.audio.unlock(); g.audio.play('move'); }
    let chosen = -1;
    if (inp.pressed.confirm || (inp.pressed.jump && !inp.pressed.up && !inp.held.up)) chosen = this.menuIndex;
    for (const tap of inp.taps) items.forEach((it, i) => { if (Math.abs(tap.y - this.menuY(i) - 3) < 5.5 && Math.abs(tap.x - g.view.w / 2) < 100) chosen = i; });
    if (chosen >= 0) {
      this.started = true;
      g.audio.unlock(); g.audio.play('select');
      items[chosen].run();
    }
  }

  render(ctx) {
    const g = this.game;
    const v = g.view;
    ctx.setTransform(v.scale, 0, 0, v.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;

    if (this.phase === 'intro') {
      ctx.fillStyle = '#05060f';
      ctx.fillRect(0, 0, v.w, v.h);
      const a = Math.min(1, this.t / 0.5) * Math.min(1, Math.max(0, (2.5 - this.t) / 0.5));
      const a2 = Math.min(1, Math.max(0, (this.t - 0.6) / 0.4)) * Math.min(1, Math.max(0, (2.5 - this.t) / 0.5));
      if (this.badge.ready) {
        const size = Math.min(v.h * 0.62, v.w * 0.6);
        const pop = Math.min(1, this.t / 0.6);
        const k = 1 + Math.sin(pop * Math.PI) * 0.06 + (1 - pop) * -0.25;
        const bs = size * k;
        const cx = v.w / 2, cy = v.h / 2 - 18;
        ctx.globalAlpha = a * 0.5;
        ctx.globalCompositeOperation = 'lighter';
        const grd = ctx.createRadialGradient(cx, cy, bs * 0.4, cx, cy, bs * 0.75);
        grd.addColorStop(0, 'rgba(90,170,255,0.5)'); grd.addColorStop(1, 'rgba(90,170,255,0)');
        ctx.fillStyle = grd; ctx.fillRect(cx - bs, cy - bs, bs * 2, bs * 2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = a;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.badge.canvas, cx - bs / 2, cy - bs / 2, bs, bs);
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 1;
        drawText(ctx, 'PRESENTE', v.w / 2, cy + size / 2 + 10, { align: 'center', scale: 2, color: '#cfe0ff', alpha: a2 });
      } else {
        drawText(ctx, 'SKING KONG', v.w / 2, v.h / 2 - 20, { align: 'center', scale: 3, color: '#7ee8ff', alpha: a, shadow: '#1767ff' });
        drawText(ctx, 'PRESENTE', v.w / 2, v.h / 2 + 10, { align: 'center', color: '#cfe0ff', alpha: a2 });
      }
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const x = (i * 83 + this.t * 20 * (1 + (i % 3))) % v.w;
        const y = (i * 47 + this.t * 30 * (1 + (i % 2))) % v.h;
        ctx.globalAlpha = 0.3 * a;
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
      ctx.globalAlpha = 1;
      return;
    }

    const { i, next, fade } = this.cycleState();
    this.bgs[i].draw(ctx, this.cam, v);
    if (fade > 0) { ctx.globalAlpha = fade; this.bgs[next].draw(ctx, this.cam, v); ctx.globalAlpha = 1; }

    // Piste au premier plan
    const night = CYCLE[fade > 0.5 ? next : i] === 'night';
    ctx.fillStyle = night ? '#c9d0f5' : '#eef6ff';
    ctx.fillRect(0, v.h - 34, v.w, 34);
    ctx.fillStyle = night ? '#8f97d8' : '#b9cdf5';
    for (let x = 0; x < v.w; x += 2) ctx.fillRect(x, v.h - 34 + Math.round(Math.sin((x + this.cam.x * 2) * 0.05) * 1.5), 2, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, v.h - 35, v.w, 1);

    // Kong arrive en skiant puis glisse au centre
    const k = g.sprites.kong;
    const enter = Math.min(1, this.mainT / 1.1);
    const ease = 1 - Math.pow(1 - enter, 3);
    // Kong se range à gauche pour laisser la place au menu
    const kx = -60 + (Math.min(v.w / 2, Math.max(60, v.w / 2 - 150)) + 60) * ease;
    const hop = enter < 1 ? 0 : Math.max(0, Math.sin((this.mainT - 1.1) * 2.2)) * (Math.sin((this.mainT - 1.1) * 0.55) > 0.7 ? 18 : 0);
    const ky = v.h - 34 - hop;
    const frame = hop > 2 ? k.jump : enter < 1 ? (Math.floor(this.mainT * 10) % 2 ? k.run1 : k.run2) : k.idle;
    const sc = 3;
    ctx.save();
    ctx.translate(Math.round(kx), Math.round(ky));
    ctx.fillStyle = '#0a0d24'; ctx.fillRect(-13 * sc, -2 * sc, 26 * sc, 3 * sc); ctx.fillRect(10 * sc, -5 * sc, 4 * sc, 4 * sc);
    ctx.fillStyle = k.ski; ctx.fillRect(-12 * sc, -2 * sc, 24 * sc, 1 * sc); ctx.fillRect(11 * sc, -4 * sc, 2 * sc, 2 * sc);
    ctx.fillStyle = k.skiD; ctx.fillRect(-12 * sc, -1 * sc, 24 * sc, 1 * sc);
    ctx.drawImage(frame, -8 * sc, -(frame.height + 1) * sc, frame.width * sc, frame.height * sc);
    drawHatRows(ctx, g.look.hat, -8 * sc, -(frame.height + 1) * sc, sc);
    if (Math.sin(this.mainT * 1.3) > 0.97) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-3 * sc, -(frame.height - 3) * sc, sc, sc); ctx.fillRect(3 * sc, -(frame.height - 3) * sc, sc, sc); }
    ctx.restore();
    if (hop < 2 && Math.random() < 0.7) this.flakes.push({ x: kx - 34, y: ky - 4, vx: -60 - Math.random() * 90, vy: -30 - Math.random() * 70, t: 0 });
    ctx.fillStyle = '#ffffff';
    for (const f of this.flakes) {
      f.t += g.lastDt; f.x += f.vx * g.lastDt; f.y += f.vy * g.lastDt; f.vy += 300 * g.lastDt;
      ctx.globalAlpha = Math.max(0, 1 - f.t * 2);
      ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
    }
    ctx.globalAlpha = 1;
    this.flakes = this.flakes.filter((f) => f.t < 0.5);

    // Logo : chute avec rebond puis flottement
    const L = this.logo;
    const ls = Math.min(2, Math.max(1, Math.floor((v.w - 20) / L.w)));
    const drop = Math.min(1, this.mainT / 0.7);
    const bounce = drop < 1 ? -120 * Math.pow(1 - drop, 2) : Math.sin((this.mainT - 0.7) * 10) * 6 * Math.exp(-(this.mainT - 0.7) * 4);
    const float = Math.sin(this.mainT * 1.6) * 2;
    drawLogo(ctx, L, v.w / 2 - (L.w * ls) / 2, 14 + bounce + float, ls, this.mainT);
    const ly = 14 + L.h * ls;
    const subA = Math.min(1, Math.max(0, (this.mainT - 0.6) / 0.4));
    drawText(ctx, 'ESTP CACHAN  ·  LISTE SKI 2027', v.w / 2, ly + 4, { align: 'center', color: '#ffd23f', alpha: subA, outline: '#0a0d24' });

    const items = this.menuItems();
    const pr = this.progress();
    if (this.mainT > 1.2) {
      // menu principal
      const mw = Math.max(200, ...items.map((it) => it.label.length * 6 + 40)), my0 = this.menuY(0) - 5;
      panel(ctx, v.w / 2 - mw / 2, my0, mw, items.length * 11 + 7, 'rgba(10,13,36,0.55)', '#2a3060');
      items.forEach((it, i) => {
        const sel = i === this.menuIndex;
        const pulse = Math.sin(this.mainT * 5) > 0;
        const bob = sel ? Math.round(Math.sin(this.mainT * 8)) : 0;
        drawText(ctx, (sel ? '> ' : '') + it.label + (sel ? ' <' : ''), v.w / 2 + bob, this.menuY(i), { align: 'center', color: sel ? (pulse ? '#ffffff' : '#7ee8ff') : '#9fb2ea', outline: '#0a0d24' });
      });
      // bas d'écran : avancée, porte-monnaie, plein écran
      const by = v.h - 24;
      const txt = pr.done > 0 ? `NIVEAUX ${pr.done}/${pr.total}   ETOILES ${pr.stars}/${pr.totalStars}` : 'BIENVENUE A LA STATION !';
      const wtxt = String(g.progress.wallet);
      const pw = txt.length * 6 + 30 + wtxt.length * 6 + 24;
      panel(ctx, v.w / 2 - pw / 2, by, pw, 16, 'rgba(10,13,36,0.82)', '#7ee8ff');
      drawText(ctx, txt, v.w / 2 - pw / 2 + 8, by + 4, { color: '#ffffff' });
      drawIcon(ctx, 'coin', v.w / 2 + pw / 2 - 18 - wtxt.length * 6, by + 3);
      drawText(ctx, wtxt, v.w / 2 + pw / 2 - 6, by + 4, { align: 'right', color: '#ffc83d' });
      if (!g.input.touchMode) drawText(ctx, 'F : PLEIN ECRAN', v.w - 6, v.h - 10, { align: 'right', color: '#ffd23f', outline: '#0a0d24', alpha: 0.8 });
    }
    const wi = fade > 0.5 ? next : i;
    this.weathers[wi].draw(ctx, v, g.settings.reduceFx);
    drawText(ctx, THEMES[CYCLE[wi]].label, 6, v.h - 10, { color: '#ffffff', alpha: 0.5, shadow: null });
  }
}
