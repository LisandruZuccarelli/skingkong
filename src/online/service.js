// Service en ligne : choisit le serveur (Supabase) ou le mode local, synchronise la sauvegarde,
// envoie les résultats (file d'attente si hors ligne) et expose les classements aux écrans.
import { LocalBackend } from './local.js';
import { SupabaseBackend } from './supabase.js';
import { levelLimits, featuredLevel, utcDay, utcWeek, DAY_LIMITS } from './rules.js';
import { mergeSaves, cloudPayload } from './merge.js';

export class Online {
  /**
   * game : objet exposant save, progress, persist(), applyLook() (le jeu, ou un faux jeu dans les tests)
   * opts : { storage, levels, url, key, now, fetchImpl }
   */
  constructor(game, { storage, levels, url = '', key = '', now = () => Date.now(), fetchImpl } = {}) {
    this.game = game; this.st = storage; this.levels = levels; this.now = now;
    this.limits = Object.fromEntries(levels.map((l) => [l.id, levelLimits(l)]));
    this.limits.DAY = DAY_LIMITS;
    this.backend = url && key
      ? new SupabaseBackend({ url, key, storage, limits: this.limits, fetchImpl })
      : new LocalBackend({ storage, levels, limits: this.limits, now });
    this.status = '';       // dernier message (affiché dans l'écran Compte)
    this.syncing = false;
    this.lastSync = 0;
    this.dirty = false;
    this.queueT = 0;
  }
  get mode() { return this.backend.mode; }
  get user() { return this.backend.user; }
  get online() { return this.mode === 'online'; }
  /** Classement du jour : le Niveau du jour généré (identifiant « DAY », filtré sur le jour UTC). */
  dailyLevel() { return 'DAY'; }
  weeklyLevel() { return featuredLevel(this.levels, utcWeek(utcDay(this.now())), 2); }

  // --- comptes ---
  async signUp(form) { await this.backend.signUp(form); await this.afterLogin(); return this.user; }
  async signIn(form) { await this.backend.signIn(form); await this.afterLogin(); return this.user; }
  async signOut() { await this.pushNow().catch(() => {}); await this.backend.signOut(); this.status = 'deconnecte'; }

  /**
   * Après connexion : réconcilie la partie de l'appareil avec celle du compte.
   *  - partie de ce compte  → fusion « sync » (on garde le meilleur de chaque côté) ;
   *  - partie invitée       → elle rejoint le compte (fusion « migrate » : forfaits et compteurs additionnés) ;
   *  - partie d'un autre compte → mise de côté sur l'appareil, remplacée par celle du compte.
   */
  async afterLogin() {
    const u = this.user;
    const g = this.game;
    const remote = await this.backend.loadSave().catch(() => null);
    const local = g.save;
    let merged;
    if (!local.owner) merged = mergeSaves(local, remote && remote.data, 'migrate');
    else if (local.owner === u.id) merged = mergeSaves(local, remote && remote.data, 'sync');
    else {
      this.st.set('save.backup.' + local.owner, local);
      merged = remote ? { ...remote.data, settings: local.settings } : { best: {}, settings: local.settings, totalCoins: 0 };
    }
    merged.owner = u.id;
    this.apply(merged);
    await this.backend.storeSave(cloudPayload(g.save)).catch(() => {});
    if (g.progress && u.skin !== g.save.equip.skin) this.backend.updateProfile({ skin: g.save.equip.skin }).catch(() => {});
    this.lastSync = this.now();
    this.status = remote ? 'progression synchronisee' : 'progression envoyee sur ton compte';
  }

  /** Remplace la sauvegarde du jeu sur place (Progress garde la même référence). */
  apply(data) {
    const g = this.game;
    const settings = g.save.settings;
    for (const k of Object.keys(g.save)) delete g.save[k];
    Object.assign(g.save, JSON.parse(JSON.stringify(data)), { settings });
    if (g.progress) g.progress.load(g.save);
    if (g.applyLook) g.applyLook();
    g.persist();
  }

  // --- synchronisation ---
  markDirty() { this.dirty = true; }
  async sync() {
    if (!this.user || this.syncing) return false;
    this.syncing = true;
    try {
      const remote = await this.backend.loadSave();
      const merged = mergeSaves(this.game.save, remote && remote.data, 'sync');
      merged.owner = this.user.id;
      this.apply(merged);
      await this.backend.storeSave(cloudPayload(this.game.save));
      this.lastSync = this.now(); this.dirty = false;
      this.status = 'progression synchronisee';
      return true;
    } catch (e) { this.status = e.message; return false; }
    finally { this.syncing = false; }
  }
  async pushNow() {
    if (!this.user || !this.dirty) return;
    await this.backend.storeSave(cloudPayload(this.game.save));
    this.dirty = false; this.lastSync = this.now();
  }
  /** Appelée à chaque image : envoie la file de résultats et synchronise au plus toutes les 60 s. */
  tick(dt) {
    if (!this.user) return;
    this.queueT += dt;
    if (this.queueT > 5) { this.queueT = 0; this.flushQueue(); }
    if (this.dirty && !this.syncing && this.now() - this.lastSync > 60000) this.sync();
  }

  // --- résultats ---
  queue() { return this.st.get('pending.runs') || []; }
  /** Envoie un résultat ; s'il ne part pas (hors ligne), il attend dans la file. Renvoie { rank, of } ou { error }. */
  async submit(run) {
    if (!this.user) return { error: 'connecte-toi pour entrer au classement' };
    const item = { ...run, user: this.user.id };
    try { return await this.backend.submitRun(item); }
    catch (e) {
      if (/connexion|reseau|patiente/.test(e.message)) { this.st.set('pending.runs', [...this.queue(), item].slice(-50)); return { error: 'hors ligne : envoi plus tard' }; }
      return { error: e.message };
    }
  }
  async flushQueue() {
    const q = this.queue();
    if (!q.length || this.flushing) return;
    this.flushing = true;
    const [item, ...rest] = q;
    try {
      if (item.user === this.user.id) await this.backend.submitRun(item);
      this.st.set('pending.runs', rest);
    } catch (e) {
      if (!/connexion|reseau|patiente/.test(e.message)) this.st.set('pending.runs', rest); // refusé : on l'abandonne
    } finally { this.flushing = false; }
  }

  // --- classements, amis, profil ---
  board(opts) {
    const level = opts.scope === 'daily' ? this.dailyLevel() : opts.scope === 'weekly' ? this.weeklyLevel() : opts.scope === 'level' ? opts.level : null;
    return this.backend.board({ ...opts, level }).then((r) => ({ ...r, level }));
  }
  friends() { return this.backend.friends(); }
  addFriend(p) { return this.backend.addFriend(p); }
  removeFriend(id) { return this.backend.removeFriend(id); }
  updateProfile(p) { return this.user ? this.backend.updateProfile(p) : Promise.resolve(); }
}
