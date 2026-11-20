// Décor en parallaxe généré procéduralement : 4 univers, ciel, étoiles, aurores, astres, brouillard, effets animés.
import { makeCanvas, mulberry32 } from '../engine/util.js';
import { drawText } from '../engine/font.js';
import { getTheme } from './themes.js';

const LAYER_W = 960;
const H = 200;
const cache = new Map();

// ---------- primitives de dessin ----------
function ridge(g, w, h, base, amp, seed, body, shade, snow, snowLine, sharp = 0) {
  const rnd = mulberry32(seed);
  const waves = [1, 2, 3, 5, 7, 11].map((k, i) => ({ k, a: amp / (i + 1.4), ph: rnd() * Math.PI * 2 }));
  const hAt = (x) => {
    let v = 0;
    for (const wv of waves) v += Math.sin((x / w) * Math.PI * 2 * wv.k + wv.ph) * wv.a;
    if (sharp) v += Math.abs(Math.sin((x / w) * Math.PI * 2 * 23 + seed)) * sharp;
    return Math.round(base - Math.abs(v) * 0.9 - v * 0.35);
  };
  const hs = [];
  for (let x = -4; x < w + 4; x++) hs.push(hAt(((x % w) + w) % w));
  const Hh = (x) => hs[x + 4];
  for (let x = 0; x < w; x++) {
    const y = Hh(x);
    const shaded = Hh(x + 4) - Hh(x - 4) > 3;
    g.fillStyle = shaded ? shade : body;
    g.fillRect(x, y, 1, h - y);
    if (snow && y < snowLine) {
      const n = Math.sin(x * 0.21) * 2 + Math.sin(x * 0.07 + seed) * 3;
      const depth = Math.max(2, Math.round((snowLine - y) * 0.5 + n));
      g.fillStyle = snow;
      g.fillRect(x, y, 1, shaded ? Math.max(1, Math.round(depth * 0.45)) : depth);
    }
  }
  return Hh;
}

function crane(g, x, groundY, height, jibR, jibL, col) {
  g.fillStyle = col;
  const top = groundY - height;
  g.fillRect(x, top, 1, height); g.fillRect(x + 4, top, 1, height);
  for (let y = top; y < groundY; y += 4) { for (let i = 0; i < 4; i++) g.fillRect(x + i, y + i, 1, 1); g.fillRect(x, y, 5, 1); }
  g.fillRect(x - jibL, top - 2, jibL + jibR, 2);
  for (let i = 0; i < jibR; i += 4) g.fillRect(x + i, top - 3 - ((i / 4) % 2), 1, 1);
  g.fillRect(x + 1, top - 9, 3, 7);
  for (let i = 0; i < jibR; i += 2) g.fillRect(x + 2 + i, top - 9 + Math.round((i * 7) / jibR), 1, 1);
  for (let i = 0; i < jibL; i += 2) g.fillRect(x + 2 - i, top - 9 + Math.round((i * 7) / jibL), 1, 1);
  g.fillRect(x - jibL, top, 6, 5);
  const hookX = x + Math.round(jibR * 0.7);
  g.fillRect(hookX, top, 1, Math.round(height * 0.45));
  g.fillRect(hookX - 3, top + Math.round(height * 0.45), 7, 5);
}

function excavator(g, x, groundY, col) {
  g.fillStyle = col;
  g.fillRect(x, groundY - 5, 22, 5);
  g.fillRect(x + 2, groundY - 12, 14, 7);
  g.fillRect(x + 4, groundY - 18, 7, 6);
  for (let i = 0; i < 12; i++) g.fillRect(x + 15 + i, groundY - 13 - Math.round(i * 0.8), 2, 2);
  for (let i = 0; i < 9; i++) g.fillRect(x + 27 + Math.round(i * 0.4), groundY - 22 + i * 2, 2, 2);
  g.fillRect(x + 27, groundY - 6, 6, 4);
}

