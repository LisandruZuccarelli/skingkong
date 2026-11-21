import { Game } from './game/game.js';
import { needsFirstRun, startFirstRun } from './modes/firstrun.js';
import { MIX } from './engine/music.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
const params = new URLSearchParams(location.search);
if (params.has('probe')) {
  import('./game/probe.js').then((m) => { m.runProbe(game, params); game.start(); });
} else {
  // ?warm=<s> : pré-simule l'écran titre (captures d'écran automatisées).
  const warm = +(params.get('warm') || 0);
  // ?menu=shop|succes|defis|options (captures d'écran) ; &coins=500 : forfaits fictifs en mémoire ; &tab=1 : rayon de la boutique
  if (params.get('menu')) {
    import('./game/menus.js').then(async (M) => {
      if (params.get('coins')) { game.save.earnedBy = { probe: game.save.spent + +params.get('coins') }; game.progress.sum(); }
      const O = await import('./game/online-menus.js');
      // &demo=1 : joueurs fictifs en mode local pour remplir les classements (captures uniquement)
      if (params.get('demo')) await seedDemo(game);
      const B = await import('./game/bonus-menus.js');
      const E = await import('./modes/editor.js');
      const S = { bonus: B.BonusScene, defi_prep: B.ChallengeSetupScene, editeur: E.EditorScene, shop: M.ShopScene, succes: M.AchievementsScene, defis: M.ChallengesScene, options: M.OptionsScene, compte: O.AccountScene, classements: O.LeaderboardScene, profil: O.ProfileScene }[params.get('menu')];
      if (!S) return;
      game.scene = new S(game);
      if (params.get('tab')) { game.scene.cat = +params.get('tab'); game.scene.index = +(params.get('item') || 0); }
      game.fade = 0;
      if (params.get('form') && game.scene.form) game.scene.form(params.get('form')); // formulaire ouvert (capture)
    });
  }
  // ?upto=2-3 : progression simulée en mémoire (sans sauvegarder), pour les captures de l'écran titre
  if (params.get('upto')) {
    import('./levels/index.js').then(({ LEVELS }) => {
      for (const L of LEVELS) { if (L.id === params.get('upto')) break; game.save.best[L.id] = { time: 40, rating: 2, coins: 10, stars: [true, false, true] }; }
      game.save.lastLevel = params.get('upto');
    });
  }
  // toute première visite (sans paramètre de capture) : on joue tout de suite, menu ensuite
  if (![...params.keys()].length) {
    if (needsFirstRun(game.save)) { startFirstRun(game); game.fade = 0; }
  }
  // ?first=<tuile> : premier essai forcé, Kong placé à cette tuile (captures)
  if (params.has('first')) { startFirstRun(game); game.fade = 0; game.scene.player.x = +params.get('first') * 16; }
  // ?ecoute=w1 : écoute des morceaux (clic pour démarrer, ↑/↓ change de morceau, ←/→ intensité des synthés, N : dosage niveau / carte)
  if (params.has('ecoute')) {
    const LIST = ['title', 'w1', 'w2', 'w3', 'w4', 'boss1', 'boss2', 'boss3', 'boss4', 'boss'];
    const NAMES = { title: 'ACCUEIL', w1: 'MONDE 1', w2: 'MONDE 2', w3: 'MONDE 3', w4: 'MONDE 4', boss1: 'BOSS 1', boss2: 'BOSS 2', boss3: 'BOSS 3', boss4: 'BOSS 4', boss: 'ANCIEN BOSS (SYNTHE)' };
    let id = params.get('ecoute');
    let lvl = 0.3, inLevel = false, started = false;
    window.game = game; // outils de mesure
    game.scene = {
      update() {
        const inp = game.input;
        const mix = inLevel ? MIX.level : MIX.map;
        // téléphone : 1er toucher = lecture, toucher suivant = morceau suivant
        const tapNext = started && inp.taps.length;
        if (inp.pressed.jump || inp.pressed.confirm || (inp.taps.length && !started)) { started = true; game.music.play(id, mix); }
        const d = inp.pressed.down || tapNext ? 1 : inp.pressed.up ? -1 : 0;
        if (d) { const i = LIST.indexOf(id); id = LIST[(i + d + LIST.length) % LIST.length]; if (started) game.music.play(id, mix); }
        const n = inp.keys.has('KeyN');
        if (n && !this.n) { inLevel = !inLevel; if (started) game.music.play(id, inLevel ? MIX.level : MIX.map); }
        this.n = n;
        if (inp.pressed.right) lvl = Math.min(1, lvl + 0.1);
        if (inp.pressed.left) lvl = Math.max(0, lvl - 0.1);
        game.music.setIntensity(lvl);
      },
      render(ctx) {
        const v = game.view;
        ctx.fillStyle = '#0e1650'; ctx.fillRect(0, 0, v.w, v.h);
        game.text(ctx, 'ECOUTE : ' + (NAMES[id] || id.toUpperCase()), v.w / 2, 80, { align: 'center', scale: 2, color: '#ffc83d' });
        game.text(ctx, game.music.current ? 'EN COURS' : 'CLIQUE OU ESPACE POUR LANCER', v.w / 2, 110, { align: 'center' });
        game.text(ctx, `DOSAGE : ${inLevel ? 'NIVEAU 20%' : 'CARTE 50%'}  (N)`, v.w / 2, 130, { align: 'center', color: '#7ee8ff' });
        game.text(ctx, '↑ / ↓ (OU TOUCHER) : MORCEAU SUIVANT', v.w / 2, 145, { align: 'center', color: '#9fb2ea' });
        if (id === 'boss') game.text(ctx, `INTENSITE ${Math.round(lvl * 100)}%  (← / →)`, v.w / 2, 160, { align: 'center', color: '#9fb2ea' });
      },
    };
    game.fade = 0;
  }
  // ?card=1 : aperçu de l'image de partage (captures)
  if (params.has('card')) {
    import('./game/share.js').then((S) => { S.preloadShare(); setTimeout(() => { const c = S.drawCard(game, { head: '1-3 LA FORET', big: '0:42.18', lines: [['★★·   CHUTES : 2', '#ffffff'], ['3E DU CLASSEMENT', '#7ee8ff']], pseudo: 'ZUCCA' }); c.style.cssText = 'position:fixed;left:0;top:0;height:100vh;width:auto;z-index:99;background:#000'; document.body.appendChild(c); }, 800); });
  }
  const run = () => {
    for (let i = 0; i < warm * 60; i++) {
      game.lastDt = 1 / 60; game.time += 1 / 60;
      game.updateFade(1 / 60);
      game.scene.update(1 / 60);
    }
    game.start();
  };
  if (warm && document.readyState !== 'complete') window.addEventListener('load', run);
  else run();
}
canvas.focus();
window.__skingkong = game;

