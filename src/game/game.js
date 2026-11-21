// Noyau : canvas responsive, boucle à pas variable, gestion des scènes, transitions, sauvegarde locale.
import { Input } from '../engine/input.js';
import { AudioEngine } from '../engine/audio.js';
import { Music } from '../engine/music.js';
import { buildSprites, buildKong, ghostPalette } from '../engine/sprites.js';
import { drawText } from '../engine/font.js';
import { TitleScene } from './title.js';
import { LevelScene } from './level.js';
import { getLevel, nextLevelId, LEVELS } from '../levels/index.js';
import { Progress } from './progress.js';
import { ShopScene, AchievementsScene, ChallengesScene, OptionsScene, drawIcon } from './menus.js';
import { WorldMapScene } from './worldmap.js';
import { AccountScene, LeaderboardScene, ProfileScene } from './online-menus.js';
import { BonusScene } from './bonus-menus.js';
import { EditorScene } from '../modes/editor.js';
import { Online } from '../online/service.js';
import { Replays } from '../modes/replays.js';
import { browserStorage } from '../online/local.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../online/config.js';

const SAVE_KEY = 'skingkong.save.v1';
const BASE_H = 270;
const MIN_W = 360;

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s === 'object') return { best: {}, settings: {}, totalCoins: 0, ...s };
  } catch (_) { /* stockage indisponible : on joue sans sauvegarde */ }
  return { best: {}, settings: {}, totalCoins: 0 };
}

