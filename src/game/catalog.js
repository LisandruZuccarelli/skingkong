// Boutique : skins de Kong (palettes), accessoires (pixel art posé sur la tête), traînées de vitesse, effets de saut.
// Module pur (pas de DOM au chargement) : testable sous Node.

const P = (F, f, S, s, G, L, ski = '#ffc83d', skiD = '#b07a10', W = '#ffffff') => ({ K: '#0a0d24', F, f, S, s, G, L, W, ski, skiD });

export const SKINS = [
  { id: 'classic', name: 'Kong classique', price: 0, desc: 'Le gorille skieur original.', pal: P('#2b3c94', '#4d6ad6', '#dbe8ff', '#9fb2ea', '#1767ff', '#7ee8ff') },
  { id: 'estp', name: 'Kong ESTP', price: 60, desc: 'Aux couleurs de l\'ecole : bleu nuit et or.', pal: P('#0b2a6b', '#2456b8', '#f2f6ff', '#b8c8ee', '#ffc83d', '#fff3a0', '#ffffff', '#9fb2ea') },
  { id: 'chantier', name: 'Pilote de chantier', price: 100, desc: 'Gilet haute visibilite, pret a couler du beton.', pal: P('#ff8a2a', '#ffb36b', '#ffe0c0', '#e0a070', '#ffd23f', '#3a4270', '#ffd23f', '#a07000') },
  { id: 'moniteur', name: 'Moniteur', price: 120, desc: 'Veste rouge, il corrige ton chasse-neige.', pal: P('#c8102e', '#ff4f5e', '#f2f6ff', '#c0c8e0', '#ffffff', '#1767ff', '#ffffff', '#c0c8e0') },
  { id: 'pingouin', name: 'Pingouin', price: 150, desc: 'Glisse sur le ventre en option.', pal: P('#1b2240', '#2a3360', '#f4f8ff', '#c8d4ee', '#ff9a2a', '#ffffff', '#ff9a2a', '#a05a10') },
  { id: 'dj', name: 'DJ', price: 180, desc: 'Le son de l\'afterski coule dans ses veines.', pal: P('#3a2c70', '#5a46a8', '#e8dcff', '#a898d8', '#ff4fd8', '#2a1a3a', '#ff4fd8', '#8a1a7a') },
  { id: 'pirate', name: 'Pirate', price: 200, desc: 'A l\'abordage de la piste noire !', pal: P('#6b3a1a', '#9a5a2a', '#f0d0b0', '#c09070', '#0a0d24', '#0a0d24', '#c8a050', '#7a5020') },
  { id: 'ninja', name: 'Ninja', price: 250, desc: 'Silencieux comme la poudreuse.', pal: P('#1a1a24', '#33334a', '#3a3a52', '#24243a', '#e8455a', '#ffffff', '#e8455a', '#8a1a2a') },
  { id: 'noel', name: 'Pere Noel', price: 300, desc: 'Livre les forfaits en luge.', pal: P('#d81e2c', '#ff6b78', '#ffffff', '#dbe8ff', '#0a0d24', '#7ee8ff', '#ffffff', '#c0c8e0') },
  { id: 'astronaute', name: 'Astronaute', price: 350, desc: 'Gravite lunaire non incluse.', pal: P('#dfe6f2', '#ffffff', '#c0c8dc', '#8a93b8', '#8a93b8', '#ffc83d', '#7ee8ff', '#2f7fb0') },
  { id: 'yeti', name: 'Yeti des neiges', price: 400, desc: 'Le cousin abominable.', pal: P('#dbe8ff', '#ffffff', '#7ea6d8', '#5a80b8', '#b9cbef', '#ff4f5e', '#7ea6d8', '#3a5a90') },
  { id: 'neon', name: 'Neon afterski', price: 450, desc: 'Brille dans le noir, surtout a 2 h du matin.', pal: P('#0e1230', '#ff4fd8', '#7ee8ff', '#3ab8d8', '#5cff8a', '#ffffff', '#5cff8a', '#1a9a4a') },
  { id: 'cristal', name: 'Kong de cristal', price: 500, desc: 'Taille dans la glace du glacier.', pal: P('#5fb8e0', '#bff3ff', '#ffffff', '#cfefff', '#2f7fb0', '#ffffff', '#bff3ff', '#5fb8e0') },
  { id: 'or', name: 'Kong d\'or', price: 750, desc: 'Pour les vrais rois de la station.', pal: P('#b07a10', '#ffd23f', '#fff3c0', '#e0c070', '#8a5a00', '#ffffff', '#ffe066', '#b07a10') },
];

