// Entités du niveau : forfaits, étoiles, pics, ressorts, ennemis, drapeaux, arrivée, bonus, plateformes, panneaux.
import { T, isSlopeChar } from './tilemap.js';
import { approach } from '../engine/util.js';
import { PHYS } from './player.js';
import { drawText } from '../engine/font.js';

class Entity {
  constructor(x, y, w, h) { this.x = x; this.y = y; this.w = w; this.h = h; this.active = true; this.t = Math.random() * 10; }
  update(dt) { this.t += dt; }
  touch() {}
  draw() {}
}

export class Coin extends Entity {
  get kind() { return 'coin'; }
  constructor(tx, ty) { super(tx * T + 3, ty * T + 3, 10, 10); this.baseY = this.y; }
  update(dt) { super.update(dt); this.y = this.baseY + Math.sin(this.t * 3) * 1.5; }
  touch(lvl) { this.active = false; lvl.collectCoin(this); }
  light() { return { x: this.x + 5, y: this.y + 5, r: 14, rgb: '160,220,255', bloom: 0 }; }
  draw(ctx, lvl) {
    const s = lvl.sprites.pass;
    const k = Math.cos(this.t * 4);
    const w = Math.max(1, Math.abs(k) * s.width);
    ctx.drawImage(s, Math.round(this.x + 5 - w / 2), Math.round(this.y + 1), Math.round(w), s.height);
    if (k > 0.85) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(this.x + 7), Math.round(this.y + 2), 1, 1); }
  }
}

export class Star extends Entity {
  get kind() { return 'star'; }
  constructor(tx, ty, index) { super(tx * T + 2, ty * T + 2, 12, 12); this.index = index; this.baseY = this.y; }
  update(dt, lvl) {
    super.update(dt);
    this.y = this.baseY + Math.sin(this.t * 2.2) * 2;
    if (Math.random() < dt * 6) lvl.particles.spawn(this.x + Math.random() * 12, this.y + Math.random() * 12, 0, -10, 0.6, 2, '#fff3a0', { shape: 'spark', additive: true });
  }
  touch(lvl) { this.active = false; lvl.collectStar(this); }
  light() { return { x: this.x + 6, y: this.y + 6, r: 34, rgb: '255,224,102', bloom: 0.5 }; }
  draw(ctx, lvl) {
    const s = lvl.sprites.star;
    const r = 9 + Math.sin(this.t * 4) * 2;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,224,102,0.18)';
    ctx.beginPath(); ctx.arc(this.x + 6, this.y + 6, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(s, Math.round(this.x + 0.5), Math.round(this.y + 0.5));
  }
}

export class Spike extends Entity {
  get kind() { return 'spike'; }
  constructor(tx, ty) { super(tx * T + 2, ty * T + 10, 12, 6); this.dx = tx * T; this.dy = ty * T + 9; }
  touch(lvl) { lvl.killPlayer('spike', this); }
  draw(ctx, lvl) { ctx.drawImage(lvl.sprites.spikes, this.dx, this.dy); }
}

export class Spring extends Entity {
  get kind() { return 'spring'; }
  constructor(tx, ty) { super(tx * T + 1, ty * T + 8, 14, 8); this.anim = 0; }
  update(dt) { super.update(dt); this.anim = Math.max(0, this.anim - dt); }
  touch(lvl, p) {
    // Rebondit dès que Kong arrive dessus (en tombant ou en marchant), pas besoin de ressauter.
    if (p.vy < 0 || p.bottom > this.y + this.h + 0.5) return;
    if (p.cx < this.x - 2 || p.cx > this.x + this.w + 2) return;
    // SAUT maintenu ou pressé juste avant l'impact = bond boosté ; sinon fenêtre de rattrapage après le rebond.
    const held = lvl.game.input.held.jump || p.buffer > 0;
    p.vy = -(held ? PHYS.springHeld : PHYS.spring);
    p.y = this.y - p.h;
    p.grounded = false; p.jumping = false; p.usedDouble = false; p.coyote = 0; p.riding = null;
    p.buffer = 0; p.springBoost = held; p.springT = held ? 0 : PHYS.springGrace;
    p.squash(0.6, 1.5);
    this.anim = 0.3;
    lvl.fx('spring', this);
  }
  draw(ctx, lvl) {
    const up = this.anim > 0.12;
    const s = up ? lvl.sprites.springUp : lvl.sprites.spring;
    ctx.drawImage(s, this.x - 1, this.y + 8 - s.height);
  }
}