function chalet(g, x, groundY, w, col, win, rnd, roof) {
  const h = 10 + ((rnd() * 6) | 0);
  g.fillStyle = col;
  g.fillRect(x, groundY - h, w, h);
  for (let i = 0; i <= w / 2 + 2; i++) {
    g.fillStyle = roof && i < 2 ? roof : col;
    g.fillRect(x - 2 + i, Math.round(groundY - h - i * 0.7), w + 4 - i * 2, 1);
  }
  g.fillStyle = win;
  for (let wx = x + 2; wx < x + w - 2; wx += 4) if (rnd() > 0.3) g.fillRect(wx, groundY - h + 3, 2, 2);
  return h;
}

function pine(g, x, groundY, h, col, snow) {
  g.fillStyle = col;
  g.fillRect(x, groundY - 3, 1, 3);
  const tiers = Math.max(2, Math.ceil(h / 8));
  for (let i = 0; i < h; i++) {
    const tierLen = Math.ceil(h / tiers);
    const half = Math.floor(((i % tierLen) + 1) * 0.55 + (i / h) * 3.5);
    const y = groundY - 3 - (h - i);
    g.fillStyle = snow && i % tierLen === 0 ? snow : col;
    g.fillRect(x - half, y, half * 2 + 1, 1);
  }
}

function deadTree(g, x, groundY, h, col) {
  g.fillStyle = col;
  g.fillRect(x, groundY - h, 2, h);
  for (let i = 4; i < h - 2; i += 5) {
    const dir = (i / 5) % 2 ? 1 : -1;
    for (let k = 0; k < 6; k++) g.fillRect(x + dir * k + (dir > 0 ? 2 : -1), groundY - h + i - Math.floor(k / 2), 1, 1);
  }
}

function crystal(g, x, groundY, h, w, light, dark, edge) {
  for (let i = 0; i < h; i++) {
    const tip = i < w ? w - i : 0;
    const y = groundY - h + i;
    const half = Math.max(0, w - Math.max(0, w - i));
    if (tip > w) continue;
    g.fillStyle = edge; g.fillRect(x - half - 1, y, half * 2 + 2, 1);
    g.fillStyle = light; g.fillRect(x - half, y, half, 1);
    g.fillStyle = dark; g.fillRect(x, y, half, 1);
  }
}

// ---------- univers ----------
function buildMountains() {
  const layers = [];
  { const [c, g] = makeCanvas(LAYER_W, H); ridge(g, LAYER_W, H, 120, 70, 11, '#7387d8', '#6578c8', '#dfe7ff', 105); layers.push({ c, f: 0.06, fy: 0.03, y: -20, base: '#7387d8' }); }
  {
    const [c, g] = makeCanvas(LAYER_W, 80);
    const rnd = mulberry32(5);
    for (let i = 0; i < 7; i++) {
      const cx = rnd() * LAYER_W, cy = 15 + rnd() * 40, r = 10 + rnd() * 14;
      for (let k = 0; k < 5; k++) {
        const ox = (k - 2) * r * 0.7, rr = r * (1 - Math.abs(k - 2) * 0.22);
        for (let y = -rr; y < rr * 0.5; y++) {
          const half = Math.sqrt(rr * rr - y * y);
          g.fillStyle = y > rr * 0.15 ? '#b6b4d8' : '#e6e3f5';
          g.fillRect(Math.round(cx + ox - half), Math.round(cy + y), Math.round(half * 2), 1);
        }
      }
    }
    layers.push({ c, f: 0.1, fy: 0.02, y: -150, drift: 4, alpha: 0.85 });
  }
  { const [c, g] = makeCanvas(LAYER_W, H); ridge(g, LAYER_W, H, 140, 55, 23, '#4256b6', '#36489f', '#c6d5ff', 120); layers.push({ c, f: 0.16, fy: 0.06, y: 0, base: '#4256b6' }); }
  {
    const [c, g] = makeCanvas(LAYER_W, H);
    const rnd = mulberry32(42);
    ridge(g, LAYER_W, H, 168, 14, 37, '#2a3890', '#2a3890', '#8fa6ec', 175);
    crane(g, 120, 160, 70, 50, 18, '#1f2b78');
    crane(g, 610, 162, 88, 60, 20, '#1f2b78');
    excavator(g, 380, 166, '#1f2b78');
    for (const cx of [230, 255, 470, 760, 790, 820]) chalet(g, cx, 168, 16, '#1f2b78', '#ffd76a', rnd);
    layers.push({ c, f: 0.3, fy: 0.1, y: 10, base: '#2a3890' });
  }
  {
    const [c, g] = makeCanvas(LAYER_W, H);
    const rnd = mulberry32(77);
    ridge(g, LAYER_W, H, 186, 8, 53, '#141d58', '#141d58', null, 0);
    for (let x = 4; x < LAYER_W; x += 7 + ((rnd() * 9) | 0)) pine(g, x, 188 + ((rnd() * 4) | 0), 14 + ((rnd() * 14) | 0), '#141d58', '#a9bdf0');
    layers.push({ c, f: 0.5, fy: 0.16, y: 26, base: '#141d58' });
  }
  return layers;
}

