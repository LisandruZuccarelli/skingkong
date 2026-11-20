// Vérificateur d'accessibilité des niveaux (sans navigateur).
// Calcule, sur la grille de tuiles, toutes les positions que Kong peut atteindre depuis le départ :
//   - « simple » : saut simple uniquement (+ ressorts, plateformes, télésièges, tyroliennes, sauts muraux) ;
//   - « double » : avec le double saut.
// Puis liste les forfaits, étoiles, clés, poutrelles et l'arrivée hors d'atteinte.
// Usage : node tools/levels/reach.mjs [ids...]   (code de sortie 1 si un élément est inaccessible même au double saut)
import { LEVELS } from '../../src/levels/index.js';
import { parseLevel } from '../../src/game/tilemap.js';

// Capacités (en tuiles) calibrées sur la physique (PHYS) : saut simple 3,85 t, double 6,5 t, course 150 px/s.
// rise = hauteur de surface gagnée ; reach(k) = écart de colonnes max pour une montée de k (k < 0 : chute).
const ABIL = {
  single: { rise: 3, item: 4, reach: (k) => (k <= 1 ? 6 : k === 2 ? 5 : 4) },
  double: { rise: 6, item: 7, reach: (k) => (k <= 2 ? 9 : k <= 4 ? 8 : k === 5 ? 7 : 5) },
  spring: { rise: 14, item: 15, reach: () => 6 },
};
const fallBonus = (k) => (k < 0 ? Math.min(6, Math.floor(-k / 2)) : 0);