// Accessoires : petites grilles posées au-dessus de la tête (16 colonnes, alignées sur le sprite de Kong).
// dy : décalage vertical par rapport au haut du sprite.
export const HATS = [
  { id: 'none', name: 'Aucun', price: 0, desc: 'Tete nue, cheveux au vent.' },
  { id: 'beanie', name: 'Bonnet a pompon', price: 60, desc: 'Le classique des pistes.', dy: -3, rows: [
    '.......WW.......',
    '......WRRW......',
    '....KRRRRRRK....',
    '...KWWWWWWWWK...',
  ], pal: { K: '#0a0d24', R: '#e8455a', W: '#ffffff' } },
  { id: 'helmet', name: 'Casque de chantier', price: 90, desc: 'Norme EPI, valide par l\'ESTP.', dy: -3, rows: [
    '.....KKKKKK.....',
    '....KYYYYWYK....',
    '...KYYYYYYYYK...',
    '..KKKKKKKKKKKK..',
  ], pal: { K: '#0a0d24', Y: '#ffd23f', W: '#fff3a0' } },
  { id: 'headphones', name: 'Casque audio', price: 120, desc: 'Pour skier en rythme.', dy: 0, rows: [
    '....KKKKKKKK....',
    '...K........K...',
    '..K..........K..',
    '.KPK........KPK.',
    '.KPK........KPK.',
    '.KKK........KKK.',
  ], pal: { K: '#0a0d24', P: '#ff4fd8' } },
  { id: 'pirate', name: 'Chapeau de pirate', price: 150, desc: 'Avec tete de mort reglementaire.', dy: -4, rows: [
    '......KKKK......',
    '....KKBBBBKK....',
    '...KBBBWWBBBK...',
    '.KKBBBBBBBBBBKK.',
    'KBBBBBBBBBBBBBBK',
  ], pal: { K: '#0a0d24', B: '#1a1a24', W: '#ffffff' } },
  { id: 'santa', name: 'Bonnet de Noel', price: 150, desc: 'Ho ho ho, schuss !', dy: -4, rows: [
    '..........KWW...',
    '........KRRKW...',
    '......KRRRRK....',
    '....KRRRRRRRK...',
    '...KWWWWWWWWWK..',
  ], pal: { K: '#0a0d24', R: '#d81e2c', W: '#ffffff' } },
  { id: 'viking', name: 'Cornes de viking', price: 200, desc: 'Pour les descentes barbares.', dy: -3, rows: [
    '.KW..........WK.',
    '.KWW..KKKK..WWK.',
    '..KWWKGGGGKWWK..',
    '...KGGGGGGGGK...',
  ], pal: { K: '#0a0d24', W: '#fff3dc', G: '#8a93b8' } },
  { id: 'antenna', name: 'Antenne alien', price: 220, desc: 'Capte la 5G au sommet.', dy: -5, rows: [
    '.......KK.......',
    '.......GG.......',
    '........K.......',
    '........K.......',
    '.......KKK......',
    '......KSSSK.....',
  ], pal: { K: '#0a0d24', G: '#5cff8a', S: '#8a93b8' } },
  { id: 'crown', name: 'Couronne', price: 400, desc: 'Roi (ou reine) de l\'afterski.', dy: -3, rows: [
    '...K.K..K..K.K..',
    '...KYKKYKKYKYK..',
    '...KYYYRYYYYYK..',
    '...KKKKKKKKKKK..',
  ], pal: { K: '#0a0d24', Y: '#ffd23f', R: '#e8455a' } },
  { id: 'shades', name: 'Lunettes de star', price: 100, desc: 'Le soleil tape fort a 3000 m.', dy: 4, rows: [
    '..KKKKKKKKKKKK..',
    '..KPPPKKKKPPPK..',
    '...KPK....KPK...',
  ], pal: { K: '#0a0d24', P: '#ff4fd8' } },
];

