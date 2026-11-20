// Fusion de deux sauvegardes (résolution de conflits). Module pur, testé sous Node.
//  - mode 'sync'    : deux copies de la MÊME progression (deux appareils, cloud) → on garde le maximum de chaque compteur ;
//  - mode 'migrate' : la partie invitée rejoint un compte → les compteurs s'additionnent.
// Rien n'est jamais perdu : records = meilleur des deux, objets / succès / étoiles = union.
// Porte-monnaie : compteurs croissants par appareil (earnedBy / spentBy) ; fusion = maximum par appareil
// (ou somme en migration), wallet = somme des gains - somme des dépenses. Aucun forfait n'est perdu ni dupliqué.

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

function mergeBest(a = {}, b = {}) {
  const out = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[id], y = b[id];
    if (!x || !y) { out[id] = JSON.parse(JSON.stringify(x || y)); continue; }
    const sx = x.stars || [], sy = y.stars || [];
    out[id] = {
      time: Math.min(num(x.time) || Infinity, num(y.time) || Infinity),
      rating: Math.max(num(x.rating), num(y.rating)),
      coins: Math.max(num(x.coins), num(y.coins)),
      stars: Array.from({ length: Math.max(sx.length, sy.length) }, (_, i) => !!(sx[i] || sy[i])),
    };
  }
  return out;
}

function mergeCounters(a = {}, b = {}, add) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    // les « records » (best*, top*) se comparent toujours, même en migration
    const isRecord = /^(best|top)/.test(k);
    out[k] = add && !isRecord ? num(a[k]) + num(b[k]) : Math.max(num(a[k]), num(b[k]));
  }
  return out;
}

function mergeChallenges(a, b, key) {
  if (!a) return b ? JSON.parse(JSON.stringify(b)) : undefined;
  if (!b) return JSON.parse(JSON.stringify(a));
  if (a[key] !== b[key]) return JSON.parse(JSON.stringify(a[key] > b[key] ? a : b));
  const base = {};
  for (const k of new Set([...Object.keys(a.base || {}), ...Object.keys(b.base || {})])) base[k] = Math.min(num((a.base || {})[k]), num((b.base || {})[k]));
  return { ...a, base, done: [...new Set([...(a.done || []), ...(b.done || [])])] };
}

/** Porte-monnaie d'une sauvegarde sous forme de compteurs par appareil (anciennes sauvegardes : `earned` / `wallet`). */
export function walletParts(s) {
  return {
    earnedBy: s.earnedBy || { legacy: num(s.earned ?? s.wallet ?? s.totalCoins) },
    spentBy: s.spentBy || { legacy: num(s.spent) },
  };
}
function mergeMaps(a, b, add) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = add ? num(a[k]) + num(b[k]) : Math.max(num(a[k]), num(b[k]));
  return out;
}
const total = (m) => Object.values(m).reduce((x, y) => x + num(y), 0);

/**
 * @param local  sauvegarde de cet appareil
 * @param remote sauvegarde du cloud
 * @param mode   'sync' | 'migrate'
 * @returns nouvelle sauvegarde (les réglages de l'appareil sont conservés)
 */
export function mergeSaves(local, remote, mode = 'sync') {
  if (!remote) return JSON.parse(JSON.stringify(local));
  if (!local) return JSON.parse(JSON.stringify(remote));
  const add = mode === 'migrate';
  const newer = num(remote.updatedAt) > num(local.updatedAt) ? remote : local;
  const wl = walletParts(local), wr = walletParts(remote);
  const earnedBy = mergeMaps(wl.earnedBy, wr.earnedBy, add);
  const spentBy = mergeMaps(wl.spentBy, wr.spentBy, add);
  const earned = total(earnedBy), spent = total(spentBy);
  const ach = { ...(remote.achievements || {}) };
  for (const [k, t] of Object.entries(local.achievements || {})) ach[k] = ach[k] ? Math.min(ach[k], t) : t;
  const out = {
    ...JSON.parse(JSON.stringify(newer)),
    best: mergeBest(local.best, remote.best),
    stats: mergeCounters(local.stats, remote.stats, add),
    owned: [...new Set([...(remote.owned || []), ...(local.owned || [])])],
    achievements: ach,
    earnedBy, spentBy, earned, spent, wallet: earned - spent,
    totalCoins: add ? num(local.totalCoins) + num(remote.totalCoins) : Math.max(num(local.totalCoins), num(remote.totalCoins)),
    doubleJump: !!(local.doubleJump || remote.doubleJump),
    equip: { ...(newer.equip || {}) },
    settings: local.settings || remote.settings || {},
    lastLevel: newer.lastLevel || local.lastLevel || remote.lastLevel,
    updatedAt: Math.max(num(local.updatedAt), num(remote.updatedAt)),
  };
  const daily = mergeChallenges(local.daily, remote.daily, 'day');
  const weekly = mergeChallenges(local.weekly, remote.weekly, 'week');
  if (daily) out.daily = daily;
  if (weekly) out.weekly = weekly;
  // série de connexion : la plus récente l'emporte
  if (num(remote.lastLogin) !== num(local.lastLogin)) {
    const r = num(remote.lastLogin) > num(local.lastLogin) ? remote : local;
    out.lastLogin = r.lastLogin; out.streak = r.streak;
  }
  // un objet équipé doit être possédé
  for (const [cat, id] of Object.entries(out.equip)) if (!out.owned.includes(`${cat}:${id}`)) delete out.equip[cat];
  return out;
}

/** Ce qui part dans le cloud : tout sauf les réglages propres à l'appareil. */
export function cloudPayload(save) {
  const { settings, ...rest } = save;
  return JSON.parse(JSON.stringify(rest));
}