export class Snowman extends Entity {
  get kind() { return 'snowman'; }
  get sleeps() { return true; }
  constructor(tx, ty) { super(tx * T + 2, ty * T + 3, 12, 13); this.vx = -32; this.vy = 0; this.dead = false; this.deadT = 0; this.grounded = false; }
  update(dt, lvl) {
    super.update(dt);
    if (this.dead) { this.deadT += dt; if (this.deadT > 0.5) this.remove = true; return; }
    const map = lvl.map;
    this.vy = Math.min(this.vy + 1500 * dt, 450);
    this.x += this.vx * dt;
    const front = this.vx > 0 ? this.x + this.w : this.x;
    if (map.solidAtPoint(front, this.y + this.h - 3) || map.solidAtPoint(front, this.y + 2)) {
      this.x = this.vx > 0 ? Math.floor(front / T) * T - this.w - 0.01 : (Math.floor(front / T) + 1) * T + 0.01;
      this.vx = -this.vx;
    } else if (this.grounded && !map.solidAtPoint(this.vx > 0 ? this.x + this.w + 1 : this.x - 1, this.y + this.h + 2)) {
      this.vx = -this.vx;
    }
    this.y += this.vy * dt;
    const ty = Math.floor((this.y + this.h) / T);
    if (map.solid(Math.floor((this.x + this.w / 2) / T), ty)) { this.y = ty * T - this.h; this.vy = 0; this.grounded = true; }
    else this.grounded = false;
    if (this.y > lvl.bounds.h + 40 || lvl.map.get(Math.floor((this.x + 6) / T), Math.floor((this.y + this.h - 4) / T)) === 'w') this.remove = true;
  }
  touch(lvl, p) {
    if (this.dead) return;
    if (p.vy > 0 && p.bottom - this.y < 8 + p.vy / 60) {
      this.dead = true;
      lvl.stomp(this);
    } else lvl.killPlayer('enemy', this);
  }
  draw(ctx, lvl) {
    if (this.dead) {
      const s = lvl.sprites.snowmanSquash;
      ctx.globalAlpha = Math.max(0, 1 - this.deadT * 2);
      ctx.drawImage(s, Math.round(this.x), Math.round(this.y + this.h - s.height));
      ctx.globalAlpha = 1;
      return;
    }
    const s = Math.sin(this.t * 8) > 0 ? lvl.sprites.snowman : lvl.sprites.snowman2;
    const bob = Math.abs(Math.sin(this.t * 8));
    const sy = 1 - bob * 0.08, sx = 1 + bob * 0.06;
    const cx = this.x + this.w / 2, by = this.y + this.h;
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(by));
    ctx.scale(this.vx > 0 ? -sx : sx, sy);
    ctx.drawImage(s, -s.width / 2, -s.height);
    ctx.restore();
  }
}

export class Checkpoint extends Entity {
  get kind() { return 'checkpoint'; }
  constructor(tx, ty) { super(tx * T, ty * T - 16, 16, 32); this.on = false; this.raise = 0; }
  update(dt) { super.update(dt); if (this.on) this.raise = Math.min(1, this.raise + dt * 3); }
  touch(lvl) { if (!this.on) { this.on = true; lvl.reachCheckpoint(this); } }
  light() { return this.on ? { x: this.x + 10, y: this.y + 8, r: 40, rgb: '255,200,61', bloom: 0.35 } : null; }
  draw(ctx) {
    const px = this.x + 3, base = this.y + 32;
    ctx.fillStyle = '#0a0d24'; ctx.fillRect(px - 1, base - 30, 3, 30);
    ctx.fillStyle = '#b8c4e0'; ctx.fillRect(px, base - 30, 1, 30);
    const fy = base - 12 - this.raise * 16;
    const col = this.on ? '#ffc83d' : '#545e94';
    for (let i = 0; i < 11; i++) {
      const wave = Math.round(Math.sin(this.t * 6 - i * 0.6) * (this.on ? 1.5 : 0.6));
      const h = 8 - Math.floor(i * 0.55);
      ctx.fillStyle = '#0a0d24'; ctx.fillRect(px + 2 + i, fy + wave - 1, 1, h + 2);
      ctx.fillStyle = col; ctx.fillRect(px + 2 + i, fy + wave, 1, h);
    }
    if (this.on) { ctx.fillStyle = '#0a0d24'; ctx.fillRect(px + 4, fy + 2, 3, 3); }
    ctx.fillStyle = '#0a0d24'; ctx.fillRect(px - 3, base - 2, 7, 2);
  }
}

