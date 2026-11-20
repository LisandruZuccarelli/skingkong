// Progression : statistiques, porte-monnaie (forfaits), achats et équipement, succès, défis quotidiens/hebdomadaires,
// série de connexion, notifications. Module pur (pas de DOM) : testable sous Node.
import { CATEGORIES, DEFAULT_EQUIP, FREE, findItem, SKINS } from './catalog.js';
import { mulberry32 } from '../engine/util.js';

const DAY = 86400000;
/** Numéro du jour local (change à minuit, heure du joueur). */
export const dayIndex = (now = Date.now()) => Math.floor((now - new Date(now).getTimezoneOffset() * 60000) / DAY);
/** Semaine commençant le lundi. */
export const weekIndex = (day) => Math.floor((day + 3) / 7);

// ---------------------------------------------------------------------------
// Succès (au moins 40). test(st, ctx) → vrai quand c'est gagné ; goal/value pour la barre de progression.
// ctx : { save, levels } (levels = liste de la campagne)
// ---------------------------------------------------------------------------
const won = (ids) => (st, c) => ids.every((id) => c.save.best[id]);
const worldIds = (c, n) => c.levels.filter((l) => l.id.startsWith(n + '-')).map((l) => l.id);
const perfectWorld = (n) => (st, c) => worldIds(c, n).every((id) => c.save.best[id] && c.save.best[id].rating >= 3);
const count = (stat, goal) => ({ goal, value: (st) => st[stat] || 0, test: (st) => (st[stat] || 0) >= goal });

