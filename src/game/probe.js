import { mulberry32 } from '../engine/util.js';
// Outil de test automatisé (?probe=1) : pilote Kong avec une séquence d'entrées et écrit un rapport JSON dans le DOM.
// Paramètres : level=1-1, tx=<tuile de départ>, script=<nom>, dur=<secondes>
import { LevelScene } from './level.js';
import { getLevel, DEMO_FX, LEVELS } from '../levels/index.js';
import { generateLevel } from '../modes/generator.js';
import { T } from './tilemap.js';
import { ARENA } from './bosses.js';

const SCRIPTS = {
  walk: (t) => ({ right: t > 0.3, jump: (t > 1 && t < 1.35) || (t > 2.2 && t < 2.5) }),
  idle: () => ({}),
  slide: (t) => ({ right: true, down: t > 0.5 }),
  spring: (t) => ({ right: t > 0.1 && t < 0.32, left: t > 0.6 && t < 0.7, jump: t > 0.05 }),
  bot: makeBot(),
  boss: makeBossBot(),
  left: () => ({ left: true }),
  star2: (t) => ({ left: t > 0.2 && t < 1.2, jump: t > 0.25 && t < 0.8 }),
  pause: (t) => ({ right: t < 0.3, pause: t > 0.4 && t < 0.45 }),
};

/** Bot de boss : esquive ce qui est annoncé, saute sur la tête du boss quand il est sonné. */
function makeBossBot() {
  let hold = 0, rel = 0;
  return (t, scene) => {
    const p = scene.player, b = scene.boss;
    if (p.dead) { hold = 0; return { jump: t % 0.4 < 0.2 }; } // relance le combat après une chute
    if (!b || p.won) { hold = 0; return {}; }
    const r = {};
    let jump = false, dir = 0, block = false;
    const mid = (ARENA.x0 + ARENA.x1) / 2;
    const bc = b.x + b.w / 2;
    const head = b.head();
    if (b.vulnerable && head) {
      const hx = head.x + head.w / 2;
      dir = Math.abs(hx - p.cx) > 3 ? Math.sign(hx - p.cx) : 0;
      if (p.grounded && Math.abs(hx - p.cx) < 46) jump = true;
      if (!p.grounded && p.vy > 0 && p.bottom > head.y - 2 && Math.abs(hx - p.cx) > 10 && p.canDouble && !p.usedDouble) jump = true;
    } else {
      // rester loin du boss
      const far = bc < mid ? ARENA.x1 - 30 : ARENA.x0 + 30;
      dir = Math.abs(far - p.cx) > 8 ? Math.sign(far - p.cx) : 0;
      // corps du boss qui fonce sur Kong : on saute par-dessus
      for (const body of b.bodies()) {
        if (body.soft || b.harmless) continue;
        const gap = p.cx < body.x ? body.x - (p.x + p.w) : p.x - (body.x + body.w);
        const closing = (b.st === 'charge' || b.st.startsWith('drive') || b.st === 'dive') && gap < 70;
        if (gap < 24 || closing) {
          if (body.y + body.h > p.y - 30 && body.y < p.bottom + 4) {
            if (p.grounded) jump = true;
            dir = b.st === 'dive' ? Math.sign(p.cx - bc) || 1 : Math.sign(bc - p.cx) || 1; // passer au-dessus
            if (b.st === 'dive') jump = false;
          }
        }
      }
      if (!p.grounded && p.vy > 0 && p.canDouble && !p.usedDouble) {
        const low = b.bodies().some((q) => !q.soft && !b.harmless && Math.abs(q.x + q.w / 2 - p.cx) < q.w / 2 + 20 && q.y < p.bottom + 30);
        if (low) jump = true;
      }
    }
    for (const z of b.hz) {
      if (z.k === 'wave' || z.k === 'roll' || (z.k === 'ring' && !z.high)) {
        const toward = Math.sign(p.cx - (z.x + z.w / 2)) === Math.sign(z.vx);
        const d = Math.abs(z.x + z.w / 2 - p.cx);
        if (toward && d < 26 + Math.abs(z.vx) * 0.1) jump = true;
      }
      if (z.k === 'ring' && z.high) { const d = Math.abs(z.x + z.w / 2 - p.cx); if (d < 70) block = true; }
      if (z.k === 'drop' || z.k === 'ball') {
        const lx = z.k === 'drop' ? z.x + z.w / 2 : (z.mark ?? z.x + z.vx * 0.3);
        if (Math.abs(lx - p.cx) < 16 && z.y < ARENA.floor - 20 && (!b.vulnerable || z.y > ARENA.floor - 110)) dir = lx > p.cx ? -1 : 1;
      }
      if (z.k === 'laser' && z.w < 20) {
        if (Math.abs(z.x + z.w / 2 - p.cx) < 14) dir = z.x + z.w / 2 > p.cx ? -1 : 1;
      }
      if (z.k === 'laser' && z.w > 20 && z.t > z.warn - 0.2 && z.t < z.warn + 0.1 && p.grounded) jump = true;
      if (z.k === 'ray' && !z.on) {
        const ux = z.x2 - z.x1, uy = z.y2 - z.y1, L = Math.hypot(ux, uy);
        const dist = Math.abs((p.cx - z.x1) * uy - (p.y + 7 - z.y1) * ux) / L;
        if (dist < 22) { dir = ux * (p.y + 7 - z.y1) - uy * (p.cx - z.x1) > 0 ? -1 : 1; if (z.warn - z.t < 0.25 && p.grounded) jump = true; }
      }
      if (z.k === 'shard') {
        const ahead = Math.hypot(z.x - p.cx, z.y - p.y) < 60;
        if (ahead && p.grounded) jump = true;
      }
    }
    if (block) jump = false;
    if (jump && hold <= 0 && rel <= 0) hold = 0.4;
    if (hold > 0) { r.jump = true; hold -= 1 / 60; if (hold <= 0) rel = 2; } else rel--;
    if (block && !p.grounded) r.jump = false;
    if (dir > 0) r.right = true; else if (dir < 0) r.left = true;
    return r;
  };
}

