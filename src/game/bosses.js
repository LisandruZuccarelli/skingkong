// Boss de fin de monde : Yéti géant, Dameuse folle, Dragon de glace, DJ Yéti.
// Règles communes :
//  - 3 phases, de plus en plus rapides ; chaque attaque est annoncée (posture, marque au sol, ligne clignotante) ;
//  - on ne blesse le boss qu'en lui sautant sur la tête quand il est sonné (il clignote en jaune) ;
//  - sauter sur sa tête le reste du temps fait rebondir sans dégâts ; toucher son corps est mortel ;
//  - une chute remet le combat à zéro.
// Module pur (pas de DOM au chargement) : testable sous Node.
import { aabb, clamp } from '../engine/util.js';
import { drawText } from '../engine/font.js';
import { PHYS } from './player.js';

const INK = '#0a0d24';
const R = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const rnd = (a, b) => a + Math.random() * (b - a);

/** Arène commune : 40 colonnes (murs de 6 colonnes de chaque côté), sol à la ligne 15. */
export const ARENA = { x0: 96, x1: 544, floor: 240, w: 640, h: 272 };

// ---------------------------------------------------------------------------
// Projectiles et dangers
// ---------------------------------------------------------------------------
// k : ball (boule en cloche), roll (boule qui roule), wave (onde au sol), drop (chute depuis le haut, annoncée),
//     ray (rayon entre deux points, annoncé), shard (éclat en ligne droite), ring (onde sonore basse/haute), laser (colonne)
class Hazard {
  constructor(o) {
    Object.assign(this, { vx: 0, vy: 0, g: 0, t: 0, warn: 0, life: 99, w: 8, h: 8, dead: false }, o);
  }
  get on() { return this.t >= this.warn; }
  hit(box) {
    if (!this.on || this.dead) return false;
    if (this.k === 'ray') {
      if (this.t > this.warn + this.dur) return false;
      const { x1, y1, x2, y2 } = this;
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const dx = x2 - x1, dy = y2 - y1;
      const s = clamp(((cx - x1) * dx + (cy - y1) * dy) / (dx * dx + dy * dy), 0, 1);
      const px = x1 + dx * s - cx, py = y1 + dy * s - cy;
      return px * px + py * py < (this.thick / 2 + 4) * (this.thick / 2 + 4);
    }
    if (this.k === 'laser' && this.t > this.warn + this.dur) return false;
    const m = this.k === 'ball' || this.k === 'roll' || this.k === 'shard' ? 2 : 1; // boîtes un peu indulgentes
    return aabb(box, { x: this.x + m, y: this.y + m, w: this.w - 2 * m, h: this.h - 2 * m });
  }
}

function updateHazards(boss, dt, lvl) {
  const A = ARENA;
  for (const z of boss.hz) {
    z.t += dt;
    if (z.t > z.life) z.dead = true;
    if (!z.on || z.dead) continue;
    if (z.k === 'ray' || z.k === 'laser') { if (z.t > z.warn + z.dur) z.dead = true; continue; }
    z.vy += z.g * dt;
    z.x += z.vx * dt;
    z.y += z.vy * dt;
    if (z.k === 'roll') z.spin = (z.spin || 0) + z.vx * dt / 8;
    const bottom = z.y + z.h;
    if ((z.k === 'ball' || z.k === 'drop') && bottom >= A.floor) {
      z.dead = true;
      lvl.particles.burst(z.x + z.w / 2, A.floor - 2, 10, { color: z.k === 'drop' && z.ice ? ['#9fe6ff', '#ffffff'] : ['#ffffff', '#dbe8ff'], speed: 90, angle: -Math.PI / 2, spread: 1.4, g: 400, life: 0.45, size: 2 });
      lvl.game.audio.play(z.ice ? 'shatter' : 'land', 0.8);
      if (z.onLand) z.onLand(z);
    }
    if ((z.k === 'roll' || z.k === 'wave' || z.k === 'ring' || z.k === 'shard') && (z.x + z.w < A.x0 - 4 || z.x > A.x1 + 4)) z.dead = true;
    if (z.k === 'shard' && (z.y > A.floor || z.y < -40)) z.dead = true;
    if (z.k === 'wave' && Math.random() < dt * 40) lvl.particles.spawn(z.x + z.w / 2, A.floor - 2, -z.vx * 0.1, -60 - Math.random() * 60, 0.35, 2, '#ffffff', { g: 300 });
  }
  boss.hz = boss.hz.filter((z) => !z.dead);
}

