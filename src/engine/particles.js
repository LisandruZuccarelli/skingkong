// Système de particules avec pool pré-alloué (aucune allocation en jeu).
export class Particles {
  constructor(max = 900) {
    this.pool = [];
    for (let i = 0; i < max; i++) this.pool.push({ on: false });
    this.cursor = 0;
    this.count = 0;
  }

  spawn(x, y, vx, vy, life, size, color, o = {}) {
    const n = this.pool.length;
    let p = null;
    for (let i = 0; i < n; i++) {
      const j = (this.cursor + i) % n;
      if (!this.pool[j].on) { p = this.pool[j]; this.cursor = j + 1; break; }
    }
    if (!p) { p = this.pool[this.cursor % n]; this.cursor++; }
    p.on = true;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = life; p.t = 0; p.size = size; p.color = color;
    p.g = o.g ?? 0;
    p.drag = o.drag ?? 0;
    p.shape = o.shape ?? 'sq';
    p.shrink = o.shrink ?? true;
    p.grow = o.grow ?? 0;
    p.fade = o.fade ?? true;
    p.additive = o.additive ?? false;
    return p;
  }

  burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = (o.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
      const s = (o.speed ?? 80) * (0.4 + Math.random() * 0.8);
      const col = Array.isArray(o.color) ? o.color[(Math.random() * o.color.length) | 0] : o.color;
      this.spawn(
        x + (Math.random() - 0.5) * (o.w ?? 0), y + (Math.random() - 0.5) * (o.h ?? 0),
        Math.cos(a) * s + (o.vx ?? 0), Math.sin(a) * s + (o.vy ?? 0),
        (o.life ?? 0.5) * (0.6 + Math.random() * 0.7), (o.size ?? 2) * (0.6 + Math.random() * 0.8), col, o
      );
    }
  }

  update(dt) {
    let c = 0;
    for (const p of this.pool) {
      if (!p.on) continue;
      p.t += dt;
      if (p.t >= p.life) { p.on = false; continue; }
      c++;
      p.vy += p.g * dt;
      if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.count = c;
  }

  draw(ctx, view) {
    for (const p of this.pool) {
      if (!p.on) continue;
      if (view && (p.x < view.x - 20 || p.x > view.x + view.w + 20 || p.y < view.y - 20 || p.y > view.y + view.h + 20)) continue;
      const k = 1 - p.t / p.life;
      const s = Math.max(0.5, (p.shrink ? p.size * k : p.size) + p.grow * p.t);
      ctx.globalAlpha = p.fade ? Math.min(1, k * 1.5) : 1;
      if (p.additive) ctx.globalCompositeOperation = 'lighter';
      if (p.shape === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === 'spark') {
        ctx.fillStyle = p.color;
        const r = Math.round(s);
        ctx.fillRect(Math.round(p.x) - r, Math.round(p.y), r * 2 + 1, 1);
        ctx.fillRect(Math.round(p.x), Math.round(p.y) - r, 1, r * 2 + 1);
      } else {
        ctx.fillStyle = p.color;
        const r = Math.round(s);
        ctx.fillRect(Math.round(p.x - r / 2), Math.round(p.y - r / 2), r, r);
      }
      if (p.additive) ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }
}
