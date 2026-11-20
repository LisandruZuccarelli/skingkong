// Client Supabase minimal (fetch, sans dépendance) : authentification, profil, sauvegarde cloud, classements, amis.
// Le mot de passe part en HTTPS vers Supabase Auth, qui le hache (bcrypt) côté serveur ; le jeu ne le garde jamais.
// Toutes les vérifications importantes (temps plausibles, limitation de débit) sont refaites côté serveur (supabase/schema.sql).
import { checkPseudo, checkPassword, checkEmail, checkRun, isPromo } from './rules.js';

const MSG = {
  'Invalid login credentials': 'identifiants incorrects',
  'Email not confirmed': 'confirme d\'abord ton adresse (lien recu par e-mail)',
  'User already registered': 'un compte existe deja avec cette adresse',
  pseudo_taken: 'ce pseudo est deja pris',
  too_fast: 'trop de resultats envoyes, patiente un peu',
  too_many: 'limite de resultats atteinte pour aujourd\'hui',
  impossible_time: 'temps impossible',
  bad_run: 'resultat invalide',
  unknown_level: 'niveau inconnu',
  no_player: 'aucun joueur avec ce pseudo',
  self: 'c\'est toi !',
  not_authenticated: 'connecte-toi d\'abord',
};
const human = (m) => { for (const [k, v] of Object.entries(MSG)) if (String(m).includes(k)) return v; return String(m || 'erreur reseau').toLowerCase(); };

export class SupabaseBackend {
  constructor({ url, key, storage, limits, fetchImpl }) {
    this.mode = 'online';
    this.url = url.replace(/\/$/, ''); this.key = key; this.st = storage; this.limits = limits;
    this.fetch = fetchImpl || ((...a) => fetch(...a));
    this.session = this.st.get('cloud.session');
    this.user = this.session ? this.session.user : null;
  }
  setSession(s) { this.session = s; this.user = s ? s.user : null; this.st.set('cloud.session', s); }