function buildForest() {
  const layers = [];
  { const [c, g] = makeCanvas(LAYER_W, H); ridge(g, LAYER_W, H, 112, 60, 91, '#5b6a82', '#4f5d74', '#c9d3e0', 100); layers.push({ c, f: 0.05, fy: 0.03, y: -10, base: '#5b6a82', fogAfter: 0.35 }); }
  const forest = (seed, base, amp, col, snow, hMin, hMax, gapMin, gapMax, dead) => {
    const [c, g] = makeCanvas(LAYER_W, H);
    const rnd = mulberry32(seed);
    ridge(g, LAYER_W, H, base, amp, seed + 1, col, col, null, 0);
    for (let x = 3; x < LAYER_W - 3; x += gapMin + ((rnd() * (gapMax - gapMin)) | 0)) {
      if (dead && rnd() < 0.12) deadTree(g, x, base + 3, hMin + ((rnd() * (hMax - hMin)) | 0), col);
      else pine(g, x, base + 2 + ((rnd() * 3) | 0), hMin + ((rnd() * (hMax - hMin)) | 0), col, snow);
    }
    return c;
  };
  layers.push({ c: forest(13, 150, 10, '#3e4c63', '#9fb0c4', 16, 28, 4, 8), f: 0.14, fy: 0.06, y: 0, base: '#3e4c63', fogAfter: 0.3 });
  layers.push({ c: forest(29, 170, 8, '#2c384d', '#8597ae', 22, 38, 6, 12, true), f: 0.28, fy: 0.1, y: 12, base: '#2c384d', fogAfter: 0.25 });
  layers.push({ c: forest(47, 190, 6, '#1b2433', '#6f8098', 30, 50, 10, 22, true), f: 0.5, fy: 0.16, y: 30, base: '#1b2433' });
  return layers;
}