function drawHazards(ctx, boss, t) {
  const A = ARENA;
  for (const z of boss.hz) {
    const blink = Math.sin(t * 30) > 0;
    if (z.k === 'drop' || z.k === 'ball' && z.mark) {
      // marque au sol : où ça va tomber
      const mx = z.k === 'drop' ? z.x + z.w / 2 : z.mark;
      if (z.k === 'drop' || z.y < A.floor - 30) {
        ctx.globalAlpha = z.on ? 0.5 : blink ? 0.9 : 0.4;
        R(ctx, mx - 7, A.floor - 2, 14, 2, z.ice ? '#7ee8ff' : '#ff4f5e');
        R(ctx, mx - 1, A.floor - 6, 2, 3, z.ice ? '#7ee8ff' : '#ff4f5e');
        ctx.globalAlpha = 1;
      }
    }
    if (!z.on && z.k !== 'ray' && z.k !== 'laser') continue;
    switch (z.k) {
      case 'ball': case 'roll': {
        const r = z.w / 2, cx = z.x + r, cy = z.y + r;
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b9cbef'; ctx.beginPath(); ctx.arc(cx + r * 0.3, cy + r * 0.3, r * 0.55, 0, Math.PI * 2); ctx.fill();
        if (z.k === 'roll') { const a = z.spin || 0; R(ctx, cx + Math.cos(a) * r * 0.5 - 1, cy + Math.sin(a) * r * 0.5 - 1, 2, 2, '#8fa3d6'); R(ctx, cx - Math.cos(a) * r * 0.5 - 1, cy - Math.sin(a) * r * 0.5 - 1, 2, 2, '#8fa3d6'); }
        break;
      }
      case 'drop':
        if (z.ice) {
          R(ctx, z.x, z.y, z.w, z.h * 0.5, INK); R(ctx, z.x + 1, z.y, z.w - 2, z.h * 0.45, '#bff3ff');
          R(ctx, z.x + 2, z.y + z.h * 0.45, z.w - 4, z.h * 0.3, '#9fe6ff'); R(ctx, z.x + z.w / 2 - 1, z.y + z.h * 0.75, 2, z.h * 0.25, '#7ec8e8');
        } else {
          R(ctx, z.x - 1, z.y - 1, z.w + 2, z.h + 2, INK); R(ctx, z.x, z.y, z.w, z.h, '#eef6ff'); R(ctx, z.x, z.y + z.h - 3, z.w, 3, '#b9cbef');
        }
        break;
      case 'wave':
        for (let i = 0; i < 3; i++) R(ctx, z.x + i * 3, z.y + z.h - (z.h - i * 3), 3, z.h - i * 3, i ? '#dbe8ff' : '#ffffff');
        R(ctx, z.x, z.y + z.h - 1, z.w, 1, '#8fa3d6');
        break;
      case 'shard': {
        ctx.save(); ctx.translate(z.x + z.w / 2, z.y + z.h / 2); ctx.rotate(Math.atan2(z.vy, z.vx));
        R(ctx, -6, -2, 12, 4, INK); R(ctx, -5, -1, 10, 2, '#bff3ff'); R(ctx, 3, -1, 2, 2, '#ffffff');
        ctx.restore();
        break;
      }
      case 'ring': {
        const c = z.high ? '#ff4fd8' : '#7ee8ff';
        ctx.globalAlpha = 0.9;
        R(ctx, z.x, z.y, z.w, z.h, c); R(ctx, z.x + 2, z.y + 2, z.w - 4, z.h - 4, '#ffffff');
        ctx.globalAlpha = 0.35; R(ctx, z.x - z.vx * 0.04, z.y + 1, z.w, z.h - 2, c);
        ctx.globalAlpha = 1;
        break;
      }
      case 'ray': {
        const active = z.on;
        ctx.save();
        ctx.lineCap = 'round';
        if (!active) {
          ctx.globalAlpha = blink ? 0.85 : 0.3; ctx.strokeStyle = z.color || '#7ee8ff'; ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
        } else {
          const k = 1 - Math.max(0, z.t - z.warn - z.dur + 0.15) / 0.15;
          ctx.globalAlpha = 0.5 * k; ctx.strokeStyle = z.color || '#7ee8ff'; ctx.lineWidth = z.thick + 4;
          ctx.beginPath(); ctx.moveTo(z.x1, z.y1); ctx.lineTo(z.x2, z.y2); ctx.stroke();
          ctx.globalAlpha = k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = z.thick * 0.6;
        }
        ctx.beginPath(); ctx.moveTo(z.x1, z.y1); ctx.lineTo(z.x2, z.y2); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'laser': {
        if (!z.on) { ctx.globalAlpha = blink ? 0.8 : 0.25; R(ctx, z.x + z.w / 2 - 0.5, z.y, 1, z.h, z.color); R(ctx, z.x - 2, z.y + z.h - 2, z.w + 4, 2, z.color); ctx.globalAlpha = 1; break; }
        ctx.globalAlpha = 0.45; R(ctx, z.x - 3, z.y, z.w + 6, z.h, z.color);
        ctx.globalAlpha = 1; R(ctx, z.x, z.y, z.w, z.h, z.color); R(ctx, z.x + z.w / 2 - 1, z.y, 2, z.h, '#ffffff');
        break;
      }
      default: break;
    }
  }
}

// ---------------------------------------------------------------------------
// Base commune
// ---------------------------------------------------------------------------
class Boss {
  constructor(lvl, o) {
    this.lvl = lvl;
    this.name = o.name;
    this.maxHp = o.hp; this.hp = o.hp; this.perPhase = o.perPhase;
    this.w = o.w; this.h = o.h;
    this.x = o.x; this.y = o.y;
    this.facing = -1;
    this.hz = [];
    this.t = 0; this.st = 'intro'; this.stT = 0; this.did = {};
    this.inv = 0; this.hurtT = 0;
    this.defeated = false; this.winSent = false;
    this.step = 0; // index dans la séquence d'attaques de la phase
    this.shownPhase = 1;
  }
  get phase() { return Math.min(3, 1 + Math.floor((this.maxHp - this.hp) / this.perPhase)); }
  get vulnerable() { return this.st === this.weakState && this.inv <= 0; }
  set(st) { this.st = st; this.stT = 0; this.did = {}; }
  /** une seule fois par état (déclenchement d'événements à un instant donné) */
  once(key, at) { if (this.stT >= at && !this.did[key]) { this.did[key] = true; return true; } return false; }
  nextAttack() {
    const seq = this.sequences[this.phase - 1];
    const a = seq[this.step % seq.length];
    this.step++;
    this.set(a);
  }
  facePlayer() { const p = this.lvl.player; this.facing = p.cx < this.x + this.w / 2 ? -1 : 1; }
  sfx(n, p) { this.lvl.game.audio.play(n, p); }
  shake(a) { this.lvl.camera.shake(a); }
  /** rectangles : tête (point faible / rebond), corps mortels, corps inoffensifs (sonné) */
  head() { return null; }
  bodies() { return [{ x: this.x, y: this.y, w: this.w, h: this.h }]; }
  get harmless() { return this.st === this.weakState || this.st === 'hurt' || this.st === 'phase' || this.st === 'defeat' || this.st === 'intro'; }

  update(dt, lvl) {
    this.t += dt; this.stT += dt;
    this.inv = Math.max(0, this.inv - dt);
    if (this.st === 'defeat') this.updateDefeat(dt, lvl);
    else if (this.st === 'phase') {
      this.think(dt, lvl, true);
      if (this.once('roar', 0.3)) { this.sfx('roar'); this.shake(0.5); lvl.flashNow('#ffffff', 0.3); }
      if (this.stT > 1.6) { this.step = 0; this.nextAttack(); }
    } else this.think(dt, lvl, false);
    updateHazards(this, dt, lvl);
    if (!lvl.player.dead && !lvl.player.won) this.interact(lvl, lvl.player);
  }

  interact(lvl, p) {
    const box = p.box();
    const falling = (r) => p.vy > 0 && p.bottom - r.y < 8 + p.vy / 60;
    const h = this.head();
    if (h && aabb(box, h) && falling(h) && this.st !== 'defeat') {
      if (this.vulnerable) this.hit(lvl, p);
      else this.bounce(lvl, p, false);
      return;
    }
    for (const r of this.bodies()) {
      if (!aabb(box, r)) continue;
      if (r.safeTop && falling(r)) { this.bounce(lvl, p, true); return; }
      if (this.harmless || r.soft) {
        // corps inoffensif : on est simplement repoussé
        if (p.cx < r.x + r.w / 2) { p.x = r.x - p.w - 0.1; p.vx = Math.min(p.vx, -60); } else { p.x = r.x + r.w + 0.1; p.vx = Math.max(p.vx, 60); }
        continue;
      }
      lvl.killPlayer('boss', r);
      return;
    }
    for (const z of this.hz) if (z.hit(box)) { lvl.killPlayer('boss', z); return; }
  }

  bounce(lvl, p, quiet) {
    const held = lvl.game.input.held.jump;
    p.vy = -(held ? PHYS.stompHeld : PHYS.stompBounce) * 0.9;
    p.jumping = held; p.usedDouble = false; p.grounded = false;
    p.squash(1.2, 0.8);
    if (!quiet) { this.sfx('bonk'); lvl.particles.burst(p.cx, p.bottom, 6, { color: ['#ffffff', '#ffc83d'], speed: 60, angle: -Math.PI / 2, spread: 1.6, life: 0.3, size: 2, shape: 'spark', additive: true }); }
  }

  hit(lvl, p) {
    this.hp--;
    this.inv = 1.0;
    const held = lvl.game.input.held.jump;
    p.vy = -(held ? PHYS.stompHeld : PHYS.stompBounce);
    p.jumping = held; p.usedDouble = false; p.grounded = false;
    p.vx = p.cx < this.x + this.w / 2 ? -170 : 170; // éjecté sur le côté pour ne pas retomber dessus
    p.squash(1.3, 0.75);
    lvl.freeze = 0.12;
    lvl.flashNow('#ffffff', 0.45);
    this.shake(0.45);
    this.sfx('bossHit');
    const h = this.head() || this;
    lvl.particles.burst(h.x + h.w / 2, h.y + h.h / 2, 26, { color: ['#ffffff', '#ffc83d', '#ff4f5e'], speed: 150, life: 0.7, size: 3, shape: 'spark', drag: 3, additive: true });
    lvl.particles.spawn(h.x + h.w / 2, h.y + h.h / 2, 0, 0, 0.4, 2, '#ffc83d', { shape: 'ring', grow: 90, shrink: false });
    lvl.popup(h.x + h.w / 2, h.y - 8, this.hp > 0 ? 'BAM !' : 'K.O. !', '#ffc83d');
    this.hz = this.hz.filter((z) => z.k === 'drop' && z.on); // les attaques en cours s'arrêtent
    if (this.hp <= 0) {
      this.set('defeat'); this.defeated = true; lvl.game.music.stop(0.4);
      for (const e of lvl.entities) if (e.minion && !e.dead) { e.dead = true; lvl.particles.burst(e.x + 6, e.y + 8, 10, { color: ['#ffffff', '#ff4fd8'], speed: 80, life: 0.5, size: 2 }); }
      return;
    }
    if (this.phase !== this.shownPhase) {
      this.shownPhase = this.phase;
      this.set('phase');
      lvl.banners.push({ title: `PHASE ${this.phase} / 3`, sub: this.phase === 3 ? 'DERNIER ROUND !' : 'IL S\'ENERVE...', t: 0, dur: 1.6 });
      lvl.musicBoost = this.phase;
    } else this.set('hurt');
  }

  updateDefeat(dt, lvl) {
    if (Math.random() < dt * 14 && this.stT < 2) {
      const x = this.x + Math.random() * this.w, y = this.y + Math.random() * this.h;
      lvl.particles.burst(x, y, 10, { color: ['#ffffff', '#ffc83d', '#ff8a2a'], speed: 110, life: 0.5, size: 3, g: 100, additive: true });
      this.sfx('boom');
      this.shake(0.2);
    }
    if (this.stT > 2.4 && !this.winSent) { this.winSent = true; lvl.win(); }
  }

  /** commun à tous : clignotement d'invulnérabilité, étoiles de sonné */
  drawStatus(ctx, cx, top) {
    if (this.st === this.weakState) {
      for (let i = 0; i < 3; i++) {
        const a = this.t * 5 + i * 2.1;
        const x = cx + Math.cos(a) * 12, y = top - 6 + Math.sin(a) * 3;
        R(ctx, x - 1, y - 1, 3, 3, INK); R(ctx, x, y, 1, 1, '#ffe066'); R(ctx, x - 1, y, 3, 1, '#ffe066'); R(ctx, x, y - 1, 1, 3, '#ffe066');
      }
      // flèche : saute-lui sur la tête !
      if (Math.sin(this.t * 8) > -0.2) drawText(ctx, '↓', cx, top - 22, { align: 'center', color: '#ffe066', outline: INK });
    }
  }
  hidden() { return this.inv > 0 && Math.floor(this.t * 16) % 2 === 0; }

  draw(ctx) {
    if (this.st === 'defeat' && this.stT > 2.2) return;
    ctx.save();
    if (this.st === 'defeat') { ctx.translate(Math.sin(this.t * 60) * 1.5, 0); }
    if (!this.hidden()) this.drawBody(ctx);
    ctx.restore();
    if (this.st !== 'defeat') { const h = this.head(); if (h) this.drawStatus(ctx, h.x + h.w / 2, h.y); }
  }
  drawFront(ctx) { drawHazards(ctx, this, this.t); }
  lights() { return []; }

  // aides pour les attaques
  throwArc(x0, y0, tx, flight, o = {}) {
    const g = o.g || 900;
    const ty = ARENA.floor - (o.size || 8);
    const vx = (tx - x0) / flight;
    const vy = (ty - y0 - 0.5 * g * flight * flight) / flight;
    this.hz.push(new Hazard({ k: 'ball', x: x0 - (o.size || 8) / 2, y: y0, w: o.size || 8, h: o.size || 8, vx, vy, g, mark: tx, ...o }));
  }
  dropAt(x, warn, o = {}) {
    const w = o.w || 10, h = o.h || 14;
    this.hz.push(new Hazard({ k: 'drop', x: clamp(x, ARENA.x0 + w, ARENA.x1 - w) - w / 2, y: -h - 4, w, h, g: 900, vy: 120, warn, ...o }));
  }
  wavesFrom(x, speed, h = 10) {
    for (const d of [-1, 1]) this.hz.push(new Hazard({ k: 'wave', x: x - 4 + d * 6, y: ARENA.floor - h, w: 9, h, vx: d * speed }));
    this.lvl.particles.burst(x, ARENA.floor - 2, 16, { color: ['#ffffff', '#dbe8ff'], speed: 120, angle: -Math.PI / 2, spread: 1.4, g: 400, life: 0.5, size: 2 });
  }
  /** n abscisses réparties sur l'arène (toujours des trous pour passer) ; la 1re peut viser Kong */
  spread(n, around) {
    const A = ARENA;
    const xs = [];
    for (let i = 0; i < n; i++) xs.push(A.x0 + 20 + ((A.x1 - A.x0 - 40) * (i + 0.5)) / n + rnd(-10, 10));
    if (around !== undefined && n) {
      // on remplace la chute la plus proche de Kong par une chute pile sur lui
      let best = 0;
      xs.forEach((x, i) => { if (Math.abs(x - around) < Math.abs(xs[best] - around)) best = i; });
      xs[best] = clamp(around, A.x0 + 12, A.x1 - 12);
    }
    return xs;
  }
}

// ---------------------------------------------------------------------------
// Monde 1 : le Yéti géant — charge contre les murs, lance des boules, saute et fait trembler le sol
// ---------------------------------------------------------------------------
class Yeti extends Boss {
  constructor(lvl) {
    super(lvl, { name: 'LE YETI GEANT', hp: 6, perPhase: 2, w: 34, h: 40, x: ARENA.x1 - 70, y: ARENA.floor - 40 });
    this.weakState = 'stunned';
    this.sequences = [
      ['charge', 'throw', 'charge', 'throw'],
      ['charge', 'leap', 'throw', 'charge', 'leap'],
      ['leap', 'charge', 'throw', 'leap', 'charge'],
    ];
    this.vx = 0; this.vy = 0; this.pose = 'idle';
  }
  head() { return { x: this.x + 6, y: this.y - 2, w: this.w - 12, h: 10 }; }
  bodies() { return [{ x: this.x + 2, y: this.y + 8, w: this.w - 4, h: this.h - 8 }]; }
  think(dt, lvl, idle) {
    const P = this.phase, A = ARENA;
    const ground = A.floor - this.h;
    this.pose = 'idle';
    if (idle || this.st === 'intro') {
      if (this.st === 'intro') { this.facePlayer(); if (this.once('r', 1.0)) { this.sfx('roar'); this.shake(0.4); } if (this.stT > 2.0) this.nextAttack(); }
      this.pose = 'roar';
      return;
    }
    switch (this.st) {
      case 'hurt':
        this.pose = 'hurt';
        if (this.stT > 0.8) this.nextAttack();
        break;
      case 'charge': {
        const wind = [0.75, 0.6, 0.5][P - 1];
        if (this.stT < wind) {
          this.facePlayer(); this.pose = 'crouch';
          if (Math.random() < dt * 20) lvl.particles.spawn(this.x + this.w / 2 - this.facing * 14, A.floor - 2, -this.facing * 60, -40, 0.4, 2, '#ffffff', { g: 300 });
          if (this.once('w', 0)) this.sfx('roar', 1.3);
          break;
        }
        this.pose = 'run';
        const sp = [215, 250, 290][P - 1];
        this.x += this.facing * sp * dt;
        if (Math.random() < dt * 25) lvl.particles.spawn(this.x + this.w / 2, A.floor - 2, -this.facing * 40, -50, 0.4, 2, '#ffffff', { g: 300 });
        if (this.x < A.x0 || this.x + this.w > A.x1) {
          this.x = clamp(this.x, A.x0, A.x1 - this.w);
          this.sfx('boom'); this.shake(0.6);
          lvl.particles.burst(this.facing > 0 ? A.x1 : A.x0, this.y + 20, 20, { color: ['#ffffff', '#cfe0ff'], speed: 120, spread: Math.PI, angle: this.facing > 0 ? Math.PI : 0, g: 300, life: 0.6, size: 3 });
          // le choc fait tomber de la neige du haut (phases 2 et 3)
          const n = [0, 3, 5][P - 1];
          // ... jamais juste devant le Yéti sonné : l'accès à sa tête reste libre
          const wallX = this.facing > 0 ? A.x1 : A.x0;
          const xs = this.spread(n + 2).filter((x) => Math.abs(x - wallX) > 110).slice(0, n);
          xs.forEach((x, i) => this.dropAt(x, 0.7 + i * 0.12, { w: 12, h: 12 }));
          this.set('stunned');
        }
        break;
      }
      case 'stunned':
        this.pose = 'dizzy';
        if (this.stT > [1.9, 1.6, 1.35][P - 1]) this.nextAttack();
        break;
      case 'throw': {
        this.facePlayer();
        const n = [2, 3, 3][P - 1];
        this.pose = 'throw';
        const hand = { x: this.x + this.w / 2 + this.facing * 10, y: this.y - 6 };
        for (let i = 0; i < n; i++) {
          if (this.once('b' + i, 0.55 + i * 0.4)) {
            const px = lvl.player.cx + lvl.player.vx * 0.4 * (i % 2);
            this.throwArc(hand.x, hand.y, clamp(px + (i === 2 ? this.facing * 40 : 0), A.x0 + 10, A.x1 - 10), 0.85, { size: 10 });
            this.sfx('throw');
          }
        }
        if (P === 3 && this.once('roll', 0.55 + n * 0.4)) {
          this.hz.push(new Hazard({ k: 'roll', x: this.x + this.w / 2 - 9, y: A.floor - 18, w: 18, h: 18, vx: this.facing * 150 }));
          this.sfx('throw', 0.7);
        }
        if (this.stT > 0.75 + n * 0.4 + (P === 3 ? 0.6 : 0)) this.nextAttack();
        break;
      }
      case 'leap': {
        if (this.stT < 0.5) { this.pose = 'crouch'; this.facePlayer(); this.target = clamp(lvl.player.cx - this.w / 2, A.x0, A.x1 - this.w); this.from = this.x; break; }
        const k = clamp((this.stT - 0.5) / 0.9, 0, 1);
        this.pose = 'jump';
        this.x = this.from + (this.target - this.from) * k;
        this.y = ground - Math.sin(k * Math.PI) * 120;
        if (k >= 1) {
          this.y = ground;
          if (this.once('land', 0)) { this.sfx('boom'); this.shake(0.55); this.wavesFrom(this.x + this.w / 2, [0, 170, 210][P - 1]); }
          this.pose = 'crouch';
          if (P === 3 && this.once('ice', 0)) this.spread(4).forEach((x, i) => this.dropAt(x, 0.6 + i * 0.15, { w: 10, h: 16, ice: true }));
          if (this.stT > 1.4 + 0.5) this.nextAttack();
        }
        break;
      }
      default: this.nextAttack();
    }
    if (this.st !== 'leap') this.y = ground;
  }
  drawBody(ctx) {
    const f = this.facing, P = this.phase;
    ctx.save();
    ctx.translate(Math.round(this.x + this.w / 2), Math.round(this.y + this.h));
    const run = this.pose === 'run';
    if (run) ctx.rotate(f * 0.12);
    ctx.scale(f, 1);
    const sq = this.pose === 'crouch' ? 0.88 : 1;
    ctx.scale(1, sq);
    const step = run ? Math.sin(this.t * 22) * 3 : 0;
    const fur = '#eef6ff', shade = '#b9cbef', face = '#7ea6d8';
    // jambes
    R(ctx, -14, -10 + Math.min(0, step), 10, 10, INK); R(ctx, -13, -9 + Math.min(0, step), 8, 8, shade);
    R(ctx, 4, -10 + Math.min(0, -step), 10, 10, INK); R(ctx, 5, -9 + Math.min(0, -step), 8, 8, fur);
    // bras arrière
    const armUp = this.pose === 'throw' || this.pose === 'roar';
    R(ctx, -20, armUp ? -44 : -32, 9, 20, INK); R(ctx, -19, armUp ? -43 : -31, 7, 18, shade);
    // torse
    R(ctx, -16, -36, 32, 28, INK); R(ctx, -15, -35, 30, 26, fur); R(ctx, -15, -35, 6, 26, shade);
    R(ctx, -6, -28, 14, 14, '#dbe8ff');
    // tête
    R(ctx, -11, -48, 24, 16, INK); R(ctx, -10, -47, 22, 14, fur);
    R(ctx, -2, -44, 13, 10, face);
    const dizzy = this.pose === 'dizzy';
    const eye = P === 3 ? '#ff4f5e' : '#ffffff';
    if (dizzy) { R(ctx, 0, -42, 3, 1, INK); R(ctx, 1, -43, 1, 3, INK); R(ctx, 7, -42, 3, 1, INK); R(ctx, 8, -43, 1, 3, INK); }
    else { R(ctx, 0, -43, 3, 3, eye); R(ctx, 7, -43, 3, 3, eye); R(ctx, 2, -42, 1, 1, INK); R(ctx, 9, -42, 1, 1, INK); R(ctx, -1, -45, 4, 1, INK); R(ctx, 6, -45, 5, 1, INK); }
    const open = this.pose === 'roar' || this.pose === 'run' || P >= 2;
    R(ctx, 1, -37, 9, open ? 3 : 1, INK);
    if (open) { R(ctx, 2, -37, 1, 1, '#ffffff'); R(ctx, 8, -37, 1, 1, '#ffffff'); }
    // bras avant
    if (armUp) {
      R(ctx, 12, -52, 9, 22, INK); R(ctx, 13, -51, 7, 20, fur);
      if (this.pose === 'throw') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(16, -54, 5, 0, Math.PI * 2); ctx.fill(); }
    } else {
      const sw = run ? -step : 0;
      R(ctx, 12, -32 + sw, 9, 22, INK); R(ctx, 13, -31 + sw, 7, 20, fur); R(ctx, 13, -13 + sw, 7, 2, shade);
    }
    ctx.restore();
    if (this.st === 'charge' && this.stT < [0.75, 0.6, 0.5][P - 1] && Math.sin(this.t * 25) > 0) drawText(ctx, '!', this.x + this.w / 2, this.y - 24, { align: 'center', scale: 2, color: '#ff4f5e', outline: INK });
    if (this.st === 'leap' && this.stT >= 0.5 && this.stT < 1.4) { ctx.globalAlpha = 0.35; R(ctx, this.target + 2, ARENA.floor - 3, this.w - 4, 3, INK); ctx.globalAlpha = 1; }
  }
}

