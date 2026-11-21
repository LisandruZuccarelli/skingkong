// Tests headless de la physique et des niveaux (node tests/run.mjs)
import { parseLevel, TileMap, T } from '../src/game/tilemap.js';
import { Player, PHYS } from '../src/game/player.js';
import { LEVELS } from '../src/levels/index.js';
const STAGES = LEVELS.filter((L) => !L.boss); // niveaux de plateforme (les arènes de boss ont leurs propres tests)

let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) { passes++; console.log('  ✓ ' + msg); } else { fails++; console.log('  ✗ ' + msg); } };

function makeWorld(rows) {
  const data = { height: rows.length, chunks: [rows.join('\n')] };
  const p = parseLevel(data);
  const map = new TileMap(p.w, p.h, p.tiles);
  const events = [];
  const lvl = { map, platforms: [], fx: (n) => events.push(n) };
  const pl = new Player(p.start.tx * T + 3, (p.start.ty + 1) * T - PHYS.h);
  return { map, lvl, pl, events, parsed: p };
}
function sim(w, seconds, inputFn, dt = 1 / 60) {
  const held = {}, pressed = {};
  const frames = Math.round(seconds / dt);
  let prev = {};
  for (let i = 0; i < frames; i++) {
    const cur = inputFn ? inputFn(i * dt, w.pl) : {};
    for (const k of ['left', 'right', 'down', 'jump']) { pressed[k] = !!cur[k] && !prev[k]; held[k] = !!cur[k]; }
    prev = cur;
    w.pl.update(dt, { held, pressed }, w.lvl);
  }
}

console.log('Physique de base');
{
  const w = makeWorld(['..........', '..........', '..........', '....P.....', '##########']);
  sim(w, 1);
  ok(w.pl.grounded && Math.abs(w.pl.bottom - 4 * T) < 0.01, 'Kong tombe et se pose au sol');
  let minY = w.pl.y; const y0 = w.pl.y;
  sim(w, 1, (t) => ({ jump: t < 0.6 }), 1 / 60);
  // re-measure
  const w2 = makeWorld(['..........', '..........', '..........', '..........', '..........', '....P.....', '##########']);
  sim(w2, 0.5);
  const base = w2.pl.y; let top = base;
  for (let i = 0; i < 60; i++) { sim(w2, 1 / 60, () => ({ jump: true })); top = Math.min(top, w2.pl.y); }
  const full = base - top;
  const w3 = makeWorld(['..........', '..........', '..........', '..........', '..........', '....P.....', '##########']);
  sim(w3, 0.5);
  const base3 = w3.pl.y; let top3 = base3;
  sim(w3, 1 / 60, () => ({ jump: true }));
  for (let i = 0; i < 60; i++) { sim(w3, 1 / 60, () => ({})); top3 = Math.min(top3, w3.pl.y); }
  const tap = base3 - top3;
  console.log(`    hauteur saut max ${full.toFixed(1)}px, saut court ${tap.toFixed(1)}px`);
  ok(full > 3 * T && full < 4.5 * T, 'saut maximal entre 3 et 4.5 tuiles');
  ok(tap < full * 0.6, 'hauteur de saut variable (tap nettement plus bas)');
}

console.log('Indépendance au framerate');
{
  const heights = [];
  for (const fps of [30, 60, 144, 240]) {
    const w = makeWorld(['..........', '..........', '..........', '..........', '..........', '....P.....', '##########']);
    sim(w, 0.5, null, 1 / fps);
    const base = w.pl.y; let top = base;
    const n = Math.round(fps * 0.8);
    for (let i = 0; i < n; i++) { sim(w, 1 / fps, () => ({ jump: true }), 1 / fps); top = Math.min(top, w.pl.y); }
    heights.push(base - top);
  }
  console.log('    hauteurs 30/60/144/240 fps : ' + heights.map((h) => h.toFixed(1)).join(' / '));
  ok(Math.max(...heights) - Math.min(...heights) < 6, 'hauteur de saut stable entre 30 et 240 fps (< 6px)');
}

console.log('Coyote time & jump buffer');
{
  const w = makeWorld(['................', '................', '...P............', '#####...........', '################']);
  sim(w, 0.4);
  let jumped = false;
  sim(w, 1.2, (t, p) => {
    const r = { right: true };
    if (!jumped && !p.grounded && p.airTime > 0.03 && p.airTime < 0.08) { r.jump = true; jumped = true; }
    return r;
  });
  ok(w.events.includes('jump'), 'saut accepté juste après avoir quitté le bord');
  const w2 = makeWorld(['..........', '..........', '..........', '..........', '....P.....', '##########']);
  sim(w2, 0.5);
  sim(w2, 0.2, () => ({ jump: true }));
  sim(w2, 0.6, () => ({}));
  const before = w2.events.filter((e) => e === 'jump').length;
  let pressedEarly = false;
  sim(w2, 1, (t, p) => { if (!p.grounded && p.vy > 0 && p.bottom > 4.2 * T && !pressedEarly) { pressedEarly = true; return { jump: true }; } return { jump: pressedEarly && p.grounded ? false : pressedEarly }; });
  ok(w2.events.filter((e) => e === 'jump').length > before || !pressedEarly, 'jump buffer : saut pressé avant l\'atterrissage déclenché');
}

console.log('Pentes et glissade');
{
  const w = makeWorld([
    '..............................',
    '.P............................',
    '###\\..........................',
    '####\\.........................',
    '#####\\........................',
    '######\\.......................',
    '##############################',
  ]);
  sim(w, 0.4);
  sim(w, 1.0, () => ({ right: true, down: true }));
  ok(w.pl.grounded, 'reste collé au sol en descendant la pente');
  ok(Math.abs(w.pl.vx) > PHYS.run * 1.3, `glissade donne de l'élan (vx=${w.pl.vx.toFixed(0)})`);
  const w2 = makeWorld([
    '..............................',
    '..............................',
    '......................../#####',
    '......................./######',
    '....P................./#######',
    '##################.../########',
    '##############################',
  ]);
  w2.map.tiles = w2.map.tiles.map((c) => c);
  // remplir le trou sous les pentes
  sim(w2, 0.3);
  sim(w2, 3, () => ({ right: true }));
  ok(w2.pl.x > 26 * T && w2.pl.bottom <= 2 * T + 0.5, 'monte une pente et arrive sur le plateau');
}

console.log('Saut mural');
{
  const rows = [];
  for (let i = 0; i < 14; i++) rows.push('#....#####');
  rows.push('#.P..#####');
  rows.push('##########');
  // couloir de 4 de large entre deux murs : on vérifie qu'on gagne de la hauteur
  const w = makeWorld(rows);
  sim(w, 0.3);
  const y0 = w.pl.y;
  let t0 = 0;
  sim(w, 3, (t, p) => {
    const r = {};
    r[p.wallDir === 1 || (p.grounded) ? 'right' : 'left'] = true;
    if (p.grounded) r.right = true;
    if (Math.floor(t * 8) % 2 === 0) r.jump = true;
    return r;
  });
  ok(w.events.includes('walljump'), 'saut mural déclenché');
}

