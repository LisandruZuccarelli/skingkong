// Partage du score : une image (format story / post 1080×1350) avec le temps, Kong et le QR code du jeu,
// envoyée au menu de partage du téléphone (Instagram, WhatsApp...) ou téléchargée sur ordinateur.
import { drawText, measure } from '../engine/font.js';
import { drawHatRows } from './catalog.js';
import { buildLogo } from './logo.js';

let gameLogo = null;

export const GAME_URL = 'https://skingkong.estp-ski.workers.dev';
const W = 1080, H = 1350;

const imgs = {};
function load(name, src) {
  if (typeof Image === 'undefined') return null;
  if (!imgs[name]) { const i = new Image(); i.src = src; imgs[name] = i; }
  return imgs[name];
}
/** Précharge le logo et le QR code (le partage doit partir vite après l'appui : activation utilisateur). */
export function preloadShare() { load('qr', './qr.png'); }
const ready = (i) => i && i.complete && i.naturalWidth > 0;
const waitImg = (i) => (!i || ready(i) ? Promise.resolve() : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 1500); }));

/** Dessine la carte. card : { head, big, lines: [[texte, couleur]], pseudo } */
export function drawCard(game, card) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#1a2a8a'); grd.addColorStop(0.55, '#0e1650'); grd.addColorStop(1, '#0a0d24');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  // neige
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 140; i++) { const z = 3 + Math.floor(rnd() * 3) * 3; ctx.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * H), z, z); }
  // montagne
  ctx.fillStyle = '#2456b8';
  ctx.beginPath(); ctx.moveTo(0, 900); ctx.lineTo(260, 700); ctx.lineTo(520, 860); ctx.lineTo(800, 640); ctx.lineTo(W, 820); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  ctx.fillStyle = '#eef6ff';
  ctx.beginPath(); ctx.moveTo(0, 1000); ctx.lineTo(W, 900); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  // logo
  const logo = gameLogo || (gameLogo = buildLogo());
  const ls = Math.floor(940 / logo.w);
  ctx.drawImage(logo.canvas, Math.round((W - logo.w * ls) / 2), 60, logo.w * ls, logo.h * ls);
  // en-tête : niveau / mode
  drawText(ctx, card.head, W / 2, 380, { align: 'center', scale: 5, color: '#cfe0ff', outline: '#0a0d24' });
  // le score
  drawText(ctx, card.big, W / 2, 450, { align: 'center', scale: 16, color: '#ffd23f', outline: '#0a0d24', outlineWidth: 6 });
  (card.lines || []).forEach(([t, col], i) => drawText(ctx, t, W / 2, 610 + i * 52, { align: 'center', scale: 5, color: col || '#ffffff', outline: '#0a0d24' }));
  // Kong
  const k = game.sprites.kong.win, ks = 14;
  const kx = 90, ky = 1010 - k.height * ks;
  ctx.drawImage(k, kx, ky, k.width * ks, k.height * ks);
  if (game.look && game.look.hat) drawHatRows(ctx, game.look.hat, kx, ky, ks);
  if (card.pseudo) drawText(ctx, card.pseudo.toUpperCase(), kx + k.width * ks / 2, 1030, { align: 'center', scale: 4, color: '#0a0d24' });
  // appel à l'action + QR
  const qr = load('qr', './qr.png');
  const q = 330, qx = W - q - 70, qy = H - q - 140;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(qx - 18, qy - 18, q + 36, q + 36);
  if (ready(qr)) ctx.drawImage(qr, qx, qy, q, q);
  drawText(ctx, 'BATS MON TEMPS !', 90, 1130, { align: 'left', scale: 6, color: '#0a0d24', shadow: null });
  drawText(ctx, 'SCANNE ET JOUE', 90, 1200, { align: 'left', scale: 4, color: '#2456b8', shadow: null });
  drawText(ctx, GAME_URL.replace('https://', '').toUpperCase(), W / 2, H - 70, { align: 'center', scale: 3, color: '#0a0d24', shadow: null });
  drawText(ctx, 'LISTE SKI ESTP CACHAN 2027', W / 2, H - 40, { align: 'center', scale: 2, color: '#2456b8', shadow: null });
  return c;
}

/** Image d'aperçu des liens (Google, WhatsApp, réseaux) : 1200×630, générée une fois puis publiée en public/og.png. */
export function drawOgCard(game) {
  const OW = 1200, OH = 630;
  const c = document.createElement('canvas'); c.width = OW; c.height = OH;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const grd = ctx.createLinearGradient(0, 0, 0, OH);
  grd.addColorStop(0, '#1a2a8a'); grd.addColorStop(0.6, '#0e1650'); grd.addColorStop(1, '#0a0d24');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, OW, OH);
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 90; i++) { const z = 3 + Math.floor(rnd() * 3) * 3; ctx.fillRect(Math.floor(rnd() * OW), Math.floor(rnd() * OH), z, z); }
  ctx.fillStyle = '#2456b8';
  ctx.beginPath(); ctx.moveTo(0, 470); ctx.lineTo(260, 360); ctx.lineTo(560, 450); ctx.lineTo(880, 330); ctx.lineTo(OW, 430); ctx.lineTo(OW, OH); ctx.lineTo(0, OH); ctx.fill();
  ctx.fillStyle = '#eef6ff';
  ctx.beginPath(); ctx.moveTo(0, 540); ctx.lineTo(OW, 500); ctx.lineTo(OW, OH); ctx.lineTo(0, OH); ctx.fill();
  const logo = gameLogo || (gameLogo = buildLogo());
  const ls = Math.floor(760 / logo.w);
  ctx.drawImage(logo.canvas, Math.round(OW - 60 - logo.w * ls), 70, logo.w * ls, logo.h * ls);
  const k = game.sprites.kong.win, ks = 16;
  const kx = 80, ky = 540 - k.height * ks;
  ctx.drawImage(k, kx, ky, k.width * ks, k.height * ks);
  const tx = Math.min(OW - 60 - (logo.w * ls) / 2, OW - 50 - measure('JEU DE PLATEFORME GRATUIT', 4) / 2);
  drawText(ctx, 'JEU DE PLATEFORME GRATUIT', tx, 70 + logo.h * ls + 40, { align: 'center', scale: 4, color: '#ffd23f', outline: '#0a0d24' });
  drawText(ctx, 'DANS TON NAVIGATEUR', tx, 70 + logo.h * ls + 84, { align: 'center', scale: 4, color: '#ffffff', outline: '#0a0d24' });
  drawText(ctx, 'LISTE SKI ESTP CACHAN 2027', OW / 2, OH - 50, { align: 'center', scale: 4, color: '#2456b8', shadow: null });
  return c;
}

/** Partage (ou téléchargement) de la carte ; renvoie un message court pour l'écran. */
export async function shareCard(game, card) {
  await waitImg(load('qr', './qr.png'));
  const c = drawCard(game, card);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  if (!blob) return 'PARTAGE IMPOSSIBLE';
  const file = typeof File !== 'undefined' ? new File([blob], 'skingkong-score.png', { type: 'image/png' }) : null;
  const text = `${card.head} : ${card.big} sur SkingKong ! Bats mon temps :`;
  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'SkingKong', text: `${text} ${GAME_URL}` });
      return 'PARTAGE !';
    }
  } catch (e) { if (e && e.name === 'AbortError') return 'PARTAGE ANNULE'; }
  // ordinateur : on télécharge l'image
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'skingkong-score.png';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'IMAGE ENREGISTREE';
}