export class Goal extends Entity {
  get kind() { return 'goal'; }
  // Zone de passage très haute : impossible de « sauter par-dessus » l'arche d'arrivée.
  constructor(tx, ty) { super(tx * T - 8, ty * T - 232, 32, 248); this.bx = tx * T - 16; this.by = ty * T + 16; }
  update(dt, lvl) {
    super.update(dt);
    if (Math.random() < dt * 4) lvl.particles.spawn(this.bx + 4 + Math.random() * 40, this.by - 44, (Math.random() - 0.5) * 10, 15, 1.2, 2, Math.random() < 0.5 ? '#ffc83d' : '#ff4f5e', { g: 30 });
  }
  touch(lvl) { lvl.win(); }
  light() { return { x: this.bx + 24, y: this.by - 30, r: 70, rgb: '255,240,220', bloom: 0.25 }; }
  draw(ctx) {
    const x = this.bx, b = this.by;
    for (const px of [x, x + 44]) {
      ctx.fillStyle = '#0a0d24'; ctx.fillRect(px - 1, b - 48, 6, 48);
      ctx.fillStyle = '#ff4f5e'; ctx.fillRect(px, b - 47, 4, 47);
      ctx.fillStyle = '#ffffff';
      for (let y = b - 44; y < b; y += 8) ctx.fillRect(px, y, 4, 4);
    }
    const wave = Math.sin(this.t * 3) * 1.5;
    ctx.fillStyle = '#0a0d24'; ctx.fillRect(x - 2, b - 50 + wave, 52, 13);
    ctx.fillStyle = '#1767ff'; ctx.fillRect(x - 1, b - 49 + wave, 50, 11);
    ctx.fillStyle = '#7ee8ff'; ctx.fillRect(x - 1, b - 49 + wave, 50, 1);
    drawText(ctx, 'ARRIVEE', x + 24, b - 47 + wave, { align: 'center', color: '#ffffff' });
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#ffc83d' : '#ffffff';
      ctx.fillRect(x + 4 + i * 7, b - 37 + wave + Math.sin(this.t * 5 + i) * 1, 5, 3);
    }
  }
}

export class DoubleJumpOrb extends Entity {
  get kind() { return 'orb'; }
  constructor(tx, ty) { super(tx * T + 2, ty * T + 1, 12, 12); this.baseY = this.y; }
  update(dt, lvl) {
    super.update(dt);
    this.y = this.baseY + Math.sin(this.t * 3) * 2.5;
    if (Math.random() < dt * 10) lvl.particles.spawn(this.x + 6 + (Math.random() - 0.5) * 14, this.y + 6 + (Math.random() - 0.5) * 14, 0, -12, 0.5, 1.5, '#7ee8ff', { additive: true });
  }
  touch(lvl, p) { this.active = false; p.canDouble = true; lvl.unlockDoubleJump(this); }
  light() { return { x: this.x + 6, y: this.y + 6, r: 40, rgb: '126,232,255', bloom: 0.55 }; }
  draw(ctx) {
    const cx = Math.round(this.x + 6), cy = Math.round(this.y + 6);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(126,232,255,0.22)';
    ctx.beginPath(); ctx.arc(cx, cy, 10 + Math.sin(this.t * 5) * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    const flap = Math.round(Math.sin(this.t * 12) * 2);
    ctx.fillStyle = '#0a0d24';
    ctx.fillRect(cx - 10, cy - 3 + flap, 6, 4); ctx.fillRect(cx + 4, cy - 3 + flap, 6, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 9, cy - 2 + flap, 5, 2); ctx.fillRect(cx + 4, cy - 2 + flap, 5, 2);
    ctx.fillStyle = '#0a0d24'; ctx.fillRect(cx - 5, cy - 5, 10, 10);
    ctx.fillStyle = '#1767ff'; ctx.fillRect(cx - 4, cy - 4, 8, 8);
    ctx.fillStyle = '#7ee8ff'; ctx.fillRect(cx - 3, cy - 3, 3, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 1, cy - 2, 2, 5); ctx.fillRect(cx - 2, cy - 2, 4, 1);
  }
}

export class MovingPlatform extends Entity {
  get kind() { return 'platform'; }
  constructor(tx, ty, vertical = false) {
    super(tx * T, ty * T, 48, 6);
    this.x0 = tx * T; this.y0 = ty * T; this.range = vertical ? 44 : 40; this.period = vertical ? 3.8 : 3.4;
    this.dx = 0; this.dy = 0; this.t = 0; this.vertical = vertical; this.travel = 72;
    this.solidPlatform = true;
  }
  update(dt) {
    this.t += dt;
    const k = Math.sin((this.t / this.period) * Math.PI * 2) * this.range;
    if (this.vertical) { const ny = this.y0 - (1 - Math.cos((this.t / this.period) * Math.PI * 2)) / 2 * this.travel; this.dy = ny - this.y; this.y = ny; this.dx = 0; }
    else { const nx = this.x0 + k; this.dx = nx - this.x; this.x = nx; this.dy = 0; }
  }
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y);
    ctx.fillStyle = '#0a0d24'; ctx.fillRect(x - 1, y - 1, this.w + 2, 8);
    ctx.fillStyle = '#c23a4f'; ctx.fillRect(x, y, this.w, 6);
    ctx.fillStyle = '#e2566a'; ctx.fillRect(x, y, this.w, 1);
    ctx.fillStyle = '#7c1f30';
    for (let i = 0; i < this.w; i += 6) { ctx.fillRect(x + i, y + 2, 1, 3); ctx.fillRect(x + i + 1, y + 2, 1, 1); ctx.fillRect(x + i + 2, y + 3, 1, 1); ctx.fillRect(x + i + 3, y + 4, 1, 1); }
    ctx.fillStyle = '#ffc83d'; ctx.fillRect(x + 2, y + 6, 4, 2); ctx.fillRect(x + this.w - 6, y + 6, 4, 2);
  }
}

