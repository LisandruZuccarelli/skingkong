// Logo SkingKong pré-rendu : lettres de glace en dégradé, neige sur le dessus, étoile dans le O, contour, reflet animé.
import { makeCanvas } from '../engine/util.js';
import { normalize } from '../engine/font.js';

const GLYPH_ROWS = {
  S: ['01111', '11000', '11000', '01110', '00011', '00011', '11110'],
  K: ['11011', '11011', '11110', '11100', '11110', '11011', '11011'],
  I: ['11111', '01110', '01110', '01110', '01110', '01110', '11111'],
  N: ['11001', '11101', '11101', '11111', '10111', '10111', '10011'],
  G: ['01111', '11000', '11000', '11011', '11001', '11001', '01111'],
  O: ['01110', '11011', '11011', '11011', '11011', '11011', '01110'],
};

const PX = 4;

export function buildLogo() {
  const word = ['SKING', 'KONG'];
  const letterW = 5 * PX, gap = PX + 1, wordGap = PX * 4;
  const letters = word[0].length + word[1].length;
  const W = letters * (letterW + gap) + wordGap + 16;
  const Hh = 7 * PX + 22;
  const [mask, mg] = makeCanvas(W, Hh);
  const ox = 8, oy = 10;
  let x = ox;
  const oPos = [];
  word.forEach((wd, wi) => {
    for (const ch of normalize(wd)) {
      const rows = GLYPH_ROWS[ch];
      rows.forEach((r, ry) => { for (let rx = 0; rx < 5; rx++) if (r[rx] === '1') { mg.fillStyle = '#fff'; mg.fillRect(x + rx * PX, oy + ry * PX, PX, PX); } });
      if (ch === 'O' && wi === 1) oPos.push(x);
      x += letterW + gap;
    }
    x += wordGap - gap;
  });
  // arrondis légers
  const data = mg.getImageData(0, 0, W, Hh);
  const on = (px, py) => px >= 0 && py >= 0 && px < W && py < Hh && data.data[(py * W + px) * 4 + 3] > 0;

  const [logo, g] = makeCanvas(W, Hh);
  // ombre portée / relief
  for (let d = 6; d >= 1; d--) {
    for (let py = 0; py < Hh; py++) for (let px = 0; px < W; px++) {
      if (!on(px, py - d)) continue;
      g.fillStyle = d > 3 ? '#0d1f66' : '#1a3fb0';
      g.fillRect(px, py, 1, 1);
    }
  }
  // contour
  for (let py = 0; py < Hh; py++) for (let px = 0; px < W; px++) {
    if (on(px, py)) continue;
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3 && on(px + dx, py + dy)) { near = true; break; }
    if (near) { g.fillStyle = '#0a0d24'; g.fillRect(px, py, 1, 1); }
  }
  // remplissage dégradé glace
  const grad = ['#ffffff', '#eafaff', '#cdf2ff', '#aee6ff', '#8fd6ff', '#6fc2fb', '#58aef4', '#4a9cec'];
  for (let py = 0; py < Hh; py++) for (let px = 0; px < W; px++) {
    if (!on(px, py)) continue;
    const k = Math.min(grad.length - 1, Math.max(0, Math.floor(((py - oy) / (7 * PX)) * grad.length)));
    g.fillStyle = grad[k];
    g.fillRect(px, py, 1, 1);
    if (!on(px - 1, py) || !on(px, py - 1)) { g.fillStyle = '#ffffff'; g.fillRect(px, py, 1, 1); }
    if (!on(px + 1, py) || !on(px, py + 1)) { g.fillStyle = '#3b86d8'; g.fillRect(px, py, 1, 1); }
  }
  // neige qui coule sur le haut des lettres
  for (let px = 0; px < W; px++) {
    for (let py = 0; py < Hh; py++) {
      if (!on(px, py)) continue;
      if (!on(px, py - 1)) {
        const drip = ((px * 37) % 11) < 3 ? 3 + ((px * 13) % 3) : 2;
        g.fillStyle = '#0a0d24'; g.fillRect(px, py - 2, 1, 1);
        g.fillStyle = '#ffffff'; g.fillRect(px, py - 1, 1, drip);
        g.fillStyle = '#c9d8f5'; g.fillRect(px, py - 1 + drip, 1, 1);
      }
      break;
    }
  }
  // étoile dans le O de KONG
  for (const x0 of oPos) {
    const cx = x0 + letterW / 2, cy = oy + 3.5 * PX;
    g.fillStyle = '#0a0d24';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 2.6 : 6;
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath(); g.fill();
    g.fillStyle = '#ffd23f';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 1.6 : 4.2;
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath(); g.fill();
  }
  const [shine, sg] = makeCanvas(W, Hh);
  return { canvas: logo, mask, shine, shineG: sg, w: W, h: Hh };
}

/** Dessine le logo avec un reflet diagonal qui balaie les lettres. */
export function drawLogo(ctx, logo, x, y, scale, t) {
  ctx.drawImage(logo.canvas, Math.round(x), Math.round(y), logo.w * scale, logo.h * scale);
  const period = 3.2;
  const k = (t % period) / period;
  if (k < 0.45) {
    const sg = logo.shineG;
    sg.globalCompositeOperation = 'source-over';
    sg.clearRect(0, 0, logo.w, logo.h);
    sg.drawImage(logo.mask, 0, 0);
    sg.globalCompositeOperation = 'source-in';
    const sx = -40 + (k / 0.45) * (logo.w + 80);
    sg.fillStyle = 'rgba(255,255,255,0.85)';
    sg.beginPath();
    sg.moveTo(sx, 0); sg.lineTo(sx + 10, 0); sg.lineTo(sx - 10, logo.h); sg.lineTo(sx - 20, logo.h);
    sg.closePath(); sg.fill();
    ctx.drawImage(logo.shine, Math.round(x), Math.round(y), logo.w * scale, logo.h * scale);
  }
}
