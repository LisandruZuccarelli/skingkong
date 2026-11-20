// Écrans en ligne : compte (connexion, inscription, synchronisation), classements, profil joueur et amis.
import { drawText } from '../engine/font.js';
import { formatTime } from '../engine/util.js';
import { panel } from './hud.js';
import { MenuScene, kongFor, drawIcon } from './menus.js';
import { drawHatRows } from './catalog.js';
import { ACHIEVEMENTS } from './progress.js';
import { SCOPES, FILTERS } from '../online/rules.js';
import { openForm } from '../online/form.js';
import { levelLong } from './labels.js';
import { LEVELS } from '../levels/index.js';

const INK = '#0a0d24';

/** Liste d'options verticale (clavier, manette, tactile) */
function optionList(scene, items, x, y0, w, step = 15) {
  const g = scene.game, inp = g.input;
  if (!scene.busy && !inp.blocked) {
    if (inp.pressed.down) { scene.index = (scene.index + 1) % items.length; g.audio.play('move'); }
    if (inp.pressed.up && !inp.pressed.confirm) { scene.index = (scene.index + items.length - 1) % items.length; g.audio.play('move'); }
    let chosen = -1;
    if (inp.pressed.confirm || (inp.pressed.jump && !inp.held.up)) chosen = scene.index;
    items.forEach((_, i) => { if (inp.tapIn(x, y0 + i * step - 3, w, 14)) { if (i === scene.index) chosen = i; else scene.index = i; } });
    if (chosen >= 0 && items[chosen]) { g.audio.play('select'); items[chosen].act(); }
  }
  scene.index = Math.min(scene.index, items.length - 1);
}
function drawOptions(ctx, scene, items, x, y0, w, step = 15) {
  items.forEach((it, i) => {
    const y = y0 + i * step, sel = i === scene.index;
    panel(ctx, x, y - 3, w, 13, sel ? 'rgba(126,232,255,0.22)' : 'rgba(10,13,36,0.7)', sel ? '#7ee8ff' : '#2a3060');
    drawText(ctx, (sel ? '> ' : '') + it.label, x + w / 2, y, { align: 'center', color: it.color || (sel ? '#ffffff' : '#9fb2ea') });
  });
}
/** Kong avec la tenue équipée */
function drawKong(ctx, g, x, y, sc, t = 0) {
  const k = kongFor(g.save.equip.skin);
  const fr = Math.sin(t * 3) > 0.8 ? k.win : k.idle;
  const bob = Math.round(Math.sin(t * 2.5) * sc * 0.5);
  ctx.drawImage(fr, Math.round(x - 8 * sc), Math.round(y - fr.height * sc + bob), fr.width * sc, fr.height * sc);
  drawHatRows(ctx, g.look.hat, Math.round(x - 8 * sc), Math.round(y - fr.height * sc + bob), sc);
}
const modeLine = (o) => (o.online ? 'SERVEUR EN LIGNE' : 'MODE LOCAL : COMPTES ET CLASSEMENTS DE CET APPAREIL');
const modeShort = (o) => (o.online ? 'SERVEUR EN LIGNE' : 'MODE LOCAL (CET APPAREIL)');