// ---------------------------------------------------------------------------
// Monde 2 : la Dameuse folle — traverse l'arène (on passe par-dessus en rebondissant sur le toit),
// cale contre le mur (le conducteur sort : point faible), mitraille des blocs de neige
// ---------------------------------------------------------------------------
class Groomer extends Boss {
  constructor(lvl) {
    super(lvl, { name: 'LA DAMEUSE FOLLE', hp: 6, perPhase: 2, w: 64, h: 34, x: ARENA.x1 - 80, y: ARENA.floor - 34 });
    this.weakState = 'stall';
    this.facing = -1;
    this.sequences = [
      ['drive', 'drive'],
      ['drive', 'mortar', 'drive'],
      ['drive2', 'mortar', 'drive'],
    ];
    this.speed = 0; this.passes = 0; this.tread = 0;
  }
  local(x, y, w, h) { return this.facing > 0 ? { x: this.x + x, y: this.y + y, w, h } : { x: this.x + this.w - x - w, y: this.y + y, w, h }; }
  head() { return this.local(14, -6, 24, 10); }
  bodies() {
    const deck = this.local(2, 13, 50, 5); deck.safeTop = true;
    return [deck, this.local(2, 16, 50, 18), this.local(16, 2, 20, 12), this.local(52, 6, 12, 28)];
  }
  get harmless() { return super.harmless; }
  think(dt, lvl, idle) {
    const P = this.phase, A = ARENA;
    this.y = A.floor - this.h;
    if (idle || this.st === 'intro') {
      if (this.st === 'intro' && this.once('r', 0.8)) this.sfx('engine');
      if (this.st === 'intro' && this.stT > 2.0) this.nextAttack();
      this.exhaust(lvl, 8);
      return;
    }
    switch (this.st) {
      case 'hurt':
        if (this.stT > 0.8) this.nextAttack();
        break;
      case 'drive': case 'drive2': {
        const wind = [0.8, 0.65, 0.55][P - 1];
        if (this.stT < wind) {
          if (this.once('w', 0)) { this.sfx('engine'); this.facing = this.x + this.w / 2 < (A.x0 + A.x1) / 2 ? 1 : -1; this.speed = 0; this.passes = 0; }
          this.exhaust(lvl, 30);
          break;
        }
        const max = [175, 215, 250][P - 1];
        this.speed = Math.min(max, this.speed + 500 * dt);
        this.x += this.facing * this.speed * dt;
        this.tread += this.speed * dt;
        this.exhaust(lvl, 12);
        // la fraise arrière projette des mottes de neige (phases 2 et 3)
        if (P >= 2 && this.once('t' + Math.floor(this.stT / 0.45), 0)) {
          const bx = this.facing > 0 ? this.x - 2 : this.x + this.w + 2;
          this.hz.push(new Hazard({ k: 'ball', x: bx - 4, y: this.y + 14, w: 8, h: 8, vx: -this.facing * rnd(60, 120), vy: -rnd(220, 300), g: 900 }));
        }
        if (this.x < A.x0 || this.x + this.w > A.x1) {
          this.x = clamp(this.x, A.x0, A.x1 - this.w);
          this.sfx('boom'); this.shake(0.55);
          lvl.particles.burst(this.facing > 0 ? A.x1 : A.x0, this.y + 16, 18, { color: ['#ffffff', '#cfe0ff', '#ffc83d'], speed: 120, spread: Math.PI, angle: this.facing > 0 ? Math.PI : 0, g: 300, life: 0.6, size: 3 });
          this.passes++;
          if (this.st === 'drive2' && this.passes < 2) { this.facing = -this.facing; this.speed = 40; this.stT = wind; this.did = {}; this.did.w = true; }
          else this.set('stall');
        }
        break;
      }
      case 'stall':
        if (Math.random() < dt * 12) lvl.particles.spawn(this.head().x + 4, this.y - 4, rnd(-10, 10), -30, 0.8, 3, '#545e94', { g: -20 });
        if (this.stT > [1.9, 1.6, 1.35][P - 1]) { this.facing = -this.facing; this.nextAttack(); }
        break;
      case 'mortar': {
        const n = [0, 4, 6][P - 1];
        this.exhaust(lvl, 20);
        const xs = this.mortarXs || (this.mortarXs = this.spread(n, lvl.player.cx));
        for (let i = 0; i < n; i++) if (this.once('m' + i, 0.3 + i * 0.25)) { this.dropAt(xs[i], 0.9, { w: 14, h: 14 }); this.sfx('throw', 0.6); }
        if (this.stT > 0.3 + n * 0.25 + 1.4) { this.mortarXs = null; this.nextAttack(); }
        break;
      }
      default: this.nextAttack();
    }
  }
  exhaust(lvl, rate) {
    const e = this.local(8, -8, 3, 2);
    if (Math.random() < lvl.game.lastDt * rate) lvl.particles.spawn(e.x + 1, e.y, rnd(-8, 8), -40, 0.7, 3, this.phase === 3 ? '#3a3f55' : '#8a93b8', { g: -30 });
  }
  drawBody(ctx) {
    const f = this.facing, P = this.phase;
    ctx.save();
    ctx.translate(Math.round(this.x + this.w / 2), Math.round(this.y));
    const rumble = this.st === 'drive' || this.st === 'drive2' ? Math.round(Math.sin(this.t * 40)) : 0;
    ctx.translate(0, rumble * 0.5);
    ctx.scale(f, 1);
    ctx.translate(-32, 0);
    const red = P === 3 ? '#ff2f4a' : '#e8455a', redD = '#a52438';
    // chenilles
    R(ctx, 1, 22, 52, 12, INK); R(ctx, 2, 23, 50, 10, '#3a3f55');
    for (let i = 0; i < 6; i++) { const wx = 6 + i * 8.4; ctx.fillStyle = '#8a93b8'; ctx.beginPath(); ctx.arc(wx, 28, 3, 0, Math.PI * 2); ctx.fill(); }
    const tr = Math.floor(this.tread / 3) % 4;
    for (let i = tr; i < 50; i += 4) { R(ctx, 2 + i, 23, 2, 1, '#545e94'); R(ctx, 2 + i, 32, 2, 1, '#545e94'); }
    // fraise arrière
    R(ctx, -5, 20, 8, 12, INK); R(ctx, -4, 21, 6, 10, '#8a93b8'); R(ctx, -4, 21 + (Math.floor(this.tread / 2) % 8), 6, 2, '#dbe8ff');
    // coque
    R(ctx, 1, 12, 52, 12, INK); R(ctx, 2, 13, 50, 10, red); R(ctx, 2, 20, 50, 3, redD); R(ctx, 2, 16, 50, 2, '#ffffff');
    // cabine
    R(ctx, 13, -1, 26, 15, INK); R(ctx, 14, 0, 24, 13, red);
    R(ctx, 17, 2, 18, 8, '#7ee8ff'); R(ctx, 18, 3, 4, 2, '#ffffff');
    // conducteur
    const out = this.st === 'stall';
    if (out) {
      // trappe ouverte : le pilote sort la tête, sonné
      R(ctx, 16, -9, 20, 9, INK); R(ctx, 17, -8, 18, 8, '#ffc83d'); R(ctx, 22, -12, 8, 5, '#2b3c94');
      R(ctx, 20, -6, 3, 2, INK); R(ctx, 29, -6, 3, 2, INK); R(ctx, 23, -3, 6, 1, INK);
    } else {
      R(ctx, 26, 4, 7, 6, '#2b3c94'); R(ctx, 29, 5, 2, 2, P === 3 ? '#ff4f5e' : '#ffffff');
    }
    // pot d'échappement
    R(ctx, 7, -8, 4, 10, INK); R(ctx, 8, -7, 2, 9, '#545e94');
    // gyrophare
    if (Math.sin(this.t * 12) > 0) { R(ctx, 34, -4, 4, 3, '#ffc83d'); }
    // lame
    R(ctx, 52, 6, 12, 28, INK); R(ctx, 53, 7, 10, 26, '#ffc83d');
    for (let i = 0; i < 4; i++) R(ctx, 53, 9 + i * 7, 10, 2, '#b07a10');
    R(ctx, 49, 16, 4, 4, '#545e94');
    if (Math.sin(this.t * 6) > 0 || this.st === 'drive' || this.st === 'drive2') R(ctx, 61, 10, 3, 3, '#ffffff');
    ctx.restore();
    const wind = [0.8, 0.65, 0.55][P - 1];
    if ((this.st === 'drive' || this.st === 'drive2') && this.stT < wind && Math.sin(this.t * 25) > 0) drawText(ctx, '!', this.x + this.w / 2, this.y - 26, { align: 'center', scale: 2, color: '#ff4f5e', outline: INK });
  }
  lights() {
    const h = this.local(60, 10, 4, 4);
    return [{ x: h.x, y: h.y, r: 40, rgb: '255,240,200', bloom: 0.3 }];
  }
}