/** Bot réactif : sert à vérifier qu'un niveau est faisable de bout en bout (pas à bien jouer). */
function makeBot() {
  let jumpHeld = 0, release = 0, lastWallJump = -1, target = null, bestX = 0, bestT = 0, unstick = 0, wasAir = 0, fetch = null, owlWait = 0, owlBrave = 0;
  return (t, scene) => {
    const p = scene.player, m = scene.map;
    if (p.dead || p.won) { jumpHeld = 0; target = null; bestT = t; bestX = 0; unstick = 0; fetch = null; return {}; }
    if (p.zip) { target = null; return {}; }
    const r = { right: true };
    // à l'atterrissage, on relâche saut une image pour pouvoir ré-appuyer aussitôt
    if (p.grounded && wasAir > 2 && jumpHeld > 0) { jumpHeld = 0; release = 1; }
    wasAir = p.grounded ? 0 : wasAir + 1;
    const front = p.x + p.w;
    const footTy = Math.floor((p.bottom - 1) / T);
    const stand = (tx, ty) => (m.solid(tx, ty) || '-/\\'.includes(m.get(tx, ty))) && !m.solid(tx, ty - 1) && m.get(tx, ty - 1) !== 'w';
    const groundCol = (tx, dyMin, dyMax) => { for (let dy = dyMin; dy <= dyMax; dy++) if (stand(tx, footTy + dy)) return true; return false; };
    const ax = Math.floor((front + 6) / T);
    // un mur ne vaut la peine d'être sauté que s'il a un sommet (pas un pilier qui monte jusqu'au ciel)
    const topAt = (cx) => { for (let dy = 1; dy <= 9; dy++) if (!m.solid(cx, footTy - dy)) return true; return false; };
    const wallAhead = (m.solid(ax, footTy) || m.solid(ax, footTy - 1)) && topAt(ax);
    const gapAt = (px) => { const gx = Math.floor(px / T); return !(groundCol(gx, 1, 9) || m.solid(gx, footTy)); };
    const gap = gapAt(front + 4);
    const gapSoon = gapAt(front + 14);
    // terre ferme atteignable d'un saut (jusqu'à 5 tuiles devant, de 4 rangées plus haut à 6 plus bas)
    const landing = (maxTiles) => { const fx = Math.floor(front / T); for (let d = 1; d <= maxTiles; d++) if (groundCol(fx + d, -4, 6)) return d; return 0; };
    const live = scene.platforms.filter((pl) => !pl.hidden);
    const reach = (pl) => (pl.x < front + 8 || (pl.x < front + 34 && (pl.dx || 0) <= 0.05)) && pl.x + pl.w > front + 2 && pl.y > p.bottom - 46 && pl.y < p.bottom + 40;

    // progression : si bloqué, on tente autre chose
    if (p.x > bestX + 8) { bestX = p.x; bestT = t; }
    if (t - bestT > 2.5 && !p.riding) { unstick = 0.5; bestT = t; }

    // Porte fermée devant et pas de clé : on retourne chercher la clé oubliée derrière
    let doorAhead = false;
    for (let dx = 0; dx <= 1 && !doorAhead; dx++) for (let dy = 0; dy <= 16; dy++) { const y = footTy + dy; if (m.get(ax + dx, y) === 'O' && !m.opened.has(y * m.w + ax + dx)) { doorAhead = true; break; } }
    if (doorAhead && scene.keys === 0 && !fetch) fetch = scene.entities.find((e) => e.kind === 'key' && e.active && e.x < p.x && p.x - e.x < 40 * T) || null;
    if (fetch) {
      if (!fetch.active) fetch = null;
      else {
        const out = { left: p.cx > fetch.x + 6, right: p.cx < fetch.x };
        if (p.grounded && Math.abs(p.cx - fetch.x - 6) < 20 && fetch.y < p.y - 4 && jumpHeld <= 0 && release <= 0) jumpHeld = 0.45;
        if (p.grounded && fetch.y > p.bottom + 4 && Math.abs(p.cx - fetch.x - 6) < 40) { out.down = true; if (jumpHeld <= 0 && release <= 0) jumpHeld = 0.2; }
        if (p.grounded && m.solid(Math.floor((p.x - 6) / T), footTy)) jumpHeld = jumpHeld > 0 ? jumpHeld : 0.45;
        if (jumpHeld > 0) { out.jump = true; jumpHeld -= 1 / 60; if (jumpHeld <= 0) release = 1; } else if (release > 0) release--;
        return out;
      }
    }

    // Sur une plateforme / un siège : on reste dessus tant qu'il n'y a pas de terre ferme à portée
    if (p.riding && p.grounded) {
      const pl = p.riding;
      const d = landing(3);
      if (pl.vertical && (m.solid(ax, footTy) || m.solid(ax, footTy - 1)) && pl.y <= pl.y0 - pl.travel + 4) { if (jumpHeld <= 0 && release <= 0) jumpHeld = 0.45; }
      // l'élan de la plateforme est conservé au saut : on attend qu'elle aille dans notre sens
      else if (d && !(pl.vertical && pl.dy < 0 && wallAhead) && (pl.vertical || pl.chair || (pl.dx || 0) >= -0.05)) { if (jumpHeld <= 0 && release <= 0) { jumpHeld = 0.45; target = null; } }
      else if (d) { const c = pl.x + pl.w / 2; r.right = p.cx < c + 6; r.left = false; }
      else {
        // on attend vers l'avant de la plateforme (saut plus court vers la suite)
        const c = pl.vertical || pl.chair ? pl.x + pl.w / 2 : pl.x + pl.w - 12;
        r.right = p.cx < c - 3; r.left = p.cx > c + 3;
        const nxt = live.find((q) => q !== pl && reach(q));
        if (nxt && (pl.vertical || pl.chair || (pl.dx || 0) >= -0.05)) { jumpHeld = 0.45; target = nxt; r.right = true; r.left = false; }
      }
    }

    // Lasers : on attend qu'ils soient éteints assez longtemps pour passer
    for (const e of scene.entities) {
      if (e.kind !== 'laser') continue;
      if (e.x + e.w < p.x - 2 || e.x > front + 26) continue;
      if (e.y > p.bottom + 2 || e.y + e.h < p.y - 30) continue;
      const cross = (e.x + e.w - p.x + 12) / 140 + 0.1;
      const offLeft = e.on ? 0 : e.period - e.cycle;
      if (e.on || offLeft < cross) { if (p.grounded) { r.right = false; r.left = p.x + p.w > e.x - 6; bestT = t; } }
    }

    const hazard = scene.entities.some((e) => (e.kind === 'spike') && e.x > p.x && e.x - front < 14 && Math.abs(e.y - p.y) < 20);
    const enemyE = scene.entities.find((e) => (e.stompable || e.kind === 'snowman') && !e.dead && e.kind !== 'owl' && e.x + e.w > p.x && e.x - front < 34 && Math.abs(e.y - p.y) < 22);
    const enemy = !!enemyE;
    const zipNear = scene.ziplines.some((z) => { const pr = z.project(p.cx, p.y - 3); return pr.s > -10 && pr.s < 40 && pr.d < 34 && z.ay < p.y; });

    // Hiboux : on ne saute pas un trou tant qu'un hibou traverse la trajectoire
    const owlBlock = scene.entities.some((e) => e.kind === 'owl' && !e.dead && e.y + e.h > p.y - 60 && e.y < p.bottom && e.x + e.w > front - 10 && e.x < front + 130);
    const onCrumble = m.get(Math.floor(p.x / T), footTy + 1) === 'x' || m.get(Math.floor((p.x + p.w) / T), footTy + 1) === 'x';
    let press = false;
    // on attend le hibou, mais pas indéfiniment : au bout de 2,5 s on tente sa chance
    if (owlBrave > 0) owlBrave -= 1 / 60;
    if (p.grounded && !p.riding && (gap || gapSoon) && owlBlock && !onCrumble && owlBrave <= 0) {
      r.right = false; r.left = gap; bestT = t; owlWait += 1 / 60;
      if (owlWait > 2.5) { owlWait = 0; owlBrave = 1.2; }
    }
    else if (p.grounded && !p.riding) {
      if (gap || gapSoon) {
        const pl = live.find((q) => q.x + q.w > front - 4 && q.x < front + 12 * T && Math.abs(q.y - p.bottom) < 8 * T);
        const d = landing(5);
        if (d) { if (gap) press = true; }
        else if (pl) {
          if (reach(pl)) { press = true; target = pl; }
          else if (gapSoon && !onCrumble) { r.right = false; bestT = t; }
          else if (gap || gapSoon) { press = true; target = pl; }
        } else if (gap) press = true;
      }
      if (wallAhead || hazard || enemy || zipNear) { press = true; scene.__why = [wallAhead, hazard, enemy, zipNear].map(Number).join('') + (enemyE ? enemyE.kind + Math.round(enemyE.x / T) : ''); }
    }
    // saut mural seulement si le mur a un sommet atteignable (pas les piliers qui montent jusqu'au ciel)
    const wcol = Math.floor((p.wallDir > 0 ? p.x + p.w + 2 : p.x - 2) / T);
    let wallTop = false; for (let dy = 1; dy <= 14; dy++) if (!m.solid(wcol, footTy - dy)) { wallTop = true; break; }
    if (!p.grounded && p.wallDir !== 0 && wallTop && t - lastWallJump > 0.12 && p.vy > -80) { press = true; lastWallJump = t; }
    const safeBelow = (() => { const fx = Math.floor(p.cx / T); for (let d = 0; d <= 1; d++) for (let dy = 1; dy <= 7; dy++) if (stand(fx + d, footTy + dy)) return true; return false; })();
    if (!p.grounded && p.canDouble && !p.usedDouble && p.vy > -20 && !target && (wallAhead || (gapAt(front + 4) && !safeBelow)) && !zipNear) press = true;
    if (!p.grounded && p.canDouble && !p.usedDouble && target && p.vy > 0 && p.bottom > target.y - 4 && (p.x + p.w < target.x || p.x > target.x + target.w)) press = true;
    if (unstick > 0) { unstick -= 1 / 60; if (p.grounded) press = true; else if (p.canDouble && !p.usedDouble && p.vy > 0) press = true; }
    if (p.grounded && jumpHeld <= 0) release = Math.max(0, release);
    if (release > 0) { release--; press = false; }
    if (press && jumpHeld <= 0) { jumpHeld = 0.45; }
    if (jumpHeld > 0) { r.jump = true; jumpHeld -= 1 / 60; if (jumpHeld <= 0) release = 1; }
    if (!p.grounded && p.wallDir !== 0 && t - lastWallJump < 0.1 && t - lastWallJump > 0.02) r.jump = false;
    // en l'air vers une plateforme : on vise son centre
    scene.__tgt = target ? Math.round(target.x / T * 10) / 10 : null;
    if (target && !p.grounded) {
      const c = target.x + target.w / 2;
      r.right = p.cx < c - 2; r.left = p.cx > c + 2;
      if (p.vy > 0 && p.bottom > target.y + 30) target = null;
    }
    if (p.grounded && !p.riding && !r.jump) target = null;
    return r;
  };
}