// Traînées : couleur(s) des « fantômes » laissés à grande vitesse.
export const TRAILS = [
  { id: 'ice', name: 'Givre', price: 0, desc: 'La trainee bleutee d\'origine.', colors: ['#8fe6ff'] },
  { id: 'none', name: 'Aucune', price: 0, desc: 'Discret comme un ninja.', colors: [] },
  { id: 'fire', name: 'Feu', price: 80, desc: 'Ca chauffe sur la piste.', colors: ['#ff8a2a', '#ff4f5e', '#ffd23f'] },
  { id: 'pink', name: 'Neon rose', price: 120, desc: 'Le style afterski.', colors: ['#ff4fd8'] },
  { id: 'gold', name: 'Or', price: 200, desc: 'Chaque descente vaut de l\'or.', colors: ['#ffd23f', '#fff3a0'] },
  { id: 'rainbow', name: 'Arc-en-ciel', price: 300, desc: 'Toutes les couleurs de la station.', colors: ['#ff2a3a', '#ff8a1a', '#ffe02a', '#3ae86a', '#2ab8ff', '#8a4aff'], stripes: true },
  { id: 'shadow', name: 'Ombre', price: 150, desc: 'Laisse ton double derriere toi.', colors: ['#3a2c70'] },
];

// Effets de saut : particules au saut et au double saut.
export const EFFECTS = [
  { id: 'snow', name: 'Neige', price: 0, desc: 'Une gerbe de poudreuse.', colors: ['#ffffff', '#eef6ff', '#cfe0ff'], shape: 'sq' },
  { id: 'stars', name: 'Etoiles', price: 60, desc: 'Tu brilles a chaque saut.', colors: ['#ffe066', '#ffffff'], shape: 'spark', additive: true },
  { id: 'confetti', name: 'Confettis', price: 100, desc: 'C\'est la fete a chaque bond.', colors: ['#ff4f5e', '#ffd23f', '#5cff8a', '#7ee8ff', '#ff4fd8'], shape: 'sq', g: 300 },
  { id: 'flames', name: 'Flammes', price: 150, desc: 'Decollage reacteur.', colors: ['#ff8a2a', '#ff4f5e', '#ffd23f'], shape: 'sq', g: -200, additive: true },
  { id: 'crystal', name: 'Cristaux', price: 180, desc: 'Eclats de glace eternelle.', colors: ['#bff3ff', '#7ee8ff', '#ffffff'], shape: 'spark', additive: true, ring: '#7ee8ff' },
  { id: 'passes', name: 'Pluie de forfaits', price: 250, desc: 'Pour montrer que tu es riche.', colors: ['#ffc83d', '#7ee8ff', '#ffffff'], shape: 'sq', g: 400 },
];

export const CATEGORIES = [
  { id: 'skin', name: 'SKINS', items: SKINS },
  { id: 'hat', name: 'ACCESSOIRES', items: HATS },
  { id: 'trail', name: 'TRAINEES', items: TRAILS },
  { id: 'effect', name: 'EFFETS DE SAUT', items: EFFECTS },
];
export const DEFAULT_EQUIP = { skin: 'classic', hat: 'none', trail: 'ice', effect: 'snow' };
/** Objets possédés dès le départ (gratuits). */
export const FREE = CATEGORIES.flatMap((c) => c.items.filter((i) => i.price === 0).map((i) => `${c.id}:${i.id}`));

export const findItem = (cat, id) => (CATEGORIES.find((c) => c.id === cat) || { items: [] }).items.find((i) => i.id === id);

/** Dessine un accessoire (grille + palette) dans un contexte déjà placé sur le coin haut-gauche du sprite de Kong. */
export function drawHatRows(ctx, hat, x, y, s = 1) {
  if (!hat || !hat.rows) return;
  hat.rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      const c = hat.pal[r[i]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x + i * s, y + (j + hat.dy) * s, s, s);
    }
  });
}
