// Premier essai : à la toute première visite, on joue tout de suite (pas de menu, pas de compte).
// Une mini piste en ligne droite : avancer, sauter un pic (appel à l'action), puis la porte « ACCEDER A SKINGKONG ».
import { LevelScene } from '../game/level.js';
import { TitleScene } from '../game/title.js';
import { drawText } from '../engine/font.js';

const T = 16;
const W = 36;
const START = 4, SPIKE = 14, DOOR = 25;

function row(fill, put = {}) {
  let s = '';
  for (let x = 0; x < W; x++) s += put[x] || (x < 2 || x >= W - 2 ? '#' : fill);
  return s;
}
export const FIRST_RUN_LEVEL = (() => {
  const rows = [];
  for (let y = 0; y < 14; y++) rows.push(row('.'));
  rows.push(row('.', { [START]: 'P', [SPIKE]: '^', [DOOR]: 'G' }));
  for (let y = 0; y < 3; y++) rows.push(row('#'));
  return { id: 'FIRST', label: 'BIENVENUE', name: 'Premier essai', theme: 'dawn', height: 18, parTime: 30, chunks: [rows.join('\n')], signs: [] };
})();

/** Le joueur n'a encore rien fait : ni premier essai, ni niveau terminé. */
export function needsFirstRun(save) {
  return !save.firstRunDone && !Object.keys(save.best || {}).length;
}

export function startFirstRun(game) {
  game.scene = new LevelScene(game, FIRST_RUN_LEVEL, { mode: firstRunMode(game) });
}

function finish(g) {
  g.save.firstRunDone = true;
  g.persist();
  g.goto(() => new TitleScene(g));
}

const isTouch = (g) => g.input.touchMode || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);

function firstRunMode(g) {
  let leaving = false;
  return {
    id: 'firstrun', ghostKey: null, hideHud: true, noShare: true, exitLabel: 'PASSER',
    setup(lvl) { lvl.banners = []; lvl.player.canDouble = false; },
    onWin(lvl) { lvl.results = { custom: true, rating: 0, title: 'BIENVENUE !', lines: [] }; },
    update(lvl) {
      if (!leaving && lvl.state === 'won' && lvl.stateT > 1.1) { leaving = true; finish(g); }
    },
    next() { if (!leaving) { leaving = true; finish(g); } },
    exit() { if (!leaving) { leaving = true; finish(g); } },
    restart() { return this; },
    hud(ctx, lvl, v) {
      const cam = lvl.camera, p = lvl.player, t = g.time;
      const sx = (wx) => (wx - cam.left) * cam.zoom;
      const sy = (wy) => (wy - cam.top) * cam.zoom;
      const groundY = 15 * T;
      const touch = isTouch(g);
      const pulse = 1 + Math.round((Math.sin(t * 7) + 1) / 2);
      // 1) avancer
      if (p.cx < (START + 3) * T && lvl.state === 'play') {
        const a = Math.sin(t * 6) * 3;
        const ax = sx((START + 4) * T);
        drawText(ctx, 'AVANCE →', ax + a, sy(groundY - 60), { align: 'center', scale: 2, color: '#ffffff', outline: '#0a0d24' });
        drawText(ctx, touch ? 'MAINTIENS LA FLECHE DROITE' : 'FLECHE DROITE OU D', ax, sy(groundY - 40), { align: 'center', color: '#cfe0ff', outline: '#0a0d24' });
      }
      // 2) appel à l'action : sauter le pic
      if (p.cx < (SPIKE + 1) * T && p.cx > (START + 1) * T && lvl.state === 'play') {
        const cx = sx(SPIKE * T + 8);
        drawText(ctx, 'SAUTE !', cx, sy(groundY - 70), { align: 'center', scale: 2 + pulse - 1, color: '#ffc83d', outline: '#0a0d24' });
        drawText(ctx, touch ? 'TOUCHE LE BOUTON SAUT' : 'ESPACE OU ↑', cx, sy(groundY - 38), { align: 'center', color: '#ffffff', outline: '#0a0d24' });
        drawText(ctx, '↓', cx, sy(groundY - 28) + Math.sin(t * 8) * 2, { align: 'center', scale: 2, color: '#ff4f5e', outline: '#0a0d24' });
      }
      // 3) la porte du jeu
      const dx = sx(DOOR * T + 8);
      const glow = Math.sin(t * 4) > 0 ? '#ffd23f' : '#ffffff';
      const bob = Math.round(Math.sin(t * 3) * 2);
      drawText(ctx, 'ACCEDER A', dx, sy(groundY - 98) + bob, { align: 'center', color: '#ffffff', outline: '#0a0d24' });
      drawText(ctx, 'SKINGKONG', dx, sy(groundY - 86) + bob, { align: 'center', scale: 2, color: glow, outline: '#0a0d24' });
      drawText(ctx, '↓', dx, sy(groundY - 66) + Math.sin(t * 5) * 2, { align: 'center', scale: 2, color: '#ffc83d', outline: '#0a0d24' });
      // passer
      drawText(ctx, touch ? '' : 'ECHAP : PASSER', v.w - 8, 8, { align: 'right', color: '#9fb2ea', outline: '#0a0d24' });
    },
  };
}