export const ACHIEVEMENTS = [
  // Aventure
  { id: 'first', cat: 'AVENTURE', name: 'Premier tire-fesses', desc: 'Terminer le niveau 1-1.', reward: 20, test: won(['1-1']) },
  { id: 'double', cat: 'AVENTURE', name: 'Deux fois plus haut', desc: 'Debloquer le double saut.', reward: 20, test: (st, c) => !!c.save.doubleJump },
  { id: 'boss1', cat: 'AVENTURE', name: 'Yeti K.O.', desc: 'Battre le Yeti geant.', reward: 60, test: won(['1-B']) },
  { id: 'boss2', cat: 'AVENTURE', name: 'Permis retire', desc: 'Battre la Dameuse folle.', reward: 80, test: won(['2-B']) },
  { id: 'boss3', cat: 'AVENTURE', name: 'Brise-glace', desc: 'Battre le Dragon de glace.', reward: 100, test: won(['3-B']) },
  { id: 'boss4', cat: 'AVENTURE', name: 'Roi de l\'afterski', desc: 'Battre DJ Yeti et finir l\'aventure.', reward: 150, test: won(['4-B']) },
  { id: 'avalanche', cat: 'AVENTURE', name: 'Plus rapide que l\'avalanche', desc: 'Terminer un niveau poursuivi par une avalanche.', reward: 40, ...count('avalancheWins', 1) },
  { id: 'secret', cat: 'AVENTURE', name: 'Passe-muraille', desc: 'Traverser 5 faux murs.', reward: 40, ...count('secrets', 5) },
  // Collection
  { id: 'coins100', cat: 'COLLECTION', name: 'Tirelire', desc: 'Ramasser 100 forfaits.', reward: 20, ...count('coins', 100) },
  { id: 'coins500', cat: 'COLLECTION', name: 'Collectionneur', desc: 'Ramasser 500 forfaits.', reward: 50, ...count('coins', 500) },
  { id: 'coins2000', cat: 'COLLECTION', name: 'Magnat des forfaits', desc: 'Ramasser 2000 forfaits.', reward: 150, ...count('coins', 2000) },
  { id: 'stars10', cat: 'COLLECTION', name: 'Chasseur d\'etoiles', desc: 'Trouver 10 etoiles cachees.', reward: 40, goal: 10, value: (st, c) => starsFound(c), test: (st, c) => starsFound(c) >= 10 },
  { id: 'stars36', cat: 'COLLECTION', name: 'Astronome', desc: 'Trouver 36 etoiles cachees.', reward: 100, goal: 36, value: (st, c) => starsFound(c), test: (st, c) => starsFound(c) >= 36 },
  { id: 'stars72', cat: 'COLLECTION', name: 'Ciel complet', desc: 'Trouver les 72 etoiles cachees.', reward: 250, goal: 72, value: (st, c) => starsFound(c), test: (st, c) => starsFound(c) >= 72 },
  { id: 'allcoins', cat: 'COLLECTION', name: 'Rafle', desc: 'Ramasser tous les forfaits d\'un niveau.', reward: 30, ...count('fullCoinWins', 1) },
  { id: 'keys', cat: 'COLLECTION', name: 'Porte-cles', desc: 'Ramasser 20 cles.', reward: 40, ...count('keys', 20) },
  // Maîtrise
  { id: 'rate3', cat: 'MAITRISE', name: 'Trois etoiles', desc: 'Obtenir la note maximale sur un niveau.', reward: 30, goal: 1, value: (st, c) => perfectCount(c), test: (st, c) => perfectCount(c) >= 1 },
  { id: 'rate10', cat: 'MAITRISE', name: 'Premier de cordee', desc: 'Note maximale sur 10 niveaux.', reward: 100, goal: 10, value: (st, c) => perfectCount(c), test: (st, c) => perfectCount(c) >= 10 },
  { id: 'rate28', cat: 'MAITRISE', name: 'Legende de la station', desc: 'Note maximale sur les 28 niveaux.', reward: 400, goal: 28, value: (st, c) => perfectCount(c), test: (st, c) => perfectCount(c) >= 28 },
  { id: 'perf1', cat: 'MAITRISE', name: 'Pistes vertes maitrisees', desc: 'Note maximale sur tout le monde 1.', reward: 80, test: perfectWorld(1) },
  { id: 'perf2', cat: 'MAITRISE', name: 'Roi de la foret', desc: 'Note maximale sur tout le monde 2.', reward: 100, test: perfectWorld(2) },
  { id: 'perf3', cat: 'MAITRISE', name: 'Seigneur des glaces', desc: 'Note maximale sur tout le monde 3.', reward: 120, test: perfectWorld(3) },
  { id: 'perf4', cat: 'MAITRISE', name: 'Star de la soiree', desc: 'Note maximale sur tout le monde 4.', reward: 150, test: perfectWorld(4) },
  { id: 'nodeath', cat: 'MAITRISE', name: 'Sans une egratignure', desc: 'Finir un niveau sans chute.', reward: 30, ...count('noDeathWins', 1) },
  { id: 'nodeathboss', cat: 'MAITRISE', name: 'Intouchable', desc: 'Battre un boss sans chute.', reward: 80, ...count('noDeathBoss', 1) },
  { id: 'par1', cat: 'MAITRISE', name: 'Chrono en poche', desc: 'Battre le temps cible d\'un niveau.', reward: 30, goal: 1, value: (st, c) => parCount(c), test: (st, c) => parCount(c) >= 1 },
  { id: 'par10', cat: 'MAITRISE', name: 'Chrono-skieur', desc: 'Battre le temps cible de 10 niveaux.', reward: 100, goal: 10, value: (st, c) => parCount(c), test: (st, c) => parCount(c) >= 10 },
  { id: 'combo', cat: 'MAITRISE', name: 'Combo !', desc: 'Enchainer 10 forfaits d\'affilee.', reward: 40, ...count('bestCombo', 10) },
  { id: 'chain', cat: 'MAITRISE', name: 'Ricochet', desc: 'Ecraser 3 ennemis sans toucher le sol.', reward: 50, ...count('bestChain', 3) },
  { id: 'walls', cat: 'MAITRISE', name: 'Grimpeur', desc: 'Enchainer 5 sauts muraux sans toucher le sol.', reward: 50, ...count('bestWallChain', 5) },
  { id: 'speed', cat: 'MAITRISE', name: 'Schuss', desc: 'Atteindre la vitesse maximale en glissade.', reward: 30, ...count('topSpeed', 300) },
  // Activité
  { id: 'jumps500', cat: 'ACTIVITE', name: 'Sauterelle', desc: 'Sauter 500 fois.', reward: 20, ...count('jumps', 500) },
  { id: 'jumps5000', cat: 'ACTIVITE', name: 'Kangourou des neiges', desc: 'Sauter 5000 fois.', reward: 100, ...count('jumps', 5000) },
  { id: 'stomp25', cat: 'ACTIVITE', name: 'Pouf !', desc: 'Ecraser 25 ennemis.', reward: 30, ...count('stomps', 25) },
  { id: 'stomp150', cat: 'ACTIVITE', name: 'Terreur des pistes', desc: 'Ecraser 150 ennemis.', reward: 100, ...count('stomps', 150) },
  { id: 'deaths50', cat: 'ACTIVITE', name: 'Perseverant', desc: 'Chuter 50 fois. Ca forge le caractere.', reward: 20, ...count('deaths', 50) },
  { id: 'deaths250', cat: 'ACTIVITE', name: 'Tetu comme un yeti', desc: 'Chuter 250 fois.', reward: 60, ...count('deaths', 250) },
  { id: 'splash', cat: 'ACTIVITE', name: 'Plouf', desc: 'Tomber 10 fois dans l\'eau glacee.', reward: 20, ...count('drowns', 10) },
  { id: 'skibidi', cat: 'ACTIVITE', name: 'Skibidi skibidi skibidi', desc: 'Chuter 3 fois en moins de 15 secondes.', reward: 20, ...count('deathBurst', 3) },
  { id: 'springs', cat: 'ACTIVITE', name: 'Boing', desc: 'Rebondir 30 fois sur un ressort.', reward: 30, ...count('springs', 30) },
  { id: 'zips', cat: 'ACTIVITE', name: 'Tyrolien', desc: 'Descendre 20 tyroliennes.', reward: 30, ...count('zips', 20) },
  { id: 'time30', cat: 'ACTIVITE', name: 'Habitue', desc: 'Jouer 30 minutes.', reward: 30, goal: 30, value: (st) => Math.floor((st.playTime || 0) / 60), test: (st) => (st.playTime || 0) >= 1800 },
  { id: 'time120', cat: 'ACTIVITE', name: 'Saisonnier', desc: 'Jouer 2 heures.', reward: 100, goal: 120, value: (st) => Math.floor((st.playTime || 0) / 60), test: (st) => (st.playTime || 0) >= 7200 },
  // Modes bonus
  { id: 'speedrun', cat: 'BONUS', name: 'Speedrunner', desc: 'Finir un monde entier en mode Speedrun.', reward: 80, ...count('speedrunWins', 1) },
  { id: 'inf500', cat: 'BONUS', name: 'Fuite en avant', desc: 'Parcourir 500 m en mode Infini.', reward: 50, goal: 500, value: (st) => st.bestDistance || 0, test: (st) => (st.bestDistance || 0) >= 500 },
  { id: 'inf2000', cat: 'BONUS', name: 'Plus fort que la montagne', desc: 'Parcourir 2000 m en mode Infini.', reward: 150, goal: 2000, value: (st) => st.bestDistance || 0, test: (st) => (st.bestDistance || 0) >= 2000 },
  { id: 'defi1', cat: 'BONUS', name: 'Challenger', desc: 'Reussir un niveau en mode Defi.', reward: 40, ...count('challengeWins', 1) },
  { id: 'defi4', cat: 'BONUS', name: 'Masochiste', desc: 'Reussir un Defi avec les 4 contraintes.', reward: 200, goal: 4, value: (st) => st.challengeMax || 0, test: (st) => (st.challengeMax || 0) >= 4 },
  { id: 'dayLevel1', cat: 'BONUS', name: 'Piste du jour', desc: 'Terminer un Niveau du jour.', reward: 30, ...count('dailyWins', 1) },
  { id: 'dayLevel7', cat: 'BONUS', name: 'Abonne aux pistes', desc: 'Terminer 7 Niveaux du jour.', reward: 120, ...count('dailyWins', 7) },
  { id: 'editor', cat: 'BONUS', name: 'Architecte', desc: 'Finir un niveau cree dans l\'editeur.', reward: 50, ...count('customWins', 1) },
  // Boutique et régularité
  { id: 'buy1', cat: 'STYLE', name: 'Premier achat', desc: 'Acheter un objet a la boutique.', reward: 20, ...count('purchases', 1) },
  { id: 'skins5', cat: 'STYLE', name: 'Garde-robe', desc: 'Posseder 5 skins.', reward: 60, goal: 5, value: (st, c) => skinsOwned(c), test: (st, c) => skinsOwned(c) >= 5 },
  { id: 'skinsAll', cat: 'STYLE', name: 'Fashion week', desc: 'Posseder tous les skins.', reward: 300, goal: SKINS.length, value: (st, c) => skinsOwned(c), test: (st, c) => skinsOwned(c) >= SKINS.length },
  { id: 'look', cat: 'STYLE', name: 'Total look', desc: 'Equiper un skin, un accessoire, une trainee et un effet achetes.', reward: 40, test: (st, c) => CATEGORIES.every((cat) => { const it = findItem(cat.id, (c.save.equip || {})[cat.id]); return it && it.price > 0; }) },
  { id: 'streak3', cat: 'STYLE', name: 'Fidele', desc: 'Jouer 3 jours d\'affilee.', reward: 40, ...count('bestStreak', 3) },
  { id: 'streak7', cat: 'STYLE', name: 'Abonne a la station', desc: 'Jouer 7 jours d\'affilee.', reward: 120, ...count('bestStreak', 7) },
  { id: 'daily1', cat: 'STYLE', name: 'Defi releve', desc: 'Reussir un defi quotidien.', reward: 20, ...count('dailyDone', 1) },
  { id: 'daily10', cat: 'STYLE', name: 'Accro aux defis', desc: 'Reussir 10 defis quotidiens.', reward: 100, ...count('dailyDone', 10) },
  { id: 'weekly1', cat: 'STYLE', name: 'Semaine chargee', desc: 'Reussir un defi hebdomadaire.', reward: 60, ...count('weeklyDone', 1) },
];