// ---------------------------------------------------------------------------
// Compte
// ---------------------------------------------------------------------------
export class AccountScene extends MenuScene {
  constructor(game) { super(game, 'COMPTE', 'dawn'); this.index = 0; this.busy = false; this.msg = ''; }
  get online() { return this.game.online; }
  form(kind) {
    const o = this.online, g = this.game;
    const signup = kind === 'signup';
    openForm(g, signup ? {
      title: 'Creer un compte',
      intro: 'Ta progression, tes skins et tes succes te suivent sur tous tes appareils, et tes temps entrent au classement.',
      fields: [
        { name: 'pseudo', label: 'Pseudo (affiche au classement)', max: 16, auto: 'username' },
        { name: 'email', label: 'Adresse e-mail', type: 'email', max: 120, auto: 'email' },
        { name: 'password', label: 'Mot de passe (8 caracteres minimum)', type: 'password', max: 72, auto: 'new-password' },
      ],
      submit: 'Creer',
      note: o.online
        ? 'Le mot de passe est hache par le serveur ; ton e-mail n\'est jamais affiche. Ta partie actuelle rejoint ton compte.'
        : 'Mode local : le compte est enregistre sur cet appareil uniquement (mot de passe hache). Ta partie actuelle rejoint ton compte.',
      onSubmit: async (v) => { await o.signUp(v); this.msg = `BIENVENUE ${o.user.pseudo.toUpperCase()} !`; g.audio.play('powerup'); },
    } : {
      title: 'Se connecter',
      fields: [
        { name: 'login', label: o.online ? 'Adresse e-mail' : 'Pseudo ou e-mail', type: o.online ? 'email' : 'text', max: 120, auto: o.online ? 'email' : 'username' },
        { name: 'password', label: 'Mot de passe', type: 'password', max: 72, auto: 'current-password' },
      ],
      submit: 'Connexion',
      note: 'Si tu jouais en invite, ta partie rejoint ton compte (rien n\'est perdu).',
      onSubmit: async (v) => { await o.signIn(v); this.msg = `RE-BONJOUR ${o.user.pseudo.toUpperCase()} !`; g.audio.play('powerup'); },
    });
  }
  run(p) {
    this.busy = true; this.msg = 'PATIENTE...';
    p.then((m) => { this.msg = (m || this.online.status || '').toUpperCase(); })
      .catch((e) => { this.msg = String(e.message).toUpperCase(); })
      .finally(() => { this.busy = false; });
  }
  items() {
    const o = this.online, g = this.game, u = o.user;
    if (!u) return [
      { label: 'CREER UN COMPTE', act: () => this.form('signup') },
      { label: 'SE CONNECTER', act: () => this.form('signin') },
      { label: 'CONTINUER EN INVITE', act: () => this.back() },
    ];
    return [
      { label: 'SYNCHRONISER MAINTENANT', act: () => this.run(o.sync().then((ok) => (ok ? 'PROGRESSION SYNCHRONISEE' : o.status))) },
      { label: 'MON PROFIL ET MES AMIS', act: () => g.gotoProfile() },
      { label: 'CLASSEMENTS', act: () => g.gotoLeaderboard() },
      { label: 'SE DECONNECTER', act: () => this.run(o.signOut().then(() => 'DECONNECTE : TA PARTIE RESTE SUR CET APPAREIL')), color: '#ff8a9a' },
    ];
  }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const v = this.game.view;
    optionList(this, this.items(), v.w / 2 + 10, this.listY(), Math.min(220, v.w / 2 - 20));
  }
  listY() { return this.game.online.user ? 96 : 120; }
  render(ctx) {
    const g = this.game, v = g.view, o = this.online, u = o.user;
    this.drawFrame(ctx, { keys: '↑/↓ : CHOISIR   SAUT/ENTREE : VALIDER   ECHAP : RETOUR', touch: 'TOUCHE UNE OPTION' });
    const lx = v.w / 4 + 4;
    drawKong(ctx, g, lx, 150, 4, this.t);
    ctx.fillStyle = 'rgba(10,13,36,0.4)'; ctx.fillRect(lx - 34, 150, 68, 4);
    const rx = v.w / 2 + 10, rw = Math.min(220, v.w / 2 - 20);
    if (u) {
      drawText(ctx, u.pseudo.toUpperCase(), lx, 168, { align: 'center', scale: 2, color: '#ffffff', outline: INK });
      if (u.estp) { panel(ctx, lx - 56, 188, 112, 13, 'rgba(255,200,61,0.2)', '#ffc83d'); drawText(ctx, 'LISTE SKINGKONG', lx, 191, { align: 'center', color: '#ffc83d' }); }
      drawText(ctx, 'CONNECTE', rx + rw / 2, 34, { align: 'center', color: '#5cff8a', outline: INK });
      drawText(ctx, modeShort(o), rx + rw / 2, 46, { align: 'center', color: '#9fb2ea', outline: INK });
      const ago = o.lastSync ? Math.max(0, Math.round((Date.now() - o.lastSync) / 60000)) : null;
      drawText(ctx, ago === null ? 'PAS ENCORE SYNCHRONISE' : ago < 1 ? 'SYNCHRONISE A L\'INSTANT' : `SYNCHRONISE IL Y A ${ago} MIN`, rx + rw / 2, 58, { align: 'center', color: '#7ee8ff', outline: INK });
      const q = o.queue().length;
      if (q) drawText(ctx, `${q} RESULTAT${q > 1 ? 'S' : ''} EN ATTENTE D'ENVOI`, rx + rw / 2, 70, { align: 'center', color: '#ffc83d', outline: INK });
    } else {
      drawText(ctx, 'INVITE', lx, 168, { align: 'center', scale: 2, color: '#cfe0ff', outline: INK });
      const lines = ['UN COMPTE, C\'EST :', '- TA PARTIE SUR TOUS TES APPAREILS', '- TES TEMPS AU CLASSEMENT', '- DES AMIS A DEFIER', '- LE CLASSEMENT LISTE SKINGKONG'];
      lines.forEach((l, i) => drawText(ctx, l, rx, 34 + i * 11, { color: i ? '#cfe0ff' : '#ffc83d', outline: INK }));
      drawText(ctx, modeShort(o), rx + rw / 2, 96, { align: 'center', color: '#9fb2ea', outline: INK });
    }
    drawOptions(ctx, this, this.items(), rx, this.listY(), rw);
    if (this.msg) drawText(ctx, this.msg, v.w / 2, v.h - 26, { align: 'center', color: this.busy ? '#9fb2ea' : '#ffc83d', outline: INK });
  }
}

