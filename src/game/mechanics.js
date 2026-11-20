// Systèmes de niveau : tyroliennes, télésièges, avalanche (poursuite), zones de vent.
import { T } from './tilemap.js';
import { clamp } from '../engine/util.js';

// ---------- Tyrolienne ----------
export class Zipline {
  /** a, b : ancres {tx, ty} ; le câble est tendu entre le haut des deux poteaux. */
  constructor(a, b) {
    this.ax = a.tx * T + 8; this.ay = a.ty * T - 14;
    this.bx = b.tx * T + 8; this.by = b.ty * T - 14;
    this.pa = a; this.pb = b;
    const dx = this.bx - this.ax, dy = this.by - this.ay;
    this.len = Math.hypot(dx, dy);
    this.ux = dx / this.len; this.uy = dy / this.len;
    // sens de descente : vers l'ancre la plus basse (vers la droite si plat)
    this.dir = this.by >= this.ay - 2 ? 1 : -1;
  }

  /** Point du câble le plus proche (paramètre s en px depuis A). */
  project(x, y) {
    const s = (x - this.ax) * this.ux + (y - this.ay) * this.uy;
    const px = this.ax + this.ux * s, py = this.ay + this.uy * s;
    return { s, d: Math.hypot(x - px, y - py) };
  }

  point(s) { return { x: this.ax + this.ux * s, y: this.ay + this.uy * s }; }

  draw(ctx) {
    for (const [px, py] of [[this.ax, this.ay], [this.bx, this.by]]) {
      ctx.fillStyle = '#0a0d24'; ctx.fillRect(px - 2, py - 2, 4, 32);
      ctx.fillStyle = '#c23a4f'; ctx.fillRect(px - 1, py - 1, 2, 31);
      ctx.fillStyle = '#ffc83d'; ctx.fillRect(px - 3, py - 3, 6, 3);
    }
    ctx.strokeStyle = '#0a0d24'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(this.ax, this.ay); ctx.lineTo(this.bx, this.by); ctx.stroke();
    ctx.strokeStyle = '#b8c4e0'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(this.ax, this.ay - 0.5); ctx.lineTo(this.bx, this.by - 0.5); ctx.stroke();
  }
}

export const ZIP = { grab: 8, gravity: 900, minSpeed: 90, maxSpeed: 330, cool: 0.3 };

/** Met à jour Kong suspendu. Renvoie 'release' si il lâche. */
export function updateZip(p, dt, input, lvl) {
  const z = p.zip.line;
  const along = p.zip.v;
  let v = along + ZIP.gravity * z.uy * dt * (z.dir > 0 ? 1 : 1);
  // sur câble plat, avance doucement dans le sens choisi
  if (Math.abs(z.uy) < 0.08) v = Math.sign(v || z.dir) * Math.max(Math.abs(v), ZIP.minSpeed);
  if (z.dir > 0) v = clamp(v, ZIP.minSpeed, ZIP.maxSpeed); else v = clamp(v, -ZIP.maxSpeed, -ZIP.minSpeed);
  p.zip.v = v;
  p.zip.s += v * dt;
  const vx = z.ux * v, vy = z.uy * v;
  p.vx = vx; p.vy = vy;
  const pt = z.point(clamp(p.zip.s, 0, z.len));
  p.x = pt.x - p.w / 2;
  p.y = pt.y + 3;
  p.facing = vx >= 0 ? 1 : -1;
  p.t += dt;
  const end = p.zip.s >= z.len - 6 || p.zip.s <= 6;
  if (input.pressed.jump) {
    p.zip = null; p.zipCool = ZIP.cool;
    p.vy = Math.min(vy, 0) - 330; p.vx = vx; p.jumping = true; p.usedDouble = false;
    p.squash(0.7, 1.35);
    lvl.fx('jump', p);
    return 'release';
  }
  if (input.pressed.down || end) {
    p.zip = null; p.zipCool = ZIP.cool;
    p.vx = vx; p.vy = Math.max(vy, 0);
    return 'release';
  }
  return null;
}