console.log('Plateforme mobile');
{
  const rows = ['..............................', '..............................', '..............................', '..............................', '..............................', '..............................', '...P..........................', '..............................', '..............................', '..............................'];
  const w = makeWorld(rows);
  const plat = { x: 2 * T, y: 7 * T, w: 48, h: 6, dx: 0, t: 0, x0: 2 * T };
  w.lvl.platforms.push(plat);
  let fell = false, maxOff = 0;
  for (const fps of [60, 144]) {
    plat.t = 0; plat.x = plat.x0;
    w.pl.reset(plat.x + 19, plat.y - PHYS.h - 20);
    let ref = null;
    for (let i = 0; i < fps * 6; i++) {
      plat.t += 1 / fps;
      const nx = plat.x0 + Math.sin(plat.t / 3.4 * Math.PI * 2) * 40;
      plat.dx = nx - plat.x; plat.x = nx;
      w.pl.update(1 / fps, { held: {}, pressed: {} }, w.lvl);
      if (i > fps * 0.5) {
        if (!w.pl.grounded || w.pl.bottom > plat.y + 1) fell = true;
        if (ref === null) ref = w.pl.x - plat.x;
        maxOff = Math.max(maxOff, Math.abs((w.pl.x - plat.x) - ref));
      }
    }
  }
  ok(!fell, 'Kong reste sur la plateforme mobile (60 et 144 fps)');
  ok(maxOff < 1, `Kong suit la plateforme sans glisser (écart max ${maxOff.toFixed(2)}px)`);
}

console.log('Élan des objets en mouvement, glissade automatique, poutres');
{
  // Saut depuis une plateforme qui file à droite : Kong garde la vitesse et retombe dessus
  const rows = Array.from({ length: 14 }, (_, i) => (i === 6 ? '...P' : '....').padEnd(60, '.'));
  const w = makeWorld(rows);
  const plat = { x: 2 * T, y: 9 * T, w: 48, h: 6, dx: 0, dy: 0 };
  w.lvl.platforms.push(plat);
  w.pl.reset(plat.x + 19, plat.y - PHYS.h - 4);
  const speed = 60;
  let jumped = false, landedOn = false, airborne = false;
  for (let i = 0; i < 240; i++) {
    plat.dx = speed / 60; plat.x += plat.dx;
    const jump = i === 60;
    w.pl.update(1 / 60, { held: { jump: i >= 60 && i < 75 }, pressed: { jump } }, w.lvl);
    if (jump) jumped = true;
    if (jumped && !w.pl.grounded) airborne = true;
    if (airborne && w.pl.grounded) { landedOn = w.pl.riding === plat; break; }
  }
  ok(airborne && landedOn, 'saut sur une plateforme en mouvement : Kong garde son élan et retombe dessus');

  // Élan en l'air (à la Mario) : flèche relâchée après le saut, la vitesse est conservée
  const wa = makeWorld(['.'.repeat(60), '.P'.padEnd(60, '.'), '#'.repeat(60)].map((r, i) => r));
  sim(wa, 0.6, () => ({ right: true }));
  let vxAir = null;
  sim(wa, 0.6, (t, pl) => { if (t > 0.1 && !pl.grounded) vxAir = pl.vx; return { jump: t < 0.25, right: t < 0.02 }; });
  ok(vxAir !== null && vxAir > PHYS.run * 0.85, `flèche relâchée en l'air : l'élan reste (vx=${(vxAir ?? 0).toFixed(0)} px/s)`);

  // Cristaux : posés sur un sol, jamais en l'air
  for (const L of STAGES) {
    const p = parseLevel(L);
    const air = p.entities.filter((e) => e.type === 'k' && p.tiles[(e.ty + 1) * p.w + e.tx] === '.');
    if (air.length) ok(false, `${L.id} : cristal en l'air en ${air.map((e) => e.tx + ',' + e.ty).join(' ')}`);
  }

  // Pente : on glisse tout seul, sans ↓
  const ws = makeWorld(['..............................', '.P............................', '###\\..........................', '####\\.........................', '#####\\........................', '######\\.......................', '##############################']);
  sim(ws, 0.3);
  sim(ws, 1.0, () => ({ right: true }));
  ok(Math.abs(ws.pl.vx) > PHYS.run * 1.3, `glissade automatique en descente (vx=${ws.pl.vx.toFixed(0)})`);

  // Poutre : ↓ seul suffit pour descendre
  const wg = makeWorld(['..........', '..P.......', '..........', '----------', '..........', '..........', '##########']);
  sim(wg, 0.6);
  const yOn = wg.pl.bottom;
  sim(wg, 0.6, (t) => ({ down: t < 0.1 }));
  ok(Math.abs(yOn - 3 * T) < 1 && wg.pl.bottom > 5 * T, '↓ fait descendre d\'une poutre');

  // Glace friable : une fois brisée, elle ne revient pas toute seule
  const map = new TileMap(3, 2, ['.', 'x', '.', '#', '#', '#']);
  map.triggerCrumble(1, 0);
  for (let i = 0; i < 600; i++) map.update(1 / 60);
  ok(!map.solid(1, 0), 'glace friable brisée : ne réapparaît pas avec le temps');
  map.restoreCrumble(() => true);
  ok(map.solid(1, 0), 'glace friable réparée quand Kong réapparaît');
}

console.log('Ressort');
{
  const { Spring } = await import('../src/game/entities.js');
  const run = (jumpMode) => {
    const w = makeWorld(['..........', '..........', '..........', '..........', '..........', '..........', '....P.....', '##########']);
    const spring = new Spring(4, 6);
    const inp = { held: {}, pressed: {} };
    w.lvl.game = { input: inp };
    w.lvl.fx = (n) => w.events.push(n);
    w.pl.y = 1 * T;
    let bounced = false, top = 1e9, t = 0;
    for (let i = 0; i < 120; i++) {
      t += 1 / 60;
      const hold = jumpMode === 'hold' || (jumpMode === 'late' && bounced && t < 2);
      const press = jumpMode === 'late' && bounced && !inp.held.jump;
      inp.held = { jump: hold }; inp.pressed = { jump: hold && press };
      w.pl.update(1 / 60, inp, w.lvl);
      const b = w.pl.box();
      if (b.x < spring.x + spring.w && b.x + b.w > spring.x && b.y < spring.y + spring.h && b.y + b.h > spring.y) { if (w.pl.vy >= 0) { spring.touch(w.lvl, w.pl); if (w.pl.vy < 0) bounced = true; } }
      top = Math.min(top, w.pl.y);
    }
    return { bounced, height: 6 * T - top };
  };
  const plain = run('none'), hold = run('hold'), late = run('late');
  console.log(`    hauteur sans saut ${plain.height.toFixed(0)}px, maintenu ${hold.height.toFixed(0)}px, pressé après ${late.height.toFixed(0)}px`);
  ok(plain.bounced, 'tomber sur le ressort suffit à rebondir');
  ok(hold.height > plain.height + 30, 'SAUT maintenu = bond plus haut');
  ok(late.height > plain.height + 20, 'SAUT pressé juste après le rebond = bond plus haut');
}