export function analyse(L, debug = false) {
  const p = parseLevel(L);
  const { w, h } = p;
  const tile = (x, y) => {
    if (x < 0 || x >= w) return '#';
    if (y < 0) return p.tiles[x] === '#' ? '#' : '.';
    if (y >= h) return '.';
    return p.tiles[y * w + x];
  };
  const SOLID = new Set(['#', '=', 'x']);
  const SUPPORT = new Set(['#', '=', 'x', '-', '/', '\\', 'O']);
  const ents = p.entities;
  const spikes = new Set(ents.filter((e) => e.type === '^').map((e) => e.tx + ',' + e.ty));
  const free = (x, y) => y < h && !SOLID.has(tile(x, y)) && tile(x, y) !== 'w';
  const stand = (x, y) => free(x, y) && y + 1 < h && SUPPORT.has(tile(x, y + 1)) && !spikes.has(x + ',' + y);

  // Nœuds d'appui : sol statique + plateformes mobiles, ressorts, télésièges, tyroliennes.
  const nodes = new Map(); // "x,y" -> { x, y, kind }
  const add = (x, y, kind = 'ground') => { if (x >= 0 && x < w && y >= -40 && free(x, y) && !nodes.has(x + ',' + y)) nodes.set(x + ',' + y, { x, y, kind }); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (stand(x, y)) add(x, y);
  for (const e of ents) {
    if (e.type === 'M') for (let x = e.tx - 2; x <= e.tx + 4; x++) add(x, e.ty - 1, 'platform');
    if (e.type === 'V') for (let k = 0; k <= 4; k++) for (let x = e.tx; x <= e.tx + 2; x++) add(x, e.ty - 1 - k, 'platform');
    if (e.type === 'S') { nodes.delete(e.tx + ',' + e.ty); add(e.tx, e.ty, 'spring'); }
  }
  const pairs = (c) => {
    const a = ents.filter((e) => e.type === c).sort((m, n) => m.tx - n.tx);
    const out = [];
    for (let i = 0; i + 1 < a.length; i += 2) out.push([a[i], a[i + 1]]);
    return out;
  };
  const line = (a, b, dy, kind) => {
    for (let x = a.tx; x <= b.tx; x++) {
      const y = Math.round(a.ty + ((b.ty - a.ty) * (x - a.tx)) / Math.max(1, b.tx - a.tx)) + dy;
      add(x, y, kind);
    }
  };
  for (const [a, b] of pairs('t')) line(a, b, -1, 'lift');
  for (const [a, b] of pairs('z')) line(a, b, -1, 'zip');

  // Trajectoire en L (montée verticale, palier, descente) : toutes les cases traversées doivent être libres.
  const clearPath = (x, y, x2, y2) => {
    const top = Math.min(y, y2);
    for (let yy = y; yy >= top; yy--) if (!free(x, yy)) return false;
    const s = Math.sign(x2 - x);
    for (let xx = x; xx !== x2; xx += s) if (!free(xx + s, top)) return false;
    for (let yy = top; yy <= y2; yy++) if (!free(x2, yy)) return false;
    return true;
  };
  // Le chemin peut aussi passer plus haut (saut par-dessus un obstacle) : on essaie quelques paliers.
  const canGo = (n, x2, y2, ab, isItem) => {
    const k = n.y - y2;
    const lim = isItem ? ab.item : ab.rise;
    if (k > lim) return false;
    const dx = Math.abs(x2 - n.x);
    // Vent : porte le saut dans son sens, le raccourcit à contre-sens
    const zone = (L.wind || []).find((z) => n.x >= z[0] && n.x <= z[1]);
    const windB = !zone ? 0 : Math.sign(zone[2]) === Math.sign(x2 - n.x) ? Math.floor(Math.abs(zone[2]) / 60) : -Math.floor(Math.abs(zone[2]) / 120);
    if (dx > ab.reach(k) + fallBonus(k) + windB) return false;
    if (clearPath(n.x, n.y, x2, y2)) return true;
    for (let lift = 1; lift <= lim - Math.max(0, k); lift++) {
      const ay = Math.min(n.y, y2) - lift;
      let ok = true;
      for (let yy = n.y; yy >= ay && ok; yy--) ok = free(n.x, yy);
      const s = Math.sign(x2 - n.x);
      for (let xx = n.x; ok && xx !== x2; xx += s) ok = free(xx + s, ay);
      for (let yy = ay; ok && yy <= y2; yy++) ok = free(x2, yy);
      if (ok) return true;
    }
    return false;
  };

  const run = (mode) => {
    const walls = !mode.startsWith('n');
    mode = { nsingle: 'single', natural: 'double' }[mode] || mode;
    const start = [...nodes.values()].find((n) => n.x === p.start.tx && Math.abs(n.y - p.start.ty) <= 1)
      || { x: p.start.tx, y: p.start.ty, kind: 'ground' };
    const seen = new Set([start.x + ',' + start.y]);
    const q = [start];
    const byX = new Map();
    for (const m of nodes.values()) { if (!byX.has(m.x)) byX.set(m.x, []); byX.get(m.x).push(m); }
    const reached = [];
    let qi = 0;
    while (qi < q.length) {
      const n = q[qi++];
      reached.push(n);
      const ab = n.kind === 'spring' ? ABIL.spring : ABIL[mode];
      const visit = (m) => { const key = m.x + ',' + m.y; if (!seen.has(key)) { seen.add(key); q.push(m); } };
      for (let cx = n.x - 16; cx <= n.x + 16; cx++) for (const m of byX.get(cx) || []) {
        if (seen.has(m.x + ',' + m.y)) continue;
        if (Math.abs(m.x - n.x) > 16 || m.y - n.y > 40 || n.y - m.y > ab.rise) continue;
        if (canGo(n, m.x, m.y, ab, false)) visit(m);
      }
      // Contact avec un mur en plein saut (entrée d'un puits par-dessous, par exemple)
      if (walls) for (let x2 = n.x - 6; x2 <= n.x + 6; x2++) for (let y2 = n.y - ab.item; y2 <= n.y + 2; y2++) {
        if (y2 < -2 || seen.has(x2 + "," + y2) || !free(x2, y2)) continue;
        if (!SOLID.has(tile(x2 - 1, y2)) && !SOLID.has(tile(x2 + 1, y2))) continue;
        if (canGo(n, x2, y2, ab, true)) visit({ x: x2, y: y2, kind: 'wall' });
      }
      // Glace friable : elle cède sous Kong, qui tombe dans ce qu'il y a dessous.
      if (tile(n.x, n.y + 1) === 'x') {
        let yy = n.y + 1;
        while (yy < h && (tile(n.x, yy) === 'x' || free(n.x, yy))) { if (yy > n.y + 1 && stand(n.x, yy)) { visit({ x: n.x, y: yy, kind: 'ground' }); break; } yy++; }
      }
      // Saut mural : on remonte un mur tant qu'il continue, puis on peut prendre pied dessus.
      if (walls) for (const side of [-1, 1]) {
        if (!SOLID.has(tile(n.x + side, n.y)) && !SOLID.has(tile(n.x + side, n.y - 1))) continue;
        for (let yy = n.y - 1; yy > n.y - 60; yy--) {
          if (!free(n.x, yy)) break;
          if (!SOLID.has(tile(n.x + side, yy))) {
            if (free(n.x + side, yy)) visit({ x: n.x, y: yy, kind: 'wall' });
            break;
          }
          if (yy < -2) break;
          visit({ x: n.x, y: yy, kind: 'wall' });
        }
      }
    }
    return reached;
  };

  const res = {};
  for (const mode0 of ['nsingle', 'natural', 'single', 'double']) {
    const reached = run(mode0);
    const mode = { nsingle: 'single', natural: 'double' }[mode0] || mode0;
    const rX = new Map();
    for (const n of reached) { if (!rX.has(n.x)) rX.set(n.x, []); rX.get(n.x).push(n); }
    const near = (x2, y2, isItem) => [...Array(31).keys()].some((i) => (rX.get(x2 - 15 + i) || []).some((n) => {
      const ab = n.kind === 'spring' ? ABIL.spring : ABIL[mode];
      return canGo(n, x2, y2, ab, isItem);
    }));
    const items = ents.filter((e) => '$*KG'.includes(e.type)).filter((e) => !near(e.tx, e.ty, e.type !== 'G'));
    const girders = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (tile(x, y) === '-' && tile(x - 1, y) !== '-') {
        let x1 = x; while (tile(x1 + 1, y) === '-') x1++;
        let ok = false;
        for (let xx = x; xx <= x1 && !ok; xx++) ok = (rX.get(xx) || []).some((n) => n.y === y - 1);
        if (!ok) girders.push({ tx: x, ty: y, n: x1 - x + 1 });
      }
    }
    // Poutrelles « marche » : depuis une surface atteignable, se prennent-elles avec un saut simple ?
    const hard = [];
    if (mode0 === 'natural') for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (tile(x, y) !== '-' || tile(x - 1, y) === '-') continue;
      let x1 = x; while (tile(x1 + 1, y) === '-') x1++;
      let ok = false;
      for (let xx = x; xx <= x1 && !ok; xx++) for (let cx = xx - 6; cx <= xx + 6 && !ok; cx++) ok = (rX.get(cx) || []).some((n) => n.kind !== 'wall' && n.y !== y - 1 && canGo(n, xx, y - 1, n.kind === 'spring' ? ABIL.spring : ABIL.single, false));
      if (!ok) hard.push({ tx: x, ty: y });
    }
    res[mode0] = { items, girders, hard };
    if (debug && mode0 === 'natural') res.maxX = Math.max(...reached.map((n) => n.x));
  }
  return { p, res, reachedNatural: res.maxX };
}