// ---------- Télésiège ----------
export class Chairlift {
  constructor(a, b) {
    this.ax = a.tx * T + 8; this.ay = a.ty * T - 26;
    this.bx = b.tx * T + 8; this.by = b.ty * T - 26;
    const dx = this.bx - this.ax, dy = this.by - this.ay;
    this.len = Math.hypot(dx, dy);
    this.ux = dx / this.len; this.uy = dy / this.len;
    this.speed = 46;
    this.spacing = 72;
    this.chairs = [];
    const n = Math.max(2, Math.floor(this.len / this.spacing));
    for (let i = 0; i < n; i++) this.chairs.push({ s: (i / n) * this.len, x: 0, y: 0, w: 22, h: 4, dx: 0, dy: 0, solidPlatform: true, chair: true });
    this.n = n;
    this.place(0);
  }

  place(dt) {
    for (const c of this.chairs) {
      c.s += this.speed * dt;
      if (c.s > this.len) c.s -= this.len;
      const x = this.ax + this.ux * c.s - c.w / 2, y = this.ay + this.uy * c.s + 20;
      if (dt > 0 && c.s > this.speed * dt * 2) { c.dx = x - c.x; c.dy = y - c.y; } else { c.dx = 0; c.dy = 0; }
      c.x = x; c.y = y;
      // invisible (et non solide) pendant le court retour en gare
      c.hidden = c.s < 10 || c.s > this.len - 10;
    }
  }

  get platforms() { return this.chairs; }

  draw(ctx) {
    for (const [px, py] of [[this.ax, this.ay], [this.bx, this.by]]) {
      ctx.fillStyle = '#0a0d24'; ctx.fillRect(px - 3, py - 2, 6, 44);
      ctx.fillStyle = '#545e94'; ctx.fillRect(px - 2, py - 1, 4, 43);
      ctx.fillStyle = '#0a0d24'; ctx.fillRect(px - 8, py - 4, 16, 4);
      ctx.fillStyle = '#ffc83d'; ctx.fillRect(px - 7, py - 3, 14, 2);
    }
    ctx.strokeStyle = '#0a0d24'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(this.ax, this.ay); ctx.lineTo(this.bx, this.by); ctx.stroke();
    for (const c of this.chairs) {
      if (c.hidden) continue;
      const cx = Math.round(c.x + c.w / 2), cy = Math.round(c.y);
      ctx.fillStyle = '#0a0d24';
      ctx.fillRect(cx - 1, cy - 20, 2, 20);
      ctx.fillRect(c.x - 1, cy - 1, c.w + 2, 6);
      ctx.fillRect(Math.round(c.x) - 1, cy - 9, 3, 9);
      ctx.fillStyle = '#ff4f5e'; ctx.fillRect(Math.round(c.x), cy, c.w, 3);
      ctx.fillStyle = '#ff8a93'; ctx.fillRect(Math.round(c.x), cy, c.w, 1);
      ctx.fillStyle = '#ff4f5e'; ctx.fillRect(Math.round(c.x), cy - 8, 1, 8);
      ctx.fillStyle = '#b8c4e0'; ctx.fillRect(cx - 3, cy - 22, 6, 2);
    }
  }
}

// ---------- Avalanche ----------
export class Avalanche {
  constructor(cfg) {
    this.speed = cfg.speed ?? 120;
    this.accel = cfg.accel ?? 1.2;
    this.lag = cfg.lag ?? 230;
    this.x = -9999;
    this.v = this.speed;
    this.active = false;
    this.t = 0;
  }

  start(px) { this.active = true; this.x = px - this.lag; this.v = this.speed; }
  reset(px) { this.x = px - this.lag; this.v = this.speed; }

  update(dt, lvl) {
    this.t += dt;
    if (!this.active) return;
    const p = lvl.player;
    this.v = Math.min(this.v + this.accel * dt, this.speed + 60);
    // élastique : ne reste jamais trop loin derrière, pour garder la pression
    const gap = p.cx - this.x;
    const catchup = gap > 300 ? (gap - 300) * 1.5 : 0;
    this.x += (this.v + catchup) * dt;
    if (!p.dead && !p.won && p.x < this.x - 4) lvl.killPlayer('avalanche');
  }