  async http(path, { method = 'GET', body, auth = true, headers = {}, retry = true } = {}) {
    if (auth && this.session && this.session.expires_at - 60 < Date.now() / 1000) await this.refresh();
    const h = { apikey: this.key, 'Content-Type': 'application/json', ...headers };
    h.Authorization = `Bearer ${auth && this.session ? this.session.access_token : this.key}`;
    let res;
    try { res = await this.fetch(this.url + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }); }
    catch (_) { throw new Error('pas de connexion au serveur'); }
    if (res.status === 401 && auth && this.session && retry) { await this.refresh(); return this.http(path, { method, body, auth, headers, retry: false }); }
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(human(data && (data.msg || data.message || data.error_description || data.error)));
    return data;
  }
  async refresh() {
    if (!this.session) return;
    try {
      const d = await this.http('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: this.session.refresh_token }, auth: false });
      await this.adopt(d, this.session.user);
    } catch (e) { this.setSession(null); throw new Error('session expiree, reconnecte-toi'); }
  }
  async adopt(d, known) {
    const s = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600), user: known };
    this.setSession(s);
    if (!known) {
      const p = await this.http(`/rest/v1/profiles?id=eq.${d.user.id}&select=id,pseudo,estp,skin,promo`);
      s.user = p[0] ? { id: p[0].id, pseudo: p[0].pseudo, estp: p[0].estp, skin: p[0].skin, promo: p[0].promo || null } : { id: d.user.id, pseudo: '?', estp: false, skin: 'classic', promo: null };
      this.setSession(s);
    }
    return s.user;
  }

  async signUp({ pseudo, email, password, estp, promo }) {
    const err = checkPseudo(pseudo) || checkEmail(email) || checkPassword(password);
    if (err) throw new Error(err);
    const free = await this.http('/rest/v1/rpc/pseudo_available', { method: 'POST', body: { p_pseudo: pseudo.trim() }, auth: false });
    if (!free) throw new Error(MSG.pseudo_taken);
    let d;
    try { d = await this.http('/auth/v1/signup', { method: 'POST', auth: false, body: { email: email.trim(), password, data: { pseudo: pseudo.trim(), estp: !!estp, promo: isPromo(promo) ? promo : null } } }); }
    catch (e) { throw new Error(/database error/i.test(e.message) ? MSG.pseudo_taken : e.message); }
    if (!d.access_token) throw new Error('compte cree ! confirme ton adresse (lien recu par e-mail) puis connecte-toi');
    return this.adopt(d);
  }
  async signIn({ login, password }) {
    if (checkEmail(login)) throw new Error('connecte-toi avec ton adresse e-mail');
    const d = await this.http('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email: login.trim(), password } });
    return this.adopt(d);
  }
  async signOut() {
    try { if (this.session) await this.http('/auth/v1/logout', { method: 'POST', retry: false }); } catch (_) { /* hors ligne : on oublie la session quand même */ }
    this.setSession(null);
  }
  async updateProfile(patch) {
    if (!this.user) return;
    const body = {};
    if ('skin' in patch) body.skin = patch.skin;
    if ('estp' in patch) body.estp = !!patch.estp;
    if ('promo' in patch) body.promo = isPromo(patch.promo) ? patch.promo : null;
    await this.http(`/rest/v1/profiles?id=eq.${this.user.id}`, { method: 'PATCH', body, headers: { Prefer: 'return=minimal' } });
    this.setSession({ ...this.session, user: { ...this.user, ...body } });
  }

  async loadSave() {
    if (!this.user) return null;
    const r = await this.http(`/rest/v1/saves?user_id=eq.${this.user.id}&select=data,updated_at`);
    return r[0] ? { data: r[0].data, updatedAt: Date.parse(r[0].updated_at) } : null;
  }
  async storeSave(data) {
    if (!this.user) return;
    await this.http('/rest/v1/saves?on_conflict=user_id', { method: 'POST', body: { user_id: this.user.id, data }, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
  }

  async submitRun(run) {
    if (!this.user) throw new Error('non connecte');
    const err = checkRun(this.limits[run.level], run);
    if (err) throw new Error(err);
    const r = await this.http('/rest/v1/rpc/submit_run', { method: 'POST', body: { p_level: run.level, p_time: Math.round(run.time * 100) / 100, p_coins: run.coins, p_deaths: run.deaths } });
    return { rank: r && r.rank, of: r && r.total };
  }
  async board({ scope, filter = 'all', level = null, limit = 50 }) {
    if (scope === 'promos') {
      const rows = await this.http('/rest/v1/rpc/promo_board', { method: 'POST', auth: !!this.user, body: {} });
      const list = rows.map((r) => ({ rank: r.rank, promo: r.promo, players: r.players, levels: r.levels, me: r.is_mine }));
      return { rows: list, me: list.find((r) => r.me) || null, total: list.length };
    }
    const rows = await this.http('/rest/v1/rpc/leaderboard', { method: 'POST', auth: !!this.user, body: { p_scope: scope, p_filter: filter, p_level: level, p_limit: limit } });
    const list = rows.map((r) => ({ rank: r.rank, user: r.user_id, pseudo: r.pseudo, skin: r.skin, estp: r.estp, promo: r.promo || null, time: r.total_time, levels: r.levels, me: r.is_me }));
    const me = list.find((r) => r.me) || null;
    return { rows: list.filter((r) => r.rank <= limit), me, total: rows.length ? rows[0].total : 0 };
  }
  async friends() {
    if (!this.user) return [];
    const r = await this.http('/rest/v1/rpc/my_friends', { method: 'POST', body: {} });
    return r.map((f) => ({ id: f.id, pseudo: f.pseudo, estp: f.estp, skin: f.skin }));
  }
  async addFriend(pseudo) { const f = await this.http('/rest/v1/rpc/add_friend', { method: 'POST', body: { p_pseudo: String(pseudo).trim() } }); return f; }
  async removeFriend(id) { await this.http('/rest/v1/rpc/remove_friend', { method: 'POST', body: { p_friend: id } }); }
}
