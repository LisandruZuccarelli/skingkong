// Scène de niveau : orchestre carte, joueur, entités, caméra, effets ("juice"), HUD, pause et résultats.
import { T, parseLevel, TileMap } from './tilemap.js';
import { levelShort } from './labels.js';
import { Player, PHYS } from './player.js';
import { createEntity } from './entities.js';
import { createBoss } from './bosses.js';
import { drawHatRows } from './catalog.js';
import { buildTileCanvas, buildLooseTiles } from './tilerender.js';
import { Background } from './background.js';
import { Weather } from './weather.js';
import { getTheme, THEME_ORDER } from './themes.js';
import { Darkness, drawGlow } from '../engine/lights.js';
import { Zipline, Chairlift, Avalanche, WindField, updateZip, ZIP } from './mechanics.js';
import { Particles } from '../engine/particles.js';
import { Camera } from '../engine/camera.js';
import { clamp, damp, aabb, formatTime } from '../engine/util.js';
import { MIX } from '../engine/music.js';
import { shareCard, preloadShare } from './share.js';
import { toggleSound, stepVolume, tapVolumeRow } from './volume.js';
import { drawHUD, drawTouchControls, drawPause, pauseLayout, drawResults, drawBanners, drawSignBubble, drawDebug, touchLayout, drawDeath } from './hud.js';

const SNOW = ['#ffffff', '#eef6ff', '#cfe0ff'];
// Phrases de chute (chaque phrase contient « SKI », affiché en couleurs)
export const DEATH_PHRASES = [
  'SKIBIDI MORT', 'SKILL ISSUE', 'SKIBIDI FAIL', 'SKIBIDI DOP DOP... NON', 'OHIO SKI CLUB', 'AURA : -1000 SKI',
  'SKIBIDI RESPAWN', 'SKIPPE LE TUTO ?', 'RIZZ 0 - SKI 0', 'SKIBIDI TOILETTE DE NEIGE', 'GYATT... SKI-RATE', 'SKIBIDI SIGMA DOWN',
];

const GHOST_FRAMES = ['idle', 'run1', 'run2', 'jump', 'fall', 'crouch', 'wall', 'skid', 'dead', 'win'];

export class LevelScene {
  constructor(game, data, opts = {}) {
    this.game = game;
    this.data = data;
    this.sprites = game.sprites;
    // mode bonus (speedrun, infini, défi, niveau du jour, éditeur) : voir src/modes/modes.js
    this.mode = opts.mode || null;
    this.label = data.label || levelShort(data.id);
    const parsed = parseLevel(data);
    this.map = new TileMap(parsed.w, parsed.h, parsed.tiles);
    this.bounds = { w: parsed.w * T, h: parsed.h * T };
    this.particles = new Particles(1000);
    this.camera = new Camera();
    this.darkness = new Darkness();
    this.setTheme(opts.theme || data.theme);
    this.water = [];
    for (let ty = 0; ty < this.map.h; ty++) for (let tx = 0; tx < this.map.w; tx++) if (this.map.get(tx, ty) === 'w') this.water.push({ tx, ty, surface: this.map.get(tx, ty - 1) !== 'w' });
    this.musicI = 0.3;

    this.entities = [];
    const ctx = { starIndex: 0, signIndex: 0, signs: data.signs || [], map: this.map };
    const sorted = parsed.entities.slice().sort((a, b) => a.tx - b.tx || a.ty - b.ty);
    const zipAnchors = [], liftAnchors = [];
    for (const e of sorted) {
      if (e.type === 'z') { zipAnchors.push(e); continue; }
      if (e.type === 't') { liftAnchors.push(e); continue; }
      const ent = createEntity(e.type, e.tx, e.ty, ctx);
      if (ent) { ent.spawn = e; this.entities.push(ent); }
    }
    this.ziplines = [];
    for (let i = 0; i + 1 < zipAnchors.length; i += 2) this.ziplines.push(new Zipline(zipAnchors[i], zipAnchors[i + 1]));
    this.lifts = [];
    for (let i = 0; i + 1 < liftAnchors.length; i += 2) this.lifts.push(new Chairlift(liftAnchors[i], liftAnchors[i + 1]));
    this.enemySpawns = sorted.filter((e) => 'eopf'.includes(e.type));
    this.platforms = this.entities.filter((e) => e.solidPlatform);
    for (const l of this.lifts) this.platforms.push(...l.platforms);
    this.wind = new WindField(data.wind);
    this.windAt = data.wind ? (pl) => this.wind.at(pl.cx) : null;
    this.avalanche = data.avalanche ? new Avalanche(data.avalanche) : null;
    this.keys = 0;
    this.doorsOpened = []; // [{ x, tiles }]
    this.totalKeys = parsed.entities.filter((e) => e.type === 'K').length;
    this.doorAnim = [];
    this.lockedMsgT = 0;
    this.totalCoins = parsed.entities.filter((e) => e.type === '$').length;
    this.totalStars = parsed.entities.filter((e) => e.type === '*').length;
    this.fakeWalls = [];
    for (let ty = 0; ty < this.map.h; ty++) for (let tx = 0; tx < this.map.w; tx++) if (this.map.get(tx, ty) === 'H') this.fakeWalls.push({ tx, ty });

    this.start = { x: parsed.start.tx * T + 3, y: (parsed.start.ty + 1) * T - PHYS.h };
    this.player = new Player(this.start.x, this.start.y);
    // Le double saut s'obtient au 1-1 et reste acquis pour toute la suite de l'aventure.
    if (data.id !== '1-1' || game.save.doubleJump) this.player.canDouble = true;
    // fantôme : meilleure descente enregistrée sur ce niveau (rejouée en transparence)
    this.ghostKey = this.mode ? this.mode.ghostKey : data.boss ? null : data.id;
    this.ghost = this.ghostKey && game.settings.ghost !== false ? game.replays.load(this.ghostKey) : null;
    this.ghostRec = []; this.ghostT = 0;
    this.checkpoint = null;
    this.camera.snap(this.player.cx, this.player.y);

    this.coins = 0;
    this.stars = new Array(this.totalStars).fill(false);
    this.deaths = 0;
    this.time = 0;
    this.timerOn = false;
    this.freeze = 0;
    this.flash = 0; this.flashColor = '#ffffff';
    this.combo = 0; this.comboT = 0;
    this.trails = []; this.trailT = 0; this.dustT = 0;
    this.popups = [];
    this.banners = [{ title: this.label, sub: data.name.toUpperCase(), t: 0, dur: 2.6, big: true }];
    this.state = 'play';
    this.stateT = 0;
    this.pauseIndex = 0;
    this.hAlpha = 1;
    this.skiAngle = 0;
    this.results = null;
    this.ratingShown = 0;
    this.best = game.save.best[data.id] || null;
    // mode assisté (options) : jeu ralenti et/ou bouclier ; la partie ne compte ni au classement ni pour les records
    this.assistSpeed = game.settings.gameSpeed || 1;
    this.shield = !!game.settings.shield;
    this.assisted = this.assistSpeed < 1 || this.shield;
    this.shieldT = 0;
    if (this.mode && this.mode.setup) this.mode.setup(this);
    preloadShare();
    // Boss : arène fixe (caméra bloquée), combat qui démarre dès l'entrée
    this.boss = data.boss ? createBoss(data.boss, this) : null;
    if (this.boss) {
      this.camera.lock = { x: this.bounds.w / 2, y: this.bounds.h / 2 - 1 };
      this.camera.snap(this.camera.lock.x, this.camera.lock.y);
      this.banners = [{ title: 'BOSS', sub: this.boss.name, t: 0, dur: 2.4, big: true }];
      this.musicBoost = 1;
    }
  }

  /** fait apparaître un ennemi en cours de partie (renforts des boss) */
  spawnEnemy(type, tx, ty) {
    const ent = createEntity(type, tx, ty, { starIndex: 0, signIndex: 0, signs: [], map: this.map });
    if (ent) this.entities.push(ent);
    return ent;
  }