export function runProbe(game, params) {
  game.probe = true; // pas d'envoi au classement pendant les tests
  // Hasard déterministe : deux exécutions du même probe donnent exactement le même résultat.
  Math.random = mulberry32(+(params.get('seed') || 1));
  const errors = [];
  window.addEventListener('error', (e) => errors.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));
  if (params.get('audio')) return audioProbe(game, errors);
  if (params.get('scene') === 'map') {
    // Carte des mondes (captures) : progression simulée jusqu'au niveau demandé
    const upto = params.get('upto') || '4-6';
    for (const L of LEVELS) { if (L.id === upto) break; game.save.best[L.id] = { time: L.parTime - 3, rating: 1 + (L.id.endsWith('1') ? 2 : L.id.endsWith('2') ? 1 : 0), coins: 10, stars: [true, false, true] }; }
    game.save.lastLevel = params.get('level') || upto;
    const report = { errors };
    import('./worldmap.js').then(({ WorldMapScene }) => {
      game.scene = new WorldMapScene(game); game.fade = 0; game.fadeDir = 0;
      const inp = game.input; inp.update = () => {};
      const sc = game.scene, frames = +(params.get('frames') || 60), press = params.get('press');
      for (let i = 0; i < frames; i++) {
        for (const k of ['left', 'right', 'up', 'down', 'jump', 'confirm', 'pause']) inp.pressed[k] = false;
        if (press && i === 30) inp.pressed[press] = true;
        sc.update(1 / 60);
      }
      inp.update = () => {}; sc.update = () => {};
      report.world = sc.world; report.index = sc.index; report.scene = game.pending ? 'lancement' : 'map';
      const pre = document.createElement('pre'); pre.id = 'probe'; pre.textContent = JSON.stringify(report); document.body.appendChild(pre);
      game.start();
    });
    return;
  }
  // niveaux générés : level=GEN&gseed=12&glen=230 (sans mode, pour la validation par le bot)
  const genLevel = () => { const gl = generateLevel({ seed: +(params.get('gseed') || 1), length: +(params.get('glen') || 230), checkpoints: 75, ramp: +(params.get('gramp') || 260) }); return { id: 'GEN', label: 'GENERE', name: 'Graine ' + params.get('gseed'), theme: 'dawn', height: gl.height, parTime: 60, chunks: gl.chunks, signs: [] }; };
  // assist=speed,shield : mode assisté (réglages de l'appareil)
  game.settings.shield = (params.get('assist') || '').includes('shield');
  game.settings.gameSpeed = (params.get('assist') || '').includes('speed') ? 0.7 : 1;
  const level = params.get('level') === 'demo' ? DEMO_FX : params.get('level') === 'GEN' ? genLevel() : getLevel(params.get('level') || '1-1');
  const scene = new LevelScene(game, level, { theme: params.get('theme') || undefined });
  if (params.get('deathrule')) {
    // Règles de réapparition : tout ramasser / casser / éliminer, sauvegarde au milieu, puis chute.
    const mid = scene.map.w * T / 2;
    const count = () => ({
      coinsBefore: scene.entities.filter((e) => e.spawn && e.spawn.type === '$' && e.active !== false && e.x < mid - 8).length,
      coinsAfter: scene.entities.filter((e) => e.spawn && e.spawn.type === '$' && e.active !== false && e.x >= mid - 8).length,
      stars: scene.stars.filter(Boolean).length,
      enemies: scene.entities.filter((e) => e.spawn && 'eopf'.includes(e.spawn.type)).length,
      broken: scene.map.crumble.size, coins: scene.coins,
    });
    const initial = count();
    for (const e of scene.entities) {
      if (!e.spawn) continue;
      if (e.spawn.type === '$') { e.active = false; scene.coins++; }
      if (e.spawn.type === '*') { e.active = false; scene.stars[e.index] = true; }
      if ('eopf'.includes(e.spawn.type)) e.remove = true;
    }
    scene.entities = scene.entities.filter((e) => !e.remove);
    for (let ty = 0; ty < scene.map.h; ty++) for (let tx2 = 0; tx2 < scene.map.w; tx2++) if (scene.map.get(tx2, ty) === 'x') scene.map.crumble.set(ty * scene.map.w + tx2, { state: 'gone', t: 0, tx: tx2, ty });
    const brokenAll = scene.map.crumble.size;
    const looted = count();
    scene.checkpoint = { x: mid, y: 0 };
    scene.respawn();
    const after = count();
    const brokenBeforeCp = [...scene.map.crumble.values()].every((c) => c.tx * T < mid - 8);
    const pre = document.createElement('pre'); pre.id = 'probe';
    pre.textContent = JSON.stringify({ errors, initial, looted, after, brokenAll, brokenBeforeCp });
    document.body.appendChild(pre);
    return;
  }
  const tx = params.get('tx');
  if (tx !== null) {
    scene.player.x = +tx * T + 3;
    scene.player.y = (+(params.get('ty') ?? 2)) * T;
    scene.camera.snap(scene.player.cx, scene.player.y);
  }
  if (params.get('dbl')) scene.player.canDouble = true;
  if (params.get('god')) scene.god = true;
  if (params.get('look')) {
    // ?look=skin,accessoire,trainee,effet : tenue simulée (captures)
    const [skin, hat, trail, effect] = params.get('look').split(',');
    const e = game.save.equip;
    Object.assign(e, { skin: skin || e.skin, hat: hat || e.hat, trail: trail || e.trail, effect: effect || e.effect });
    for (const [c, id] of Object.entries(e)) if (!game.save.owned.includes(`${c}:${id}`)) game.save.owned.push(`${c}:${id}`);
    game.applyLook();
  }
  game.scene = scene;
  game.fade = 0; game.fadeDir = -1;
  const script = SCRIPTS[params.get('script') || 'walk'] || SCRIPTS.walk;
  const dur = +(params.get('dur') || 4);
  const fps = +(params.get('fps') || 60);
  const prev = {};
  const samples = [];
  const inp = game.input;
  inp.update = () => {};
  let t = 0;
  const frames = Math.round(dur * fps);
  for (let i = 0; i < frames; i++) {
    const dt = 1 / fps;
    t += dt;
    game.lastDt = dt;
    game.time += dt;
    const cur = script(t, scene);
    for (const k of ['left', 'right', 'down', 'jump', 'up', 'pause', 'restart', 'confirm', 'debug']) {
      const v = !!cur[k];
      inp.pressed[k] = v && !prev[k];
      inp.held[k] = v;
      prev[k] = v;
    }
    inp.taps = [];
    if (game.scene !== scene) break;
    if (scene.state === 'won' && params.get('stopwin')) break;
    scene.update(dt);
    const tr = params.get('trace');
    if (tr) { const [a, b] = tr.split('-').map(Number); const px = scene.player.cx / T; if (px >= a && px <= b && samples.length < 400) samples.push([+t.toFixed(2), +px.toFixed(2), +(scene.player.bottom / T).toFixed(2), scene.player.grounded ? 1 : 0, (cur.right ? 'R' : '') + (cur.left ? 'L' : '') + (cur.jump ? 'J' : ''), scene.player.riding ? 1 : 0, scene.keys, (scene.__why || '') + (scene.__tgt != null ? 'T' + scene.__tgt : ''), Math.round((scene.platforms.find((q) => Math.abs(q.x - scene.player.x) < 120) || {}).x / T * 10) / 10]); scene.__why = ''; }
    else if (scene.boss && params.get('bt') && i % 6 === 0) samples.push([+t.toFixed(1), scene.boss.st, scene.boss.hp, Math.round(scene.boss.x), Math.round(scene.player.cx), Math.round(scene.player.bottom), (cur.right ? 'R' : '') + (cur.left ? 'L' : '') + (cur.jump ? 'J' : '')]);
    else if (i % 15 === 0) samples.push([+t.toFixed(2), Math.round(scene.player.x / T * 10) / 10, Math.round(scene.player.y / T * 10) / 10, scene.player.grounded ? 1 : 0]);
  }
  for (const k in inp.held) { inp.held[k] = false; inp.pressed[k] = false; }
  if (params.get('debug')) game.debug = true;
  // bench=1 : coût moyen et pire cas d'une image (update + rendu) à la position atteinte
  let bench;
  if (params.get('bench')) {
    const ms = [];
    for (let i = 0; i < 180; i++) { const t0 = performance.now(); scene.update(1 / 60); scene.render(game.ctx); ms.push(performance.now() - t0); }
    ms.sort((a, b) => a - b);
    bench = { avg: +(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(2), p95: +ms[Math.floor(ms.length * 0.95)].toFixed(2), max: +ms[ms.length - 1].toFixed(2), particles: scene.particles.list ? scene.particles.list.length : undefined, entities: scene.entities.length };
  }
  const p = scene.player;
  const pre = document.createElement('pre');
  pre.id = 'probe';
  pre.textContent = JSON.stringify({
    errors, t: +t.toFixed(2), tileX: +(p.cx / T).toFixed(1), tileY: +(p.bottom / T).toFixed(2),
    vx: Math.round(p.vx), grounded: p.grounded, dead: p.dead, deaths: scene.deaths, coins: scene.coins, stars: scene.stars, state: scene.state,
    dbl: p.canDouble, assisted: scene.assisted, shieldHits: scene.shieldHits || 0, best: game.save.best[scene.data.id] || null, online: scene.results && scene.results.online, deathLog: scene.deathLog, starsGot: scene.stars.filter(Boolean).length, keys: scene.keys, mapW: scene.map.w, cam: [Math.round(scene.camera.x), Math.round(scene.camera.left), Math.round(scene.camera.vw), scene.bounds.w, game.view.w], boss: scene.boss ? { hp: scene.boss.hp, phase: scene.boss.phase, st: scene.boss.st, hits: scene.godHits || 0, log: scene.godLog } : undefined, samples: params.get('samples') ? samples : undefined, bench,
  });
  document.body.appendChild(pre);
  scene.freeze = 0;
  scene.update = () => {};
}

