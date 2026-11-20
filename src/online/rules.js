// Règles partagées client / serveur (le script SQL reprend les mêmes limites, générées par tools/online/gen_sql.mjs).
// Module pur : testé sous Node.
import { parseLevel } from '../game/tilemap.js';

const DAY = 86400000;
/** Jour UTC (identique pour tous les joueurs, quel que soit le fuseau) */
export const utcDay = (now = Date.now()) => Math.floor(now / DAY);
/** Semaine UTC commençant le lundi (le 1er janvier 1970 était un jeudi) */
export const utcWeek = (day) => Math.floor((day + 3) / 7);

/** Limites anti-triche d'un niveau : temps minimal plausible et forfaits maximum. */
export function levelLimits(level) {
  const p = parseLevel(level);
  const coins = p.entities.filter((e) => e.type === '$').length;
  // Glisse maximale de Kong : 320 px/s = 20 tuiles/s. Marge : on accepte jusqu'à 24 tuiles/s de moyenne sur toute la largeur,
  // et au moins 20 % du temps cible (les niveaux ne se traversent jamais en ligne droite).
  const minTime = Math.max(4, Math.round(Math.max(p.w / 24, level.parTime * 0.2) * 10) / 10);
  return { id: level.id, minTime, maxCoins: coins };
}

/** Niveau du jour généré : environ 240 tuiles, 80 forfaits au plus (même valeur dans supabase/levels.sql). */
export const DAY_LIMITS = { id: 'DAY', minTime: 8, maxCoins: 80 };

/** Vérifie un résultat avant envoi (le serveur refait la même vérification). */
export function checkRun(limits, run) {
  if (!limits) return 'niveau inconnu';
  if (!(run.time > 0) || !isFinite(run.time)) return 'temps invalide';
  if (run.time < limits.minTime) return 'temps impossible';
  if (run.time > 3600) return 'temps trop long';
  if (!Number.isInteger(run.coins) || run.coins < 0 || run.coins > limits.maxCoins) return 'forfaits invalides';
  if (!Number.isInteger(run.deaths) || run.deaths < 0) return 'chutes invalides';
  return null;
}

/** Niveau du jour / de la semaine (hors boss), le même pour tout le monde. */
export function featuredLevel(levels, n, salt = 0) {
  const pool = levels.filter((l) => !l.boss);
  let h = (n * 2654435761 + salt * 40503) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0; h = Math.imul(h, 2246822519) >>> 0; h = (h ^ (h >>> 13)) >>> 0;
  return pool[h % pool.length].id;
}

/** Pseudo : 3 à 16 caractères, lettres sans accents, chiffres, _ et - (affichable par la police du jeu). */
export function checkPseudo(p) {
  if (typeof p !== 'string') return 'pseudo manquant';
  const s = p.trim();
  if (s.length < 3) return 'pseudo trop court (3 caracteres minimum)';
  if (s.length > 16) return 'pseudo trop long (16 caracteres maximum)';
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return 'lettres sans accents, chiffres, _ et - seulement';
  return null;
}
export function checkPassword(p) {
  if (typeof p !== 'string' || p.length < 8) return 'mot de passe trop court (8 caracteres minimum)';
  if (p.length > 72) return 'mot de passe trop long';
  return null;
}
export function checkEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) ? null : 'adresse e-mail invalide';
}

/** Tableaux disponibles : portée × filtre */
export const SCOPES = [
  { id: 'global', name: 'GENERAL' },
  { id: 'level', name: 'PAR NIVEAU' },
  { id: 'daily', name: 'DU JOUR' },
  { id: 'weekly', name: 'SEMAINE' },
  { id: 'promos', name: 'PROMOS' },
];
export const FILTERS = [
  { id: 'all', name: 'TOUS' },
  { id: 'friends', name: 'AMIS' },
  { id: 'estp', name: 'LISTE ESTP CACHAN' },
  { id: 'promo', name: 'MA PROMO' },
];

/** Promos (déclarées par le joueur ; même liste que la contrainte SQL de profiles.promo). */
export const PROMOS = [
  { id: '1A', name: '1RE ANNEE' }, { id: '2A', name: '2E ANNEE' }, { id: '3A', name: '3E ANNEE' },
  { id: '4A', name: '4E ANNEE' }, { id: '5A', name: '5E ANNEE' }, { id: 'ALUMNI', name: 'ANCIENS' }, { id: 'EXT', name: 'EXTERIEUR' },
];
export const isPromo = (p) => PROMOS.some((x) => x.id === p);
export const promoName = (p) => (PROMOS.find((x) => x.id === p) || { name: 'AUCUNE' }).name;

/**
 * Bataille des promos : chaque niveau terminé par un membre rapporte un point à sa promo
 * (niveau du jour exclu). Égalité : le plus de joueurs.
 */
export function rankPromos(rows, myPromo = null) {
  const by = new Map();
  for (const r of rows) {
    if (!isPromo(r.promo) || r.level === 'DAY') continue;
    const p = by.get(r.promo) || { promo: r.promo, users: new Set(), done: new Set() };
    p.users.add(r.user); p.done.add(r.user + '|' + r.level);
    by.set(r.promo, p);
  }
  const list = [...by.values()].map((p) => ({ promo: p.promo, players: p.users.size, levels: p.done.size }))
    .sort((a, b) => b.levels - a.levels || b.players - a.players || a.promo.localeCompare(b.promo));
  list.forEach((r, i) => { r.rank = i + 1; r.me = r.promo === myPromo; });
  return list;
}

/**
 * Classe des lignes de scores. rows : { user, pseudo, level, time, day, week, estp, skin }.
 * Global : niveaux terminés (desc) puis somme des meilleurs temps (asc). Les autres : meilleur temps.
 * Calcul utilisé par le mode local ; le serveur fait l'équivalent en SQL.
 */
export function rankBoard(rows, { scope, level, day, week, filter, me, friends = [], promo = null }) {
  let rs = rows;
  if (filter === 'friends') { const ok = new Set([...friends, me]); rs = rs.filter((r) => ok.has(r.user)); }
  if (filter === 'estp') rs = rs.filter((r) => r.estp);
  if (filter === 'promo') rs = rs.filter((r) => promo && r.promo === promo);
  if (scope === 'level') rs = rs.filter((r) => r.level === level);
  if (scope === 'daily') rs = rs.filter((r) => r.level === level && r.day === day);
  if (scope === 'weekly') rs = rs.filter((r) => r.level === level && r.week === week);
  const byUser = new Map();
  if (scope === 'global') {
    for (const r of rs) {
      const u = byUser.get(r.user) || { user: r.user, pseudo: r.pseudo, skin: r.skin, estp: r.estp, promo: r.promo || null, best: {} };
      u.best[r.level] = Math.min(u.best[r.level] ?? Infinity, r.time);
      byUser.set(r.user, u);
    }
    for (const u of byUser.values()) { u.levels = Object.keys(u.best).length; u.time = Object.values(u.best).reduce((a, b) => a + b, 0); delete u.best; }
  } else {
    for (const r of rs) {
      const u = byUser.get(r.user);
      if (!u || r.time < u.time) byUser.set(r.user, { user: r.user, pseudo: r.pseudo, skin: r.skin, estp: r.estp, promo: r.promo || null, time: r.time });
    }
  }
  const list = [...byUser.values()].sort((a, b) => (scope === 'global' ? b.levels - a.levels : 0) || a.time - b.time || a.pseudo.localeCompare(b.pseudo));
  list.forEach((r, i) => { r.rank = i + 1; r.me = r.user === me; });
  return list;
}