  get prog() { return this.game.progress; }

  setTheme(name) {
    this.themeName = name;
    this.theme = getTheme(name);
    this.tileCanvas = buildTileCanvas(this.map, this.theme.tiles);
    this.loose = buildLooseTiles(this.theme.tiles);
    this.bg = new Background(name);
    this.weather = new Weather(this.theme.weather, this.theme.wind);
    this.darkAmount = this.data.dark ?? this.theme.dark;
    this.game.music.play(this.data.music || this.theme.music, MIX.level);
  }

  // ---------- Événements de jeu & juice ----------
  fx(name, d) {
    const a = this.game.audio;
    const p = this.player;
    const P = this.particles;
    switch (name) {
      case 'jump': {
        a.play('jump');
        this.prog.inc('jumps');
        const e = this.game.look.effect;
        P.burst(p.cx, p.bottom, e.id === 'snow' ? 7 : 10, { color: e.colors, speed: 60, angle: -Math.PI / 2, spread: Math.PI * 0.9, g: e.g ?? 200, life: 0.35, size: 2, drag: 3, shape: e.shape, additive: e.additive });
        break;
      }
      case 'djump': {
        a.play('djump');
        this.prog.inc('jumps'); this.prog.inc('djumps');
        const e = this.game.look.effect;
        P.spawn(p.cx, p.bottom, 0, 0, 0.3, 2, e.ring || (e.id === 'snow' ? '#7ee8ff' : e.colors[0]), { shape: 'ring', grow: 50, shrink: false });
        P.burst(p.cx, p.bottom, 10, { color: e.id === 'snow' ? ['#7ee8ff', '#ffffff'] : e.colors, speed: 70, angle: Math.PI / 2, spread: Math.PI, life: 0.4, size: 2, drag: 4, additive: e.id === 'snow' ? true : e.additive, shape: e.shape, g: e.g ?? 0 });
        break;
      }
      case 'walljump': {
        a.play('walljump');
        this.prog.inc('walljumps');
        this.wallChain = (this.wallChain || 0) + 1;
        this.prog.max('bestWallChain', this.wallChain);
        const wx = p.facing > 0 ? p.x : p.x + p.w;
        P.burst(wx, p.y + p.h / 2, 8, { color: SNOW, speed: 70, angle: p.facing > 0 ? 0 : Math.PI, spread: 1.4, g: 150, life: 0.35, size: 2 });
        this.camera.shake(0.12);
        break;
      }
      case 'land': {
        this.stompChain = 0; this.wallChain = 0;
        const vy = d.vy;
        const k = clamp((vy - 150) / 350, 0, 1);
        if (vy > 120) {
          p.squash(1 + 0.4 * k + 0.1, 1 - 0.35 * k - 0.08);
          a.play('land', 0.4 + k);
          P.burst(p.cx, p.bottom, 4 + Math.round(10 * k), { color: SNOW, speed: 40 + 60 * k, angle: -Math.PI / 2, spread: Math.PI * 1.1, g: 220, life: 0.4, size: 2, drag: 2, w: 8 });
        }
        if (vy > 440) this.camera.shake(0.18 * k + 0.08);
        break;
      }
      case 'hop':
        P.burst(p.cx, p.bottom, 4, { color: SNOW, speed: 40, spread: Math.PI, g: 200, life: 0.3 });
        break;
      case 'spring':
        a.play('spring');
        this.prog.inc('springs');
        this.camera.shake(0.15);
        P.burst(d.x + 7, d.y, 14, { color: ['#ffc83d', '#ffffff', '#ff4f5e'], speed: 110, angle: -Math.PI / 2, spread: 1.6, g: 300, life: 0.5, size: 2 });
        break;
      case 'springBoost':
        a.play('djump');
        P.burst(p.cx, p.bottom, 10, { color: ['#ffc83d', '#ffffff'], speed: 90, angle: Math.PI / 2, spread: 1.2, life: 0.4, size: 2, additive: true });
        break;
      case 'slideStart':
        P.burst(p.cx, p.bottom, 8, { color: SNOW, speed: 60, angle: -Math.PI / 2 - p.facing * 0.8, spread: 0.8, g: 250, life: 0.4 });
        break;
      case 'crumbleStart':
        a.play('crumble');
        P.burst(d.tx * T + 8, d.ty * T + 4, 5, { color: ['#9fe6ff', '#ffffff'], speed: 30, spread: Math.PI, g: 200, life: 0.4, w: 14 });
        break;
      case 'sign':
        a.play('sign');
        break;
      default: break;
    }
  }

  mapEvent(type, tx, ty) {
    if (type === 'crumble') {
      this.particles.burst(tx * T + 8, ty * T + 8, 14, { color: ['#9fe6ff', '#d8f7ff', '#5fb8e0'], speed: 60, spread: Math.PI * 2, g: 500, life: 0.7, size: 3, w: 14, h: 14 });
    } else if (type === 'restore') {
      this.particles.burst(tx * T + 8, ty * T + 8, 6, { color: ['#d8f7ff'], speed: 20, life: 0.3, w: 14, h: 14 });
    }
  }

  popup(x, y, text, color = '#ffffff') { this.popups.push({ x, y, text, color, t: 0 }); }

  collectCoin(c) {
    this.coins++;
    this.prog.inc('coins');
    this.combo = this.comboT > 0 ? this.combo + 1 : 0;
    this.comboT = 1.1;
    const pitch = Math.pow(2, Math.min(this.combo, 15) / 12);
    this.game.audio.play('coin', pitch);
    this.particles.burst(c.x + 5, c.y + 5, 6, { color: ['#ffffff', '#ffc83d', '#7ee8ff'], speed: 60, life: 0.35, size: 2, shape: 'spark', additive: true, drag: 5 });
    this.prog.max('bestCombo', this.combo + 1);
    if (this.combo >= 3) this.popup(c.x + 5, c.y - 4, `X${this.combo + 1}`, this.combo >= 8 ? '#ffc83d' : '#ffffff');
  }

  collectStar(s) {
    this.stars[s.index] = true;
    this.prog.inc('starsGot');
    const n = this.stars.filter(Boolean).length;
    this.game.audio.play('star');
    this.freeze = 0.07;
    this.flashNow('#fff3a0', 0.45);
    this.camera.shake(0.22);
    this.particles.burst(s.x + 6, s.y + 6, 26, { color: ['#ffe066', '#ffffff', '#ffc83d'], speed: 130, life: 0.8, size: 3, shape: 'spark', drag: 3, additive: true });
    this.particles.spawn(s.x + 6, s.y + 6, 0, 0, 0.45, 2, '#ffe066', { shape: 'ring', grow: 80, shrink: false });
    this.banners.push({ title: `ETOILE CACHEE ${n}/${this.totalStars}`, t: 0, dur: 1.8 });
  }

  collectKey(k) {
    this.keys++;
    this.prog.inc('keys');
    this.game.audio.play('key');
    this.particles.burst(k.x + 6, k.y + 4, 16, { color: ['#ffd23f', '#ffffff'], speed: 90, life: 0.5, size: 2, shape: 'spark', additive: true, drag: 3 });
    this.popup(k.x + 6, k.y - 6, 'CLE !', '#ffd23f');
    this.camera.shake(0.08);
  }