const isMain = process.argv[1] && process.argv[1].endsWith('reach.mjs');
if (isMain) {
  const ids = process.argv.slice(2);
  let bad = 0;
  for (const L of LEVELS) {
    if (ids.length && !ids.includes(L.id)) continue;
    const { res } = analyse(L);
    const fmt = (e) => `${e.type || '-'}@${e.tx},${e.ty}`;
    const dbl = res.single.items.filter((e) => !res.double.items.includes(e));
    const dg = res.single.girders.filter((g) => !res.double.girders.some((d) => d.tx === g.tx && d.ty === g.ty));
    const line = [`${L.id}`];
    if (res.double.items.length) { bad++; line.push(`INACCESSIBLE: ${res.double.items.map(fmt).join(' ')}`); }
    if (res.double.girders.length) line.push(`poutrelles inaccessibles: ${res.double.girders.map((g) => `${g.tx},${g.ty}`).join(' ')}`);
    if (dbl.length) line.push(`double saut requis: ${dbl.map(fmt).join(' ')}`);
    if (dg.length) line.push(`poutrelles au double saut: ${dg.map((g) => `${g.tx},${g.ty}`).join(' ')}`);
    if (process.env.NATURAL) {
      const nat = res.natural.items.filter((e) => !res.double.items.includes(e));
      const ng = res.natural.hard.filter((g) => !res.double.girders.some((d) => d.tx === g.tx && d.ty === g.ty));
      if (nat.length) line.push(`escalade murale requise: ${nat.map(fmt).join(' ')}`);
      if (ng.length) line.push(`poutrelles hors saut simple: ${ng.map((g) => `${g.tx},${g.ty}`).join(' ')}`);
    }
    console.log(line.join('  |  '));
  }
  process.exit(bad ? 1 : 0);
}
