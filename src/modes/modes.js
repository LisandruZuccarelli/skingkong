// Modes bonus : chaque mode est un objet branché sur LevelScene (opts.mode) qui personnalise
// l'arrivée, les chutes, l'affichage et la navigation. Voir les hooks dans src/game/level.js.
import { LevelScene } from '../game/level.js';
import { LEVELS, WORLDS, getLevel } from '../levels/index.js';
import { generateLevel } from './generator.js';
import { utcDay } from '../online/rules.js';
import { THEME_ORDER } from '../game/themes.js';
import { drawText } from '../engine/font.js';
import { formatTime } from '../engine/util.js';
import { panel } from '../game/hud.js';
import { levelLong } from '../game/labels.js';

const T = 16;
const bonus = (g) => (g.save.bonus = g.save.bonus || {});
const hudBox = (ctx, v, lines, y = 50) => {
  const w = Math.max(...lines.map(([t]) => t.length)) * 6 + 16;
  panel(ctx, v.w - w - 6, y, w, lines.length * 10 + 6, 'rgba(10,13,36,0.8)', '#7ee8ff');
  lines.forEach(([t, c], i) => drawText(ctx, t, v.w - 14, y + 4 + i * 10, { align: 'right', color: c || '#ffffff' }));
};
const start = (g, data, mode) => g.goto(() => new LevelScene(g, data, { mode }));

// ---------------------------------------------------------------------------
// Speedrun : les 6 niveaux d'un monde d'affilée, chrono cumulé, temps intermédiaires
// ---------------------------------------------------------------------------
export function worldStages(n) { return WORLDS.find((w) => w.n === n).levels.filter((id) => !id.endsWith('B')); }
export function speedrunUnlocked(g, n) { return worldStages(n).every((id) => g.save.best[id]); }

export function startSpeedrun(g, world) {
  const run = { world, ids: worldStages(world), i: 0, splits: [] };
  start(g, getLevel(run.ids[0]), speedrunMode(g, run));
}
function speedrunMode(g, run) {
  const best = () => (bonus(g).speedrun || {})[run.world] || null;
  const done = () => run.splits.reduce((a, b) => a + b, 0);
  return {
    id: 'speedrun', ghostKey: run.ids[run.i], exitLabel: 'MODES BONUS',
    setup(lvl) { lvl.banners[0].title = `SPEEDRUN ${run.i + 1}/${run.ids.length}`; },
    hud(ctx, lvl, v) {
      const total = done() + lvl.time;
      const b = best();
      const lines = [[`TOTAL ${formatTime(total)}`, '#ffd23f']];
      if (b && b.splits[run.i] !== undefined) {
        const ref = b.splits.slice(0, run.i).reduce((a, x) => a + x, 0);
        const d = done() - ref;
        if (run.i > 0) lines.push([`${d <= 0 ? '-' : '+'}${Math.abs(d).toFixed(2)}`, d <= 0 ? '#5cff8a' : '#ff6b78']);
        lines.push([`RECORD ${formatTime(b.total)}`, '#9fb2ea']);
      }
      hudBox(ctx, v, lines);
    },
    onWin(lvl) {
      run.splits.push(lvl.time);
      if (lvl.assisted) run.assisted = true;
      const pr = g.progress;
      pr.earn(lvl.coins);
      const last = run.i === run.ids.length - 1;
      const total = done();
      const b = best();
      const lines = run.ids.map((id, i) => [`${levelLong(id)}   ${i < run.splits.length ? formatTime(run.splits[i]) : '--:--'}${b && b.splits[i] !== undefined && i < run.splits.length ? `  (${formatTime(b.splits[i])})` : ''}`, i === run.i ? '#ffffff' : '#9fb2ea']);
      if (last) {
        const record = !run.assisted && (!b || total < b.total);
        if (record) (bonus(g).speedrun = bonus(g).speedrun || {})[run.world] = { total, splits: run.splits.slice() };
        pr.inc('speedrunWins'); pr.check(); pr.flush();
        lvl.results = { custom: true, rating: 0, title: record ? 'NOUVEAU RECORD !' : 'MONDE TERMINE !', lines: [[`TEMPS TOTAL ${formatTime(total)}`, '#ffd23f', 2], ['', null], ...lines.map(([t, c]) => [t, c])], prompt: 'SAUT : MODES BONUS   R : RECOMMENCER LE MONDE' };
        // les lignes de temps intermédiaires prennent la place des étoiles
        lvl.results.lines.splice(1, 1);
      } else {
        lvl.results = { custom: true, rating: 0, title: `SPLIT ${run.i + 1}/${run.ids.length}`, lines: [[`TOTAL ${formatTime(total)}`, '#ffd23f', 2], ...lines], prompt: 'SAUT : NIVEAU SUIVANT   R : RECOMMENCER LE MONDE' };
      }
    },
    next() {
      if (run.i === run.ids.length - 1) { g.gotoBonus(); return; }
      run.i++;
      start(g, getLevel(run.ids[run.i]), speedrunMode(g, run));
    },
    restart() { startSpeedrun(g, run.world); return false; },
    exit() { g.gotoBonus(); },
  };
}