  checkDoors(dt) {
    const p = this.player;
    this.lockedMsgT = Math.max(0, this.lockedMsgT - dt);
    if (p.dead || !this.totalKeys) return;
    const ty0 = Math.floor(p.y / T), ty1 = Math.floor((p.bottom - 0.01) / T);
    for (const side of [-1, 1]) {
      const tx = Math.floor((side < 0 ? p.x - 2 : p.x + p.w + 2) / T);
      for (let ty = ty0; ty <= ty1; ty++) {
        if (this.map.get(tx, ty) !== 'O' || this.map.opened.has(ty * this.map.w + tx)) continue;
        if (this.keys > 0) {
          this.keys--;
          const tiles = this.map.openDoor(tx, ty);
          this.doorsOpened.push({ x: tx * T, tiles });
          for (const t of tiles) {
            this.doorAnim.push({ tx: t.tx, ty: t.ty, t: 0 });
            this.particles.burst(t.tx * T + 8, t.ty * T + 8, 6, { color: ['#7a4a2a', '#ffd23f', '#ffffff'], speed: 60, life: 0.5, g: 300 });
          }
          this.game.audio.play('door');
          this.camera.shake(0.15);
          this.popup(tx * T + 8, ty * T - 8, 'OUVERT !', '#ffd23f');
        } else if (this.lockedMsgT <= 0) {
          this.lockedMsgT = 1.5;
          this.game.audio.play('locked');
          this.popup(tx * T + 8, ty * T - 8, 'IL FAUT UNE CLE', '#ff9aa5');
        }
        return;
      }
    }
  }

  stomp(e) {
    const p = this.player;
    this.prog.inc('stomps');
    this.stompChain = (this.stompChain || 0) + 1;
    this.prog.max('bestChain', this.stompChain);
    const held = this.game.input.held.jump;
    p.vy = -(held ? PHYS.stompHeld : PHYS.stompBounce);
    p.jumping = held; p.usedDouble = false; p.grounded = false;
    p.squash(1.3, 0.75);
    this.freeze = 0.05;
    this.camera.shake(0.2);
    this.game.audio.play('stomp');
    this.particles.burst(e.x + 6, e.y + 8, 16, { color: ['#ffffff', '#eef6ff', '#ff8a2a', '#e8455a'], speed: 110, life: 0.6, size: 3, g: 400, drag: 1 });
    this.popup(e.x + 6, e.y - 6, 'POUF !', '#ffffff');
  }

  reachCheckpoint(cp) {
    this.checkpoint = { x: cp.x + 3, y: cp.y + 32 - PHYS.h };
    this.game.audio.play('checkpoint');
    this.particles.burst(cp.x + 8, cp.y + 8, 16, { color: ['#ffc83d', '#ffffff'], speed: 90, life: 0.6, size: 2, shape: 'spark', additive: true, drag: 3 });
    this.popup(cp.x + 8, cp.y - 6, 'SAUVEGARDE !', '#ffc83d');
  }

  unlockDoubleJump(o) {
    this.game.save.doubleJump = true;
    this.game.persist();
    this.game.audio.play('powerup');
    this.freeze = 0.12;
    this.flashNow('#7ee8ff', 0.5);
    this.camera.shake(0.2);
    this.particles.burst(o.x + 6, o.y + 6, 30, { color: ['#7ee8ff', '#ffffff', '#1767ff'], speed: 140, life: 0.8, size: 3, shape: 'spark', drag: 3, additive: true });
    this.banners.push({ title: 'DOUBLE SAUT DEBLOQUE !', sub: 'SAUTE A NOUVEAU EN L\'AIR', t: 0, dur: 2.4 });
  }

  flashNow(color, amount) {
    this.flashColor = color;
    this.flash = Math.max(this.flash, amount * (this.game.settings.reduceFx ? 0.25 : 1));
  }

  killPlayer(cause = 'fall', src = null) {
    const p = this.player;
    if (p.dead || p.won) return;
    // bouclier (mode assisté) : ennemis, pics et projectiles repoussent Kong au lieu de le faire tomber
    if (this.shield && !['fall', 'water', 'avalanche'].includes(cause)) {
      if (this.shieldT > 0) return;
      this.shieldT = 1.2; this.shieldHits = (this.shieldHits || 0) + 1;
      p.vy = -260; p.vx = -p.facing * 140;
      this.flashNow('#7ee8ff', 0.2);
      this.camera.shake(0.2);
      this.game.audio.play('bonk');
      return;
    }
    if (this.god) {
      // mode d'essai (sonde) : on compte les coups au lieu de mourir
      if (this.time - (this.godT ?? -9) > 0.6) { this.godHits = (this.godHits || 0) + 1; this.godT = this.time; (this.godLog = this.godLog || []).push(cause + (this.boss ? ':' + this.boss.st : '')); }
      if (cause === 'fall' || cause === 'water') { p.x = this.start.x; p.y = this.start.y; p.vx = 0; p.vy = 0; }
      return;
    }
    this.deathLog = this.deathLog || [];
    this.deathLog.push({ cause, x: +(p.cx / T).toFixed(1), y: +(p.bottom / T).toFixed(1), vy: Math.round(p.vy), src: src ? [+(src.x / T).toFixed(1), +(src.y / T).toFixed(1)] : null });
    p.dead = true; p.deadT = 0;
    if (!this.god) {
      this.prog.inc('deaths');
      if (cause === 'water') this.prog.inc('drowns');
      this.recentDeaths = (this.recentDeaths || []).filter((t) => this.game.time - t < 15).concat(this.game.time);
      this.prog.max('deathBurst', this.recentDeaths.length);
      this.stompChain = 0; this.wallChain = 0;
    }
    // phrase de chute, jamais deux fois la même d'affilée
    let ph;
    do ph = DEATH_PHRASES[Math.floor(Math.random() * DEATH_PHRASES.length)]; while (ph === this.deathPhrase && DEATH_PHRASES.length > 1);
    this.deathPhrase = ph;
    p.vy = -330; p.vx = -p.facing * 50; p.rot = 0;
    this.deaths++;
    this.freeze = 0.1;
    this.camera.shake(0.45);
    this.flashNow('#ff4f5e', 0.25);
    this.game.audio.play('death');
    this.game.audio.setSlide(0);
    this.game.music.duck(0.25, 0.7);
    this.particles.burst(p.cx, p.y + 7, 18, { color: ['#2b3c94', '#4d6ad6', '#ffffff', '#eef6ff'], speed: 120, life: 0.7, size: 3, g: 500 });
    this.particles.spawn(p.cx - 6, p.bottom, -60, -220, 1, 3, '#ffc83d', { g: 700, shrink: false });
    this.particles.spawn(p.cx + 6, p.bottom, 70, -260, 1, 3, '#ffc83d', { g: 700, shrink: false });
    this.combo = 0; this.comboT = 0;
    if (this.mode && this.mode.onDeath) this.mode.onDeath(this, cause);
  }

  /** Fin de partie d'un mode bonus (Infini, une seule vie) : écran de résultats sans respawn. */
  endRun(results) {
    this.over = true;
    this.results = { rating: 0, custom: true, ...results };
    this.state = 'won'; this.stateT = 0.5;
    this.deathPhrase = null;
    this.game.audio.setSlide(0);
    if (this.game.audio.setRumble) this.game.audio.setRumble(0);
    this.game.music.stop(0.6);
  }

  /**
   * Remise en place après une chute :
   *  - tous les ennemis réapparaissent (même avant la sauvegarde) ;
   *  - forfaits, étoiles, clés, portes et glace friable situés APRÈS la sauvegarde (ou le départ) reviennent ;
   *    ceux d'avant restent acquis.
   */
  resetAfterDeath() {
    const cpX = this.checkpoint ? this.checkpoint.x : -Infinity;
    const after = (x) => x >= cpX - 8;
    const ctx = { starIndex: 0, signIndex: 0, signs: [], map: this.map };
    const ENEMIES = 'eopf';
    const kept = [];
    for (const e of this.entities) {
      if (e.spawn && ENEMIES.includes(e.spawn.type)) continue;
      kept.push(e);
    }
    for (const sp of this.enemySpawns) {
      const ent = createEntity(sp.type, sp.tx, sp.ty, ctx);
      ent.spawn = sp;
      // ronde décalée au hasard : on ne revit pas exactement la même situation à chaque essai
      const n = Math.floor(Math.random() * 120);
      for (let i = 0; i < n && !ent.dead; i++) ent.update(1 / 60, this);
      kept.push(ent);
    }
    this.entities = kept;
    for (const e of this.entities) {
      if (e.active !== false || !e.spawn || !after(e.x)) continue;
      if (e.spawn.type === '$') { e.active = true; this.coins = Math.max(0, this.coins - 1); }
      else if (e.spawn.type === '*') { e.active = true; this.stars[e.index] = false; }
      else if (e.spawn.type === 'K') e.active = true;
    }
    // portes ouvertes après la sauvegarde : refermées ; nombre de clés recalculé
    this.doorsOpened = this.doorsOpened.filter((d) => {
      if (!after(d.x)) return true;
      for (const t of d.tiles) this.map.opened.delete(t.ty * this.map.w + t.tx);
      this.doorAnim = this.doorAnim.filter((a) => !d.tiles.some((t) => t.tx === a.tx && t.ty === a.ty));
      return false;
    });
    const keysHeld = this.entities.filter((e) => e.spawn && e.spawn.type === 'K' && e.active === false).length;
    this.keys = Math.max(0, keysHeld - this.doorsOpened.length);
    this.map.restoreCrumble((tx) => after(tx * T));
  }

