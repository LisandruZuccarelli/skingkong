// Météo en espace écran : neige, neige légère, blizzard avec rafales, poussière de diamant.
import { mulberry32 } from '../engine/util.js';

const COUNTS = { snow: 110, snowLight: 55, blizzard: 260, sparkle: 50, none: 0 };

export class Weather {
  constructor(type = 'snow', wind = -14) {
    this.type = type;
    this.baseWind = wind;
    this.wind = wind;
    this.gust = 0; this.gustT = 3; this.gustPhase = 0;
    this.t = 0;
    this.lastCam = null;
    const rnd = mulberry32(99);
    this.p = [];
    for (let i = 0; i < (COUNTS[type] ?? 100); i++) this.p.push({ x: rnd() * 900, y: rnd() * 500, z: 0.3 + rnd() * 0.9, ph: rnd() * 6 });
  }

  update(dt, cam, view) {
    this.t += dt;
    const dx = this.lastCam ? cam.x - this.lastCam.x : 0;
    const dy = this.lastCam ? cam.y - this.lastCam.y : 0;
    this.lastCam = { x: cam.x, y: cam.y };
    if (this.type === 'blizzard') {
      this.gustT -= dt;
      if (this.gustT <= 0) { this.gustPhase = 2.2; this.gustT = 4 + Math.random() * 4; }
      this.gustPhase = Math.max(0, this.gustPhase - dt);
      const target = this.gustPhase > 0 ? Math.sin((this.gustPhase / 2.2) * Math.PI) : 0;
      this.gust += (target - this.gust) * Math.min(1, dt * 3);
      this.wind = this.baseWind * (1 + this.gust * 1.3);
    }
    const W = view.w + 40, Hh = view.h + 40;
    const fall = this.type === 'blizzard' ? 90 : this.type === 'sparkle' ? 4 : 24;
    for (const f of this.p) {
      const sway = this.type === 'sparkle' ? Math.sin(this.t * 0.5 + f.ph) * 4 : Math.sin(this.t * 0.8 + f.ph) * 12;
      f.x += (sway + this.wind) * f.z * dt - dx * f.z * 0.9;
      f.y += fall * f.z * dt - dy * f.z * 0.9;
      f.x = ((f.x % W) + W) % W;
      f.y = ((f.y % Hh) + Hh) % Hh;
    }
  }

  draw(ctx, view, reduce) {
    const n = reduce ? Math.min(40, this.p.length) : this.p.length;
    if (this.type === 'blizzard') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      const len = 0.03 * (Math.abs(this.wind) + 40);
      for (let i = 0; i < n; i++) {
        const f = this.p[i];
        ctx.globalAlpha = 0.25 + f.z * 0.5;
        const x = Math.round(f.x - 20), y = Math.round(f.y - 20);
        if (f.z > 0.75) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - this.wind * len * 0.02 * f.z * 3, y - 2 * f.z); ctx.stroke();
        } else { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1); }
      }
      ctx.globalAlpha = (0.04 + this.gust * 0.14) * (reduce ? 0.4 : 1);
      ctx.fillStyle = '#e8eef8';
      ctx.fillRect(0, 0, view.w, view.h);
    } else if (this.type === 'sparkle') {
      for (let i = 0; i < n; i++) {
        const f = this.p[i];
        const a = Math.max(0, Math.sin(this.t * 2.5 + f.ph * 3));
        if (a < 0.2) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ffffff';
        const x = Math.round(f.x - 20), y = Math.round(f.y - 20);
        ctx.fillRect(x, y, 1, 1);
        if (a > 0.8 && f.z > 0.8) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
      }
    } else {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < n; i++) {
        const f = this.p[i];
        ctx.globalAlpha = 0.35 + f.z * 0.5;
        const s = f.z > 0.9 ? 2 : 1;
        ctx.fillRect(Math.round(f.x - 20), Math.round(f.y - 20), s, s);
      }
    }
    ctx.globalAlpha = 1;
  }
}