function buildGlacier() {
  const layers = [];
  { const [c, g] = makeCanvas(LAYER_W, H); ridge(g, LAYER_W, H, 118, 64, 17, '#cfe6fa', '#b4d3ef', '#ffffff', 112); layers.push({ c, f: 0.05, fy: 0.03, y: -18, base: '#cfe6fa' }); }
  {
    const [c, g] = makeCanvas(LAYER_W, H);
    const rnd = mulberry32(8);
    g.fillStyle = '#2a7cc4'; g.fillRect(0, 150, LAYER_W, 50);
    g.fillStyle = '#3a8fd4'; for (let y = 152; y < 200; y += 5) for (let x = 0; x < LAYER_W; x += 9 + ((rnd() * 20) | 0)) g.fillRect(x, y, 4 + ((rnd() * 8) | 0), 1);
    for (let i = 0; i < 9; i++) {
      const bx = (rnd() * LAYER_W) | 0, bw = 10 + ((rnd() * 26) | 0), bh = 6 + ((rnd() * 14) | 0);
      for (let k = 0; k < bh; k++) {
        const half = Math.round(bw / 2 - (bh - k) * 0.3 - rnd() * 1.5);
        g.fillStyle = '#ffffff'; g.fillRect(bx - half, 150 - bh + k, half, 1);
        g.fillStyle = '#bfe3fa'; g.fillRect(bx, 150 - bh + k, half, 1);
      }
      g.fillStyle = '#7fc0ea'; g.fillRect(bx - bw / 2 + 2, 151, bw - 4, 2);
    }
    layers.push({ c, f: 0.1, fy: 0.04, y: 0, base: '#2a7cc4', shimmer: true });
  }
  {
    const [c, g] = makeCanvas(LAYER_W, H);
    const rnd = mulberry32(61);
    const hh = ridge(g, LAYER_W, H, 160, 26, 33, '#7fc4ef', '#5aa8de', '#e9f7ff', 150, 10);
    g.fillStyle = '#3f8cc9';
    for (let i = 0; i < 70; i++) { const x = (rnd() * LAYER_W) | 0; const y = hh(x) + 4 + ((rnd() * 6) | 0); g.fillRect(x, y, 1, 6 + ((rnd() * 22) | 0)); }
    layers.push({ c, f: 0.24, fy: 0.08, y: 6, base: '#5aa8de' });
  }
  {
    const [c, g] = makeCanvas(LAYER_W, H);
    const rnd = mulberry32(83);
    ridge(g, LAYER_W, H, 188, 6, 71, '#2f6fa8', '#2f6fa8', '#d8f2ff', 192);
    for (let x = 10; x < LAYER_W - 10; x += 30 + ((rnd() * 60) | 0)) {
      const purple = rnd() < 0.35;
      for (let k = 0; k < 3; k++) {
        crystal(g, x + k * 6 - 6, 190, 10 + ((rnd() * 20) | 0), 3 + ((rnd() * 2) | 0), purple ? '#e2d4ff' : '#c9f6ff', purple ? '#9b7fe8' : '#5fc8ec', '#1d4f7d');
      }
    }
    layers.push({ c, f: 0.45, fy: 0.15, y: 28, base: '#2f6fa8' });
  }
  return layers;
}