  respawn() {
    this.resetAfterDeath();
    if (this.boss) {
      // une chute remet le combat à zéro
      this.entities = this.entities.filter((e) => !e.minion);
      this.boss = createBoss(this.data.boss, this);
      this.musicBoost = 1;
    }
    const s = this.checkpoint || this.start;
    const dbl = this.player.canDouble;
    this.player.reset(s.x, s.y);
    this.player.canDouble = dbl;
    this.player.squash(0.6, 1.4);
    if (this.avalanche) this.avalanche.reset(this.player.cx);
    this.camera.fast = 0.18;
    this.trails.length = 0;
    this.game.audio.play('respawn');
    this.particles.spawn(this.player.cx, this.player.y + 7, 0, 0, 0.35, 2, '#ffffff', { shape: 'ring', grow: 60, shrink: false });
    this.particles.burst(this.player.cx, this.player.y + 7, 10, { color: SNOW, speed: 70, life: 0.4, size: 2, drag: 4 });
  }

  win() {
    const p = this.player;
    if (p.won || p.dead) return;
    p.won = true; p.winT = 0; p.zip = null;
    if (this.game.audio.setRumble) this.game.audio.setRumble(0);
    this.state = 'won'; this.stateT = 0;
    this.freeze = 0.12;
    this.flashNow('#ffffff', 0.6);
    this.camera.shake(0.25);
    this.camera.zoomOverride = 1.3;
    this.game.audio.play('win');
    this.game.audio.setSlide(0);
    this.game.music.stop(0.3);
    setTimeout(() => this.game.music.jingle('victory'), 700);
    for (let i = 0; i < 60; i++) {
      this.particles.spawn(p.cx + (Math.random() - 0.5) * 60, p.y - 60 - Math.random() * 60, (Math.random() - 0.5) * 60, Math.random() * 40, 2 + Math.random(), 2 + Math.random() * 2,
        ['#ffc83d', '#ff4f5e', '#7ee8ff', '#ffffff', '#1767ff'][i % 5], { g: 60, drag: 1, shrink: false });
    }
    if (!this.assisted) this.saveGhost();
    if (this.mode && this.mode.onWin) { this.mode.onWin(this); this.game.persist(); return; }
    const allCoins = this.coins >= this.totalCoins;
    const allStars = this.stars.every(Boolean);
    const underPar = !this.assisted && this.time <= this.data.parTime;
    // boss : la 2e étoile récompense un combat sans chute
    const rating = 1 + ((this.boss ? this.deaths === 0 : allCoins && allStars) ? 1 : 0) + (underPar ? 1 : 0);
    const prev = this.game.save.best[this.data.id];
    // temps assisté : le niveau est validé mais le chrono n'est pas retenu s'il existe déjà un vrai temps
    const keepTime = !this.assisted || !prev;
    const newRecord = !this.assisted && (!prev || prev.assisted || this.time < prev.time);
    // un vrai temps remplace toujours un temps assisté
    const realTime = !this.assisted && prev && prev.assisted ? this.time : null;
    this.results = { time: this.time, coins: this.coins, allCoins, allStars, underPar, rating, deaths: this.deaths, newRecord, prevTime: prev ? prev.time : null };
    this.game.save.best[this.data.id] = {
      time: realTime ?? (!keepTime ? prev.time : prev ? Math.min(prev.time, this.time) : this.time),
      ...((prev ? prev.assisted && this.assisted : this.assisted) ? { assisted: true } : {}),
      rating: Math.max(prev ? prev.rating : 0, rating),
      coins: Math.max(prev ? prev.coins : 0, this.coins),
      stars: (prev ? prev.stars : []).map((v, i) => v || this.stars[i]).concat(this.stars.slice((prev ? prev.stars : []).length)),
    };
    this.game.save.totalCoins = (this.game.save.totalCoins || 0) + this.coins;
    // progression : forfaits versés au porte-monnaie, statistiques des succès et des défis
    const pr = this.prog;
    this.results.earned = this.coins;
    pr.earn(this.coins);
    pr.inc('wins');
    if (this.boss) pr.inc('bossWins');
    if (this.deaths === 0) { pr.inc('noDeathWins'); if (this.boss) pr.inc('noDeathBoss'); }
    if (underPar) pr.inc('parWins');
    if (allCoins && this.totalCoins > 0) pr.inc('fullCoinWins');
    if (rating >= 3) pr.inc('perfectWins');
    if (this.avalanche) pr.inc('avalancheWins');
    pr.check();
    pr.flush();
    // classement en ligne (ou local) : envoi du temps, le rang s'affiche sur l'écran de résultats
    const on = this.game.online;
    if (this.assisted) this.results.online = { msg: 'MODE ASSISTE : HORS CLASSEMENT' };
    else if (on && !this.game.probe) {
      if (!on.user) this.results.online = { msg: 'CREE UN COMPTE : CE TEMPS IRA AU CLASSEMENT' };
      else {
        this.results.online = { msg: 'ENVOI AU CLASSEMENT...' };
        on.submit({ level: this.data.id, time: this.time, coins: this.coins, deaths: this.deaths }).then((r) => {
          this.results.online = r.error ? { msg: r.error.toUpperCase() } : { msg: `CLASSEMENT DU NIVEAU : ${r.rank}${r.rank === 1 ? 'ER' : 'E'} SUR ${r.of}`, rank: r.rank };
        });
      }
    }
    this.game.persist();
  }

  /** Partage du résultat (image avec le QR code du jeu). */
  canShare() { return !!this.results && !(this.mode && this.mode.noShare) && typeof document !== 'undefined'; }
  shareCardData() {
    const r = this.results, u = this.game.online && this.game.online.user;
    const pseudo = u ? u.pseudo : null;
    if (r.custom) {
      const lines = (r.lines || []).filter(([t]) => t);
      const big = lines.length ? lines[0][0] : formatTime(this.time);
      return { head: r.title || this.label, big, lines: lines.slice(1, 4).map(([t, c]) => [t, c && c !== '#ffffff' ? c : '#ffffff']), pseudo };
    }
    const lines = [[`${'★'.repeat(r.rating)}${'·'.repeat(3 - r.rating)}   CHUTES : ${r.deaths}`, '#ffffff']];
    if (r.online && r.online.rank) lines.push([`${r.online.rank}${r.online.rank === 1 ? 'ER' : 'E'} DU CLASSEMENT`, '#7ee8ff']);
    if (r.newRecord && r.prevTime !== null) lines.push(['NOUVEAU RECORD !', '#ffc83d']);
    return { head: `${this.label} ${this.data.name.toUpperCase()}`, big: formatTime(r.time), lines, pseudo };
  }
  share() {
    if (this.sharing) return;
    this.sharing = true; this.shareMsg = 'PREPARATION...';
    shareCard(this.game, this.shareCardData())
      .then((msg) => { this.shareMsg = msg; }, () => { this.shareMsg = 'PARTAGE IMPOSSIBLE'; })
      .finally(() => { this.sharing = false; setTimeout(() => { this.shareMsg = null; }, 2500); });
  }