  draw(ctx, view, particles) {
    if (!this.active) return;
    if (this.x < view.x - 40) {
      // hors champ : brume blanche et alerte sur le bord gauche, d'autant plus forte qu'elle est proche
      const k = Math.max(0, 1 - (view.x - this.x) / 320);
      const g = ctx.createLinearGradient(view.x, 0, view.x + 60, 0);
      g.addColorStop(0, `rgba(238,246,255,${0.25 + 0.55 * k})`); g.addColorStop(1, 'rgba(238,246,255,0)');
      ctx.fillStyle = g; ctx.fillRect(view.x, view.y, 60, view.h);
      if (Math.sin(this.t * (6 + k * 10)) > 0) {
        const cx = view.x + 12, cy = view.y + view.h / 2;
        ctx.fillStyle = '#0a0d24'; ctx.fillRect(cx - 5, cy - 9, 10, 18);
        ctx.fillStyle = '#ff4f5e'; ctx.fillRect(cx - 4, cy - 8, 8, 16);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 1, cy - 6, 2, 8); ctx.fillRect(cx - 1, cy + 4, 2, 2);
      }
      return;
    }
    const t = this.t;
    const top = view.y - 4, bot = view.y + view.h + 4;
    for (let y = Math.floor(top); y < bot; y += 2) {
      const edge = this.x + Math.sin(y * 0.07 + t * 6) * 8 + Math.sin(y * 0.19 - t * 9) * 4 + Math.sin(y * 0.031 + t * 2) * 10;
      ctx.fillStyle = '#eef6ff';
      ctx.fillRect(view.x - 2, y, edge - view.x + 2, 2);
      ctx.fillStyle = '#b9cdf5';
      ctx.fillRect(edge - 14, y, 6, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(edge - 4, y, 4, 2);
    }
    for (let i = 0; i < 6; i++) {
      const by = top + ((i * 61 + t * 40) % (bot - top));
      const r = 6 + (i % 3) * 3;
      const bx = this.x - 6 + Math.sin(t * 3 + i) * 5;
      ctx.fillStyle = '#0a0d24'; ctx.beginPath(); ctx.arc(bx, by, r + 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c9d8f5'; ctx.fillRect(bx - r * 0.3, by + r * 0.2, r * 0.6, r * 0.4);
    }
    if (particles && Math.random() < 0.8) particles.spawn(this.x + 4, top + Math.random() * (bot - top), 60 + Math.random() * 80, -60 - Math.random() * 80, 0.6, 3, '#ffffff', { g: 300 });
  }
}

// ---------- Vent ----------
/** zones : [[tx0, tx1, force]] ; force en px/s² (négatif = vers la gauche). */
export class WindField {
  constructor(zones) { this.zones = (zones || []).map(([a, b, f]) => ({ x0: a * T, x1: b * T, f })); this.t = 0; }
  update(dt) { this.t += dt; }
  gust() { return 0.65 + 0.35 * Math.sin(this.t * 1.3) + 0.15 * Math.sin(this.t * 4.1); }
  at(x) {
    let f = 0;
    for (const z of this.zones) if (x >= z.x0 && x <= z.x1) f += z.f;
    return f * this.gust();
  }
  draw(ctx, view, particles) {
    for (const z of this.zones) {
      if (z.x1 < view.x || z.x0 > view.x + view.w) continue;
      const n = Math.abs(z.f) / 60;
      if (Math.random() < n * 0.016 * 60 / 6) {
        const x = z.f > 0 ? Math.max(z.x0, view.x) : Math.min(z.x1, view.x + view.w);
        particles.spawn(x, view.y + Math.random() * view.h, Math.sign(z.f) * (180 + Math.random() * 120), (Math.random() - 0.5) * 20, 1.4, 1, 'rgba(255,255,255,0.8)', { shape: 'sq', shrink: false });
      }
    }
  }
}
