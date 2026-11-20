// Généré par tools/levels/build.py : liste des niveaux, des mondes et règles de déblocage.
import w1_1 from './w1-1.js';
import w1_2 from './w1-2.js';
import w1_3 from './w1-3.js';
import w1_4 from './w1-4.js';
import w1_5 from './w1-5.js';
import w1_6 from './w1-6.js';
import b1 from './b1.js';
import w2_1 from './w2-1.js';
import w2_2 from './w2-2.js';
import w2_3 from './w2-3.js';
import w2_4 from './w2-4.js';
import w2_5 from './w2-5.js';
import w2_6 from './w2-6.js';
import b2 from './b2.js';
import w3_1 from './w3-1.js';
import w3_2 from './w3-2.js';
import w3_3 from './w3-3.js';
import w3_4 from './w3-4.js';
import w3_5 from './w3-5.js';
import w3_6 from './w3-6.js';
import b3 from './b3.js';
import w4_1 from './w4-1.js';
import w4_2 from './w4-2.js';
import w4_3 from './w4-3.js';
import w4_4 from './w4-4.js';
import w4_5 from './w4-5.js';
import w4_6 from './w4-6.js';
import b4 from './b4.js';

export const LEVELS = [w1_1, w1_2, w1_3, w1_4, w1_5, w1_6, b1, w2_1, w2_2, w2_3, w2_4, w2_5, w2_6, b2, w3_1, w3_2, w3_3, w3_4, w3_5, w3_6, b3, w4_1, w4_2, w4_3, w4_4, w4_5, w4_6, b4];
export const WORLDS = [
  { n: 1, name: "L'aube sur la station", theme: 'dawn', levels: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-B'] },
  { n: 2, name: "La forêt dans la tempête", theme: 'storm', levels: ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-B'] },
  { n: 3, name: "Les glaciers éternels", theme: 'glacier', levels: ['3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-B'] },
  { n: 4, name: "L'afterski sous les étoiles", theme: 'night', levels: ['4-1', '4-2', '4-3', '4-4', '4-5', '4-6', '4-B'] },
];
export const getLevel = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];
/** Niveau suivant dans l'ordre de la campagne (null après le dernier). */
export function nextLevelId(id) {
  const i = LEVELS.findIndex((l) => l.id === id);
  return i >= 0 && i + 1 < LEVELS.length ? LEVELS[i + 1].id : null;
}
/**
 * Un niveau est ouvert si c'est le premier, si le précédent de la campagne est terminé,
 * ou si un niveau plus loin a déjà été terminé (sauvegardes d'avant l'ajout des boss).
 */
export function isUnlocked(id, save) {
  if (save.unlockAll) return true;
  const i = LEVELS.findIndex((l) => l.id === id);
  const best = save.best || {};
  return i <= 0 || !!best[LEVELS[i - 1].id] || LEVELS.slice(i).some((l) => best[l.id]);
}
/** Un monde est ouvert dès que son premier niveau l'est. */
export function worldUnlocked(n, save) {
  const w = WORLDS[n - 1];
  return !!w && isUnlocked(w.levels[0], save);
}
export { default as DEMO_FX } from './demo-fx.js';