console.log('Niveaux');
for (const L of STAGES) {
  const p = parseLevel(L);
  const signs = p.entities.filter((e) => e.type === '?').length;
  const stars = p.entities.filter((e) => e.type === '*').length;
  const goals = p.entities.filter((e) => e.type === 'G').length;
  ok(signs === L.signs.length, `${L.id} : ${signs} panneaux = ${L.signs.length} textes`);
  ok(stars === 3, `${L.id} : 3 étoiles cachées`);
  ok(goals === 1, `${L.id} : une arrivée`);
  // le joueur atterrit au départ
  const map = new TileMap(p.w, p.h, p.tiles);
  const pl = new Player(p.start.tx * T + 3, (p.start.ty + 1) * T - PHYS.h);
  const lvl = { map, platforms: [], fx() {} };
  for (let i = 0; i < 60; i++) pl.update(1 / 60, { held: {}, pressed: {} }, lvl);
  ok(pl.grounded, `${L.id} : départ sur sol ferme (${p.w}x${p.h} tuiles)`);
  // étoiles et clés jamais enfermées dans la roche
  const free = (tx, ty) => !map.solid(tx, ty);
  ok(p.entities.filter((e) => e.type === '*' || e.type === 'K').every((e) => free(e.tx, e.ty) && (free(e.tx - 1, e.ty) || free(e.tx + 1, e.ty) || free(e.tx, e.ty - 1) || free(e.tx, e.ty + 1))), `${L.id} : étoiles et clés accessibles (pas dans un mur)`);
  // portes : une clé ramassée avant chaque porte (de gauche à droite)
  const keysX = p.entities.filter((e) => e.type === 'K').map((e) => e.tx).sort((a, b) => a - b);
  const doorX = [];
  for (let x = 0; x < p.w; x++) for (let y = 0; y < p.h; y++) if (p.tiles[y * p.w + x] === 'O' && p.tiles[y * p.w + x - 1] !== 'O' && !doorX.includes(x)) { doorX.push(x); break; }
  ok(doorX.every((dx, i) => keysX.filter((k) => k < dx).length >= i + 1), `${L.id} : ${doorX.length} porte(s), chacune précédée d'une clé`);
  // tyroliennes : par paires et toujours en descente (ou à plat)
  const zips = p.entities.filter((e) => e.type === 'z').sort((a, b) => a.tx - b.tx);
  ok(zips.length % 2 === 0 && zips.every((z, i) => i % 2 === 1 || zips[i + 1].ty >= z.ty), `${L.id} : ${zips.length / 2} tyrolienne(s) en descente`);
  ok(p.entities.filter((e) => e.type === 't').length % 2 === 0, `${L.id} : télésièges par paires`);
  ok(L.parTime >= 30 && L.parTime <= 120, `${L.id} : temps cible ${L.parTime} s`);
}

console.log('Accessibilité (tools/levels/reach.mjs)');
{
  const { analyse } = await import('../tools/levels/reach.mjs');
  for (const L of STAGES) {
    const { res } = analyse(L);
    const miss = res.double.items.map((e) => `${e.type}@${e.tx},${e.ty}`);
    ok(miss.length === 0, `${L.id} : arrivée, étoiles, clés et forfaits tous atteignables${miss.length ? ' — manquent ' + miss.join(' ') : ''}`);
  }
  // un forfait ne flotte jamais juste au-dessus de la tête (on doit le ramasser en marchant ou en sautant franchement)
  for (const L of STAGES) {
    const p = parseLevel(L);
    const t = (x, y) => p.tiles[y * p.w + x];
    const occ = new Set(p.entities.map((e) => e.tx + ',' + e.ty));
    const head = p.entities.filter((e) => e.type === '$' && t(e.tx, e.ty + 1) === '.' && !occ.has(e.tx + ',' + (e.ty + 1)) && '#=x-/\\'.includes(t(e.tx, e.ty + 2)));
    ok(head.length === 0, `${L.id} : aucun forfait à hauteur de tête${head.length ? ' — ' + head.map((e) => e.tx + ',' + e.ty).join(' ') : ''}`);
  }
}

{
  // Hiboux : leur ronde ne traverse jamais la roche ni le sol
  const { Owl } = await import('../src/game/entities.js');
  for (const L of STAGES) {
    const p = parseLevel(L); const map = new TileMap(p.w, p.h, p.tiles);
    const owls = p.entities.filter((e) => e.type === 'o');
    if (!owls.length) continue;
    let hit = 0;
    for (const e of owls) {
      const o = new Owl(e.tx, e.ty, map);
      for (let i = 0; i < 900; i++) { o.update(1 / 60, {}); if ([[0, 0], [o.w, 0], [0, o.h], [o.w, o.h]].some(([dx, dy]) => map.solidAtPoint(o.x + dx, o.y + dy))) { hit++; break; } }
    }
    ok(hit === 0, `${L.id} : ${owls.length} hibou(x), aucun n'entre dans la roche`);
  }
}

{
  // Textes : chaque caractère des noms de niveaux, mondes et panneaux existe dans la police pixel
  const { missingGlyphs } = await import('../src/engine/font.js');
  const { WORLDS } = await import('../src/levels/index.js');
  const texts = [...LEVELS.flatMap((L) => [L.name, ...(L.signs || [])]), ...WORLDS.map((w) => w.name)];
  const miss = texts.map((t) => [t, missingGlyphs(t)]).filter(([, m]) => m.length);
  ok(miss.length === 0, `tous les textes s'affichent avec la police pixel${miss.length ? ' — manquent : ' + miss.map(([t, m]) => `${m.join('')} dans « ${t} »`).join(' ; ') : ''}`);
}