function starsFound(c) { return c.levels.reduce((n, l) => n + (c.save.best[l.id] ? (c.save.best[l.id].stars || []).filter(Boolean).length : 0), 0); }
function perfectCount(c) { return c.levels.filter((l) => c.save.best[l.id] && c.save.best[l.id].rating >= 3).length; }
function parCount(c) { return c.levels.filter((l) => c.save.best[l.id] && c.save.best[l.id].time <= l.parTime).length; }
function skinsOwned(c) { return SKINS.filter((s) => (c.save.owned || []).includes('skin:' + s.id)).length; }

// ---------------------------------------------------------------------------
// Défis : tirés au sort chaque jour / chaque semaine avec une graine commune (les mêmes pour tout le monde)
// ---------------------------------------------------------------------------
const DAILY_POOL = [
  { stat: 'coins', goals: [40, 60, 80], label: (n) => `Ramasser ${n} forfaits`, reward: 40 },
  { stat: 'jumps', goals: [100, 150, 200], label: (n) => `Sauter ${n} fois`, reward: 30 },
  { stat: 'stomps', goals: [6, 10, 15], label: (n) => `Ecraser ${n} ennemis`, reward: 40 },
  { stat: 'wins', goals: [3, 4, 5], label: (n) => `Terminer ${n} niveaux`, reward: 50 },
  { stat: 'noDeathWins', goals: [1, 2], label: (n) => `Finir ${n} niveau${n > 1 ? 'x' : ''} sans chute`, reward: 60 },
  { stat: 'parWins', goals: [1, 2], label: (n) => `Battre ${n} temps cible${n > 1 ? 's' : ''}`, reward: 60 },
  { stat: 'starsGot', goals: [2, 3], label: (n) => `Trouver ${n} etoiles cachees`, reward: 50 },
  { stat: 'springs', goals: [5, 10], label: (n) => `Rebondir ${n} fois sur un ressort`, reward: 30 },
  { stat: 'djumps', goals: [30, 50], label: (n) => `Faire ${n} doubles sauts`, reward: 30 },
  { stat: 'walljumps', goals: [10, 20], label: (n) => `Faire ${n} sauts muraux`, reward: 30 },
];
const WEEKLY_POOL = [
  { stat: 'coins', goals: [300, 400], label: (n) => `Ramasser ${n} forfaits`, reward: 150 },
  { stat: 'wins', goals: [15, 20], label: (n) => `Terminer ${n} niveaux`, reward: 150 },
  { stat: 'bossWins', goals: [1, 2], label: (n) => `Battre ${n} boss`, reward: 200 },
  { stat: 'stomps', goals: [50, 80], label: (n) => `Ecraser ${n} ennemis`, reward: 120 },
  { stat: 'perfectWins', goals: [2, 3], label: (n) => `Obtenir ${n} fois la note maximale`, reward: 200 },
  { stat: 'playTime', goals: [1800, 3600], label: (n) => `Jouer ${n / 60} minutes`, reward: 120 },
  { stat: 'zips', goals: [10, 15], label: (n) => `Descendre ${n} tyroliennes`, reward: 100 },
];

