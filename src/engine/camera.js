// Caméra : anticipation (lookahead), lissage, verrouillage vertical sur plateformes, zoom dynamique, screen shake.
import { clamp, damp } from './util.js';

export class Camera {
  constructor() {
    this.x = 0; this.y = 0;
    this.zoom = 1; this.zoomOverride = null;
    this.look = 0;
    this.groundY = 0;
    this.trauma = 0;
    this.shakeX = 0; this.shakeY = 0;
    this.t = 0;
    this.fast = 0;
    this.left = 0; this.top = 0; this.vw = 480; this.vh = 270;
  }

  snap(px, py) {
    this.x = px; this.y = py - 12; this.groundY = py; this.look = 0;
  }

  shake(amount) { this.trauma = Math.min(1, this.trauma + amount); }

  update(dt, p, view, bounds, reduceFx) {
    this.t += dt;
    const pcx = p.x + p.w / 2;
    const pcy = p.y + p.h / 2;
    const lookT = clamp(p.facing * 30 + p.vx * 0.3, -96, 96);
    this.look = damp(this.look, p.dead ? this.look : lookT, 2.6, dt);
    if (p.grounded || p.dead) this.groundY = p.dead ? this.groundY : pcy;
    let ty = this.groundY;
    if (pcy > this.groundY) ty = pcy;
    if (pcy < this.groundY - 64) ty = pcy + 64;
    const k = this.fast > 0 ? 18 : 1;
    this.fast = Math.max(0, this.fast - dt);
    this.x = damp(this.x, pcx + this.look, 6 * k, dt);
    this.y = damp(this.y, ty - 14, (pcy > this.groundY + 8 ? 9 : 4.5) * k, dt);
    const speed = Math.abs(p.vx);
    const zt = this.zoomOverride ?? 1 - clamp((speed - 170) / 1500, 0, 0.12);
    this.zoom = damp(this.zoom, zt, 2.2, dt);

    if (this.lock) { this.x = this.lock.x; this.y = this.lock.y; this.zoom = 1; }
    const halfW = view.w / (2 * this.zoom);
    const halfH = view.h / (2 * this.zoom);
    this.x = bounds.w <= halfW * 2 ? bounds.w / 2 : clamp(this.x, halfW, bounds.w - halfW);
    this.y = clamp(this.y, halfH - 200, bounds.h - halfH);

    this.trauma = Math.max(0, this.trauma - dt * 1.7);
    const s = this.trauma * this.trauma * (reduceFx ? 0.25 : 1);
    this.shakeX = s * 7 * (Math.sin(this.t * 71.3) * 0.6 + Math.sin(this.t * 37.1) * 0.4);
    this.shakeY = s * 6 * (Math.sin(this.t * 63.7 + 1.3) * 0.6 + Math.sin(this.t * 29.3) * 0.4);

    this.vw = halfW * 2;
    this.vh = halfH * 2;
    this.left = this.x - halfW + this.shakeX;
    this.top = this.y - halfH + this.shakeY;
  }

  /** Rectangle visible en coordonnées monde. */
  get rect() { return { x: this.left, y: this.top, w: this.vw, h: this.vh }; }
}