// ---------------------------------------------------------------------------
// Classements
// ---------------------------------------------------------------------------
export class LeaderboardScene extends MenuScene {
  constructor(game) {
    super(game, 'CLASSEMENTS', 'glacier');
    this.scope = 0; this.filter = 0;
    const stages = LEVELS.map((l) => l.id);
    this.levelIdx = Math.max(0, stages.indexOf(game.save.lastLevel || '1-1'));
    this.data = null; this.error = ''; this.reqId = 0;
    this.load();
  }
  get scopeId() { return SCOPES[this.scope].id; }
  load() {
    const id = ++this.reqId;
    this.data = null; this.error = '';
    this.game.online.board({ scope: this.scopeId, filter: FILTERS[this.filter].id, level: LEVELS[this.levelIdx].id, limit: 50 })
      .then((d) => { if (id === this.reqId) this.data = d; })
      .catch((e) => { if (id === this.reqId) this.error = String(e.message).toUpperCase(); });
  }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const g = this.game, inp = g.input, v = g.view;
    let changed = false;
    if (inp.pressed.right || inp.pressed.left) { this.scope = (this.scope + (inp.pressed.right ? 1 : SCOPES.length - 1)) % SCOPES.length; changed = true; }
    if (inp.pressed.down || (inp.pressed.up && !inp.pressed.confirm)) { this.filter = (this.filter + (inp.pressed.down ? 1 : FILTERS.length - 1)) % FILTERS.length; changed = true; }
    if (this.scopeId === 'level' && (inp.pressed.confirm || (inp.pressed.jump && !inp.held.up))) { this.levelIdx = (this.levelIdx + 1) % LEVELS.length; changed = true; }
    // tactile : onglets et filtres
    const tw = this.tabW();
    SCOPES.forEach((_, i) => { if (inp.tapIn(this.tabX() + i * tw, 26, tw - 2, 14)) { this.scope = i; changed = true; } });
    FILTERS.forEach((_, i) => { if (inp.tapIn(this.filterX(i), 44, this.filterW(i), 12)) { this.filter = i; changed = true; } });
    if (this.scopeId === 'level' && inp.tapIn(v.w / 2 - 120, 59, 240, 12)) { this.levelIdx = (this.levelIdx + 1) % LEVELS.length; changed = true; }
    if (changed) { g.audio.play('move'); this.load(); }
  }
  tabW() { return Math.min(90, (this.game.view.w - 16) / SCOPES.length); }
  tabX() { return this.game.view.w / 2 - (this.tabW() * SCOPES.length) / 2; }
  filterW(i) { return FILTERS[i].name.length * 6 + 14; }
  filterX(i) { const tot = FILTERS.reduce((a, _, j) => a + this.filterW(j) + 4, -4); let x = this.game.view.w / 2 - tot / 2; for (let j = 0; j < i; j++) x += this.filterW(j) + 4; return x; }
  render(ctx) {
    const g = this.game, v = g.view, o = g.online;
    this.drawFrame(ctx, { keys: `←/→ : CLASSEMENT   ↑/↓ : TOUS / AMIS / ESTP${this.scopeId === 'level' ? '   SAUT : NIVEAU SUIVANT' : ''}   ECHAP : RETOUR`, touch: 'TOUCHE LES ONGLETS' });
    const tw = this.tabW();
    SCOPES.forEach((s, i) => {
      const x = this.tabX() + i * tw, on = i === this.scope;
      panel(ctx, x, 26, tw - 2, 14, on ? 'rgba(255,200,61,0.25)' : 'rgba(10,13,36,0.8)', on ? '#ffc83d' : '#2a3060');
      drawText(ctx, s.name, x + tw / 2 - 1, 30, { align: 'center', color: on ? '#ffd23f' : '#9fb2ea' });
    });
    FILTERS.forEach((f, i) => {
      const x = this.filterX(i), on = i === this.filter;
      panel(ctx, x, 44, this.filterW(i), 12, on ? 'rgba(126,232,255,0.22)' : 'rgba(10,13,36,0.7)', on ? '#7ee8ff' : '#2a3060');
      drawText(ctx, f.name, x + this.filterW(i) / 2, 47, { align: 'center', color: on ? '#ffffff' : '#7f8cc8' });
    });
    const lvl = this.data ? this.data.level : (this.scopeId === 'level' ? LEVELS[this.levelIdx].id : null);
    const sub = { global: 'NIVEAUX TERMINES, PUIS SOMME DES MEILLEURS TEMPS', level: `< ${lvl ? levelLong(lvl) : ''} >`, daily: 'NIVEAU DU JOUR (PISTE GENEREE, NOUVELLE CHAQUE JOUR)', weekly: `NIVEAU DE LA SEMAINE : ${lvl ? levelLong(lvl) : '...'}` }[this.scopeId];
    drawText(ctx, sub, v.w / 2, 61, { align: 'center', color: this.scopeId === 'global' ? '#9fb2ea' : '#ffc83d', outline: INK });
    const w = Math.min(380, v.w - 16), x = v.w / 2 - w / 2, top = 74, rowH = 13;
    const maxRows = Math.floor((v.h - top - 34) / rowH);
    const center = (t, c = '#9fb2ea') => drawText(ctx, t, v.w / 2, top + 40, { align: 'center', color: c, outline: INK });
    if (!o.user) drawText(ctx, 'CONNECTE-TOI (MENU COMPTE) POUR APPARAITRE AU CLASSEMENT', v.w / 2, v.h - 24, { align: 'center', color: '#ffc83d', outline: INK });
    if (this.error) return center(this.error, '#ff8a9a');
    if (!this.data) return center('CHARGEMENT' + '.'.repeat(1 + Math.floor(this.t * 3) % 3));
    let rows = this.data.rows;
    if (!rows.length) return center(FILTERS[this.filter].id === 'friends' && !o.user ? 'CONNECTE-TOI POUR VOIR TES AMIS' : 'PERSONNE POUR L\'INSTANT : SOIS LE PREMIER !');
    const me = this.data.me;
    rows = rows.slice(0, maxRows);
    if (me && !rows.some((r) => r.me)) rows = [...rows.slice(0, maxRows - 1), me];
    rows.forEach((r, i) => {
      const y = top + i * rowH;
      const podium = ['#ffd23f', '#dfe6f2', '#e0a070'][r.rank - 1];
      panel(ctx, x, y, w, rowH - 1, r.me ? 'rgba(126,232,255,0.25)' : 'rgba(10,13,36,0.75)', r.me ? '#7ee8ff' : podium ? podium : '#2a3060');
      drawText(ctx, `${r.rank}`, x + 18, y + 3, { align: 'right', color: podium || '#9fb2ea' });
      const k = kongFor(r.skin || 'classic');
      ctx.drawImage(k.idle, 0, 0, 16, 10, x + 24, y + 1, 16, 10);
      drawText(ctx, r.pseudo.toUpperCase(), x + 44, y + 3, { color: r.me ? '#ffffff' : '#cfe0ff' });
      if (r.estp) drawText(ctx, 'SKINGKONG', x + 44 + r.pseudo.length * 6 + 6, y + 3, { color: '#ffc83d' });
      const val = this.scopeId === 'global' ? `${r.levels} NIV.   ${formatTime(r.time)}` : formatTime(r.time);
      drawText(ctx, val, x + w - 6, y + 3, { align: 'right', color: '#ffffff' });
    });
    drawText(ctx, `${this.data.total} JOUEUR${this.data.total > 1 ? 'S' : ''}  -  ${modeLine(o)}`, v.w / 2, v.h - (o.user ? 24 : 35), { align: 'center', color: '#7f8cc8', outline: INK });
  }
}

