// Tilemap : parsing des niveaux (chunks texte) + requêtes de collision. Module pur (testable sous Node).
export const T = 16;

/*
 Légende des tuiles :
  .  vide           #  sol/roche          =  glace (glissante)       /  pente montante   \  pente descendante
  -  poutre de chantier (traversable par dessous, ↓+SAUT pour descendre)
  x  bloc de glace friable                H  faux mur (passage secret)      w  eau glacée (mortelle)
  O  porte verrouillée (s'ouvre avec une clé)
 Entités :
  P  départ   $  forfait   *  étoile cachée   ^  pics   S  ressort   e  bonhomme de neige
  C  drapeau de contrôle   G  arrivée   D  bonus double saut   M  plateforme mobile   ?  panneau
 Décors lumineux :
  L  lampadaire   N  enseigne néon   k  cristal
 Mécaniques (étape 3) :
  V  plateforme verticale   z  ancre de tyrolienne (par paires)   t  station de télésiège (par paires)
  K  clé   I  stalactite   l  laser horizontal (vers la droite)   j  laser vertical (vers le bas)
 Ennemis :
  o  hibou   p  pingouin   f  fêtard
*/
const ENTITY_CHARS = new Set(['P', '$', '*', '^', 'S', 'e', 'C', 'G', 'D', 'M', '?', 'L', 'N', 'k', 'V', 'z', 't', 'K', 'I', 'l', 'j', 'o', 'p', 'f']);

export function parseLevel(data) {
  const H = data.height;
  const rows = Array.from({ length: H }, () => '');
  for (const chunk of data.chunks) {
    let lines = chunk.split('\n').map((l) => l.replace(/\r/g, '')).filter((l) => l.trim().length > 0);
    if (lines.length > H) throw new Error(`Chunk trop haut (${lines.length} > ${H})`);
    const w = Math.max(...lines.map((l) => l.length));
    while (lines.length < H) lines.unshift('');
    lines = lines.map((l) => l.padEnd(w, '.'));
    for (let y = 0; y < H; y++) rows[y] += lines[y];
  }
  const w = rows[0].length;
  const tiles = new Array(w * H);
  const entities = [];
  let start = null;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (ENTITY_CHARS.has(c)) {
        tiles[y * w + x] = '.';
        if (c === 'P') start = { tx: x, ty: y };
        else entities.push({ type: c, tx: x, ty: y });
      } else tiles[y * w + x] = c;
    }
  }
  if (!start) throw new Error('Niveau sans départ (P)');
  return { w, h: H, tiles, entities, start };
}

export const isSlopeChar = (c) => c === '/' || c === '\\';

export class TileMap {
  constructor(w, h, tiles) {
    this.w = w;
    this.h = h;
    this.tiles = tiles;
    this.crumble = new Map();
    this.opened = new Set();
  }

  get(tx, ty) {
    if (tx < 0 || tx >= this.w) return '#';
    // Au-dessus de la carte, les colonnes pleines en rangée 0 se prolongent : impossible de contourner un mur par le haut.
    if (ty < 0) return this.tiles[tx] === '#' ? '#' : '.';
    if (ty >= this.h) return '.';
    return this.tiles[ty * this.w + tx];
  }

  solid(tx, ty) {
    const c = this.get(tx, ty);
    if (c === '#' || c === '=') return true;
    if (c === 'O') return !this.opened.has(ty * this.w + tx);
    if (c === 'x') {
      const s = this.crumble.get(ty * this.w + tx);
      return !s || s.state !== 'gone';
    }
    return false;
  }

  /** Solide ou pente (pour l'habillage des tuiles voisines). */
  filled(tx, ty) {
    return this.solid(tx, ty) || isSlopeChar(this.get(tx, ty));
  }

  solidAtPoint(x, y) { return this.solid(Math.floor(x / T), Math.floor(y / T)); }

  /** Ouvre toute la porte (tuiles O connexes) contenant (tx, ty). Renvoie les tuiles ouvertes. */
  openDoor(tx, ty) {
    const out = [];
    const stack = [[tx, ty]];
    while (stack.length) {
      const [x, y] = stack.pop();
      const k = y * this.w + x;
      if (this.get(x, y) !== 'O' || this.opened.has(k)) continue;
      this.opened.add(k);
      out.push({ tx: x, ty: y });
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return out;
  }

  triggerCrumble(tx, ty) {
    if (this.get(tx, ty) !== 'x') return false;
    const k = ty * this.w + tx;
    const s = this.crumble.get(k);
    if (s && s.state !== 'idle') return false;
    this.crumble.set(k, { state: 'shaking', t: 0.42, tx, ty });
    return true;
  }

  /** Répare la glace friable brisée ou fissurée pour laquelle shouldRestore(tx, ty) est vrai. */
  restoreCrumble(shouldRestore) {
    for (const [k, s] of this.crumble) if (shouldRestore(s.tx, s.ty)) this.crumble.delete(k);
  }

  /** events: callback(type, tx, ty). */
  update(dt, box, events) {
    for (const [k, s] of this.crumble) {
      if (s.state === 'shaking') {
        s.t -= dt;
        // une glace brisée ne revient pas d'elle-même (seulement quand Kong réapparaît, voir LevelScene.respawn)
        if (s.t <= 0) { s.state = 'gone'; events && events('crumble', s.tx, s.ty); }
      }
    }
  }
}
