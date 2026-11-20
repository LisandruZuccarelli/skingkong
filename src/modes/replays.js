// Fantômes (meilleures descentes) : stockés sur l'appareil uniquement, hors sauvegarde cloud (trop volumineux).
export class Replays {
  constructor(storage) { this.st = storage; this.cache = null; }
  all() { if (!this.cache) this.cache = this.st.get('replays') || {}; return this.cache; }
  load(key) { return this.all()[key] || null; }
  save(key, rep) {
    const all = this.all();
    all[key] = { ...rep, at: Date.now() };
    // au plus 60 fantômes : on oublie les plus anciens
    const keys = Object.keys(all);
    if (keys.length > 60) keys.sort((a, b) => all[a].at - all[b].at).slice(0, keys.length - 60).forEach((k) => delete all[k]);
    this.st.set('replays', all);
  }
  clear(prefix) { const all = this.all(); for (const k of Object.keys(all)) if (k.startsWith(prefix)) delete all[k]; this.st.set('replays', all); }
}