  restart() {
    const mode = this.mode && this.mode.restart ? this.mode.restart(this) : this.mode;
    if (mode === false) return;
    this.game.goto(() => new LevelScene(this.game, this.data, { theme: this.themeName, mode }));
  }
  exitLevel() { const g = this.game; g.music.muffle(false); if (this.mode && this.mode.exit) this.mode.exit(this); else g.gotoMap(this.data.id); }

  /** Enregistre la descente comme fantôme si c'est le meilleur temps. */
  saveGhost() {
    if (!this.ghostKey || this.ghostRec.length < 2) return;
    const prev = this.game.replays.load(this.ghostKey);
    if (prev && prev.time <= this.time) return;
    this.game.replays.save(this.ghostKey, { time: this.time, skin: this.game.look.skin.id, d: this.ghostRec });
  }
  recordGhost(dt) {
    if (!this.ghostKey || !this.timerOn || this.state !== 'play') return;
    this.ghostT -= dt;
    if (this.ghostT > 0 || this.ghostRec.length > 9000) return;
    this.ghostT = 1 / 15;
    const p = this.player;
    this.ghostRec.push([Math.round(this.time * 100), Math.round(p.cx), Math.round(p.bottom), GHOST_FRAMES.indexOf(this.frameFor(p)), p.facing, Math.round((p.tilt || 0) * 100)]);
  }
  /** Position du fantôme à l'instant t (interpolée). */
  ghostAt(t) {
    const d = this.ghost && this.ghost.d;
    if (!d || !d.length) return null;
    const ms = t * 100;
    let lo = 0, hi = d.length - 1;
    if (ms >= d[hi][0]) return { x: d[hi][1], y: d[hi][2], frame: GHOST_FRAMES[d[hi][3]] || 'idle', facing: d[hi][4], tilt: d[hi][5] / 100, done: true };
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (d[m][0] <= ms) lo = m; else hi = m; }
    const a = d[lo], b = d[hi], k = (ms - a[0]) / Math.max(1, b[0] - a[0]);
    return { x: a[1] + (b[1] - a[1]) * k, y: a[2] + (b[2] - a[2]) * k, frame: GHOST_FRAMES[a[3]] || 'idle', facing: a[4], tilt: a[5] / 100 };
  }

  // ---------- Boucle ----------
  update(dt) {
    const g = this.game;
    const inp = g.input;
    if (inp.pressed.debug) g.debug = !g.debug;

    if (this.state === 'paused') { this.updatePause(); return; }
    if (this.mode && this.mode.speed && this.state === 'play') dt *= this.mode.speed; // défi « turbo »
    if (this.assistSpeed < 1 && this.state === 'play') dt *= this.assistSpeed;
    if (this.shieldT > 0) this.shieldT -= dt;
    if ((inp.pressed.pause) && this.state === 'play') { this.state = 'paused'; this.pauseIndex = 0; g.audio.play('pause'); g.audio.setSlide(0); g.music.muffle(true); return; }
    if (g.debug && this.game.input.keys.has('KeyT') && !this.tHeld) {
      const i = THEME_ORDER.indexOf(this.themeName);
      this.setTheme(THEME_ORDER[(i + 1) % THEME_ORDER.length]);
      this.banners.push({ title: 'AMBIANCE : ' + this.theme.label, t: 0, dur: 1.5 });
    }
    this.tHeld = this.game.input.keys.has('KeyT');
    if (inp.pressed.restart && this.state !== 'won') { this.restart(); return; }

    if (g.debug) {
      for (const t of inp.taps) {
        if (t.type !== 'mouse') continue;
        const wx = this.camera.left + t.x / this.camera.zoom, wy = this.camera.top + t.y / this.camera.zoom;
        this.player.x = wx - this.player.w / 2; this.player.y = wy - this.player.h; this.player.vx = 0; this.player.vy = 0; this.player.dead = false;
      }
    }

    if (this.state === 'won') {
      this.stateT += dt;
      if (this.stateT > 1.4) {
        const rt = this.stateT - 1.4;
        const shouldShow = Math.min(this.results.rating, Math.floor((rt - 0.5) / 0.35) + 1);
        if (shouldShow > this.ratingShown && rt > 0.5) { this.ratingShown = shouldShow; g.audio.play('rate', 1 + this.ratingShown * 0.12); }
        const sb = this.shareBtn;
        if (rt > 0.6 && this.canShare() && (inp.pressed.share || (sb && inp.tapIn(sb.x, sb.y, sb.w, sb.h)))) { g.audio.play('select'); this.share(); return; }
        if (rt > 0.6 && (inp.pressed.jump || inp.pressed.confirm || inp.taps.length)) { g.audio.play('select'); if (this.mode && this.mode.next) this.mode.next(this); else g.nextLevel(this.data.id); return; }
        if (rt > 0.6 && inp.pressed.restart) { g.audio.play('select'); this.restart(); return; }
        if (inp.pressed.pause) { g.audio.play('select'); this.exitLevel(); return; }
      }
    }

    // Hit-stop : le monde se fige quelques centièmes de seconde.
    if (this.freeze > 0) { this.freeze -= dt; this.updateVisuals(dt * 0.15); return; }

    const p = this.player;
    if (!this.timerOn && this.state === 'play' && (inp.held.left || inp.held.right || inp.held.jump)) this.timerOn = true;
    if (this.timerOn && this.state === 'play' && !(this.boss && p.dead)) this.time += dt;
    this.recordGhost(dt);
    if (this.mode && this.mode.update) this.mode.update(this, dt);

    if (this.avalanche && this.timerOn && !this.avalanche.active && this.state === 'play') this.avalanche.start(p.cx);
    this.map.update(dt, p.box(), (ty, x, y) => this.mapEvent(ty, x, y));
    for (const pl of this.platforms) if (pl.update) pl.update(dt, this);
    for (const l of this.lifts) l.place(dt);
    this.wind.update(dt);

    const wasGrounded = p.grounded;
    p.bonked = false;
    if (p.zip) {
      if (updateZip(p, dt, inp, this)) p.grounded = false;
      if (Math.random() < dt * 30) this.particles.spawn(p.cx, p.y - 2, -p.vx * 0.1 + (Math.random() - 0.5) * 30, 20 + Math.random() * 30, 0.3, 1.5, '#ffe58a', { additive: true, g: 200 });
    } else p.update(dt, inp, this);
    if (!p.zip && !p.dead && !p.grounded && p.zipCool <= 0) {
      for (const z of this.ziplines) {
        const hx = p.cx, hy = p.y - 3;
        const pr = z.project(hx, hy);
        if (pr.s > 8 && pr.s < z.len - 8 && pr.d < ZIP.grab) {
          const along = p.vx * z.ux + p.vy * z.uy;
          this.prog.inc('zips');
          p.zip = { line: z, s: pr.s, v: z.dir > 0 ? Math.max(along, ZIP.minSpeed) : Math.min(along, -ZIP.minSpeed) };
          p.jumping = false; p.usedDouble = false;
          p.squash(1.2, 0.85);
          g.audio.play('zip');
          this.camera.shake(0.06);
          break;
        }
      }
    }
    this.checkDoors(dt);
    if (this.avalanche) {
      this.avalanche.update(dt, this);
      const gap = p.cx - this.avalanche.x;
      if (this.avalanche.active && gap < 200 && !p.dead) this.camera.shake(dt * (1 - gap / 200) * 1.5);
      g.audio.setRumble && g.audio.setRumble(this.avalanche.active && !p.won ? clamp(1 - gap / 400, 0, 1) : 0);
    }
    if (p.bonked) { g.audio.play('bonk'); this.particles.burst(p.cx, p.y, 4, { color: SNOW, speed: 40, angle: Math.PI / 2, spread: 1.5, g: 300, life: 0.3 }); }
    if (p.dead && !this.over) {
      const go = inp.pressed.jump || inp.pressed.confirm || inp.taps.length > 0;
      // boss : on attend que le joueur relance le combat ; niveau : courte transition, que SAUT abrège
      if (this.boss ? p.deadT > 0.7 && go : p.deadT > 0.9 || (p.deadT > 0.35 && go)) this.respawn();
    }

    const box = p.box();
    for (const e of this.entities) {
      if (e.solidPlatform) continue;
      if (!e.active) continue;
      // Les ennemis qui marchent ne se mettent en route qu'en arrivant près de l'écran (comme chez Mario) :
      // sinon ils partent en balade et tombent dans un trou avant que Kong n'arrive.
      if (e.sleeps && !e.awake) {
        if (Math.abs(e.x - p.cx) > this.game.view.w / 2 + 40) continue;
        e.awake = true;
      }
      e.update(dt, this);
      if (!p.dead && e.active && aabb(box, e)) e.touch(this, p);
    }
    for (let i = this.entities.length - 1; i >= 0; i--) if (this.entities[i].remove) this.entities.splice(i, 1);
    if (this.boss) this.boss.update(dt, this);

    if (!p.dead && !p.won && p.y > this.bounds.h + 24) this.killPlayer();
    if (!p.dead && !p.won && this.water.length) {
      const tx = Math.floor(p.cx / T), ty = Math.floor((p.bottom - 6) / T);
      if (this.map.get(tx, ty) === 'w') {
        this.particles.burst(p.cx, Math.floor(p.bottom / T) * T, 22, { color: this.theme.water[1], speed: 130, angle: -Math.PI / 2, spread: 1.2, g: 500, life: 0.7, size: 3 });
        this.game.audio.play('splash');
        this.killPlayer('water');
      }
    }

    // Faux murs : deviennent translucides quand Kong est dedans.
    let inFake = false;
    for (const f of this.fakeWalls) {
      if (box.x < f.tx * T + T && box.x + box.w > f.tx * T && box.y < f.ty * T + T && box.y + box.h > f.ty * T) { inFake = true; break; }
    }
    if (inFake && this.hAlpha > 0.9) g.audio.play('select');
    if (inFake && !this.wasInFake) this.prog.inc('secrets');
    this.wasInFake = inFake;
    this.hAlpha = damp(this.hAlpha, inFake ? 0.25 : 1, 10, dt);

    this.updateFeel(dt, wasGrounded);
    this.updateVisuals(dt);
  }

  updateFeel(dt, wasGrounded) {
    const p = this.player;
    const a = this.game.audio;
    const P = this.particles;
    const speed = Math.abs(p.vx);
    if (!p.dead && p.grounded) this.prog.max('topSpeed', Math.round(speed));
    // Poussière de course / gerbes de neige en glissade
    this.dustT -= dt;
    if (p.grounded && !p.dead && this.dustT <= 0) {
      if (p.sliding) {
        this.dustT = 0.02;
        P.spawn(p.cx - p.facing * 4, p.bottom - 1, -p.vx * 0.3 + (Math.random() - 0.5) * 30, -40 - Math.random() * 70, 0.45, 2, SNOW[(Math.random() * 3) | 0], { g: 300 });
      } else if (speed > 100) {
        this.dustT = p.onIce ? 0.05 : 0.09;
        if (p.onIce) P.spawn(p.cx, p.bottom - 1, 0, -10, 0.4, 2, '#d8f7ff', { shape: 'spark', additive: true });
        else P.spawn(p.cx - p.facing * 5, p.bottom - 1, -p.facing * 20, -15 - Math.random() * 20, 0.35, 2, '#eef6ff', { g: 80, drag: 2 });
      }
    }
    if (p.wallSliding && Math.random() < dt * 25) {
      P.spawn(p.wallDir > 0 ? p.x + p.w : p.x, p.y + 4, -p.wallDir * 10, -10, 0.3, 2, '#ffffff', { g: 100 });
    }
    // Son de glisse
    const slideI = p.grounded && !p.dead && (p.sliding || (p.onIce && speed > 60)) ? clamp(speed / PHYS.slideMax, 0.25, 1) : 0;
    a.setSlide(slideI);
    // Traînées de vitesse (afterimages)
    this.trailT -= dt;
    const trailCols = this.game.look.trail.colors;
    if (!p.dead && trailCols.length && (speed > 215 || p.sliding && speed > 120 || (p.usedDouble && !p.grounded)) && this.trailT <= 0) {
      this.trailT = 0.035;
      this.trailN = (this.trailN || 0) + 1;
      this.trails.push({ x: p.cx, y: p.bottom, frame: this.frameFor(p), facing: p.facing, angle: this.skiAngle, tilt: p.tilt, age: 0, color: trailCols[this.trailN % trailCols.length] });
      if (this.trails.length > 10) this.trails.shift();
    }
    this.comboT = Math.max(0, this.comboT - dt);
    // Dérapage : demi-tour à pleine vitesse
    const inpH = this.game.input.held;
    const dir = (inpH.right ? 1 : 0) - (inpH.left ? 1 : 0);
    const skid = p.grounded && !p.sliding && dir !== 0 && Math.sign(p.vx) === -dir && speed > 90;
    if (skid && !this.skidding) a.play('skid');
    if (skid && Math.random() < dt * 40) P.spawn(p.cx + Math.sign(p.vx) * 6, p.bottom - 1, p.vx * 0.4 + (Math.random() - 0.5) * 30, -30 - Math.random() * 60, 0.35, 2, SNOW[(Math.random() * 3) | 0], { g: 300 });
    this.skidding = skid;
    // Musique adaptative : vitesse, combos et moments forts font monter l'intensité.
    const target = this.state === 'won' ? 0.3 : this.boss ? [0.5, 0.72, 0.96][(this.musicBoost || 1) - 1] : clamp(0.32 + clamp((speed - 140) / 260, 0, 0.3) + (this.combo >= 3 && this.comboT > 0 ? 0.25 : 0) + (p.usedDouble || p.sliding ? 0.12 : 0), 0, 1);
    this.musicI = target > this.musicI ? damp(this.musicI, target, 3, dt) : damp(this.musicI, target, 0.5, dt);
    if (Math.abs(this.musicI - (this.lastMusicI ?? -1)) > 0.03) { this.game.music.setIntensity(this.musicI); this.lastMusicI = this.musicI; }
  }

  updateVisuals(dt) {
    const p = this.player;
    const v = this.game.view;
    this.camera.update(dt, p, v, this.bounds, this.game.settings.reduceFx);
    this.bg.update(dt);
    this.weather.update(dt, this.camera, v);
    this.particles.update(dt);
    for (const t of this.trails) t.age += dt;
    while (this.trails.length && this.trails[0].age > 0.22) this.trails.shift();
    for (const pp of this.popups) { pp.t += dt; pp.y -= 22 * dt; }
    this.popups = this.popups.filter((pp) => pp.t < 0.9);
    for (const b of this.banners) b.t += dt;
    this.banners = this.banners.filter((b) => b.t < b.dur);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    const targetAngle = p.grounded && !p.dead ? p.slopeDir * Math.PI / 4 : 0;
    this.skiAngle = damp(this.skiAngle, targetAngle, 22, dt);
  }

  updatePause() {
    const g = this.game;
    const inp = g.input;
    const items = this.pauseItems();
    if (inp.pressed.down) { this.pauseIndex = (this.pauseIndex + 1) % items.length; g.audio.play('move'); }
    if (inp.pressed.up) { this.pauseIndex = (this.pauseIndex + items.length - 1) % items.length; g.audio.play('move'); }
    let chosen = -1;
    if (inp.pressed.confirm || (inp.pressed.jump && !inp.held.up)) chosen = this.pauseIndex;
    const v = g.view;
    const lay = pauseLayout(items.length, v);
    // souris : le survol sélectionne la ligne (seulement quand la souris bouge, pour ne pas gêner le clavier)
    const m = inp.mouse;
    if (m && (!this.pauseMouse || m.x !== this.pauseMouse.x || m.y !== this.pauseMouse.y)) {
      this.pauseMouse = { x: m.x, y: m.y };
      items.forEach((_, i) => { const y = lay.itemY(i); if (m.x >= lay.x && m.x <= lay.x + lay.w && m.y >= y - 4 && m.y < y - 4 + lay.step) this.pauseIndex = i; });
    }
    items.forEach((it, i) => {
      const y = lay.itemY(i);
      if (it.vol) { if (tapVolumeRow(g, it.vol, lay.x, lay.w, y)) this.pauseIndex = i; }
      else if (inp.tapIn(lay.x, y - 4, lay.w, lay.step)) chosen = i;
    });
    if (inp.pressed.pause) chosen = 0;
    const it = items[this.pauseIndex];
    if (it.adjust && (inp.pressed.left || inp.pressed.right)) it.adjust(inp.pressed.right ? 1 : -1);
    if (chosen >= 0) {
      g.audio.play('select');
      items[chosen].action();
    }
  }

  pauseItems() {
    const g = this.game;
    const sound = (key, label) => ({ label, vol: key, action: () => toggleSound(g, key), adjust: (d) => stepVolume(g, key, d) });
    const fs = typeof document !== 'undefined' && !!document.fullscreenElement;
    return [
      { label: 'REPRENDRE', action: () => { this.state = 'play'; g.music.muffle(false); } },
      { label: 'RECOMMENCER', action: () => { g.music.muffle(false); this.restart(); } },
      sound('musicVol', 'MUSIQUE'),
      sound('sfxVol', 'EFFETS SONORES'),
      { label: `EFFETS VISUELS REDUITS : ${g.settings.reduceFx ? 'OUI' : 'NON'}`, action: () => { g.settings.reduceFx = !g.settings.reduceFx; g.persist(); } },
      { label: `PLEIN ECRAN : ${fs ? 'OUI' : 'NON'}`, action: () => g.toggleFullscreen() },
      { label: this.mode ? this.mode.exitLabel || 'MODES BONUS' : 'CARTE DES MONDES', action: () => this.exitLevel() },
      { label: 'ECRAN TITRE', action: () => { g.music.muffle(false); g.gotoTitle(); } },
    ];
  }

  // ---------- Rendu ----------
  frameFor(p) {
    if (p.dead) return 'dead';
    if (p.won) return 'win';
    if (p.sliding) return 'crouch';
    if (p.zip) return 'jump';
    if (!p.grounded) return p.wallSliding ? 'wall' : p.vy < 0 ? 'jump' : 'fall';
    if (this.skidding) return 'skid';
    const coasting = p.onIce && !this.game.input.held.left && !this.game.input.held.right;
    if (Math.abs(p.vx) > 20 && !coasting) return ['run1', 'idle', 'run2', 'idle'][Math.floor(p.animDist / 7) % 4];
    return 'idle';
  }

  drawKong(ctx, x, bottom, frame, facing, sx, sy, angle, tilt, rot, skis, ski, skiD, ghost = false) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(bottom));
    ctx.rotate(rot || angle);
    if (skis) {
      ctx.fillStyle = '#0a0d24';
      ctx.fillRect(-12, -2, 24, 3);
      ctx.fillRect(facing > 0 ? 10 : -14, -5, 4, 4);
      ctx.fillStyle = ski;
      ctx.fillRect(-11, -2, 22, 1);
      ctx.fillRect(facing > 0 ? 11 : -13, -4, 2, 2);
      ctx.fillStyle = skiD;
      ctx.fillRect(-11, -1, 22, 1);
    }
    if (!rot) ctx.rotate(tilt - angle);
    ctx.scale(facing * sx, sy);
    ctx.drawImage(frame, -8, -frame.height - 1);
    if (!ghost && this.game.look.hat) drawHatRows(ctx, this.game.look.hat, -8, -frame.height - 1);
    if (this.glint && !rot) {
      const gy = -frame.height - 1 + 4;
      ctx.fillStyle = '#ffffff';
      const k = this.glint;
      ctx.fillRect(-5 + k, gy, 1, 1); ctx.fillRect(1 + k, gy, 1, 1);
    }
    ctx.restore();
  }

  collectLights(view) {
    const out = [];
    const p = this.player;
    if (this.darkAmount > 0.01 && !p.dead) out.push({ x: p.cx, y: p.y + 6, r: 64, rgb: '255,255,255', bloom: 0 });
    for (const e of this.entities) {
      if (!e.active || !e.light) continue;
      if (e.x + 80 < view.x || e.x - 80 > view.x + view.w) continue;
      const l = e.light();
      if (l) out.push(l);
    }
    if (this.boss) out.push(...this.boss.lights());
    return out;
  }

  drawDoors(ctx, view) {
    if (!this.totalKeys) return;
    const dt = this.game.lastDt;
    for (const d of this.doorAnim) d.t += dt;
    this.doorAnim = this.doorAnim.filter((d) => d.t < 0.5);
    const tx0 = Math.max(0, Math.floor(view.x / T) - 1), tx1 = Math.min(this.map.w, Math.ceil((view.x + view.w) / T) + 1);
    for (let ty = 0; ty < this.map.h; ty++) for (let tx = tx0; tx < tx1; tx++) {
      if (this.map.get(tx, ty) !== 'O') continue;
      const k = ty * this.map.w + tx;
      let oy = 0;
      if (this.map.opened.has(k)) {
        const a = this.doorAnim.find((d) => d.tx === tx && d.ty === ty);
        if (!a) continue;
        oy = -a.t * 40; ctx.globalAlpha = 1 - a.t * 2;
      }
      const x = tx * T, y = ty * T + oy;
      ctx.fillStyle = '#0a0d24'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = '#7a4a2a'; ctx.fillRect(x + 1, y, T - 2, T);
      ctx.fillStyle = '#5a3418'; ctx.fillRect(x + 5, y, 1, T); ctx.fillRect(x + 10, y, 1, T);
      ctx.fillStyle = '#b8c4e0'; ctx.fillRect(x + 1, y + 3, T - 2, 2); ctx.fillRect(x + 1, y + 11, T - 2, 2);
      if (this.map.get(tx, ty - 1) !== 'O') {
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 6, y + 6, 4, 4);
        ctx.fillStyle = '#0a0d24'; ctx.fillRect(x + 7, y + 7, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  drawWater(ctx, view) {
    if (!this.water.length) return;
    const [body, hi] = this.theme.water;
    const t = this.game.time;
    for (const w of this.water) {
      const x = w.tx * T, y = w.ty * T;
      if (x + T < view.x || x > view.x + view.w || y + T < view.y || y > view.y + view.h) continue;
      ctx.fillStyle = body;
      if (w.surface) {
        for (let i = 0; i < T; i += 2) {
          const wy = Math.round(Math.sin((x + i) * 0.25 + t * 3) * 1.2 + 2);
          ctx.fillRect(x + i, y + wy, 2, T - wy);
          ctx.fillStyle = hi; ctx.fillRect(x + i, y + wy, 2, 1); ctx.fillStyle = body;
        }
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        if (Math.sin(t * 2 + w.tx) > 0.6) ctx.fillRect(x + ((w.tx * 5) % 12), y + 6, 3, 1);
      } else ctx.fillRect(x, y, T, T);
    }
  }

  render(ctx) {
    const g = this.game;
    const v = g.view;
    const cam = this.camera;
    ctx.setTransform(v.scale, 0, 0, v.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    this.bg.draw(ctx, cam, v);

    const z = v.scale * cam.zoom;
    ctx.setTransform(z, 0, 0, z, Math.round(-cam.left * z), Math.round(-cam.top * z));
    const view = cam.rect;

    // Tuiles statiques
    const sx = clamp(Math.floor(view.x), 0, this.tileCanvas.width - 1);
    const sy = clamp(Math.floor(view.y), 0, this.tileCanvas.height - 1);
    const sw = Math.min(Math.ceil(view.w) + 2, this.tileCanvas.width - sx);
    const sh = Math.min(Math.ceil(view.h) + 2, this.tileCanvas.height - sy);
    if (sw > 0 && sh > 0) ctx.drawImage(this.tileCanvas, sx, sy, sw, sh, sx, sy, sw, sh);

    // Blocs friables (dynamiques)
    const tx0 = Math.floor(view.x / T) - 1, tx1 = Math.ceil((view.x + view.w) / T) + 1;
    for (let ty = 0; ty < this.map.h; ty++) {
      for (let tx = Math.max(0, tx0); tx < Math.min(this.map.w, tx1); tx++) {
        if (this.map.get(tx, ty) !== 'x') continue;
        const s = this.map.crumble.get(ty * this.map.w + tx);
        if (s && s.state === 'gone') continue;
        const shake = s && s.state === 'shaking' ? Math.round(Math.sin(g.time * 90) * 1.2) : 0;
        ctx.drawImage(this.loose.crumble, tx * T + shake, ty * T);
      }
    }

    for (const z of this.ziplines) z.draw(ctx);
    for (const l of this.lifts) l.draw(ctx);
    this.drawDoors(ctx, view);

    // Entités (derrière Kong)
    for (const e of this.entities) {
      if (!e.active) continue;
      if (e.x + e.w + 40 < view.x || e.x - 40 > view.x + view.w || e.y + e.h + 60 < view.y || e.y - 60 > view.y + view.h) continue;
      e.draw(ctx, this);
    }

    if (this.boss) this.boss.draw(ctx, this);

    // Fantôme de la meilleure descente
    const gh = this.ghost && this.timerOn ? this.ghostAt(this.time) : null;
    if (gh && !(gh.done && this.state !== 'play')) {
      const gk = this.game.ghostFor('#bff3ff');
      ctx.globalAlpha = gh.done ? 0.15 : 0.32;
      this.glint = 0;
      this.drawKong(ctx, gh.x, gh.y, gk[gh.frame] || gk.idle, gh.facing, 1, 1, 0, gh.tilt, 0, true, gk.ski, gk.skiD, true);
      ctx.globalAlpha = 1;
    }
    // Traînées
    for (const t of this.trails) {
      const tr = this.game.look.trail;
      const ghost = tr && tr.stripes ? this.game.ghostStripes(tr.colors) : this.game.ghostFor(t.color || '#8fe6ff');
      ctx.globalAlpha = (tr && tr.stripes ? 0.6 : 0.4) * (1 - t.age / 0.22);
      this.glint = 0;
      this.drawKong(ctx, t.x, t.y, ghost[t.frame], t.facing, 1, 1, t.angle, t.tilt, 0, true, ghost.ski, ghost.skiD, true);
    }
    ctx.globalAlpha = 1;

    // Kong
    const p = this.player;
    const k = this.sprites.kong;
    const frame = k[this.frameFor(p)];
    const breathe = p.grounded && Math.abs(p.vx) < 5 && !p.sliding ? Math.sin(p.t * 3) * 0.03 : 0;
    const gp = (p.t % 3.2) / 3.2;
    this.glint = gp > 0.9 && frame.height >= 16 ? 1 + Math.floor((gp - 0.9) * 30) : 0;
    if (this.shieldT > 0 && Math.floor(this.shieldT * 12) % 2) ctx.globalAlpha = 0.35;
    this.drawKong(ctx, p.cx, p.bottom, frame, p.facing, p.sx - breathe, p.sy + breathe, this.skiAngle, p.tilt, p.dead ? p.rot : 0, !p.dead, k.ski, k.skiD);

    ctx.globalAlpha = 1;
    // Faux murs (passage secret) par-dessus Kong
    if (this.fakeWalls.length) {
      ctx.globalAlpha = this.hAlpha;
      for (const f of this.fakeWalls) ctx.drawImage(this.loose.rock, f.tx * T, f.ty * T);
      ctx.globalAlpha = 1;
    }

    if (p.zip) {
      ctx.fillStyle = '#0a0d24'; ctx.fillRect(Math.round(p.cx) - 3, Math.round(p.y) - 7, 7, 5);
      ctx.fillStyle = '#ffc83d'; ctx.fillRect(Math.round(p.cx) - 2, Math.round(p.y) - 6, 5, 3);
    }
    if (this.boss) this.boss.drawFront(ctx, this);
    this.drawWater(ctx, view);
    if (this.avalanche) this.avalanche.draw(ctx, view, this.particles);
    if (this.windAt) this.wind.draw(ctx, view, this.particles);
    this.particles.draw(ctx, view);

    // Éclairage : obscurité percée par les lumières, puis halos additifs (bloom léger)
    const lights = this.collectLights(view);
    if (this.darkAmount > 0.01) {
      ctx.setTransform(v.scale, 0, 0, v.scale, 0, 0);
      this.darkness.render(ctx, v, cam, lights, this.darkAmount, this.theme.darkColor);
      ctx.setTransform(z, 0, 0, z, Math.round(-cam.left * z), Math.round(-cam.top * z));
    }
    ctx.globalCompositeOperation = 'lighter';
    const bloomK = g.settings.reduceFx ? 0.5 : 1;
    for (const l of lights) if (l.bloom) drawGlow(ctx, l.x, l.y, l.r * 0.8, l.rgb, l.bloom * bloomK * (0.6 + this.darkAmount));
    ctx.globalCompositeOperation = 'source-over';

    for (const e of this.entities) if (e.text !== undefined && e.show > 0) drawSignBubble(ctx, e);
    for (const pp of this.popups) {
      const a = 1 - Math.max(0, pp.t - 0.5) / 0.4;
      const s = pp.t < 0.1 ? 1 + (0.1 - pp.t) * 6 : 1;
      g.text(ctx, pp.text, pp.x, pp.y, { align: 'center', color: pp.color, alpha: a, scale: s > 1.2 ? 2 : 1 });
    }

    if (g.debug) {
      ctx.lineWidth = 1 / z;
      ctx.strokeStyle = '#00ff88';
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#ff3366';
      for (const e of this.entities) if (e.active) ctx.strokeRect(e.x, e.y, e.w, e.h);
      if (this.boss) {
        for (const r of this.boss.bodies()) ctx.strokeRect(r.x, r.y, r.w, r.h);
        const h = this.boss.head();
        if (h) { ctx.strokeStyle = this.boss.vulnerable ? '#ffe066' : '#7ee8ff'; ctx.strokeRect(h.x, h.y, h.w, h.h); }
      }
    }

    // Couche écran
    ctx.setTransform(v.scale, 0, 0, v.scale, 0, 0);
    this.bg.drawForegroundFog(ctx, cam, v);
    this.weather.draw(ctx, v, g.settings.reduceFx);
    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(0.8, this.flash);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, v.w, v.h);
      ctx.globalAlpha = 1;
    }
    if (this.state !== 'won' || this.stateT < 1.4) { if (!(this.mode && this.mode.hideHud)) drawHUD(ctx, this, v); if (this.mode && this.mode.hud) this.mode.hud(ctx, this, v); }
    drawBanners(ctx, this, v);
    if (p.dead && this.deathPhrase) drawDeath(ctx, this, v);
    if (g.input.touchMode && this.state === 'play') {
      const btns = touchLayout(v);
      g.input.setTouchButtons(btns);
      drawTouchControls(ctx, btns, g.input);
    } else g.input.setTouchButtons([]);
    if (this.state === 'paused') drawPause(ctx, this, v);
    if (this.state === 'won' && this.stateT > 1.4) drawResults(ctx, this, v);
    if (g.debug) drawDebug(ctx, this, v);
  }
}
