// Mode hors ligne (aucun serveur configuré) : comptes, sauvegardes et classements stockés sur cet appareil.
// Même interface que le client Supabase, pour que le jeu ne fasse pas la différence.
// Les mots de passe ne sont jamais stockés en clair : PBKDF2-SHA256 (Web Crypto) avec sel aléatoire.
import { pbkdf2 } from './sha256.js';
import { checkPseudo, checkPassword, checkEmail, checkRun, rankBoard, utcDay, utcWeek } from './rules.js';

const ITER = 100000;
const ITER_FALLBACK = 100000;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function hashPassword(password, saltHex) {
  const c = globalThis.crypto;
  const salt = saltHex ? Uint8Array.from(saltHex.match(/../g).map((h) => parseInt(h, 16))) : c.getRandomValues(new Uint8Array(16));
  if (!c.subtle) return { salt: hex(salt), hash: hex(pbkdf2(new TextEncoder().encode(password), salt, ITER_FALLBACK)) };
  const key = await c.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await c.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, key, 256);
  return { salt: hex(salt), hash: hex(bits) };
}

/** Stockage clé → JSON (localStorage dans le navigateur, mémoire dans les tests) */
export function browserStorage(prefix = 'skingkong.') {
  return {
    get(k) { try { return JSON.parse(localStorage.getItem(prefix + k)); } catch (_) { return null; } },
    set(k, v) { try { if (v === null) localStorage.removeItem(prefix + k); else localStorage.setItem(prefix + k, JSON.stringify(v)); } catch (_) { /* quota */ } },
  };
}
export function memoryStorage() {
  const m = new Map();
  return { get: (k) => (m.has(k) ? JSON.parse(m.get(k)) : null), set: (k, v) => (v === null ? m.delete(k) : m.set(k, JSON.stringify(v))) };
}

export class LocalBackend {
  constructor({ storage, levels, limits, now = () => Date.now() }) {
    this.mode = 'local';
    this.st = storage; this.levels = levels; this.limits = limits; this.now = now;
    this.lastSubmit = 0;
    const s = this.st.get('local.session');
    this.user = s ? this.publicUser(this.accounts()[s]) : null;
  }
  accounts() { return this.st.get('local.accounts') || {}; }
  publicUser(a) { return a ? { id: a.id, pseudo: a.pseudo, estp: !!a.estp, skin: a.skin || 'classic' } : null; }
  findBy(fn) { return Object.values(this.accounts()).find(fn); }

  async signUp({ pseudo, email, password, estp }) {
    const err = checkPseudo(pseudo) || checkEmail(email) || checkPassword(password);
    if (err) throw new Error(err);
    pseudo = pseudo.trim(); email = email.trim().toLowerCase();
    if (this.findBy((a) => a.pseudo.toLowerCase() === pseudo.toLowerCase())) throw new Error('ce pseudo est deja pris');
    if (this.findBy((a) => a.email === email)) throw new Error('un compte existe deja avec cette adresse');
    const { salt, hash } = await hashPassword(password);
    const id = 'l-' + hex(globalThis.crypto.getRandomValues(new Uint8Array(8)));
    const acc = { id, pseudo, email, salt, hash, estp: !!estp, skin: 'classic', created: this.now(), friends: [] };
    const all = this.accounts(); all[id] = acc; this.st.set('local.accounts', all);
    this.st.set('local.session', id);
    this.user = this.publicUser(acc);
    return this.user;
  }
  async signIn({ login, password }) {
    const l = String(login || '').trim().toLowerCase();
    const acc = this.findBy((a) => a.email === l || a.pseudo.toLowerCase() === l);
    // même message dans les deux cas : on ne révèle pas si le compte existe
    if (!acc || (await hashPassword(password || '', acc.salt)).hash !== acc.hash) throw new Error('identifiants incorrects');
    this.st.set('local.session', acc.id);
    this.user = this.publicUser(acc);
    return this.user;
  }
  async signOut() { this.st.set('local.session', null); this.user = null; }
  async updateProfile(patch) {
    if (!this.user) return;
    const all = this.accounts(); const a = all[this.user.id];
    if ('skin' in patch) a.skin = patch.skin;
    if ('estp' in patch) a.estp = !!patch.estp;
    this.st.set('local.accounts', all);
    this.user = this.publicUser(a);
    // les scores reprennent le skin / le statut ESTP du profil
    const sc = this.st.get('local.scores') || [];
    for (const r of sc) if (r.user === a.id) { r.skin = a.skin; r.estp = a.estp; }
    this.st.set('local.scores', sc);
  }