export function pickChallenges(pool, seed, n) {
  const rnd = mulberry32(seed * 2654435761);
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, n).map((i) => {
    const d = pool[i];
    const goal = d.goals[Math.floor(rnd() * d.goals.length)];
    return { stat: d.stat, goal, reward: d.reward, label: d.label(goal) };
  });
}

// ---------------------------------------------------------------------------
export class Progress {
  /** save : objet de sauvegarde (modifié sur place) ; levels : campagne ; persist : écriture */
  constructor(save, levels, persist = () => {}, now = () => Date.now(), device = 'local') {
    this.levels = levels; this.persist = persist; this.now = now; this.device = device;
    this.load(save);
  }
  /** (Re)charge une sauvegarde : normalisation, défis, succès déjà mérités. Utilisé aussi après une synchronisation. */
  load(save) {
    this.save = save;
    save.stats = save.stats || {};
    save.owned = save.owned || [];
    for (const f of FREE) if (!save.owned.includes(f)) save.owned.push(f);
    save.equip = { ...DEFAULT_EQUIP, ...(save.equip || {}) };
    save.achievements = save.achievements || {};
    // porte-monnaie = forfaits gagnés - dépensés, comptés par appareil (compteurs croissants : deux appareils
    // se synchronisent sans rien perdre, voir src/online/merge.js)
    if (!save.earnedBy) save.earnedBy = { [this.device]: save.earned ?? save.wallet ?? save.totalCoins ?? 0 }; // anciens forfaits gagnés = porte-monnaie de départ
    if (!save.spentBy) save.spentBy = { [this.device]: save.spent || 0 };
    this.sum();
    this.toasts = this.toasts || [];
    this.dirty = false;
    this.refreshChallenges();
    // les succès déjà mérités par une ancienne sauvegarde sont accordés sans fanfare
    this.check(true);
  }
  get stats() { return this.save.stats; }
  get wallet() { return this.save.earned - this.save.spent; }
  sum() {
    const s = this.save, tot = (m) => Object.values(m).reduce((a, b) => a + b, 0);
    s.earned = tot(s.earnedBy); s.spent = tot(s.spentBy); s.wallet = s.earned - s.spent;
  }
  gain(n) { const m = this.save.earnedBy; m[this.device] = (m[this.device] || 0) + n; this.sum(); this.dirty = true; }
  ctx() { return { save: this.save, levels: this.levels }; }