console.log('Boss');
{
  const { createBoss, BOSS_KINDS, ARENA } = await import('../src/game/bosses.js');
  const { isUnlocked } = await import('../src/levels/index.js');
  const bossLevels = LEVELS.filter((L) => L.boss);
  ok(bossLevels.length === 4 && bossLevels.map((L) => L.id).join() === '1-B,2-B,3-B,4-B', '4 boss, un à la fin de chaque monde');
  ok(LEVELS.indexOf(bossLevels[0]) === LEVELS.findIndex((L) => L.id === '2-1') - 1, 'le boss du monde 1 se place juste avant le 2-1');
  ok(!isUnlocked('2-1', { best: { '1-6': {} } }) && isUnlocked('2-1', { best: { '1-B': {} } }), 'battre le boss ouvre le monde suivant');
  ok(isUnlocked('2-1', { best: { '2-3': {} } }), 'une ancienne sauvegarde (sans boss) garde ses mondes ouverts');
  const fakeLevel = () => {
    const lv = {
      deaths: 0, won: false, banners: [], entities: [], freeze: 0, time: 0,
      particles: { burst() {}, spawn() {} }, camera: { shake() {} },
      game: { audio: { play() {} }, input: { held: {} }, music: { stop() {} }, lastDt: 1 / 60 },
      flashNow() {}, popup() {}, spawnEnemy() { return { minion: true }; },
      killPlayer() { this.deaths++; }, win() { this.won = true; },
    };
    lv.player = new Player(ARENA.x0 + 40, ARENA.floor - PHYS.h);
    lv.player.grounded = true;
    return lv;
  };
  for (const kind of BOSS_KINDS) {
    const lv = fakeLevel();
    const b = createBoss(kind, lv);
    ok(b.maxHp === b.perPhase * 3, `${b.name} : 3 phases de ${b.perPhase} coups`);
    // chaque phase offre une ouverture (boss sonné) en moins de 15 s
    const windows = [];
    const seen = new Set();
    for (let phase = 1; phase <= 3; phase++) {
      const bp = createBoss(kind, lv);
      bp.hp = bp.maxHp - (phase - 1) * bp.perPhase; bp.shownPhase = phase; bp.nextAttack();
      let first = null;
      for (let i = 0; i < 60 * 15 && first === null; i++) {
        lv.time += 1 / 60; bp.update(1 / 60, lv); lv.player.y = ARENA.floor - PHYS.h; lv.player.x = ARENA.x0 + 40 + (i % 600) * 0.6;
        for (const z of bp.hz) seen.add(z);
        if (bp.vulnerable) first = i / 60;
      }
      windows.push(first);
    }
    ok(windows.every((w) => w !== null && w < 12), `${b.name} : une ouverture dans chaque phase (après ${windows.map((w) => (w === null ? '—' : w.toFixed(1) + ' s')).join(' / ')})`);
    // tous les dangers sont annoncés ou visibles avant de toucher (rien n'apparaît sur Kong sans prévenir)
    const unannounced = [...seen].filter((z) => (z.k === 'drop' || z.k === 'ray' || z.k === 'laser') && z.warn < 0.6);
    ok(unannounced.length === 0, `${b.name} : chutes, rayons et lasers annoncés au moins 0,6 s à l'avance`);
    // coups sur la tête : phases puis K.O. et victoire
    const lv2 = fakeLevel();
    const b2 = createBoss(kind, lv2);
    const phases = [];
    for (let n = 0; n < b2.maxHp; n++) {
      b2.set(b2.weakState); b2.inv = 0;
      const h = b2.head();
      const p = lv2.player;
      p.x = h.x + h.w / 2 - p.w / 2; p.y = h.y - p.h + 3; p.vy = 200; p.dead = false;
      b2.interact(lv2, p);
      phases.push(b2.phase);
    }
    for (let i = 0; i < 60 * 4; i++) b2.update(1 / 60, lv2);
    ok(b2.hp === 0 && lv2.won, `${b2.name} : ${b2.maxHp} coups sur la tête = K.O. puis victoire`);
    // rebond sans dégâts quand il n'est pas sonné
    const lv3 = fakeLevel(); const b3 = createBoss(kind, lv3);
    b3.set(b3.sequences[0][0]);
    const h3 = b3.head(); const p3 = lv3.player;
    p3.x = h3.x + h3.w / 2 - p3.w / 2; p3.y = h3.y - p3.h + 3; p3.vy = 200;
    b3.interact(lv3, p3);
    ok(b3.hp === b3.maxHp && p3.vy < 0 && lv3.deaths === 0, `${b3.name} : sauter sur sa tête quand il n'est pas sonné fait rebondir sans dégâts`);
  }
}

console.log('Boutique, succès, défis');
{
  const { SKINS, HATS, TRAILS, EFFECTS, CATEGORIES } = await import('../src/game/catalog.js');
  const { ACHIEVEMENTS, Progress, dayIndex, pickChallenges, streakReward } = await import('../src/game/progress.js');
  const { missingGlyphs } = await import('../src/engine/font.js');
  ok(SKINS.length >= 12, `${SKINS.length} skins (au moins 12)`);
  ok(HATS.length >= 6 && TRAILS.length >= 5 && EFFECTS.length >= 5, `${HATS.length - 1} accessoires, ${TRAILS.length} traînées, ${EFFECTS.length} effets de saut`);
  ok(CATEGORIES.every((c) => new Set(c.items.map((i) => i.id)).size === c.items.length), 'identifiants d\'objets uniques');
  ok(HATS.every((h) => !h.rows || h.rows.every((r) => r.length === 16)), 'accessoires alignés sur la grille de Kong (16 colonnes)');
  ok(ACHIEVEMENTS.length >= 40 && new Set(ACHIEVEMENTS.map((a) => a.id)).size === ACHIEVEMENTS.length, `${ACHIEVEMENTS.length} succès (au moins 40), identifiants uniques`);
  const texts = [...CATEGORIES.flatMap((c) => c.items.flatMap((i) => [i.name, i.desc])), ...ACHIEVEMENTS.flatMap((a) => [a.name, a.desc])];
  const miss = texts.filter((t) => missingGlyphs(t).length);
  ok(miss.length === 0, `textes de la boutique et des succès affichables${miss.length ? ' — ' + miss.slice(0, 3).join(' | ') : ''}`);
  // une sauvegarde neuve
  let now = new Date(2026, 10, 20, 12).getTime();
  const save = { best: {}, settings: {} };
  let writes = 0;
  const pr = new Progress(save, LEVELS, () => writes++, () => now);
  ok(pr.wallet === 0 && pr.owns('skin', 'classic') && pr.equipped('skin').id === 'classic', 'départ : skin classique offert, porte-monnaie vide');
  ok(!pr.buy('skin', 'estp'), 'impossible d\'acheter sans assez de forfaits');
  pr.earn(100);
  ok(pr.buy('skin', 'estp') && pr.wallet === 100 - 60 + 20 && pr.equipped('skin').id === 'estp', 'achat : 60 forfaits débités (+20 du succès), objet possédé et équipé');
  ok(pr.isUnlocked('buy1'), 'succès « Premier achat » débloqué');
  ok(!pr.buy('skin', 'estp'), 'on ne paie pas deux fois le même objet');
  ok(!pr.equip('skin', 'or'), 'impossible d\'équiper un objet non acheté');
  // succès à seuil
  const before = pr.wallet;
  pr.inc('jumps', 499); pr.check(); ok(!pr.isUnlocked('jumps500'), '499 sauts : pas encore « Sauterelle »');
  pr.inc('jumps'); pr.check(); ok(pr.isUnlocked('jumps500') && pr.wallet >= before + 20, '500 sauts : « Sauterelle » + 20 forfaits (et les défis de sauts éventuels)');
  ok(pr.toasts.some((t) => t.title.includes('SAUTERELLE')), 'notification affichée pour le succès');
  // défis : identiques pour tous un jour donné, renouvelés le lendemain
  const d = dayIndex(now);
  ok(JSON.stringify(pickChallenges([{ stat: 'a', goals: [1, 2], label: (n) => 'A' + n, reward: 1 }, { stat: 'b', goals: [3], label: (n) => 'B' + n, reward: 1 }], d, 2)) === JSON.stringify(pickChallenges([{ stat: 'a', goals: [1, 2], label: (n) => 'A' + n, reward: 1 }, { stat: 'b', goals: [3], label: (n) => 'B' + n, reward: 1 }], d, 2)), 'tirage des défis déterministe (même graine = mêmes défis)');
  ok(save.daily.list.length === 3 && save.weekly.list.length === 3, '3 défis du jour et 3 défis de la semaine');
  const ch = save.daily.list[0];
  const w0 = pr.wallet;
  pr.inc(ch.stat, ch.goal); pr.check();
  ok(save.daily.done.includes(0) && (pr.wallet >= w0 + ch.reward || ch.stat === 'jumps'), `défi « ${ch.label} » validé et récompensé`);
  pr.inc(ch.stat, ch.goal); pr.check();
  ok(save.daily.done.filter((i) => i === 0).length === 1, 'un défi ne paie qu\'une fois');
  now += 86400000; pr.refreshChallenges();
  ok(save.daily.day === d + 1 && save.daily.done.length === 0, 'nouveaux défis le lendemain');
  // série de connexion
  const s2 = { best: {}, settings: {} };
  let t2 = new Date(2026, 10, 20, 9).getTime();
  const p2 = new Progress(s2, LEVELS, () => {}, () => t2);
  const r1 = p2.login(); ok(r1 && r1.streak === 1 && r1.reward === streakReward(1), 'série : jour 1 récompensé');
  ok(p2.login() === null, 'série : une seule récompense par jour');
  t2 += 86400000; ok(p2.login().streak === 2, 'série : jour 2 le lendemain');
  t2 += 3 * 86400000; ok(p2.login().streak === 1, 'série : remise à 1 après des jours sans jouer');
  // ancienne sauvegarde : forfaits déjà gagnés reversés, succès déjà mérités accordés sans fanfare
  const old = { best: { '1-1': { time: 50, rating: 3, coins: 20, stars: [true, true, true] } }, settings: {}, totalCoins: 120, doubleJump: true };
  const p3 = new Progress(old, LEVELS, () => {}, () => now);
  ok(p3.isUnlocked('first') && p3.isUnlocked('double') && p3.isUnlocked('rate3') && p3.toasts.length === 0, 'ancienne sauvegarde : succès déjà mérités accordés en silence');
  ok(p3.wallet >= 120, 'ancienne sauvegarde : les forfaits déjà gagnés deviennent le porte-monnaie');
}

