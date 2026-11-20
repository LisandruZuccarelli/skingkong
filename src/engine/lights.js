// Éclairage : halos additifs (bloom léger) et couche d'obscurité percée par les lumières.
import { makeCanvas } from './util.js';

const glowCache = new Map();

/** Halo radial pré-rendu. rgb = 'r,g,b' */
export function glowSprite(rgb, r) {
  const R = Math.max(2, Math.round(r));
  const key = rgb + '|' + R;
  let c = glowCache.get(key);
  if (c) return c;
  const [cv, g] = makeCanvas(R * 2, R * 2);
  const grd = g.createRadialGradient(R, R, 0, R, R, R);
  grd.addColorStop(0, `rgba(${rgb},0.9)`);
  grd.addColorStop(0.25, `rgba(${rgb},0.45)`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, R * 2, R * 2);
  if (glowCache.size > 300) glowCache.clear();
  glowCache.set(key, cv);
  return cv;
}

export function drawGlow(ctx, x, y, r, rgb, alpha = 1) {
  const s = glowSprite(rgb, r);
  ctx.globalAlpha = alpha;
  ctx.drawImage(s, x - s.width / 2, y - s.height / 2);
  ctx.globalAlpha = 1;
}

export class Darkness {
  constructor() {
    [this.c, this.g] = makeCanvas(2, 2);
    this.scale = 0.5;
  }

  /** lights : [{x, y, r, intensity}] en coordonnées monde. */
  render(ctx, view, cam, lights, amount, rgb) {
    if (amount <= 0.01) return;
    const s = this.scale;
    const w = Math.ceil(view.w * s), h = Math.ceil(view.h * s);
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    const g = this.g;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    g.fillStyle = `rgba(${rgb},${amount})`;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      const r = l.r * cam.zoom * s;
      const x = (l.x - cam.left) * cam.zoom * s;
      const y = (l.y - cam.top) * cam.zoom * s;
      if (x < -r || y < -r || x > w + r || y > h + r) continue;
      const spr = glowSprite('255,255,255', r);
      g.globalAlpha = Math.min(1, l.intensity ?? 1);
      g.drawImage(spr, x - r, y - r);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.c, 0, 0, w, h, 0, 0, view.w, view.h);
    ctx.imageSmoothingEnabled = false;
  }
}