export class Sign extends Entity {
  get kind() { return 'sign'; }
  constructor(tx, ty, text) { super(tx * T + 1, ty * T + 2, 14, 14); this.text = text; this.seen = false; this.show = 0; }
  update(dt, lvl) {
    super.update(dt);
    const p = lvl.player;
    const near = Math.abs(p.cx - (this.x + 7)) < 26 && Math.abs(p.y - this.y) < 40 && !p.dead;
    this.show = Math.max(0, Math.min(1, this.show + (near ? dt * 7 : -dt * 7)));
    if (near && !this.seen) { this.seen = true; lvl.fx('sign', this); }
  }
  draw(ctx, lvl) {
    const bob = this.show > 0 ? 0 : Math.round(Math.sin(this.t * 2) * 0.5);
    ctx.drawImage(lvl.sprites.sign, this.x, this.y + bob);
  }
}

/** Lampadaire de station : décor lumineux. */
export class Lantern extends Entity {
  get kind() { return 'lantern'; }
  constructor(tx, ty) { super(tx * T + 6, ty * T - 16, 4, 32); this.decor = true; }
  touch() {}
  light() { const f = 0.92 + Math.sin(this.t * 13) * 0.04; return { x: this.x + 2, y: this.y + 2, r: 70, rgb: '255,190,110', bloom: 0.5 * f, intensity: f }; }
  draw(ctx) {
    const x = this.x, y = this.y;
    ctx.fillStyle = '#0a0d24'; ctx.fillRect(x, y + 4, 4, 28); ctx.fillRect(x - 2, y + 30, 8, 2);
    ctx.fillStyle = '#3a4270'; ctx.fillRect(x + 1, y + 5, 2, 25);
    ctx.fillStyle = '#0a0d24'; ctx.fillRect(x - 2, y - 2, 8, 7);
    ctx.fillStyle = '#ffe2a8'; ctx.fillRect(x - 1, y - 1, 6, 5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 2, 2);
    ctx.fillStyle = '#eef6ff'; ctx.fillRect(x - 3, y - 3, 10, 1);
  }
}

const NEON_WORDS = [['AFTER', '255,79,216', '#ff4fd8'], ['BAR', '79,240,255', '#4ff0ff'], ['ESTP', '255,210,63', '#ffd23f'], ['DJ', '125,255,106', '#7dff6a'], ['SKI', '79,240,255', '#4ff0ff']];
let neonIndex = 0;
/** Enseigne néon de l'afterski. */
export class Neon extends Entity {
  get kind() { return 'neon'; }
  constructor(tx, ty) {
    super(tx * T, ty * T + 2, 0, 12);
    const [word, rgb, col] = NEON_WORDS[neonIndex++ % NEON_WORDS.length];
    this.word = word; this.rgb = rgb; this.col = col; this.decor = true;
    this.w = word.length * 6 + 5;
  }
  get on() { return Math.sin(this.t * 7.3) > -0.92 || Math.sin(this.t * 31) > 0; }
  light() { return this.on ? { x: this.x + this.w / 2, y: this.y + 6, r: 50, rgb: this.rgb, bloom: 0.5 } : { x: this.x + this.w / 2, y: this.y + 6, r: 18, rgb: this.rgb, bloom: 0.1 }; }
  draw(ctx) {
    ctx.fillStyle = '#05060f'; ctx.fillRect(this.x, this.y, this.w, 11);
    ctx.fillStyle = this.on ? this.col : '#3a2c50'; ctx.fillRect(this.x, this.y, this.w, 1); ctx.fillRect(this.x, this.y + 10, this.w, 1);
    drawText(ctx, this.word, this.x + 3, this.y + 2, { color: this.on ? '#ffffff' : '#3a2c50', shadow: this.on ? this.col : null });
  }
}