  // --- statistiques ---
  inc(stat, n = 1) { this.stats[stat] = (this.stats[stat] || 0) + n; this.dirty = true; }
  max(stat, v) { if (v > (this.stats[stat] || 0)) { this.stats[stat] = v; this.dirty = true; } }

  // --- porte-monnaie et boutique ---
  earn(n, why) { if (n <= 0) return; this.gain(n); if (why) this.toast(why, `+${n} FORFAITS`, 'coin'); }
  owns(cat, id) { return this.save.owned.includes(`${cat}:${id}`); }
  buy(cat, id) {
    const it = findItem(cat, id);
    if (!it || this.owns(cat, id)) return false;
    if (this.wallet < it.price) return false;
    const sp = this.save.spentBy;
    sp[this.device] = (sp[this.device] || 0) + it.price;
    this.sum();
    this.save.owned.push(`${cat}:${id}`);
    this.inc('purchases');
    this.equip(cat, id);
    this.check();
    this.flush();
    return true;
  }
  equip(cat, id) {
    if (!this.owns(cat, id)) return false;
    this.save.equip[cat] = id;
    this.dirty = true;
    this.check();
    this.flush();
    return true;
  }
  equipped(cat) { return findItem(cat, this.save.equip[cat]) || findItem(cat, DEFAULT_EQUIP[cat]); }