function buildVillage() {
  const layers = [];
  { const [c, g] = makeCanvas(LAYER_W, H); ridge(g, LAYER_W, H, 120, 66, 19, '#141a3a', '#10152f', '#3a4580', 104); layers.push({ c, f: 0.05, fy: 0.03, y: -16, base: '#141a3a' }); }
  {
    const [c, g] = makeCanvas(LAYER_W, H);
    const rnd = mulberry32(21);
    ridge(g, LAYER_W, H, 168, 18, 27, '#0f1430', '#0f1430', '#252c5c', 160);
    for (let x = 30; x < LAYER_W; x += 70 + ((rnd() * 80) | 0)) {
      const w = 18 + ((rnd() * 20) | 0), h = 18 + ((rnd() * 26) | 0);
      g.fillStyle = '#1a1f45'; g.fillRect(x, 168 - h, w, h + 10);
      for (let wy = 168 - h + 3; wy < 166; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3) if (rnd() > 0.45) { g.fillStyle = rnd() > 0.5 ? '#ffd76a' : '#ff9f4a'; g.fillRect(wx, wy, 1, 2); }
    }
    // télésiège
    g.fillStyle = '#1e2552';
    for (let px = 40; px < LAYER_W; px += 120) { g.fillRect(px, 120, 2, 50); g.fillRect(px - 5, 120, 12, 2); }
    for (let x = 0; x < LAYER_W; x++) g.fillRect(x, 121 + Math.round(Math.sin(((x - 40) / 120) * Math.PI) * 4 * (((x - 40) % 120 + 120) % 120 > 0 ? 1 : 0)), 1, 1);
    for (let x = 70; x < LAYER_W; x += 40) { g.fillRect(x, 124, 1, 6); g.fillRect(x - 3, 130, 7, 2); g.fillRect(x - 3, 127, 1, 3); }
    layers.push({ c, f: 0.18, fy: 0.06, y: 4, base: '#0f1430' });
  }
  {
    const [c, g] = makeCanvas(LAYER_W, H);
    const rnd = mulberry32(55);
    ridge(g, LAYER_W, H, 182, 6, 41, '#0b0f26', '#0b0f26', '#1f2650', 186);
    const signs = [['BAR', '#ff4fd8'], ['AFTER', '#4ff0ff'], ['ESTP', '#ffd23f'], ['SKI', '#4ff0ff'], ['DISCO', '#ff4fd8']];
    const beams = [];
    let si = 0;
    for (let x = 20; x < LAYER_W - 40; x += 80 + ((rnd() * 60) | 0)) {
      const w = 22 + ((rnd() * 12) | 0);
      const h = chalet(g, x, 182, w, '#141938', '#ffb347', rnd, '#2a3466');
      const [txt, col] = signs[si++ % signs.length];
      const tw = txt.length * 6 + 3;
      g.fillStyle = '#05060f'; g.fillRect(x + w / 2 - tw / 2 - 1, 182 - h - 16, tw + 2, 11);
      drawText(g, txt, x + w / 2, 182 - h - 14, { align: 'center', color: col, shadow: null });
      beams.push({ x: x + w / 2, y: 182 - h - 10, col });
      // guirlande
      const nx = x + w + 30;
      const bulbs = ['#ff4f5e', '#ffd23f', '#4ff0ff', '#7dff6a', '#ff4fd8'];
      for (let k = 0; k < 30; k++) {
        const bx = x + w + k;
        const by = 182 - h + 2 + Math.round(Math.sin((k / 30) * Math.PI) * 5);
        g.fillStyle = '#222a55'; g.fillRect(bx, by, 1, 1);
        if (k % 4 === 0) { g.fillStyle = bulbs[(k / 4) % bulbs.length]; g.fillRect(bx, by + 1, 1, 2); }
      }
      if (nx > LAYER_W) break;
    }
    layers.push({ c, f: 0.34, fy: 0.12, y: 16, base: '#0b0f26', beams });
  }
  {
    const [c, g] = makeCanvas(LAYER_W, H);
    const rnd = mulberry32(99);
    ridge(g, LAYER_W, H, 192, 5, 63, '#070a1a', '#070a1a', null, 0);
    for (let x = 6; x < LAYER_W; x += 12 + ((rnd() * 24) | 0)) pine(g, x, 194, 16 + ((rnd() * 20) | 0), '#070a1a', '#2a3466');
    layers.push({ c, f: 0.55, fy: 0.18, y: 30, base: '#070a1a' });
  }
  return layers;
}

const BUILDERS = { mountains: buildMountains, forest: buildForest, glacier: buildGlacier, village: buildVillage };

function buildFog() {
  const [c, g] = makeCanvas(LAYER_W, 60);
  const rnd = mulberry32(4);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * LAYER_W, y = 20 + rnd() * 25, r = 12 + rnd() * 26;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(220,230,245,0.55)');
    grd.addColorStop(1, 'rgba(220,230,245,0)');
    g.fillStyle = grd;
    for (const ox of [0, -LAYER_W, LAYER_W]) { g.save(); g.translate(ox, 0); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
  }
  return c;
}