/** Cristal lumineux des grottes. */
export class Crystal extends Entity {
  get kind() { return 'crystal'; }
  constructor(tx, ty) { super(tx * T + 2, ty * T + 2, 12, 14); this.decor = true; this.purple = (tx * 7 + ty) % 3 === 0; }
  light() { const p = 0.8 + Math.sin(this.t * 2) * 0.2; return { x: this.x + 6, y: this.y + 6, r: 60, rgb: this.purple ? '190,140,255' : '120,240,255', bloom: 0.45 * p, intensity: p }; }
  draw(ctx) {
    const x = this.x, b = this.y + 14;
    const L = this.purple ? '#e2d4ff' : '#c9f6ff', D = this.purple ? '#9b7fe8' : '#5fc8ec';
    const shard = (cx, h, w) => {
      for (let i = 0; i < h; i++) {
        const half = Math.min(w, i + 1);
        ctx.fillStyle = '#0a0d24'; ctx.fillRect(cx - half - 1, b - h + i, half * 2 + 2, 1);
        ctx.fillStyle = L; ctx.fillRect(cx - half, b - h + i, half, 1);
        ctx.fillStyle = D; ctx.fillRect(cx, b - h + i, half, 1);
      }
    };
    shard(x + 3, 9, 2); shard(x + 9, 7, 2); shard(x + 6, 14, 3);
  }
}

// ---------- Étape 3 : mécaniques et ennemis ----------

export class Key extends Entity {
  get kind() { return 'key'; }
  constructor(tx, ty) { super(tx * T + 2, ty * T + 4, 12, 8); this.baseY = this.y; }
  update(dt, lvl) {
    super.update(dt);
    this.y = this.baseY + Math.sin(this.t * 3) * 2;
    if (Math.random() < dt * 5) lvl.particles.spawn(this.x + Math.random() * 12, this.y + Math.random() * 8, 0, -8, 0.5, 1.5, '#ffe58a', { shape: 'spark', additive: true });
  }
  touch(lvl) { this.active = false; lvl.collectKey(this); }
  light() { return { x: this.x + 6, y: this.y + 4, r: 34, rgb: '255,210,63', bloom: 0.45 }; }
  draw(ctx, lvl) {
    const s = lvl.sprites.key;
    const k = Math.cos(this.t * 2.5);
    const w = Math.max(2, Math.abs(k) * s.width);
    ctx.drawImage(s, Math.round(this.x + 6 - w / 2), Math.round(this.y), Math.round(w), s.height);
  }
}

/** Stalactite : tremble quand Kong passe dessous, tombe, se brise, puis repousse. */
export class Icicle extends Entity {
  get kind() { return 'icicle'; }
  constructor(tx, ty) { super(tx * T + 4, ty * T, 8, 14); this.x0 = this.x; this.y0 = this.y; this.state = 'idle'; this.timer = 0; this.vy = 0; }
  update(dt, lvl) {
    super.update(dt);
    const p = lvl.player;
    if (this.state === 'idle') {
      if (!p.dead && Math.abs(p.cx - (this.x + 4)) < 30 && p.y > this.y && p.y - this.y < 200) { this.state = 'shake'; this.timer = 0.32; lvl.game.audio.play('crumble'); }
    } else if (this.state === 'shake') {
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'fall'; this.vy = 0; }
    } else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 1400 * dt, 600);
      this.y += this.vy * dt;
      if (lvl.map.solidAtPoint(this.x + 4, this.y + this.h) || this.y > lvl.bounds.h) {
        this.state = 'gone'; this.timer = 3;
        lvl.particles.burst(this.x + 4, this.y + this.h, 14, { color: ['#c8f6ff', '#ffffff', '#7fc4ef'], speed: 90, angle: -Math.PI / 2, spread: 2.4, g: 500, life: 0.6, size: 2 });
        lvl.game.audio.play('shatter');
      }
    } else if (this.state === 'gone') {
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'idle'; this.y = this.y0; }
    }
  }
  touch(lvl) { if (this.state !== 'gone') lvl.killPlayer('icicle', this); }
  draw(ctx) {
    if (this.state === 'gone') {
      const k = 1 - this.timer / 3;
      if (k < 0.7) return;
      ctx.globalAlpha = (k - 0.7) / 0.3;
    }
    const sh = this.state === 'shake' ? Math.round(Math.sin(this.t * 80)) : 0;
    const x = Math.round(this.x0 + sh), y = Math.round(this.y);
    for (let i = 0; i < 14; i++) {
      const half = Math.max(0, Math.round(4 - i * 0.3));
      ctx.fillStyle = '#0a0d24'; ctx.fillRect(x + 4 - half - 1, y + i, half * 2 + 2, 1);
      ctx.fillStyle = '#c8f6ff'; ctx.fillRect(x + 4 - half, y + i, half, 1);
      ctx.fillStyle = '#7fc4ef'; ctx.fillRect(x + 4, y + i, half, 1);
    }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, y + 1, 1, 4);
    ctx.globalAlpha = 1;
  }
}