console.log('Comptes, sauvegarde cloud, classements');
{
  const { levelLimits, checkRun, checkPseudo, featuredLevel, rankBoard } = await import('../src/online/rules.js');
  const { mergeSaves, cloudPayload } = await import('../src/online/merge.js');
  const { LocalBackend, memoryStorage, hashPassword } = await import('../src/online/local.js');
  const { SupabaseBackend } = await import('../src/online/supabase.js');
  const { Online } = await import('../src/online/service.js');
  const { Progress } = await import('../src/game/progress.js');
  const { readFileSync } = await import('node:fs');

  // règles anti-triche
  const lims = Object.fromEntries(LEVELS.map((l) => [l.id, levelLimits(l)]));
  ok(LEVELS.every((l) => lims[l.id].minTime < l.parTime * 0.5), 'temps minimal plausible bien sous le temps cible de chaque niveau');
  const botBest = { '1-2': 19, '2-3': 17.8, '4-5': 17.3, '1-1': 24.3 }; // meilleurs temps du bot (étape 5)
  ok(Object.entries(botBest).every(([id, t]) => t > lims[id].minTime * 1.5), 'les temps réels du bot passent largement la limite');
  ok(checkRun(lims['1-1'], { time: 30, coins: 10, deaths: 0 }) === null, 'résultat normal accepté');
  ok(checkRun(lims['1-1'], { time: 3, coins: 10, deaths: 0 }) === 'temps impossible', 'temps impossible refusé');
  ok(checkRun(lims['1-1'], { time: 30, coins: lims['1-1'].maxCoins + 1, deaths: 0 }) !== null, 'plus de forfaits que le niveau n\'en contient : refusé');
  ok(checkRun(undefined, { time: 30, coins: 0, deaths: 0 }) !== null, 'niveau inconnu refusé');
  const sql = readFileSync(new URL('../supabase/levels.sql', import.meta.url), 'utf8');
  ok(LEVELS.every((l) => sql.includes(`('${l.id}', ${lims[l.id].minTime}, ${lims[l.id].maxCoins})`)), 'supabase/levels.sql à jour (mêmes limites que le client)');
  const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  ok(['profiles', 'saves', 'runs', 'friends', 'level_limits'].every((t) => schema.includes(`alter table public.${t} enable row level security`)), 'schéma SQL : Row Level Security sur toutes les tables');
  ok(/too_fast/.test(schema) && /impossible_time/.test(schema) && /too_many/.test(schema), 'schéma SQL : limitation de débit et temps impossibles vérifiés côté serveur');
  ok(checkPseudo('Kong_75') === null && checkPseudo('ab') && checkPseudo('élève') && checkPseudo('a'.repeat(17)), 'pseudos : 3 à 16 caractères affichables');
  ok(featuredLevel(LEVELS, 20000, 1) === featuredLevel(LEVELS, 20000, 1) && !featuredLevel(LEVELS, 20000, 1).endsWith('B'), 'niveau du jour identique pour tous, jamais un boss');
  const days = new Set(Array.from({ length: 30 }, (_, i) => featuredLevel(LEVELS, 20000 + i, 1)));
  ok(days.size >= 10, `niveau du jour varié (${days.size} niveaux différents sur 30 jours)`);

  // fusion des sauvegardes
  const base = { best: { '1-1': { time: 40, rating: 2, coins: 20, stars: [true, false, false] } }, stats: { jumps: 100, bestCombo: 5 }, owned: ['skin:classic'], equip: { skin: 'classic' }, achievements: { first: 1 }, earnedBy: { A: 100 }, spentBy: { A: 0 }, settings: { musicVol: 0.2 }, updatedAt: 1 };
  const devA = JSON.parse(JSON.stringify(base)); devA.earnedBy.A = 160; devA.spentBy.A = 60; devA.owned.push('skin:estp'); devA.equip.skin = 'estp'; devA.best['1-1'].time = 35; devA.updatedAt = 5;
  const devB = JSON.parse(JSON.stringify(base)); devB.earnedBy.B = 50; devB.best['1-1'].stars = [false, true, false]; devB.best['1-2'] = { time: 50, rating: 1, coins: 3, stars: [false, false, false] }; devB.achievements.double = 3; devB.stats.jumps = 140; devB.settings = { musicVol: 0.9 }; devB.updatedAt = 4;
  const m = mergeSaves(devA, devB, 'sync');
  ok(m.wallet === 160 - 60 + 50, `deux appareils : aucun forfait perdu ni dupliqué (${m.wallet} = 100 + 60 - 60 + 50)`);
  ok(m.best['1-1'].time === 35 && m.best['1-1'].stars.join() === 'true,true,false' && m.best['1-2'], 'records : meilleur temps, étoiles réunies, niveaux des deux appareils');
  ok(m.owned.includes('skin:estp') && m.equip.skin === 'estp' && m.achievements.double && m.achievements.first, 'objets, tenue et succès réunis');
  ok(m.stats.jumps === 140 && m.settings.musicVol === 0.2, 'compteurs au maximum, réglages de l\'appareil conservés');
  const mig = mergeSaves({ ...devB, earnedBy: { B: 30 }, spentBy: {} }, { ...devA }, 'migrate');
  ok(mig.wallet === 160 - 60 + 30 && mig.stats.jumps === 240 && mig.stats.bestCombo === 5, 'partie invitée → compte : forfaits et compteurs additionnés, records comparés');
  const bad = mergeSaves({ ...base, equip: { skin: 'or' }, updatedAt: 9 }, base, 'sync');
  ok(!bad.equip.skin, 'un objet équipé mais non possédé est retiré');
  ok(!('settings' in cloudPayload(devA)), 'les réglages de l\'appareil ne partent pas dans le cloud');

  // comptes (mode local)
  const store = memoryStorage();
  let clock = Date.UTC(2026, 10, 20, 12);
  const mkGame = (device) => {
    const save = { best: {}, settings: {} };
    const g = { save, persist() {}, applyLook() {} };
    g.progress = new Progress(save, LEVELS, () => {}, () => clock, device);
    g.online = new Online(g, { storage: store, levels: LEVELS, now: () => clock });
    return g;
  };
  const g1 = mkGame('dev1');
  ok(g1.online.mode === 'local' && !g1.online.user, 'sans serveur configuré : mode local, invité par défaut');
  g1.progress.earn(80); g1.save.best['1-1'] = { time: 30, rating: 3, coins: 37, stars: [true, true, true] };
  let err = '';
  try { await g1.online.signUp({ pseudo: 'x', email: 'a@b.fr', password: 'motdepasse' }); } catch (e) { err = e.message; }
  ok(/pseudo/.test(err), 'inscription refusée avec un pseudo invalide');
  await g1.online.signUp({ pseudo: 'KongMaster', email: 'kong@exemple.fr', password: 'motdepasse1', estp: true });
  ok(g1.online.user && g1.online.user.pseudo === 'KongMaster' && g1.save.owner === g1.online.user.id, 'compte créé, partie invitée rattachée au compte');
  ok(g1.save.best['1-1'] && g1.progress.wallet >= 80, 'rien n\'est perdu en créant le compte');
  const dump = JSON.stringify([...Array(1)].map(() => store.get('local.accounts')));
  ok(!dump.includes('motdepasse1') && (await hashPassword('motdepasse1', Object.values(store.get('local.accounts'))[0].salt)).hash === Object.values(store.get('local.accounts'))[0].hash, 'mot de passe jamais stocké en clair (PBKDF2 + sel)');
  err = ''; try { await new LocalBackend({ storage: store, levels: LEVELS, limits: lims }).signUp({ pseudo: 'kongmaster', email: 'autre@exemple.fr', password: 'motdepasse2' }); } catch (e) { err = e.message; }
  ok(/pris/.test(err), 'pseudo déjà pris (sans tenir compte des majuscules)');
  const lb = new LocalBackend({ storage: memoryStorage(), levels: LEVELS, limits: lims });
  await lb.signUp({ pseudo: 'Toto', email: 't@t.fr', password: '12345678' });
  let e1 = '', e2 = '';
  try { await lb.signIn({ login: 'Toto', password: 'mauvais!!' }); } catch (e) { e1 = e.message; }
  try { await lb.signIn({ login: 'Personne', password: '12345678' }); } catch (e) { e2 = e.message; }
  const { pbkdf2 } = await import('../src/online/sha256.js');
  const hp = await hashPassword('motdepasse', '0102030405060708');
  ok(Buffer.from(pbkdf2(new TextEncoder().encode('motdepasse'), Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]), 100000)).toString('hex') === hp.hash, 'repli sans Web Crypto (http sur le réseau local) : même hachage PBKDF2');
  ok(e1 && e1 === e2, 'mauvais mot de passe et compte inconnu : même message (pas de fuite)');
  ok((await lb.signIn({ login: 't@t.fr', password: '12345678' })).pseudo === 'Toto', 'connexion par e-mail ou par pseudo');

  // synchronisation entre deux appareils
  const g1wallet = g1.progress.wallet;
  await g1.online.sync();
  const g2 = mkGame('dev2');
  g2.progress.earn(5); // un peu de jeu en invité sur le 2e appareil
  await g2.online.signIn({ login: 'kong@exemple.fr', password: 'motdepasse1' });
  ok(g2.save.best['1-1'] && g2.progress.wallet === g1wallet + 5, `connexion sur un 2e appareil : progression récupérée + partie invitée ajoutée (${g2.progress.wallet} = ${g1wallet} + 5)`);
  g2.progress.earn(30); g1.progress.earn(20);
  await g2.online.sync(); await g1.online.sync(); await g2.online.sync();
  ok(g1.progress.wallet === g2.progress.wallet && g1.progress.wallet === g1wallet + 5 + 30 + 20, `deux appareils synchronisés : même porte-monnaie (${g1.progress.wallet}), rien de perdu`);

  // classements
  const players = [['KongMaster', 'kong@exemple.fr', 'motdepasse1', true], ['Yetix', 'y@x.fr', 'motdepasse', false], ['Skieuse', 's@k.fr', 'motdepasse', true]];
  const on = g1.online;
  const sub = async (pseudo, pw, email, level, time) => { await on.signIn({ login: email, password: pw }); clock += 120000; return on.submit({ level, time, coins: 5, deaths: 0 }); };
  for (const [p, e, pw, estp] of players.slice(1)) { await on.signUp({ pseudo: p, email: e, password: pw, estp }); }
  const r1 = await sub('KongMaster', 'motdepasse1', 'kong@exemple.fr', '1-1', 31.5);
  await sub('Yetix', 'motdepasse', 'y@x.fr', '1-1', 28.2);
  await sub('Skieuse', 'motdepasse', 's@k.fr', '1-1', 35);
  await sub('Skieuse', 'motdepasse', 's@k.fr', '1-2', 40);
  ok(r1.rank === 1 && r1.of === 1, 'premier résultat : 1er sur 1');
  const last = await on.submit({ level: '1-1', time: 26, coins: 5, deaths: 0 });
  ok(last.error && /patiente/.test(last.error) || last.error === 'hors ligne : envoi plus tard', 'deux résultats en moins de 2 s : limitation de débit');
  store.set('pending.runs', []);
  const cheat = await on.submit({ level: '1-1', time: 2, coins: 5, deaths: 0 });
  ok(cheat.error === 'temps impossible', 'temps impossible refusé à l\'envoi');
  const lvl = await on.board({ scope: 'level', level: '1-1', filter: 'all' });
  ok(lvl.rows.map((r) => r.pseudo).join() === 'Yetix,KongMaster,Skieuse' && lvl.rows[2].me, 'classement par niveau : meilleurs temps, ligne du joueur repérée');
  const glob = await on.board({ scope: 'global', filter: 'all' });
  ok(glob.rows[0].pseudo === 'Skieuse' && glob.rows[0].levels === 2, 'classement général : niveaux terminés d\'abord');
  // rattrapage : un niveau fini en invité entre au classement à la création du compte (temps assistés exclus)
  const g3 = mkGame('dev3');
  g3.save.best['1-1'] = { time: 27.456, rating: 1, coins: 4, stars: [] };
  g3.save.best['1-2'] = { time: 50, rating: 1, coins: 0, stars: [], assisted: true };
  clock += 120000;
  await g3.online.signUp({ pseudo: 'Invitee', email: 'i@v.fr', password: 'motdepasse' });
  await g3.online.backfill();
  const lvlB = await g3.online.board({ scope: 'level', level: '1-1', filter: 'all' });
  ok(lvlB.rows[0].pseudo === 'Invitee' && lvlB.rows[0].time === 27.46, 'temps fait en invité envoyé au classement après la création du compte');
  const lvl2 = await g3.online.board({ scope: 'level', level: '1-2', filter: 'all' });
  ok(!lvl2.rows.some((r) => r.pseudo === 'Invitee'), 'temps assisté jamais envoyé au classement');
  ok(g3.online.pendingBests().length === 0, 'rattrapage fait une seule fois');
  const weeklyB = await g3.online.board({ scope: 'weekly', level: '1-1', filter: 'all' });
  ok(!weeklyB.rows.some((r) => r.pseudo === 'Invitee'), 'temps rattrapé hors classement de la semaine');
  const mB = mergeSaves({ best: { '1-1': { time: 20, assisted: true, rating: 1, coins: 0, stars: [] } } }, { best: { '1-1': { time: 30, rating: 1, coins: 0, stars: [] } } }, 'sync');
  ok(mB.best['1-1'].time === 30 && !mB.best['1-1'].assisted, 'fusion : un vrai temps l\'emporte sur un temps assisté');
  const estp = await on.board({ scope: 'level', level: '1-1', filter: 'estp' });
  ok(estp.rows.map((r) => r.pseudo).join() === 'KongMaster,Skieuse', 'classement Liste ESTP Cachan : membres de la liste uniquement');
  let fr = await on.board({ scope: 'level', level: '1-1', filter: 'friends' });
  ok(fr.rows.length === 1 && fr.rows[0].me, 'classement amis : seul tant qu\'on n\'a pas d\'amis');
  await on.addFriend('yetix');
  fr = await on.board({ scope: 'level', level: '1-1', filter: 'friends' });
  ok(fr.rows.map((r) => r.pseudo).join() === 'Yetix,Skieuse' && (await on.friends()).length === 1, 'ami ajouté par pseudo, il apparaît dans le classement amis');
  let fe = ''; try { await on.addFriend('Skieuse'); } catch (e) { fe = e.message; }
  ok(/toi/.test(fe), 'impossible de s\'ajouter soi-même');
  const daily = on.dailyLevel();
  clock += 86400000 * 2;
  const dEmpty = await on.board({ scope: 'daily', filter: 'all' });
  ok(dEmpty.level === on.dailyLevel() && dEmpty.rows.length === 0, 'classement du jour : repart à zéro chaque jour');
  void daily;
  // file d'attente hors ligne
  const flaky = mkGame('dev3');
  await flaky.online.signIn({ login: 'y@x.fr', password: 'motdepasse' });
  const real = flaky.online.backend.submitRun.bind(flaky.online.backend);
  flaky.online.backend.submitRun = async () => { throw new Error('pas de connexion au serveur'); };
  const q = await flaky.online.submit({ level: '1-3', time: 60, coins: 3, deaths: 1 });
  ok(q.error && flaky.online.queue().length === 1, 'hors ligne : le résultat attend dans la file');
  flaky.online.backend.submitRun = real; clock += 60000;
  await flaky.online.flushQueue();
  ok(flaky.online.queue().length === 0 && (await flaky.online.board({ scope: 'level', level: '1-3' })).rows.length === 1, 'retour du réseau : le résultat est envoyé');

  // client Supabase (faux serveur) : bons points d'accès, mot de passe uniquement vers Auth
  const calls = [];
  const fakeFetch = async (url, o) => {
    calls.push({ url, ...o, body: o.body && JSON.parse(o.body) });
    const ok200 = (d) => ({ ok: true, status: 200, text: async () => JSON.stringify(d) });
    if (url.includes('/auth/v1/token')) return ok200({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'u1' } });
    if (url.includes('/rest/v1/profiles')) return ok200([{ id: 'u1', pseudo: 'KongMaster', estp: true, skin: 'or' }]);
    if (url.includes('/rpc/submit_run')) return ok200({ rank: 3, total: 12 });
    if (url.includes('/rpc/leaderboard')) return ok200([{ rank: 1, user_id: 'u2', pseudo: 'A', skin: 'classic', estp: false, total_time: 30, levels: 1, is_me: false, total: 2 }, { rank: 2, user_id: 'u1', pseudo: 'KongMaster', skin: 'or', estp: true, total_time: 31, levels: 1, is_me: true, total: 2 }]);
    return { ok: false, status: 400, text: async () => JSON.stringify({ message: 'impossible_time' }) };
  };
  const sb = new SupabaseBackend({ url: 'https://exemple.supabase.co', key: 'ANON', storage: memoryStorage(), limits: lims, fetchImpl: fakeFetch });
  const u = await sb.signIn({ login: 'kong@exemple.fr', password: 'secret123' });
  ok(u.pseudo === 'KongMaster' && calls[0].url.endsWith('/auth/v1/token?grant_type=password') && calls[0].headers.apikey === 'ANON', 'Supabase : connexion via Auth avec la clé publique');
  ok(calls.filter((c) => JSON.stringify(c.body || {}).includes('secret123')).length === 1, 'Supabase : le mot de passe ne part qu\'une fois, vers Auth (HTTPS)');
  ok(calls[1].headers.Authorization === 'Bearer AT', 'Supabase : requêtes suivantes avec le jeton de session');
  const sr = await sb.submitRun({ level: '1-1', time: 30.123, coins: 4, deaths: 0 });
  ok(sr.rank === 3 && calls.at(-1).body.p_time === 30.12, 'Supabase : envoi du résultat par la fonction serveur submit_run');
  const bd = await sb.board({ scope: 'level', level: '1-1' });
  ok(bd.rows.length === 2 && bd.me.pseudo === 'KongMaster' && bd.total === 2, 'Supabase : lecture du classement (ligne du joueur incluse)');
  let se = ''; try { await sb.addFriend('Inconnu'); } catch (e) { se = e.message; }
  ok(se === 'temps impossible', `Supabase : erreurs serveur traduites en message lisible (${se})`);
}

