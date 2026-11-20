// Libellés des niveaux pour l'affichage : on ne montre jamais l'identifiant technique « 3-4 ».
/** Numéro du niveau dans son monde (« 3-4 » → « 4 »). */
export const levelNum = (id) => (String(id).includes('-') ? String(id).split('-')[1] : String(id));
/** Numéro du monde (« 3-4 » → 3), ou null. */
export const worldNum = (id) => (String(id).includes('-') ? +String(id).split('-')[0] : null);
/** « NIVEAU 4 » (quand le monde est déjà connu par le contexte). */
export const levelShort = (id) => (levelNum(id) === 'B' ? 'BOSS' : `NIVEAU ${levelNum(id)}`);
/** « MONDE 3 - NIVEAU 4 » (quand le contexte ne dit pas de quel monde il s'agit). */
export const levelLong = (id) => (id === 'DAY' ? 'NIVEAU DU JOUR' : worldNum(id) ? `MONDE ${worldNum(id)} - ${levelShort(id)}` : levelShort(id));