  async loadSave() { return this.user ? this.st.get('local.save.' + this.user.id) : null; }
  async storeSave(data) { if (this.user) this.st.set('local.save.' + this.user.id, { data, updatedAt: data.updatedAt || this.now() }); }

  async submitRun(run) {
    if (!this.user) throw new Error('non connecte');
    const err = checkRun(this.limits[run.level], run);
    if (err) throw new Error(err);
    const now = this.now();
    if (now - this.lastSubmit < 2000) throw new Error('trop de resultats envoyes, patiente un peu');
    this.lastSubmit = now;
    const day = utcDay(now);
    const rows = this.st.get('local.scores') || [];
    rows.push({ user: this.user.id, pseudo: this.user.pseudo, skin: this.user.skin, estp: this.user.estp, level: run.level, time: Math.round(run.time * 100) / 100, coins: run.coins, deaths: run.deaths, day, week: utcWeek(day), at: now });
    this.st.set('local.scores', rows.slice(-5000));
    const list = rankBoard(rows, { scope: 'level', level: run.level, filter: 'all', me: this.user.id });
    const mine = list.find((r) => r.me);
    return { rank: mine ? mine.rank : null, of: list.length };
  }
  async submitBest(run) {
    if (!this.user) throw new Error('non connecte');
    const err = checkRun(this.limits[run.level], run);
    if (err) throw new Error(err);
    const rows = this.st.get('local.scores') || [];
    if (rows.some((r) => r.user === this.user.id && r.level === run.level && r.time <= run.time)) return { inserted: false };
    rows.push({ user: this.user.id, pseudo: this.user.pseudo, skin: this.user.skin, estp: this.user.estp, level: run.level, time: run.time, coins: run.coins, deaths: run.deaths, day: -1, week: -1, at: this.now() });
    this.st.set('local.scores', rows.slice(-5000));
    return { inserted: true };
  }
  async board({ scope, filter = 'all', level, limit = 50 }) {
    const day = utcDay(this.now());
    const me = this.user ? this.user.id : null;
    const friends = this.user ? this.accounts()[me].friends : [];
    const list = rankBoard(this.st.get('local.scores') || [], { scope, filter, level, day, week: utcWeek(day), me, friends });
    return { rows: list.slice(0, limit), me: list.find((r) => r.me) || null, total: list.length };
  }

  async friends() {
    if (!this.user) return [];
    const all = this.accounts();
    return all[this.user.id].friends.map((id) => all[id]).filter(Boolean).map((a) => this.publicUser(a));
  }
  async addFriend(pseudo) {
    if (!this.user) throw new Error('non connecte');
    const all = this.accounts();
    const f = Object.values(all).find((a) => a.pseudo.toLowerCase() === String(pseudo).trim().toLowerCase());
    if (!f) throw new Error('aucun joueur avec ce pseudo');
    if (f.id === this.user.id) throw new Error('c\'est toi !');
    const me = all[this.user.id];
    if (!me.friends.includes(f.id)) me.friends.push(f.id);
    this.st.set('local.accounts', all);
    return this.publicUser(f);
  }
  async removeFriend(id) {
    if (!this.user) return;
    const all = this.accounts(); const me = all[this.user.id];
    me.friends = me.friends.filter((x) => x !== id);
    this.st.set('local.accounts', all);
  }
}