/** Identifiant de cet appareil (porte-monnaie par appareil, voir src/online/merge.js) */
function deviceId() {
  try {
    let id = localStorage.getItem('skingkong.device');
    if (!id) { id = 'd' + Math.random().toString(36).slice(2, 10); localStorage.setItem('skingkong.device', id); }
    return id;
  } catch (_) { return 'local'; }
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.view = { w: 480, h: BASE_H, scale: 1, dpr: 1 };
    this.audio = new AudioEngine();
    this.input = new Input(this);
    this.sprites = buildSprites();
    this.save = loadSave();
    this.settings = { reduceFx: false, musicVol: 1, sfxVol: 0.8, ...this.save.settings };
    // v2 du son : MUSIQUE devient un volume général (100 % par défaut), dosé ensuite par écran (carte 50 %, niveaux 20 %)
    if (!this.settings.audioV2) {
      if (this.settings.musicVol === 0) this.settings.musicOn = false;
      this.settings.musicVol = 1;
      this.settings.audioV2 = true;
    }
    this.save.settings = this.settings;
    this.input.loadBindings(this.settings.bindings);
    // progression : porte-monnaie, objets, succès, défis ; série de connexion versée au lancement
    this.progress = new Progress(this.save, LEVELS, () => this.persist(), undefined, deviceId());
    this.ghosts = new Map();
    this.applyLook();
    // en ligne : serveur Supabase si configuré, sinon comptes et classements sur l'appareil
    this.online = new Online(this, { storage: browserStorage(), levels: LEVELS, url: SUPABASE_URL, key: SUPABASE_ANON_KEY });
    this.replays = new Replays(browserStorage());
    this.progress.login();
    this.progress.flush();
    if (this.online.user) this.online.sync();
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.online.pushNow().catch(() => {}); });
    this.flushT = 0;
    this.music = new Music(this.audio);
    this.applyVolumes();
    this.debug = false;
    this.time = 0;
    this.fps = 60; this.lastDt = 1 / 60;
    this.fade = 1; this.fadeDir = -1; this.pending = null;
    this.text = drawText;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 100));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.audio.setSlide(0); });
    this.scene = new TitleScene(this);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.floor(window.innerWidth * dpr);
    const ch = Math.floor(window.innerHeight * dpr);
    this.canvas.width = cw;
    this.canvas.height = ch;
    let scale = ch / BASE_H;
    let w = cw / scale;
    let h = BASE_H;
    if (w < MIN_W) { scale = cw / MIN_W; w = MIN_W; h = ch / scale; }
    this.view = { w, h, scale, dpr };
    this.ctx.imageSmoothingEnabled = false;
  }

  toLogical(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * this.canvas.width;
    const y = ((clientY - r.top) / r.height) * this.canvas.height;
    return { x: x / this.view.scale, y: y / this.view.scale };
  }

  applyVolumes() {
    const s = this.settings;
    this.audio.volumes.music = s.musicOn === false ? 0 : s.musicVol;
    this.audio.volumes.sfx = s.sfxOn === false ? 0 : s.sfxVol;
    this.audio.applyVolumes();
  }

  persist() {
    this.save.updatedAt = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (_) { /* quota / mode privé */ }
    if (this.online) this.online.markDirty();
  }

  goto(factory) {
    if (this.pending) return;
    this.pending = factory;
    this.fadeDir = 1;
  }

  /** Applique le skin, l'accessoire, la traînée et l'effet de saut équipés. */
  applyLook() {
    const pr = this.progress;
    this.look = { skin: pr.equipped('skin'), hat: pr.equipped('hat'), trail: pr.equipped('trail'), effect: pr.equipped('effect') };
    this.sprites.kong = buildKong(this.look.skin.pal);
    if (this.look.hat.id === 'none') this.look.hat = null;
    // le skin du profil (visible au classement) suit la tenue équipée
    const u = this.online && this.online.user;
    if (u && u.skin !== this.look.skin.id) this.online.updateProfile({ skin: this.look.skin.id }).catch(() => {});
  }
  /** Traînée d'une liste de couleurs : unie (une couleur par fantôme) ou rayée (toutes les bandes sur chaque fantôme). */
  trailGhost(trail, n) { return trail.stripes ? this.ghostStripes(trail.colors) : this.ghostFor(trail.colors[n % trail.colors.length]); }
  /** Fantômes rayés horizontalement (arc-en-ciel), mis en cache. */
  ghostStripes(colors) {
    const key = 'stripes:' + colors.join();
    if (this.ghosts.has(key)) return this.ghosts.get(key);
    const base = this.ghostFor('#ffffff');
    const out = {};
    for (const [name, fr] of Object.entries(base)) {
      if (!fr || !fr.getContext) { out[name] = fr; continue; }
      const c = document.createElement('canvas'); c.width = fr.width; c.height = fr.height;
      const g = c.getContext('2d');
      g.drawImage(fr, 0, 0);
      g.globalCompositeOperation = 'source-atop'; // peint seulement sur la silhouette, sans effacer les autres bandes
      const band = fr.height / colors.length;
      colors.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, Math.floor(i * band), fr.width, Math.ceil(band)); });
      out[name] = c;
    }
    out.ski = colors[colors.length - 1]; out.skiD = colors[colors.length - 1];
    this.ghosts.set(key, out);
    return out;
  }
  /** Sprites « fantômes » d'une couleur (traînées), mis en cache. */
  ghostFor(color) {
    if (!this.ghosts.has(color)) this.ghosts.set(color, buildKong(ghostPalette(color)));
    return this.ghosts.get(color);
  }
  gotoShop() { this.goto(() => new ShopScene(this)); }
  gotoAchievements() { this.goto(() => new AchievementsScene(this)); }
  gotoChallenges() { this.goto(() => new ChallengesScene(this)); }
  gotoOptions() { this.goto(() => new OptionsScene(this)); }
  gotoBonus() { this.goto(() => new BonusScene(this)); }
  gotoEditor() { this.goto(() => new EditorScene(this)); }
  gotoAccount() { this.goto(() => new AccountScene(this)); }
  gotoLeaderboard() { this.goto(() => new LeaderboardScene(this)); }
  gotoProfile() { this.goto(() => new ProfileScene(this)); }

  gotoTitle() { this.goto(() => new TitleScene(this, { skipIntro: true })); }
  gotoMap(levelId) { this.goto(() => new WorldMapScene(this, { levelId })); }
  startLevel(id) { this.save.lastLevel = id; this.persist(); this.goto(() => new LevelScene(this, getLevel(id))); }
  nextLevel(id) { const n = nextLevelId(id); if (n) this.startLevel(n); else this.gotoMap(id); }

  /** Sortie du plein écran par ÉCHAP sur les navigateurs sans Keyboard Lock (Firefox, Safari) : la partie se met en pause. */
  watchFullscreen() {
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) return;
      try { navigator.keyboard && navigator.keyboard.unlock && navigator.keyboard.unlock(); } catch (_) { /* non supporté */ }
      const sc = this.scene;
      if (sc instanceof LevelScene && sc.state === 'play') { sc.state = 'paused'; sc.pauseIndex = 0; this.audio.setSlide(0); this.music.muffle(true); }
    });
  }

  toggleFullscreen() {
    const d = document;
    if (!d.fullscreenElement) {
      const el = d.documentElement;
      const req = (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
      // Chrome / Edge : on garde ÉCHAP pour le jeu (RETOUR / PAUSE) ; maintenir ÉCHAP quitte le plein écran.
      Promise.resolve(req).then(() => { if (navigator.keyboard && navigator.keyboard.lock) return navigator.keyboard.lock(['Escape']); }).catch(() => {});
      try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (_) { /* non supporté */ }
    } else (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  }

  start() {
    this.watchFullscreen();
    let last = performance.now();
    const loop = (now) => {
      // dt variable, plafonné pour éviter les sauts énormes après un onglet en arrière-plan.
      const raw = (now - last) / 1000;
      last = now;
      const dt = Math.min(Math.max(raw, 0), 1 / 20);
      this.lastDt = dt;
      if (raw > 0) this.fps += (1 / raw - this.fps) * 0.05;
      // appareil lent : après 5 s sous 40 images/s en jeu, on réduit les effets une fois (réversible dans les options)
      if (!this.settings.reduceFx && !this.settings.autoFxDone && this.scene instanceof LevelScene && this.scene.state === 'play' && !document.hidden) {
        this.slowT = this.fps < 40 ? (this.slowT || 0) + dt : 0;
        if (this.slowT > 5) {
          this.settings.reduceFx = true; this.settings.autoFxDone = true; this.persist();
          this.progress.toasts.push({ title: 'EFFETS REDUITS', sub: 'POUR UN JEU PLUS FLUIDE (OPTIONS)', icon: 'flame', t: 0 });
        }
      }
      this.time += dt;
      try { this.frame(dt); } catch (err) { this.crash(err); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** Une erreur imprévue ne fige pas le jeu : on sauvegarde, on revient au menu et on prévient. */
  crash(err) {
    console.error(err);
    const now = performance.now();
    this.crashes = (this.crashes || []).filter((t) => now - t < 3000).concat(now);
    try { this.persist(); } catch (_) { /* sauvegarde impossible */ }
    if (this.crashes.length > 3) {
      // erreurs en boucle (même au menu) : écran fixe plutôt qu'une image noire
      const ctx = this.ctx, v = this.view;
      ctx.setTransform(v.scale, 0, 0, v.scale, 0, 0);
      ctx.fillStyle = '#0a0d24'; ctx.fillRect(0, 0, v.w, v.h);
      drawText(ctx, 'OUPS, KONG A CHUTE HORS PISTE', v.w / 2, v.h / 2 - 16, { align: 'center', color: '#ffc83d', scale: 2 });
      drawText(ctx, 'TA PROGRESSION EST SAUVEGARDEE. RECHARGE LA PAGE (F5).', v.w / 2, v.h / 2 + 8, { align: 'center', color: '#ffffff' });
      drawText(ctx, String(err && err.message || err).toUpperCase().slice(0, 70), v.w / 2, v.h / 2 + 24, { align: 'center', color: '#7f8cc8' });
      return;
    }
    this.progress.toasts.push({ title: 'OUPS, PETIT BUG', sub: 'RETOUR AU MENU (PROGRESSION SAUVEGARDEE)', icon: 'flame', t: 0 });
    this.fade = 0; this.fadeDir = 0;
    this.scene = new TitleScene(this, { skipIntro: true });
  }

  frame(dt) {
    {
      this.input.update();
      if (this.input.pressed.fullscreen) this.toggleFullscreen();
      this.updateFade(dt);
      this.scene.update(dt);
      this.scene.render(this.ctx);
      this.drawFade();
      // temps de jeu, sauvegarde régulière, notifications (succès, défis, série)
      if (this.scene instanceof LevelScene && this.scene.state === 'play') this.progress.inc('playTime', dt);
      this.flushT += dt;
      if (this.flushT > 10) { this.flushT = 0; this.progress.check(); this.progress.flush(); }
      this.online.tick(dt);
      this.drawToasts(dt);
    }
  }

  drawToasts(dt) {
    const q = this.progress.toasts;
    if (!q.length) return;
    const t0 = q[0];
    if (t0.t === 0) this.audio.play(t0.icon === 'trophy' ? 'powerup' : t0.icon === 'coin' ? 'coin' : 'checkpoint');
    t0.t += dt;
    const D = 3.2;
    const ctx = this.ctx, v = this.view;
    ctx.setTransform(v.scale, 0, 0, v.scale, 0, 0);
    const k = Math.min(1, t0.t / 0.25, (D - t0.t) / 0.3);
    const ease = 1 - Math.pow(1 - Math.max(0, k), 3);
    const w = Math.min(v.w - 16, Math.max(220, Math.max(t0.title.length, t0.sub.length) * 6 + 40));
    const x = v.w / 2 - w / 2, y = -30 + ease * 38;
    ctx.fillStyle = '#0a0d24'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, w + 2, 28);
    ctx.fillStyle = 'rgba(14,22,80,0.96)'; ctx.fillRect(Math.round(x), Math.round(y), w, 26);
    ctx.fillStyle = '#ffc83d'; ctx.fillRect(Math.round(x), Math.round(y) + 25, Math.round(w * Math.max(0, 1 - t0.t / D)), 1);
    const shine = (t0.t * 300) % (w + 60) - 30;
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(Math.round(x + shine), Math.round(y), 12, 26);
    drawIcon(ctx, t0.icon, x + 8, y + 8);
    drawText(ctx, t0.title, x + 24, y + 5, { color: '#ffc83d' });
    drawText(ctx, t0.sub, x + 24, y + 15, { color: '#ffffff' });
    if (t0.t >= D) q.shift();
  }

  updateFade(dt) {
    if (this.fadeDir > 0) {
      this.fade = Math.min(1, this.fade + dt * 4.5);
      if (this.fade >= 1 && this.pending) {
        const f = this.pending;
        this.pending = null;
        this.audio.setSlide(0);
        this.scene = f();
        this.fadeDir = -1;
      }
    } else this.fade = Math.max(0, this.fade - dt * 3.5);
  }

  drawFade() {
    if (this.fade <= 0) return;
    const ctx = this.ctx;
    const v = this.view;
    ctx.setTransform(v.scale, 0, 0, v.scale, 0, 0);
    // Transition en "volets" diagonaux pixelisés
    const bands = 12;
    const bh = v.h / bands;
    ctx.fillStyle = '#0a0d24';
    for (let i = 0; i < bands; i++) {
      const k = Math.min(1, Math.max(0, this.fade * 1.6 - (i / bands) * 0.6));
      const w = (v.w + 40) * k;
      if (i % 2) ctx.fillRect(0, Math.floor(i * bh), Math.ceil(w), Math.ceil(bh) + 1);
      else ctx.fillRect(v.w - w, Math.floor(i * bh), Math.ceil(w), Math.ceil(bh) + 1);
    }
  }
}