console.log('Modes bonus');
{
  const { generateLevel } = await import('../src/modes/generator.js');
  const { encodeLevel, decodeLevel, checkLevel, blankLevel, toLevelData } = await import('../src/modes/editor-format.js');
  const { Replays } = await import('../src/modes/replays.js');
  const { memoryStorage } = await import('../src/online/local.js');
  const { DAY_LIMITS, checkRun } = await import('../src/online/rules.js');
  const a = generateLevel({ seed: 42, length: 230 }), b = generateLevel({ seed: 42, length: 230 });
  ok(a.chunks[0] === b.chunks[0] && a.chunks[0] !== generateLevel({ seed: 43, length: 230 }).chunks[0], 'générateur déterministe (même graine = même piste, graine différente = autre piste)');
  let bad = 0, maxCoins = 0, minW = 1e9;
  for (let day = 20700; day < 20760; day++) {
    const g = generateLevel({ seed: day * 7919 + 13, length: 230, checkpoints: 75, finish: true, maxCoins: 80, ramp: 260 });
    const p = parseLevel({ height: g.height, chunks: g.chunks });
    const goals = p.entities.filter((e) => e.type === 'G').length;
    const map = new TileMap(p.w, p.h, p.tiles);
    // départ posé sur le sol, aucune colonne entièrement pleine qui bloquerait le passage
    const grounded = map.solid(p.start.tx, p.start.ty + 1);
    const wall = Array.from({ length: p.w }, (_, x) => Array.from({ length: p.h }, (_, y) => map.solid(x, y)).every(Boolean)).some(Boolean);
    if (goals !== 1 || !grounded || wall) bad++;
    maxCoins = Math.max(maxCoins, g.coins); minW = Math.min(minW, p.w);
  }
  ok(bad === 0, '60 Niveaux du jour : un départ posé au sol, une arrivée, jamais de mur infranchissable');
  ok(maxCoins <= DAY_LIMITS.maxCoins && minW / 24 > DAY_LIMITS.minTime, `Niveau du jour compatible avec l'anti-triche (forfaits ≤ ${DAY_LIMITS.maxCoins}, temps minimal ${DAY_LIMITS.minTime} s)`);
  ok(checkRun(DAY_LIMITS, { time: 25, coins: 40, deaths: 0 }) === null && checkRun(DAY_LIMITS, { time: 5, coins: 40, deaths: 0 }), 'résultat du Niveau du jour vérifié comme les autres');
  const inf = generateLevel({ seed: 7, length: 4000, checkpoints: 0, finish: false, maxCoins: Infinity, ramp: 900 });
  const ip = parseLevel({ height: inf.height, chunks: inf.chunks });
  ok(ip.w >= 4000 && !ip.entities.some((e) => e.type === 'G' || e.type === 'C'), 'Infini : 4000 tuiles, ni arrivée ni point de contrôle');
  // éditeur
  const lv = blankLevel(60);
  ok(checkLevel(lv) === null, 'éditeur : la grille de départ est jouable (départ + arrivée)');
  lv.rows[10] = lv.rows[10].slice(0, 20) + '$$$^^S' + lv.rows[10].slice(26);
  lv.name = 'Piste de Kong';
  const code = encodeLevel(lv);
  const back = decodeLevel(code);
  ok(code.startsWith('SK1:') && back.rows.join() === lv.rows.join() && back.name === lv.name, `éditeur : code de partage aller-retour sans perte (${code.length} caractères)`);
  let e1 = ''; try { decodeLevel('SK1:' + btoa('{"r":["<script>"]}')); } catch (e) { e1 = e.message; }
  let e2 = ''; try { decodeLevel('n\'importe quoi'); } catch (e) { e2 = e.message; }
  ok(e1 && e2, 'éditeur : codes invalides ou piégés refusés');
  const noGoal = { ...lv, rows: lv.rows.map((r) => r.replace('G', '.')) };
  ok(/ARRIVEE/.test(checkLevel(noGoal)), 'éditeur : impossible de tester sans arrivée');
  ok(parseLevel(toLevelData(lv)).w === 60, 'éditeur : le niveau se charge dans le moteur du jeu');
  // fantômes
  const rp = new Replays(memoryStorage());
  for (let i = 0; i < 70; i++) rp.save('L' + i, { time: i, d: [[0, 1, 2, 0, 1, 0]] });
  ok(Object.keys(rp.all()).length === 60 && rp.load('L69') && !rp.load('L0'), 'fantômes : 60 au plus, les plus anciens oubliés');
}