// ---------------------------------------------------------------------------
// Monde 3 : le Dragon de glace — vole, souffle des rayons de glace visés, fait pleuvoir des stalactites,
// pique vers le sol (et s'y écrase : tête à portée)
// ---------------------------------------------------------------------------
class Dragon extends Boss {
  constructor(lvl) {
    super(lvl, { name: 'LE DRAGON DE GLACE', hp: 6, perPhase: 2, w: 56, h: 28, x: (ARENA.x0 + ARENA.x1) / 2 - 28, y: -60 });
    this.weakState = 'grounded';
    this.sequences = [
      ['breath', 'dive', 'breath', 'dive'],
      ['shards', 'breath', 'dive'],
      ['rain', 'breath', 'dive', 'shards', 'dive'],
    ];
    this.home = { x: this.x, y: 56 };
    this.flap = 0;
  }
  local(x, y, w, h) { return this.facing > 0 ? { x: this.x + x, y: this.y + y, w, h } : { x: this.x + this.w - x - w, y: this.y + y, w, h }; }
  head() { return this.st === 'grounded' ? this.local(40, 12, 16, 12) : this.local(40, 0, 16, 12); }
  mouth() { const h = this.local(50, 6, 4, 4); return { x: h.x + 2, y: h.y + 2 }; }
  bodies() { return [this.local(8, 8, 34, 16), this.local(0, 12, 10, 6)]; }
  flyTo(tx, ty, dt, k = 3) { this.x += (tx - this.x) * Math.min(1, dt * k); this.y += (ty - this.y) * Math.min(1, dt * k); }
  think(dt, lvl, idle) {
    const P = this.phase, A = ARENA;
    this.flap += dt * (this.st === 'grounded' ? 2 : 9);
    const hover = Math.sin(this.t * 2.4) * 6;
    if (idle || this.st === 'intro') {
      this.flyTo(this.home.x, this.home.y + hover, dt, 2);
      this.facePlayer();
      if (this.st === 'intro' && this.once('r', 1.0)) { this.sfx('roar', 1.4); this.shake(0.3); }
      if (this.st === 'intro' && this.stT > 2.2) this.nextAttack();
      return;
    }
    switch (this.st) {
      case 'hurt':
        this.flyTo(this.home.x, this.home.y, dt, 3);
        if (this.stT > 0.9) this.nextAttack();
        break;
      case 'breath': {
        // se place sur un côté, vise Kong, rayon(s) de glace
        if (this.once('side', 0)) this.side = lvl.player.cx < (A.x0 + A.x1) / 2 ? 1 : -1;
        const sx = this.side > 0 ? A.x1 - 90 : A.x0 + 34;
        this.flyTo(sx, 50 + hover, dt, 3);
        this.facing = -this.side;
        const n = [1, 2, 3][P - 1];
        const gap = [0, 1.0, 0.8][P - 1];
        for (let i = 0; i < n; i++) {
          if (this.once('ray' + i, 0.7 + i * gap)) {
            const m = this.mouth(), p = lvl.player;
            const ang = Math.atan2(p.y + 7 - m.y, p.cx - m.x);
            this.hz.push(new Hazard({ k: 'ray', x1: m.x, y1: m.y, x2: m.x + Math.cos(ang) * 700, y2: m.y + Math.sin(ang) * 700, thick: 8, warn: 0.75, dur: 0.45, color: '#7ee8ff', anchor: true }));
            this.sfx('charge');
          }
          if (this.once('fire' + i, 0.7 + i * gap + 0.75)) { this.sfx('laser'); this.shake(0.2); }
        }
        if (this.stT > 0.7 + (n - 1) * gap + 1.5) this.nextAttack();
        break;
      }
      case 'shards': {
        this.flyTo(this.home.x, this.home.y + hover, dt, 3);
        this.facePlayer();
        const volleys = P === 3 ? 2 : 1;
        for (let v = 0; v < volleys; v++) {
          if (this.once('s' + v, 0.6 + v * 0.9)) {
            const m = this.mouth(), p = lvl.player;
            const base = Math.atan2(p.y + 7 - m.y, p.cx - m.x);
            for (let i = -2; i <= 2; i++) {
              const a = base + i * 0.28 + (v ? 0.14 : 0);
              this.hz.push(new Hazard({ k: 'shard', x: m.x - 4, y: m.y - 4, w: 8, h: 8, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190 }));
            }
            this.sfx('shatter');
          }
        }
        if (this.stT > 0.6 + volleys * 0.9 + 0.6) this.nextAttack();
        break;
      }
      case 'rain': {
        this.flyTo(this.home.x, 30 + hover, dt, 3);
        this.facePlayer();
        if (this.once('cry', 0.2)) { this.sfx('roar', 1.6); this.shake(0.3); }
        if (this.once('drop', 0.4)) this.spread(7, lvl.player.cx).forEach((x, i) => this.dropAt(x, 0.9 + (i % 3) * 0.35, { w: 10, h: 18, ice: true }));
        if (this.stT > 2.6) this.nextAttack();
        break;
      }
      case 'dive': {
        const wind = [0.9, 0.75, 0.65][P - 1];
        if (this.stT < wind) {
          // recule et vise : la ligne pointillée montre où il va s'écraser
          if (this.once('aim', 0)) { this.sfx('roar', 1.8); }
          this.facePlayer();
          this.target = { x: clamp(lvl.player.cx - this.w / 2 - this.facing * 12, A.x0, A.x1 - this.w), y: A.floor - this.h };
          this.flyTo(this.x, 40, dt, 2);
          this.from = { x: this.x, y: this.y };
          break;
        }
        const k = clamp((this.stT - wind) / 0.55, 0, 1);
        const e = k * k;
        this.x = this.from.x + (this.target.x - this.from.x) * e;
        this.y = this.from.y + (this.target.y - this.from.y) * e;
        if (k >= 1) {
          this.sfx('boom'); this.shake(0.6);
          if (P >= 2) this.wavesFrom(this.x + this.w / 2, [0, 160, 200][P - 1]);
          lvl.particles.burst(this.x + this.w / 2, A.floor - 2, 22, { color: ['#9fe6ff', '#ffffff'], speed: 130, angle: -Math.PI / 2, spread: 1.6, g: 400, life: 0.6, size: 3 });
          this.set('grounded');
        }
        break;
      }
      case 'grounded':
        this.y = A.floor - this.h;
        if (this.stT > [2.0, 1.7, 1.4][P - 1]) { this.home.x = clamp(lvl.player.cx < (A.x0 + A.x1) / 2 ? A.x1 - 150 : A.x0 + 90, A.x0, A.x1 - this.w); this.nextAttack(); }
        break;
      default: this.nextAttack();
    }
    // les rayons restent accrochés à la gueule pendant l'annonce
    const m = this.mouth();
    for (const z of this.hz) if (z.k === 'ray' && z.anchor && !z.on) { const dx = z.x2 - z.x1, dy = z.y2 - z.y1; z.x1 = m.x; z.y1 = m.y; z.x2 = m.x + dx; z.y2 = m.y + dy; }
  }
  drawBody(ctx) {
    const f = this.facing, P = this.phase;
    const grounded = this.st === 'grounded';
    ctx.save();
    ctx.translate(Math.round(this.x + this.w / 2), Math.round(this.y));
    ctx.scale(f, 1);
    ctx.translate(-28, 0);
    const body = P === 3 ? '#8fd8f8' : '#bfefff', shade = '#5fb8e0', dark = '#2f7fb0';
    // aile arrière
    const wa = grounded ? 0.2 : Math.sin(this.flap);
    ctx.fillStyle = 'rgba(159,230,255,0.75)';
    ctx.beginPath(); ctx.moveTo(18, 10); ctx.lineTo(6, 10 - 22 * wa - 6); ctx.lineTo(30, 10); ctx.fill();
    // queue
    R(ctx, -4, 13, 14, 6, INK); R(ctx, -3, 14, 12, 4, shade); R(ctx, -7, 11, 5, 4, INK); R(ctx, -6, 12, 3, 2, '#ffffff');
    // corps
    R(ctx, 7, 7, 36, 18, INK); R(ctx, 8, 8, 34, 16, body); R(ctx, 8, 19, 34, 5, shade);
    for (let i = 0; i < 5; i++) R(ctx, 11 + i * 6, 4, 3, 4, i % 2 ? '#ffffff' : '#9fe6ff');
    // pattes
    R(ctx, 14, 23, 5, 5, INK); R(ctx, 15, 24, 3, 3, dark); R(ctx, 32, 23, 5, 5, INK); R(ctx, 33, 24, 3, 3, dark);
    // cou + tête
    const hy = grounded ? 12 : 0;
    R(ctx, 38, hy + 4, 8, 12, INK); R(ctx, 39, hy + 5, 6, 10, body);
    R(ctx, 40, hy, 16, 12, INK); R(ctx, 41, hy + 1, 14, 10, body); R(ctx, 41, hy + 8, 14, 3, shade);
    R(ctx, 42, hy - 3, 3, 4, '#ffffff'); R(ctx, 47, hy - 3, 3, 4, '#ffffff');
    if (grounded) { R(ctx, 47, hy + 3, 3, 1, INK); R(ctx, 48, hy + 2, 1, 3, INK); }
    else { R(ctx, 47, hy + 3, 3, 3, P === 3 ? '#ff4f5e' : '#1767ff'); R(ctx, 48, hy + 3, 1, 1, '#ffffff'); }
    const charging = this.hz.some((z) => z.k === 'ray' && !z.on);
    R(ctx, 50, hy + 7, 5, 2, charging ? '#ffffff' : INK);
    // aile avant
    ctx.fillStyle = 'rgba(191,239,255,0.9)';
    ctx.beginPath(); ctx.moveTo(20, 9); ctx.lineTo(14, 9 - 26 * wa - 8); ctx.lineTo(36, 9); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    if (this.st === 'dive' && this.stT < [0.9, 0.75, 0.65][P - 1] && this.target) {
      const blink = Math.sin(this.t * 30) > 0;
      ctx.globalAlpha = blink ? 0.8 : 0.3;
      R(ctx, this.target.x + 4, ARENA.floor - 3, this.w - 8, 3, '#ff4f5e');
      ctx.globalAlpha = 1;
    }
  }
  lights() { const m = this.mouth(); return [{ x: m.x, y: m.y, r: 30, rgb: '126,232,255', bloom: 0.3 }]; }
}