if (import.meta.env.PROD && 'serviceWorker' in navigator && !params.has('probe')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

async function seedDemo(game) {
  // écrit directement dans le stockage local (pas de hachage : capture d'écran instantanée)
  const o = game.online, b = o.backend;
  if (o.mode !== 'local') return;
  const { utcDay, utcWeek } = await import('./online/rules.js');
  const day = utcDay(), week = utcWeek(day);
  const P = [['YetiFou', 'or', 1], ['Kong_75', 'estp', 1], ['Mathilde', 'neon', 1], ['BTP_Boss', 'chantier', 0], ['Glisseur', 'pirate', 0], ['LouisDJ', 'dj', 1], ['Paulo', 'ninja', 0], ['KongMaster', 'classic', 1]];
  const L = ['1-1', '1-2', '1-3', '2-1', o.dailyLevel(), o.weeklyLevel()];
  const acc = {}, scores = [];
  P.forEach(([p, skin, estp], i) => {
    const id = 'demo' + i;
    acc[id] = { id, pseudo: p, email: p.toLowerCase() + '@demo.fr', salt: '00', hash: '00', estp: !!estp, skin, created: 0, friends: i === 7 ? ['demo2', 'demo6'] : [] };
    L.forEach((lv, j) => { if ((i + j) % 4 !== 3) scores.push({ user: id, pseudo: p, skin, estp: !!estp, level: lv, time: Math.round((25 + i * 3.7 + j * 6.1 + ((i * j) % 5)) * 100) / 100, coins: 3, deaths: 0, day, week, at: 0 }); });
  });
  b.st.set('local.accounts', acc);
  b.st.set('local.scores', scores);
  if (new URLSearchParams(location.search).get('demo') === '2') {
    b.st.set('local.session', 'demo7');
    b.user = b.publicUser(acc.demo7);
    game.save.owner = 'demo7';
  }
}

// ?play=infini|jour|defi|speedrun : lance directement un mode bonus (captures)
if (new URLSearchParams(location.search).get('play')) {
  import('./modes/modes.js').then((Md) => {
    const p = new URLSearchParams(location.search);
    const g = window.__skingkong;
    const m = p.get('play');
    g.goto = (f) => { g.scene = f(); g.fade = 0; g.fadeDir = -1; }; // capture : pas de fondu
    if (m === 'infini' || m === 'fin') Md.startInfinite(g, 7);
    if (m === 'jour') Md.startDaily(g);
    if (m === 'defi') Md.startChallenge(g, p.get('level') || '1-2', (p.get('mods') || 'onelife,dark').split(','));
    if (m === 'speedrun') Md.startSpeedrun(g, 1);
    if (m === 'fin') setTimeout(() => { const l = g.scene; l.endRun({ title: 'NOUVEAU RECORD !', titleColor: '#ffd23f', lines: [['RATTRAPE PAR L\'AVALANCHE', '#ff8a9a'], ['342 M', '#ffffff', 3], ['', null], ['RECORD : 342 M', '#9fb2ea'], ['TEMPS 0:38.41   FORFAITS 28', '#cfe0ff'], ['+41 FORFAITS', '#ffc83d']], prompt: 'SAUT / R : NOUVELLE COURSE   ECHAP : MODES BONUS' }); }, 500);
  });
}