// ---------------------------------------------------------------------------
// Infini : piste générée sans fin, avalanche qui accélère, une seule vie
// ---------------------------------------------------------------------------
export function infiniteLevel(seed) {
  const gen = generateLevel({ seed, length: 4000, checkpoints: 0, finish: false, maxCoins: Infinity, ramp: 900 });
  return {
    id: 'INF', label: 'INFINI', name: 'Fuis l\'avalanche !', theme: THEME_ORDER[seed % THEME_ORDER.length],
    height: gen.height, parTime: 9999, endless: true, chunks: gen.chunks, signs: [], avalanche: { speed: 105, lag: 300, accel: 1.5 },
  };
}
export function startInfinite(g, seed = (Date.now() >>> 0) % 100000) { start(g, infiniteLevel(seed), infiniteMode(g, seed)); }
function infiniteMode(g, seed) {
  let x0 = 0;
  const dist = (lvl) => Math.max(0, Math.floor((lvl.player.cx - x0) / T));
  return {
    id: 'infinite', ghostKey: null, exitLabel: 'MODES BONUS',
    setup(lvl) { x0 = lvl.player.cx; lvl.maxDist = 0; },
    update(lvl, dt) {
      if (lvl.player.dead || lvl.over) return;
      lvl.maxDist = Math.max(lvl.maxDist, dist(lvl));
      // l'avalanche accélère sans cesse
      if (lvl.avalanche && lvl.avalanche.active) lvl.avalanche.speed = Math.min(215, 105 + lvl.time * 1.1);
    },
    onDeath(lvl, cause) {
      const d = lvl.maxDist;
      const pr = g.progress;
      const b = bonus(g);
      const record = !lvl.assisted && d > (b.infinite || 0);
      if (record) b.infinite = d;
      const reward = lvl.coins + Math.floor(d / 25);
      pr.earn(reward);
      pr.max('bestDistance', d);
      pr.inc('infiniteRuns');
      pr.check(); pr.flush();
      g.persist();
      const why = { avalanche: 'RATTRAPE PAR L\'AVALANCHE', water: 'TOMBE DANS L\'EAU GLACEE' }[cause] || 'CHUTE !';
      lvl.endRun({
        title: record ? 'NOUVEAU RECORD !' : 'FIN DE LA COURSE',
        titleColor: record ? '#ffd23f' : '#ff8a9a',
        lines: [[why, '#ff8a9a'], [`${d} M`, '#ffffff', 3], ['', null], [`RECORD : ${b.infinite} M`, '#9fb2ea'], [`TEMPS ${formatTime(lvl.time)}   FORFAITS ${lvl.coins}`, '#cfe0ff'], [`+${reward} FORFAITS`, '#ffc83d']],
        prompt: 'SAUT / R : NOUVELLE COURSE   ECHAP : MODES BONUS',
      });
    },
    hud(ctx, lvl, v) { hudBox(ctx, v, [[`${lvl.maxDist || 0} M`, '#ffd23f'], [`RECORD ${bonus(g).infinite || 0} M`, '#9fb2ea']]); },
    next() { startInfinite(g); },
    restart() { startInfinite(g); return false; },
    exit() { g.gotoBonus(); },
  };
}