// ---------------------------------------------------------------------------
// Monde 4 : DJ Yéti — mixe sur sa scène (hors d'atteinte) : ondes sonores basses (saute) ou hautes (reste au sol),
// lasers, fêtards ; puis descend danser sur la piste (point faible)
// ---------------------------------------------------------------------------
class DJYeti extends Boss {
  constructor(lvl) {
    super(lvl, { name: 'DJ YETI', hp: 9, perPhase: 3, w: 28, h: 36, x: 306, y: 112 - 36 });
    this.weakState = 'dance';
    this.booth = { x: 262, y: 112, w: 116, h: 26 };
    this.sequences = [
      ['waves', 'drop', 'lasers', 'drop'],
      ['waves', 'drop', 'party', 'drop'],
      ['waves', 'drop', 'lasers', 'drop', 'party', 'drop'],
    ];
    this.beat = 0;
  }
  head() { return { x: this.x + 4, y: this.y - 2, w: this.w - 8, h: 10 }; }
  bodies() { return [{ x: this.x + 3, y: this.y + 8, w: this.w - 6, h: this.h - 8, soft: this.st === 'dance' }]; }
  get onBooth() { return this.y + this.h <= this.booth.y + 1 && this.st !== 'drop'; }
  think(dt, lvl, idle) {
    const P = this.phase, A = ARENA;
    this.beat += dt;
    if (idle || this.st === 'intro') {
      if (this.st === 'intro') { if (this.once('m', 1.2)) { this.sfx('boom'); this.shake(0.4); lvl.flashNow('#ff4fd8', 0.3); } if (this.stT > 2.4) this.nextAttack(); }
      this.toBooth(dt);
      return;
    }
    switch (this.st) {
      case 'hurt':
        if (this.stT > 0.5) this.set('back');
        break;
      case 'back': {
        // remonte d'un bond sur sa scène
        if (this.once('j', 0)) { this.from = { x: this.x, y: this.y }; this.sfx('throw', 0.5); }
        const k = clamp(this.stT / 0.7, 0, 1);
        this.x = this.from.x + (306 - this.from.x) * k;
        this.y = this.from.y + (this.booth.y - this.h - this.from.y) * k - Math.sin(k * Math.PI) * 60;
        if (k >= 1) this.nextAttack();
        break;
      }
      case 'waves': {
        this.toBooth(dt);
        const n = [5, 7, 8][P - 1], gap = [0.95, 0.8, 0.68][P - 1], sp = [150, 175, 200][P - 1];
        for (let i = 0; i < n; i++) {
          if (this.once('w' + i, 0.5 + i * gap)) {
            const fromLeft = i % 2 === 0;
            const high = P >= 2 && (i % 3 === 2);
            const h = high ? 12 : 12;
            const y = high ? A.floor - 36 : A.floor - h;
            this.hz.push(new Hazard({ k: 'ring', high, x: fromLeft ? A.x0 + 10 : A.x1 - 16, y, w: 6, h, vx: (fromLeft ? 1 : -1) * sp }));
            this.sfx(high ? 'laser' : 'bass');
            this.shake(0.08);
            this.pulse = 1;
          }
        }
        if (this.stT > 0.5 + n * gap + 1.2) this.nextAttack();
        break;
      }
      case 'lasers': case 'party': {
        this.toBooth(dt);
        const volleys = P === 3 ? 3 : 2;
        const count = [3, 4, 4][P - 1];
        for (let v = 0; v < volleys; v++) {
          if (this.once('l' + v, 0.4 + v * 1.5)) {
            const xs = this.spread(count + 1).map((x) => x + (v % 2 ? 26 : 0));
            const skip = Math.floor(Math.random() * xs.length);
            xs.forEach((x, i) => { if (i !== skip) this.hz.push(new Hazard({ k: 'laser', x: x - 3, y: 0, w: 6, h: A.floor, warn: 0.95, dur: 0.55, color: v % 2 ? '#7ee8ff' : '#ff4fd8' })); });
            this.sfx('charge');
          }
          if (this.once('f' + v, 0.4 + v * 1.5 + 0.95)) { this.sfx('laser'); this.shake(0.15); }
        }
        if (P === 3 && this.st === 'lasers' && this.once('low', 0.4 + volleys * 1.5)) {
          this.hz.push(new Hazard({ k: 'laser', x: A.x0, y: A.floor - 7, w: A.x1 - A.x0, h: 4, warn: 0.9, dur: 0.35, color: '#ffc83d' }));
          this.sfx('charge');
        }
        if (this.st === 'party' && this.once('mini', 0.6)) this.spawnMinions(lvl, P === 3 ? 3 : 2);
        if (this.stT > 0.4 + volleys * 1.5 + (P === 3 && this.st === 'lasers' ? 1.4 : 0.4)) this.nextAttack();
        break;
      }
      case 'drop': {
        // saute sur la piste, à côté de Kong (l'ombre montre où)
        if (this.once('a', 0)) { this.from = { x: this.x, y: this.y }; const px = lvl.player.cx; this.target = clamp(px + (px < 320 ? 60 : -60) - this.w / 2, A.x0 + 4, A.x1 - this.w - 4); this.sfx('roar', 1.2); }
        const k = clamp((this.stT - 0.35) / 0.75, 0, 1);
        this.x = this.from.x + (this.target - this.from.x) * k;
        this.y = this.from.y + (A.floor - this.h - this.from.y) * k - Math.sin(k * Math.PI) * 50;
        if (k >= 1) {
          this.sfx('boom'); this.shake(0.4);
          if (P === 3) this.wavesFrom(this.x + this.w / 2, 170);
          this.set('dance');
        }
        break;
      }
      case 'dance':
        this.y = A.floor - this.h;
        if (this.stT > [2.4, 2.1, 1.8][P - 1]) this.set('back');
        break;
      default: this.nextAttack();
    }
    this.pulse = Math.max(0, (this.pulse || 0) - dt * 3);
  }
  toBooth(dt) { this.x += (306 - this.x) * Math.min(1, dt * 4); this.y += (this.booth.y - this.h - this.y) * Math.min(1, dt * 8); }
  spawnMinions(lvl, n) {
    // jamais plus de 3 fêtards en même temps sur la piste
    const alive = lvl.entities.filter((e) => e.minion && !e.dead && !e.remove).length;
    n = Math.min(n, 3 - alive);
    for (let i = 0; i < n; i++) {
      const tx = i % 2 ? 31 : 8;
      const ent = lvl.spawnEnemy('f', tx, 14);
      if (ent) { ent.minion = true; ent.awake = true; ent.vx = i % 2 ? -40 : 40; }
    }
    this.sfx('powerup');
  }
  drawBooth(ctx) {
    const b = this.booth, t = this.t;
    // enceintes au bord de la piste
    for (const sx of [ARENA.x0 + 2, ARENA.x1 - 26]) {
      const k = 1 + (this.pulse || 0) * 0.15;
      R(ctx, sx, ARENA.floor - 50, 24, 50, INK); R(ctx, sx + 1, ARENA.floor - 49, 22, 48, '#1b1640');
      for (const cy of [ARENA.floor - 36, ARENA.floor - 14]) { ctx.fillStyle = '#3a2c70'; ctx.beginPath(); ctx.arc(sx + 12, cy, 8 * k, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff4fd8'; ctx.beginPath(); ctx.arc(sx + 12, cy, 3 * k, 0, Math.PI * 2); ctx.fill(); }
    }
    // pied de la scène + table de mixage
    R(ctx, b.x + 20, b.y + b.h, 8, ARENA.floor - b.y - b.h, '#1b1640'); R(ctx, b.x + b.w - 28, b.y + b.h, 8, ARENA.floor - b.y - b.h, '#1b1640');
    R(ctx, b.x - 1, b.y - 1, b.w + 2, b.h + 2, INK); R(ctx, b.x, b.y, b.w, b.h, '#241a52');
    const neon = Math.sin(t * 8) > 0 ? '#ff4fd8' : '#7ee8ff';
    R(ctx, b.x, b.y, b.w, 2, neon); R(ctx, b.x, b.y + b.h - 2, b.w, 2, neon);
    drawText(ctx, 'DJ YETI', b.x + b.w / 2, b.y + 9, { align: 'center', color: neon });
    // boule à facettes
    const bx = 320, by = 22;
    R(ctx, bx, 0, 1, by - 8, '#545e94');
    ctx.fillStyle = '#cfe0ff'; ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 6; i++) { const a = t * 2 + i; R(ctx, bx + Math.cos(a) * 5 - 1, by + Math.sin(a * 1.3) * 5 - 1, 2, 2, i % 2 ? '#ffffff' : '#7ee8ff'); }
  }
  draw(ctx) { this.drawBooth(ctx); super.draw(ctx); }
  drawBody(ctx) {
    const P = this.phase;
    const dancing = this.st === 'dance';
    ctx.save();
    ctx.translate(Math.round(this.x + this.w / 2), Math.round(this.y + this.h));
    const bob = Math.round(Math.abs(Math.sin(this.beat * (dancing ? 9 : 6))) * 2);
    ctx.translate(0, -bob);
    if (dancing) ctx.scale(Math.sin(this.beat * 4.5) > 0 ? 1 : -1, 1);
    const fur = '#3a2c70', furL = '#5a46a8';
    R(ctx, -11, -8, 8, 8, INK); R(ctx, 3, -8, 8, 8, INK); R(ctx, -10, -7, 6, 6, fur); R(ctx, 4, -7, 6, 6, fur);
    R(ctx, -13, -30, 26, 24, INK); R(ctx, -12, -29, 24, 22, fur); R(ctx, -6, -24, 12, 12, furL);
    R(ctx, -7, -20, 14, 2, '#ffc83d'); R(ctx, -2, -19, 4, 4, '#ffc83d'); // chaîne en or
    // bras
    const armA = dancing ? Math.sin(this.beat * 9) * 8 : (this.st === 'lasers' || this.st === 'party' || this.st === 'waves') ? -10 : 0;
    R(ctx, -19, -28 + armA, 7, 16, INK); R(ctx, -18, -27 + armA, 5, 14, fur);
    R(ctx, 12, -28 - armA, 7, 16, INK); R(ctx, 13, -27 - armA, 5, 14, fur);
    // tête, casque, lunettes
    R(ctx, -10, -42, 20, 14, INK); R(ctx, -9, -41, 18, 12, fur); R(ctx, -5, -36, 10, 7, '#7f8cc8');
    R(ctx, -12, -40, 4, 8, '#ff4fd8'); R(ctx, 8, -40, 4, 8, '#ff4fd8'); R(ctx, -10, -45, 20, 3, '#ff4fd8');
    if (dancing) { R(ctx, -7, -38, 5, 2, INK); R(ctx, 2, -38, 5, 2, INK); R(ctx, -6, -39, 1, 3, INK); R(ctx, 5, -39, 1, 3, INK); }
    else { R(ctx, -8, -39, 16, 3, INK); R(ctx, -7, -38, 6, 1, P === 3 ? '#ff4f5e' : '#7ee8ff'); R(ctx, 1, -38, 6, 1, P === 3 ? '#ff4f5e' : '#7ee8ff'); }
    R(ctx, -3, -32, 6, 1, INK);
    ctx.restore();
    if (this.st === 'drop' && this.target !== undefined && this.stT < 1.1) { ctx.globalAlpha = Math.sin(this.t * 30) > 0 ? 0.7 : 0.3; R(ctx, this.target + 2, ARENA.floor - 3, this.w - 4, 3, '#ff4fd8'); ctx.globalAlpha = 1; }
  }
  lights() {
    const out = [{ x: 320, y: 22, r: 60, rgb: '200,220,255', bloom: 0.25 }, { x: this.x + this.w / 2, y: this.y + 10, r: 50, rgb: '255,79,216', bloom: 0.3 }];
    for (const z of this.hz) {
      if (z.k === 'laser' && z.on) out.push({ x: z.x + z.w / 2, y: Math.min(z.y + z.h - 20, 200), r: 50, rgb: z.color === '#7ee8ff' ? '126,232,255' : z.color === '#ffc83d' ? '255,200,61' : '255,79,216', bloom: 0.4 });
      if (z.k === 'ring') out.push({ x: z.x, y: z.y + 6, r: 26, rgb: z.high ? '255,79,216' : '126,232,255', bloom: 0.3 });
    }
    return out;
  }
}

const BOSSES = { yeti: Yeti, groomer: Groomer, dragon: Dragon, dj: DJYeti };
export function createBoss(kind, lvl) { const C = BOSSES[kind]; return C ? new C(lvl) : null; }
export const BOSS_KINDS = Object.keys(BOSSES);