  // --- succès ---
  isUnlocked(id) { return !!this.save.achievements[id]; }
  progressOf(a) { const c = this.ctx(); return a.goal ? { value: Math.min(a.goal, a.value(this.stats, c)), goal: a.goal } : null; }
  check(silent = false) {
    const c = this.ctx();
    for (const a of ACHIEVEMENTS) {
      if (this.save.achievements[a.id]) continue;
      if (!a.test(this.stats, c)) continue;
      this.save.achievements[a.id] = this.now();
      this.gain(a.reward);
      this.dirty = true;
      if (!silent) this.toast('SUCCES : ' + a.name.toUpperCase(), `${a.desc.toUpperCase()}  +${a.reward}`, 'trophy');
    }
    this.checkChallenges(silent);
  }
  get unlockedCount() { return ACHIEVEMENTS.filter((a) => this.save.achievements[a.id]).length; }

  // --- défis ---
  refreshChallenges() {
    const day = dayIndex(this.now()), week = weekIndex(day);
    const s = this.save;
    if (!s.daily || s.daily.day !== day) s.daily = { day, base: { ...this.stats }, list: pickChallenges(DAILY_POOL, day, 3), done: [] };
    if (!s.weekly || s.weekly.week !== week) s.weekly = { week, base: { ...this.stats }, list: pickChallenges(WEEKLY_POOL, week + 7919, 3), done: [] };
  }
  challengeProgress(group, i) {
    const g = this.save[group];
    const ch = g.list[i];
    return Math.min(ch.goal, (this.stats[ch.stat] || 0) - (g.base[ch.stat] || 0));
  }
  checkChallenges(silent = false) {
    this.refreshChallenges();
    for (const group of ['daily', 'weekly']) {
      const g = this.save[group];
      g.list.forEach((ch, i) => {
        if (g.done.includes(i) || this.challengeProgress(group, i) < ch.goal) return;
        g.done.push(i);
        this.gain(ch.reward);
        this.stats[group === 'daily' ? 'dailyDone' : 'weeklyDone'] = (this.stats[group === 'daily' ? 'dailyDone' : 'weeklyDone'] || 0) + 1;
        this.dirty = true;
        if (!silent) this.toast(group === 'daily' ? 'DEFI DU JOUR REUSSI !' : 'DEFI DE LA SEMAINE REUSSI !', `${ch.label.toUpperCase()}  +${ch.reward}`, 'flag');
      });
    }
  }

  // --- série de connexion ---
  /** À appeler au lancement : met à jour la série et verse la récompense du jour (une fois par jour). */
  login() {
    const day = dayIndex(this.now());
    const s = this.save;
    if (s.lastLogin === day) return null;
    s.streak = s.lastLogin === day - 1 ? (s.streak || 0) + 1 : 1;
    s.lastLogin = day;
    this.max('bestStreak', s.streak);
    const reward = streakReward(s.streak);
    this.gain(reward);
    this.dirty = true;
    this.toast(`SERIE DE CONNEXION : JOUR ${s.streak}`, `RECOMPENSE DU JOUR  +${reward}`, 'flame');
    this.check();
    this.flush();
    return { streak: s.streak, reward };
  }

  // --- notifications ---
  toast(title, sub, icon) { this.toasts.push({ title, sub, icon, t: 0 }); }
  flush() { if (this.dirty) { this.dirty = false; this.persist(); } }
}

/** Récompense de série : 20 forfaits le 1er jour, +10 par jour, plafonnée à 100 (jour 9 et au-delà). */
export const streakReward = (n) => Math.min(100, 10 + n * 10);