// ---------------------------------------------------------------------------
// Défi : un niveau déjà terminé avec des contraintes, récompense multipliée
// ---------------------------------------------------------------------------
export const MODS = [
  { id: 'onelife', name: 'UNE SEULE VIE', desc: 'La moindre chute met fin au defi.' },
  { id: 'nodouble', name: 'SANS DOUBLE SAUT', desc: 'Le double saut est desactive.' },
  { id: 'dark', name: 'NUIT NOIRE', desc: 'On n\'y voit presque rien.' },
  { id: 'turbo', name: 'TURBO', desc: 'Tout va 30 % plus vite.' },
];
export const challengeReward = (mods, coins = 0) => Math.round(coins * (1 + mods.length * 0.5) + 40 * mods.length);

export function startChallenge(g, levelId, mods) { start(g, getLevel(levelId), challengeMode(g, levelId, mods)); }
function challengeMode(g, levelId, mods) {
  const has = (m) => mods.includes(m);
  const key = levelId + ':' + mods.slice().sort().join('+');
  const fail = (lvl) => {
    g.progress.flush();
    lvl.endRun({ title: 'DEFI RATE', titleColor: '#ff8a9a', lines: [['UNE SEULE VIE : TU ES TOMBE !', '#ff8a9a'], ['', null], [mods.map((m) => MODS.find((x) => x.id === m).name).join(' + '), '#9fb2ea']], prompt: 'SAUT / R : REESSAYER   ECHAP : MODES BONUS' });
  };
  return {
    id: 'challenge', ghostKey: null, exitLabel: 'MODES BONUS', speed: has('turbo') ? 1.3 : 0, mods,
    setup(lvl) {
      lvl.banners[0].title = 'DEFI : ' + levelLong(levelId);
      lvl.banners[0].sub = mods.map((m) => MODS.find((x) => x.id === m).name).join(' + ') || 'SANS CONTRAINTE';
      if (has('nodouble')) lvl.player.canDouble = false;
      if (has('dark')) lvl.darkAmount = 0.9;
    },
    onDeath(lvl) { if (has('onelife')) fail(lvl); },
    next(lvl) { if (lvl.over) startChallenge(g, levelId, mods); else g.gotoBonus(); },
    onWin(lvl) {
      const pr = g.progress;
      const reward = challengeReward(mods, lvl.coins);
      pr.earn(reward);
      pr.inc('challengeWins'); pr.max('challengeMax', mods.length);
      const b = (bonus(g).challenges = bonus(g).challenges || {});
      const record = !lvl.assisted && (!b[key] || lvl.time < b[key]);
      if (record) b[key] = lvl.time;
      pr.check(); pr.flush();
      lvl.results = { custom: true, rating: 0, title: 'DEFI REUSSI !', lines: [[formatTime(lvl.time), '#ffffff', 2], [record ? 'MEILLEUR TEMPS POUR CE DEFI !' : `MEILLEUR TEMPS : ${formatTime(b[key])}`, record ? '#ffd23f' : '#9fb2ea'], ['', null], [mods.map((m) => MODS.find((x) => x.id === m).name).join(' + ') || 'SANS CONTRAINTE', '#7ee8ff'], [`CHUTES ${lvl.deaths}   FORFAITS ${lvl.coins}`, '#cfe0ff'], [`+${reward} FORFAITS`, '#ffc83d']], prompt: 'SAUT : MODES BONUS   R : REJOUER' };
    },
    restart() { startChallenge(g, levelId, mods); return false; },
    exit() { g.gotoBonus(); },
  };
}