/** Exécute tous les chemins du moteur musical (morceaux, couches, instruments, jingles) et rapporte les erreurs. */
async function audioProbe(game, errors) {
  const { TRACKS } = await import('../engine/music.js');
  const report = { errors, tracks: {}, ctx: null };
  try {
    game.audio.unlock();
    const ctx = game.audio.ctx;
    report.ctx = ctx ? ctx.state : 'none';
    const m = game.music;
    for (const id of Object.keys(TRACKS)) {
      let steps = 0;
      try {
        m.start(id, 0.1);
        for (const lvl of [0, 0.5, 1]) m.setIntensity(lvl);
        const tr = TRACKS[id];
        const sd = 60 / tr.bpm / 4;
        for (let st = 0; st < tr.chords.length * 16; st++) { m.scheduleStep(m.current, st, ctx.currentTime + 0.05 + st * sd, sd); steps++; }
        for (const k of Object.keys(tr.lead.notes)) if (tr.lead.notes[k].split(/\s+/).length !== 16) errors.push(`${id} mesure ${k} : ${tr.lead.notes[k].split(/\s+/).length} jetons`);
      } catch (e) { errors.push(id + ': ' + e.message); }
      report.tracks[id] = steps;
    }
    for (const j of ['victory', 'death', 'gameover', 'unlock']) { try { m.jingle(j); } catch (e) { errors.push('jingle ' + j + ': ' + e.message); } }
    for (const sfx of ['jump', 'djump', 'walljump', 'land', 'coin', 'star', 'stomp', 'spring', 'death', 'respawn', 'checkpoint', 'powerup', 'crumble', 'splash', 'skid', 'bonk', 'sign', 'select', 'move', 'pause', 'rate', 'win']) {
      try { game.audio.play(sfx, 1); } catch (e) { errors.push('sfx ' + sfx + ': ' + e.message); }
    }
    m.muffle(true); m.duck(0.3, 0.2); m.stop(0.1);
  } catch (e) { errors.push(e.message); }
  const pre = document.createElement('pre');
  pre.id = 'probe';
  pre.textContent = JSON.stringify(report);
  document.body.appendChild(pre);
  game.start();
}