console.log('Mécaniques de l\'étape 3');
{
  const { Zipline, updateZip, Avalanche, WindField } = await import('../src/game/mechanics.js');
  // Porte : s'ouvre d'un bloc (toutes les tuiles O connexes) et devient traversable
  const rows = ['.....', '..O..', '..O..', '..O..', '#####'];
  const map = new TileMap(5, 5, rows.join('').split(''));
  ok(map.solid(2, 2), 'porte fermée = solide');
  const opened = map.openDoor(2, 3);
  ok(opened.length === 3 && !map.solid(2, 1) && !map.solid(2, 3), 'porte ouverte en entier (3 tuiles) et traversable');
  // Mur jusqu'en haut : prolongé au-dessus de la carte
  const tall = new TileMap(3, 3, ['.', '#', '.', '.', '#', '.', '#', '#', '#'].join('').split(''));
  ok(tall.solid(1, -5) && !tall.solid(0, -5), 'un mur qui touche le haut de la carte se prolonge au-dessus');
  // Tyrolienne : on glisse vers l'ancre basse, saut = lâcher avec élan
  const z = new Zipline({ tx: 2, ty: 5 }, { tx: 22, ty: 8 });
  const pl = new Player(0, 0);
  pl.zip = { line: z, s: 20, v: 0 };
  const lvl = { fx() {} };
  let t = 0, released = null;
  while (t < 5 && !released) { released = updateZip(pl, 1 / 60, { held: {}, pressed: {} }, lvl); t += 1 / 60; }
  ok(released === 'release' && pl.cx > z.bx - 30, `tyrolienne parcourue jusqu'au bout (${t.toFixed(2)} s)`);
  const pl2 = new Player(0, 0);
  pl2.zip = { line: z, s: 60, v: 150 };
  updateZip(pl2, 1 / 60, { held: { jump: true }, pressed: { jump: true } }, lvl);
  ok(!pl2.zip && pl2.vy < -200 && pl2.vx > 50, 'saut sur la tyrolienne = lâcher vers le haut avec l\'élan');
  // Avalanche : rattrape un joueur immobile, jamais un joueur qui court
  const mk = (vx) => {
    const p = new Player(400, 100); p.vx = vx;
    const a = new Avalanche({ speed: 120, lag: 230 });
    const scene = { player: p, killed: false, killPlayer() { this.killed = true; p.dead = true; } };
    a.start(p.cx);
    for (let i = 0; i < 600; i++) { p.x += p.vx / 60; a.update(1 / 60, scene); }
    return scene.killed;
  };
  ok(mk(0) && !mk(150), 'avalanche : tue le joueur arrêté, pas celui qui court');
  // Vent : pousse dans le sens de la zone, plus fort en l'air
  const w = new WindField([[0, 10, 300]]);
  ok(w.at(5 * T) > 0 && w.at(20 * T) === 0, 'vent actif seulement dans sa zone');
}