// ---------------------------------------------------------------------------
// Profil joueur et amis
// ---------------------------------------------------------------------------
export class ProfileScene extends MenuScene {
  constructor(game) {
    super(game, 'PROFIL', 'night');
    this.index = 0; this.busy = false; this.msg = ''; this.friends = null;
    this.loadFriends();
  }
  loadFriends() {
    const o = this.game.online;
    if (!o.user) { this.friends = []; return; }
    o.friends().then((f) => { this.friends = f; }).catch((e) => { this.friends = []; this.msg = String(e.message).toUpperCase(); });
  }
  items() {
    const o = this.game.online, g = this.game;
    if (!o.user) return [{ label: 'CREER UN COMPTE / SE CONNECTER', act: () => g.gotoAccount() }];
    const list = [{ label: '+ AJOUTER UN AMI', act: () => openForm(g, {
      title: 'Ajouter un ami', intro: 'Entre le pseudo exact de ton ami. Il apparaitra dans le classement AMIS.',
      fields: [{ name: 'pseudo', label: 'Pseudo', max: 16 }], submit: 'Ajouter',
      onSubmit: async (v) => { const f = await o.addFriend(v.pseudo); this.msg = `${String(f.pseudo).toUpperCase()} AJOUTE A TES AMIS`; this.loadFriends(); },
    }) }];
    for (const f of this.friends || []) list.push({ label: `${f.pseudo.toUpperCase()}${f.estp ? '  (SKINGKONG)' : ''}`, friend: f, act: () => {
      if (this.confirm !== f.id) { this.confirm = f.id; this.msg = `ENCORE UNE FOIS POUR RETIRER ${f.pseudo.toUpperCase()}`; return; }
      this.confirm = null; o.removeFriend(f.id).then(() => { this.msg = 'AMI RETIRE'; this.loadFriends(); });
    } });
    return list;
  }
  stats() {
    const g = this.game, s = g.save, st = s.stats || {};
    const stages = LEVELS.filter((l) => !l.boss);
    const done = LEVELS.filter((l) => s.best && s.best[l.id]).length;
    const stars = stages.reduce((a, l) => a + ((s.best && s.best[l.id] && s.best[l.id].stars) || []).filter(Boolean).length, 0);
    const pt = Math.floor(st.playTime || 0);
    return [
      ['NIVEAUX', `${done}/${LEVELS.length}`], ['ETOILES', `${stars}/${stages.length * 3}`],
      ['SUCCES', `${g.progress.unlockedCount}/${ACHIEVEMENTS.length}`], ['BOSS VAINCUS', `${LEVELS.filter((l) => l.boss && s.best && s.best[l.id]).length}/4`],
      ['TEMPS DE JEU', `${Math.floor(pt / 3600)} H ${String(Math.floor(pt / 60) % 60).padStart(2, '0')}`], ['FORFAITS GAGNES', `${s.earned || 0}`],
      ['SAUTS', `${st.jumps || 0}`], ['CHUTES', `${st.deaths || 0}`],
      ['ENNEMIS ECRASES', `${st.stomps || 0}`], ['MEILLEURE SERIE', `${st.bestStreak || 0} J`],
      ['OBJETS', `${(s.owned || []).length}`], ['VITESSE MAX', `${Math.round((st.topSpeed || 0) / 16 * 3.6)} KM/H`],
    ];
  }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const items = this.items();
    const before = this.index;
    optionList(this, items, this.friendsX(), 48, this.friendsW(), 14);
    if (this.index !== before) this.confirm = null; // la confirmation de retrait ne vaut que pour la ligne choisie
  }
  friendsX() { return this.game.view.w / 2 + 16; }
  friendsW() { return Math.min(200, this.game.view.w / 2 - 24); }
  render(ctx) {
    const g = this.game, v = g.view, o = g.online, u = o.user;
    this.drawFrame(ctx, { keys: '↑/↓ : CHOISIR   SAUT/ENTREE : VALIDER   ECHAP : RETOUR', touch: 'TOUCHE UNE LIGNE' });
    const lw = Math.min(250, v.w / 2 - 16), lx = v.w / 2 - 8 - lw;
    panel(ctx, lx, 28, lw, v.h - 52, 'rgba(10,13,36,0.78)', '#2a3060');
    drawKong(ctx, g, lx + 30, 74, 2, this.t);
    drawText(ctx, u ? u.pseudo.toUpperCase() : 'INVITE', lx + 54, 38, { scale: 2, color: '#ffffff' });
    drawText(ctx, u ? (u.estp ? 'LISTE SKINGKONG' : 'JOUEUR') : 'PAS DE COMPTE', lx + 54, 56, { color: u && u.estp ? '#ffc83d' : '#9fb2ea' });
    if (u) drawText(ctx, o.online ? 'COMPTE EN LIGNE' : 'COMPTE LOCAL', lx + 54, 66, { color: '#7f8cc8' });
    this.stats().forEach(([k, val], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = lx + 8 + col * (lw / 2), y = 86 + row * 22;
      drawText(ctx, k, x, y, { color: '#7f8cc8' });
      drawText(ctx, val, x, y + 9, { color: '#ffffff' });
    });
    const fx = this.friendsX(), fw = this.friendsW();
    drawText(ctx, u ? `AMIS (${this.friends ? this.friends.length : '...'})` : 'AMIS', fx + fw / 2, 32, { align: 'center', color: '#7ee8ff', outline: INK });
    const items = this.items();
    const maxRows = Math.floor((v.h - 48 - 40) / 14);
    drawOptions(ctx, this, items.slice(0, maxRows), fx, 48, fw, 14);
    if (u && this.friends && !this.friends.length) drawText(ctx, 'AJOUTE TES AMIS PAR LEUR PSEUDO', fx + fw / 2, 70, { align: 'center', color: '#7f8cc8', outline: INK });
    if (this.msg) drawText(ctx, this.msg, v.w / 2, v.h - 22, { align: 'center', color: '#ffc83d', outline: INK });
  }
}

export { drawIcon };