// ---------------------------------------------------------------------------
// Niveau du jour : piste générée, la même pour tout le monde, classement du jour
// ---------------------------------------------------------------------------
export function dailyLevel(day) {
  const gen = generateLevel({ seed: day * 7919 + 13, length: 230, checkpoints: 75, finish: true, maxCoins: 80, ramp: 260 });
  const d = new Date(day * 86400000);
  const date = `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
  return { id: 'DAY', label: 'NIVEAU DU JOUR', name: `Piste du ${date}`, theme: THEME_ORDER[day % THEME_ORDER.length], height: gen.height, parTime: Math.round(gen.width / 6), chunks: gen.chunks, signs: [], coins: gen.coins };
}
export function startDaily(g) { const day = utcDay(); start(g, dailyLevel(day), dailyMode(g, day)); }
function dailyMode(g, day) {
  return {
    id: 'daily', ghostKey: 'DAY-' + day, exitLabel: 'MODES BONUS',
    hud(ctx, lvl, v) { const b = (bonus(g).daily || {}); if (b.day === day) hudBox(ctx, v, [[`MEILLEUR ${formatTime(b.time)}`, '#9fb2ea']]); },
    onWin(lvl) {
      const pr = g.progress;
      const b = bonus(g);
      const first = !b.daily || b.daily.day !== day;
      const record = !lvl.assisted && (first || lvl.time < b.daily.time);
      if (record) b.daily = { day, time: lvl.time };
      const reward = lvl.coins + (first ? 40 : 0);
      pr.earn(reward);
      if (first) pr.inc('dailyWins');
      pr.check(); pr.flush();
      lvl.results = { custom: true, rating: 0, title: record ? 'MEILLEUR TEMPS DU JOUR !' : 'ARRIVEE !', lines: [[formatTime(lvl.time), '#ffffff', 2], [b.daily && b.daily.day === day ? `TON MEILLEUR AUJOURD'HUI : ${formatTime(b.daily.time)}` : 'MODE ASSISTE : TEMPS NON RETENU', '#9fb2ea'], ['', null], [`CHUTES ${lvl.deaths}   FORFAITS ${lvl.coins}/${lvl.totalCoins}`, '#cfe0ff'], [`+${reward} FORFAITS${first ? ' (DONT 40 DE BONUS DU JOUR)' : ''}`, '#ffc83d'], ['UNE NOUVELLE PISTE CHAQUE JOUR A MINUIT (UTC)', '#7f8cc8']], prompt: 'SAUT : MODES BONUS   R : REJOUER' };
      const on = g.online;
      if (lvl.assisted) lvl.results.online = { msg: 'MODE ASSISTE : HORS CLASSEMENT' };
      else if (on && on.user && !g.probe) {
        lvl.results.online = { msg: 'ENVOI AU CLASSEMENT DU JOUR...' };
        on.submit({ level: 'DAY', time: lvl.time, coins: lvl.coins, deaths: lvl.deaths }).then((r) => {
          lvl.results.online = r.error ? { msg: r.error.toUpperCase() } : { msg: `CLASSEMENT DU JOUR : ${r.rank}${r.rank === 1 ? 'ER' : 'E'} SUR ${r.of}` };
        });
      } else if (on && !on.user) lvl.results.online = { msg: 'CONNECTE-TOI POUR LE CLASSEMENT DU JOUR' };
    },
    next() { g.gotoBonus(); },
    exit() { g.gotoBonus(); },
  };
}

// ---------------------------------------------------------------------------
// Test d'un niveau de l'éditeur
// ---------------------------------------------------------------------------
export function startCustom(g, data, back) { start(g, data, customMode(g, data, back)); }
function customMode(g, data, back) {
  return {
    id: 'custom', ghostKey: null, exitLabel: 'RETOUR A L\'EDITEUR',
    onWin(lvl) {
      g.progress.inc('customWins'); g.progress.check(); g.progress.flush();
      lvl.results = { custom: true, rating: 0, title: 'NIVEAU TERMINE !', lines: [[formatTime(lvl.time), '#ffffff', 2], ['', null], [`CHUTES ${lvl.deaths}   FORFAITS ${lvl.coins}/${lvl.totalCoins}`, '#cfe0ff'], ['TON NIVEAU EST FAISABLE : PARTAGE-LE !', '#5cff8a']], prompt: 'SAUT : RETOUR A L\'EDITEUR   R : REJOUER' };
    },
    next() { back(); },
    exit() { back(); },
  };
}

export { LEVELS };