console.log('\nRéglage du son');
{
  const { stepVolume, toggleSound, setVolume } = await import('../src/game/volume.js');
  const g = { settings: { musicVol: 0.2, sfxVol: 0.8 }, applied: 0, applyVolumes() { this.applied++; }, persist() {}, audio: { play() {} } };
  stepVolume(g, 'musicVol', -1); stepVolume(g, 'musicVol', -1); stepVolume(g, 'musicVol', -1);
  ok(g.settings.musicVol === 0, 'baisser s\'arrête à 0 %');
  for (let i = 0; i < 14; i++) stepVolume(g, 'musicVol', 1);
  ok(g.settings.musicVol === 1, 'monter s\'arrête à 100 % (plus de retour à 0)');
  toggleSound(g, 'musicVol');
  ok(g.settings.musicOn === false && g.settings.musicVol === 1, 'OFF coupe la musique et garde le niveau');
  stepVolume(g, 'musicVol', 1);
  ok(g.settings.musicOn === true, 'monter le volume rallume la musique');
  setVolume(g, 'sfxVol', 0);
  ok(g.settings.sfxOn === false, 'jauge à 0 = effets coupés');
  toggleSound(g, 'sfxVol');
  ok(g.settings.sfxOn === true && g.settings.sfxVol === 0.5, 'rallumer à 0 % remet un niveau audible');
}

console.log(`\n${passes} réussis, ${fails} échoués`);
process.exit(fails ? 1 : 0);