function buildAuroraStrip(colors) {
  const [c, g] = makeCanvas(1, 64);
  const grd = g.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, `rgba(${colors[2]},0)`);
  grd.addColorStop(0.35, `rgba(${colors[1]},0.55)`);
  grd.addColorStop(0.8, `rgba(${colors[0]},0.8)`);
  grd.addColorStop(1, `rgba(${colors[0]},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, 1, 64);
  return c;
}

function buildTheme(name) {
  const th = getTheme(name);
  const layers = (BUILDERS[th.layers] || buildMountains)();
  const [sky, sg] = makeCanvas(1, th.sky.length);
  th.sky.forEach((col, i) => { sg.fillStyle = col; sg.fillRect(0, i, 1, 1); });
  const rnd = mulberry32(1234);
  const stars = [];
  for (let i = 0; i < 140; i++) stars.push({ x: rnd(), y: rnd() * 0.7, s: rnd() < 0.15 ? 2 : 1, ph: rnd() * 6, sp: 1 + rnd() * 3 });
  return { th, layers, sky, stars, fog: th.fog ? buildFog() : null, aurora: th.aurora ? [buildAuroraStrip(['80,255,170', '60,220,255', '170,90,255']), buildAuroraStrip(['200,90,255', '255,80,190', '80,120,255'])] : null };
}

export class Background {
  constructor(theme = 'dawn') {
    if (!cache.has(theme)) cache.set(theme, buildTheme(theme));
    this.data = cache.get(theme);
    this.th = this.data.th;
    this.t = 0;
  }

  update(dt) { this.t += dt; }

  draw(ctx, cam, view) {
    const { th, layers, sky, stars, fog, aurora } = this.data;
    const t = this.t;
    ctx.drawImage(sky, 0, 0, 1, sky.height, 0, 0, view.w, view.h);

    if (th.stars) {
      ctx.fillStyle = '#ffffff';
      for (const s of stars) {
        const a = th.stars * (0.45 + 0.55 * Math.sin(t * s.sp + s.ph));
        if (a <= 0.05) continue;
        ctx.globalAlpha = a;
        const x = ((s.x * view.w * 1.2 - cam.x * 0.01) % (view.w * 1.2) + view.w * 1.2) % (view.w * 1.2);
        ctx.fillRect(Math.round(x), Math.round(s.y * view.h), s.s, s.s);
      }
      ctx.globalAlpha = 1;
    }

    if (aurora) {
      ctx.globalCompositeOperation = 'lighter';
      for (let band = 0; band < 2; band++) {
        const strip = aurora[band];
        const base = 30 + band * 24;
        ctx.globalAlpha = th.aurora * (band ? 0.5 : 0.7);
        for (let x = 0; x < view.w; x += 2) {
          const wx = x + cam.x * 0.02;
          const y = base + Math.sin(wx * 0.012 + t * 0.35 + band * 2) * 16 + Math.sin(wx * 0.031 - t * 0.6) * 6;
          const hgt = 40 + Math.sin(wx * 0.02 + t * 0.8 + band) * 18;
          const flick = 0.6 + 0.4 * Math.sin(wx * 0.05 + t * 1.7 + band * 3);
          ctx.globalAlpha = th.aurora * (band ? 0.45 : 0.65) * flick;
          ctx.drawImage(strip, 0, 0, 1, 64, x, y, 2, hgt);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    if (th.sun) {
      const sx = view.w * th.sun.x, sy = th.sun.y - cam.y * 0.02 + 10;
      ctx.globalCompositeOperation = 'lighter';
      for (let r = th.sun.r * 3; r > th.sun.r; r -= 7) { ctx.fillStyle = `rgba(${th.sun.glow},0.05)`; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = th.sun.color; ctx.beginPath(); ctx.arc(Math.round(sx), Math.round(sy), th.sun.r, 0, Math.PI * 2); ctx.fill();
    }
    if (th.moon) {
      const mx = Math.round(view.w * th.moon.x), my = Math.round(th.moon.y - cam.y * 0.02 + 10), r = th.moon.r;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(180,190,255,0.06)';
      for (let k = 4; k >= 1; k--) { ctx.beginPath(); ctx.arc(mx, my, r + k * 7, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#f2f0ff'; ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c9c6e8';
      ctx.fillRect(mx - 5, my - 3, 3, 3); ctx.fillRect(mx + 2, my + 2, 4, 3); ctx.fillRect(mx - 1, my + 6, 2, 2);
    }

    for (const L of layers) {
      const off = ((cam.x * L.f + (L.drift ? t * L.drift : 0)) % LAYER_W + LAYER_W) % LAYER_W;
      const ox = -off;
      const y = Math.round(view.h - L.c.height + L.y - (cam.y - 160) * L.fy);
      if (L.alpha) ctx.globalAlpha = L.alpha;
      for (let x = Math.floor(ox); x < view.w; x += LAYER_W) ctx.drawImage(L.c, x, y);
      ctx.globalAlpha = 1;
      if (L.base && y + L.c.height < view.h) { ctx.fillStyle = L.base; ctx.fillRect(0, y + L.c.height, view.w, view.h - y - L.c.height); }
      if (L.shimmer) {
        ctx.fillStyle = '#e6f8ff';
        for (let i = 0; i < 26; i++) {
          const sx = ((i * 97 + t * 10 * (1 + (i % 3))) % view.w);
          const sy = y + 154 + (i * 13) % 40;
          ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 2 + i));
          ctx.fillRect(Math.round(sx), Math.round(sy), 3 + (i % 4), 1);
        }
        ctx.globalAlpha = 1;
      }
      if (L.beams) {
        ctx.globalCompositeOperation = 'lighter';
        for (let x = Math.floor(ox); x < view.w + LAYER_W; x += LAYER_W) {
          L.beams.forEach((b, i) => {
            const bx = x + b.x, by = y + b.y;
            if (bx < -120 || bx > view.w + 120) return;
            const flick = Math.sin(t * 9 + i * 7) > -0.85 ? 1 : 0.2;
            ctx.globalAlpha = 0.35 * flick;
            ctx.fillStyle = b.col;
            ctx.beginPath(); ctx.arc(bx, by - 4, 14, 0, Math.PI * 2); ctx.globalAlpha = 0.12 * flick; ctx.fill();
            if (i % 2 === 0) {
              const ang = -Math.PI / 2 + Math.sin(t * 0.9 + i) * 0.7;
              const len = 200;
              ctx.globalAlpha = 0.08;
              ctx.beginPath();
              ctx.moveTo(bx, by);
              ctx.lineTo(bx + Math.cos(ang - 0.08) * len, by + Math.sin(ang - 0.08) * len);
              ctx.lineTo(bx + Math.cos(ang + 0.08) * len, by + Math.sin(ang + 0.08) * len);
              ctx.closePath();
              ctx.fill();
            }
          });
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      if (fog && L.fogAfter) {
        const fy = y + L.c.height - 70;
        const fo = -(((cam.x * (L.f + 0.04) + t * 12) % LAYER_W) + LAYER_W) % LAYER_W;
        ctx.globalAlpha = L.fogAfter * th.fog * 1.4;
        for (let x = Math.floor(fo); x < view.w; x += LAYER_W) ctx.drawImage(fog, x, fy);
        ctx.globalAlpha = 1;
      }
    }
  }

  /** Brouillard au premier plan (par-dessus le niveau). */
  drawForegroundFog(ctx, cam, view) {
    const { fog, th } = this.data;
    if (!fog || !th.fog) return;
    const fo = -(((cam.x * 1.15 + this.t * 25) % LAYER_W) + LAYER_W) % LAYER_W;
    ctx.globalAlpha = th.fog * 0.45;
    for (let x = Math.floor(fo); x < view.w; x += LAYER_W) ctx.drawImage(fog, x, view.h - 60);
    ctx.globalAlpha = 1;
  }
}