/** Ennemi générique piétinable. */
class Enemy extends Entity {
  get stompable() { return true; }
  touch(lvl, p) {
    if (this.dead) return;
    if (this.stompable && p.vy > 0 && p.bottom - this.y < 8 + p.vy / 60) { this.dead = true; this.deadT = 0; lvl.stomp(this); }
    else lvl.killPlayer('enemy', this);
  }
  drawSquash(ctx, s, flip) {
    ctx.globalAlpha = Math.max(0, 1 - this.deadT * 2);
    ctx.save();
    ctx.translate(Math.round(this.x + this.w / 2), Math.round(this.y + this.h));
    ctx.scale(flip ? -1.3 : 1.3, 0.35);
    ctx.drawImage(s, -s.width / 2, -s.height);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

/** Hibou : vole en va-et-vient avec une ondulation. */
export class Owl extends Enemy {
  get kind() { return 'owl'; }
  constructor(tx, ty, map) {
    super(tx * T + 2, ty * T + 3, 12, 10); this.x0 = this.x; this.y0 = this.y; this.dir = 1; this.dead = false; this.deadT = 0;
    this.amp = 40; this.bob = 8;
    if (map) {
      // La ronde (±40 px, ±8 px) est raccourcie pour ne jamais entrer dans la roche ni dans le sol.
      const hits = (x, y0, y1) => { for (let y = y0; y <= y1; y += 4) if (map.solidAtPoint(x, y)) return true; return false; };
      const top = this.y0 - this.bob, bot = this.y0 + this.h + this.bob;
      while (this.bob > 0 && (map.solidAtPoint(this.x0 + 1, this.y0 + this.h + this.bob) || map.solidAtPoint(this.x0 + this.w - 1, this.y0 + this.h + this.bob) || map.solidAtPoint(this.x0 + 6, this.y0 - this.bob))) this.bob--;
      let L = 0, R = 0;
      while (L < 40 && !hits(this.x0 - L - 1, top, bot)) L++;
      while (R < 40 && !hits(this.x0 + this.w + R + 1, top, bot)) R++;
      this.x0 += (R - L) / 2; this.amp = (L + R) / 2;
    }
  }
  update(dt, lvl) {
    super.update(dt);
    if (this.dead) { this.deadT += dt; this.y += 120 * dt; if (this.deadT > 0.6) this.remove = true; return; }
    this.x = this.x0 + Math.sin(this.t * 0.9) * this.amp;
    this.dir = Math.cos(this.t * 0.9) > 0 ? 1 : -1;
    this.y = this.y0 + Math.sin(this.t * 3.2) * this.bob;
  }
  draw(ctx, lvl) {
    const s = lvl.sprites.owl;
    if (this.dead) return this.drawSquash(ctx, s, this.dir < 0);
    const flap = Math.sin(this.t * 14) > 0;
    const x = Math.round(this.x), y = Math.round(this.y);
    ctx.fillStyle = '#0a0d24';
    ctx.fillRect(x - 4, y + (flap ? 2 : 6), 5, 3); ctx.fillRect(x + 11, y + (flap ? 2 : 6), 5, 3);
    ctx.fillStyle = '#7a6a58';
    ctx.fillRect(x - 3, y + (flap ? 3 : 7), 4, 1); ctx.fillRect(x + 11, y + (flap ? 3 : 7), 4, 1);
    ctx.save(); ctx.translate(x + 6, y); ctx.scale(this.dir, 1); ctx.drawImage(s, -6, -1); ctx.restore();
  }
}

/** Pingouin : glisse sur le ventre, rebondit sur les murs, accélère sur la glace. */
export class Penguin extends Enemy {
  get kind() { return 'penguin'; }
  get sleeps() { return true; }
  constructor(tx, ty) { super(tx * T + 1, ty * T + 8, 14, 8); this.dir = -1; this.vx = -40; this.vy = 0; this.dead = false; this.deadT = 0; this.grounded = false; }
  update(dt, lvl) {
    super.update(dt);
    if (this.dead) { this.deadT += dt; if (this.deadT > 0.5) this.remove = true; return; }
    const map = lvl.map;
    const groundAt = (x) => { const ty = Math.floor((this.y + this.h + 2) / T); return map.solid(Math.floor(x / T), ty) || isSlopeChar(map.get(Math.floor(x / T), ty)); };
    const cx = this.x + this.w / 2;
    const ice = map.get(Math.floor(cx / T), Math.floor((this.y + this.h + 2) / T)) === '=';
    // Glisse sur le ventre : vite et avec beaucoup d'inertie sur la glace, plus lentement sur la neige.
    const max = ice ? 135 : 75, accel = ice ? 110 : 320;
    if (this.grounded) {
      // demi-tour avant le bord : on regarde à la distance de freinage
      const mv = Math.sign(this.vx) || this.dir;
      const stop = (this.vx * this.vx) / (2 * accel) + 6;
      if (mv === this.dir && !groundAt(cx + mv * (this.w / 2 + stop))) this.dir = -this.dir;
      this.vx = approach(this.vx, this.dir * max, accel * dt);
    }
    this.vy = Math.min(this.vy + 1500 * dt, 450);
    this.x += this.vx * dt;
    const front = this.vx > 0 ? this.x + this.w : this.x;
    if (map.solidAtPoint(front, this.y + this.h - 3)) {
      this.x = this.vx > 0 ? Math.floor(front / T) * T - this.w - 0.01 : (Math.floor(front / T) + 1) * T + 0.01;
      this.vx = -this.vx * 0.6; this.dir = Math.sign(this.vx) || -this.dir;
      lvl.particles.burst(front, this.y + 4, 4, { color: ['#ffffff'], speed: 30, life: 0.3 });
    }
    this.y += this.vy * dt;
    const ty = Math.floor((this.y + this.h) / T);
    this.grounded = false;
    if (map.solid(Math.floor((this.x + this.w / 2) / T), ty)) { this.y = ty * T - this.h; this.vy = 0; this.grounded = true; }
    if (this.grounded && Math.abs(this.vx) > 90 && Math.random() < dt * 20) lvl.particles.spawn(this.vx > 0 ? this.x : this.x + this.w, this.y + this.h, -this.vx * 0.2, -20, 0.3, 1.5, '#ffffff', {});
    if (this.y > lvl.bounds.h + 40 || map.get(Math.floor((this.x + 7) / T), Math.floor((this.y + this.h - 3) / T)) === 'w') this.remove = true;
  }
  draw(ctx, lvl) {
    const s = lvl.sprites.penguin;
    if (this.dead) return this.drawSquash(ctx, s, this.vx > 0);
    ctx.save();
    ctx.translate(Math.round(this.x + this.w / 2), Math.round(this.y + this.h - 6));
    ctx.rotate(this.vx > 0 ? Math.PI / 2 : -Math.PI / 2);
    ctx.drawImage(s, -6, -7);
    ctx.restore();
  }
}

/** Fêtard de l'afterski : marche en dansant et fait des petits bonds. */
export class Fetard extends Enemy {
  get kind() { return 'fetard'; }
  get sleeps() { return true; }
  constructor(tx, ty) { super(tx * T + 2, ty * T, 12, 16); this.vx = -28; this.vy = 0; this.hopT = 1 + (tx % 3) * 0.3; this.grounded = false; this.dead = false; this.deadT = 0; }
  update(dt, lvl) {
    super.update(dt);
    if (this.dead) { this.deadT += dt; if (this.deadT > 0.5) this.remove = true; return; }
    const map = lvl.map;
    this.vy = Math.min(this.vy + 1300 * dt, 450);
    this.hopT -= dt;
    if (this.hopT <= 0 && this.grounded) { this.vy = -260; this.hopT = 1.3; this.grounded = false; }
    this.x += this.vx * dt;
    const front = this.vx > 0 ? this.x + this.w : this.x;
    if (map.solidAtPoint(front, this.y + this.h - 3) || (this.grounded && !map.solidAtPoint(this.vx > 0 ? this.x + this.w + 1 : this.x - 1, this.y + this.h + 2))) this.vx = -this.vx;
    this.y += this.vy * dt;
    const ty = Math.floor((this.y + this.h) / T);
    if (this.vy >= 0 && map.solid(Math.floor((this.x + this.w / 2) / T), ty)) { this.y = ty * T - this.h; this.vy = 0; this.grounded = true; }
    if (this.y > lvl.bounds.h + 40) this.remove = true;
  }
  draw(ctx, lvl) {
    const s = !this.grounded || Math.sin(this.t * 9) > 0 ? lvl.sprites.fetard2 : lvl.sprites.fetard;
    if (this.dead) return this.drawSquash(ctx, s, this.vx > 0);
    ctx.save();
    ctx.translate(Math.round(this.x + this.w / 2), Math.round(this.y + this.h));
    ctx.scale(this.vx > 0 ? -1 : 1, 1);
    ctx.drawImage(s, -6, -16);
    ctx.restore();
  }
}

/** Laser de l'afterski : cycle allumé / éteint avec préavis clignotant. vertical = faisceau vers le bas. */
export class Laser extends Entity {
  get kind() { return 'laser'; }
  constructor(tx, ty, vertical, map) {
    super(tx * T, ty * T, 16, 16);
    this.vertical = vertical;
    this.ex = tx * T; this.ey = ty * T;
    this.period = 2.6; this.onFor = 1.2;
    this.phase = ((tx * 0.37 + ty * 0.11) % 1) * this.period;
    // longueur du faisceau jusqu'au premier mur
    let len = 0;
    if (vertical) { let y = ty + 1; while (y < map.h && !map.solid(tx, y) && len < 30) { y++; len++; } this.x = tx * T + 6; this.y = (ty + 1) * T; this.w = 4; this.h = len * T; }
    else { let x = tx + 1; while (x < map.w && !map.solid(x, ty) && len < 40) { x++; len++; } this.x = (tx + 1) * T; this.y = ty * T + 6; this.w = len * T; this.h = 4; }
  }
  get cycle() { return ((this.t + this.phase) % this.period); }
  get on() { return this.cycle < this.onFor; }
  get warning() { return this.cycle > this.period - 0.45; }
  touch(lvl) { if (this.on) lvl.killPlayer('laser', this); }
  light() { return this.on ? { x: this.x + this.w / 2, y: this.y + this.h / 2, r: Math.max(this.w, this.h) * 0.5 + 20, rgb: '255,60,140', bloom: 0.25 } : null; }
  draw(ctx) {
    const on = this.on;
    if (on || (this.warning && Math.sin(this.t * 50) > 0)) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = on ? 'rgba(255,60,140,0.35)' : 'rgba(255,60,140,0.25)';
      if (this.vertical) ctx.fillRect(this.x - 2, this.y, this.w + 4, this.h); else ctx.fillRect(this.x, this.y - 2, this.w, this.h + 4);
      ctx.fillStyle = on ? '#ffd0e6' : 'rgba(255,120,180,0.6)';
      if (this.vertical) ctx.fillRect(this.x + 1, this.y, on ? 2 : 1, this.h); else ctx.fillRect(this.x, this.y + 1, this.w, on ? 2 : 1);
      ctx.globalCompositeOperation = 'source-over';
    }
    const x = this.ex, y = this.ey;
    if (this.vertical) {
      // câble de suspension qui monte hors de l'écran
      ctx.fillStyle = '#0a0d24'; ctx.fillRect(x + 7, y - 200, 2, 202);
      ctx.fillStyle = '#8f97d8'; ctx.fillRect(x + 7, y - 200, 1, 202);
    }
    ctx.fillStyle = '#0a0d24'; ctx.fillRect(x + 2, y + 2, 12, 12);
    ctx.fillStyle = '#3a3f70'; ctx.fillRect(x + 3, y + 3, 10, 10);
    ctx.fillStyle = on ? '#ff3c8c' : this.warning ? '#ffb0d0' : '#5a1a3a';
    if (this.vertical) ctx.fillRect(x + 6, y + 11, 4, 3); else ctx.fillRect(x + 11, y + 6, 3, 4);
  }
}

export function createEntity(type, tx, ty, ctx) {
  switch (type) {
    case '$': return new Coin(tx, ty);
    case '*': return new Star(tx, ty, ctx.starIndex++);
    case '^': return new Spike(tx, ty);
    case 'S': return new Spring(tx, ty);
    case 'e': return new Snowman(tx, ty);
    case 'C': return new Checkpoint(tx, ty);
    case 'G': return new Goal(tx, ty);
    case 'D': return new DoubleJumpOrb(tx, ty);
    case 'M': return new MovingPlatform(tx, ty);
    case '?': return new Sign(tx, ty, ctx.signs[ctx.signIndex++] || '');
    case 'L': return new Lantern(tx, ty);
    case 'N': return new Neon(tx, ty);
    case 'k': return new Crystal(tx, ty);
    case 'V': return new MovingPlatform(tx, ty, true);
    case 'K': return new Key(tx, ty);
    case 'I': return new Icicle(tx, ty);
    case 'o': return new Owl(tx, ty, ctx.map);
    case 'p': return new Penguin(tx, ty);
    case 'f': return new Fetard(tx, ty);
    case 'l': return new Laser(tx, ty, false, ctx.map);
    case 'j': return new Laser(tx, ty, true, ctx.map);
    default: return null;
  }
}
