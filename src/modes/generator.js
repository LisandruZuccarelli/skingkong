// Générateur de niveaux (mode Infini et Niveau du jour). Module pur, déterministe (même graine = même niveau).
// Les segments sont tous franchissables avec un saut simple (sauf mention) : hauteur de saut ≈ 3,8 tuiles,
// longueur ≈ 5 tuiles à l'arrêt. La difficulté (0 → 1) élargit les trous et ajoute pièges et ennemis.

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const H = 18;

class Builder {
  constructor(r) {
    this.r = r;
    this.cols = [];      // chaque colonne : tableau de H caractères
    this.gh = 14;        // ligne de la surface du sol (le sol occupe gh..H-1)
    this.coins = 0;
    this.maxCoins = Infinity;
  }
  pick(arr) { return arr[Math.floor(this.r() * arr.length)]; }
  int(a, b) { return a + Math.floor(this.r() * (b - a + 1)); }
  col(ground = true, surface = '#') {
    const c = new Array(H).fill('.');
    if (ground) { c[this.gh] = surface; for (let y = this.gh + 1; y < H; y++) c[y] = '#'; }
    this.cols.push(c);
    return c;
  }
  get x() { return this.cols.length; }
  put(x, y, ch) { if (x >= 0 && x < this.cols.length && y >= 0 && y < H) this.cols[x][y] = ch; }
  coin(x, y) { if (this.coins < this.maxCoins && this.cols[x] && this.cols[x][y] === '.') { this.cols[x][y] = '$'; this.coins++; } }
  arc(x0, n, base) { for (let i = 0; i < n; i++) this.coin(x0 + i, base - Math.round(Math.sin((i + 0.5) / n * Math.PI) * 2)); }

  // ---------------- segments ----------------
  flat(n, coins = true) {
    const x0 = this.x;
    for (let i = 0; i < n; i++) this.col();
    if (coins && this.r() < 0.6) this.arc(x0 + 1, Math.min(5, n - 2), this.gh - 2);
  }
  gap(d) {
    this.flat(2, false);
    const n = this.int(2, 2 + Math.round(d * 2)); // 2 à 4 tuiles
    const x0 = this.x;
    for (let i = 0; i < n; i++) this.col(false);
    this.arc(x0, n, this.gh - 3);
    this.flat(2, false);
  }
  step() {
    const dir = this.gh <= 9 ? 1 : this.gh >= 14 ? -1 : this.pick([-1, 1]);
    const k = this.int(1, 2);
    this.flat(3, false);
    this.gh = Math.min(14, Math.max(8, this.gh + dir * k));
    this.flat(3);
  }
  slopeDown() {
    if (this.gh >= 13) { this.step(); return; }
    this.flat(2, false);
    const n = Math.min(this.int(3, 5), 14 - this.gh);
    for (let i = 0; i < n; i++) { this.col(true, '\\'); this.gh++; }
    this.flat(3);
  }
  slopeUp() {
    if (this.gh <= 9) { this.slopeDown(); return; }
    this.flat(2, false);
    const n = Math.min(this.int(2, 4), this.gh - 9);
    for (let i = 0; i < n; i++) { this.gh--; this.col(true, '/'); }
    this.flat(3);
  }
  spikes(d) {
    this.flat(3, false);
    const n = d > 0.5 && this.r() < 0.5 ? 2 : 1;
    for (let i = 0; i < n; i++) { const c = this.col(); c[this.gh - 1] = '^'; }
    this.coin(this.x - 1, this.gh - 4);
    this.flat(3, false);
  }
  enemy(d) {
    this.flat(3, false);
    const x0 = this.x;
    this.flat(this.int(5, 7), false);
    this.put(x0 + 3, this.gh - 1, this.r() < 0.4 + d * 0.3 ? 'p' : 'e');
    this.coin(x0 + 3, this.gh - 4);
  }
  spring() {
    // ressort au pied d'un mur de 5 tuiles, puis plateau
    this.flat(3, false);
    const c = this.col(); c[this.gh - 1] = 'S';
    this.col();
    const top = Math.max(5, this.gh - 5);
    const x0 = this.x;
    for (let i = 0; i < 4; i++) { const w = this.col(); for (let y = top; y < this.gh; y++) w[y] = '#'; }
    this.coin(x0 + 1, top - 2); this.coin(x0 + 2, top - 2);
    this.gh = top;
    this.flat(2, false);
    // redescente douce
    const back = Math.min(14, top + this.int(2, 4));
    this.gh = back;
    this.flat(3);
  }
  ice() {
    const n = this.int(6, 10);
    const x0 = this.x;
    for (let i = 0; i < n; i++) this.col(true, '=');
    this.arc(x0 + 1, n - 2, this.gh - 2);
  }
  beams(d) {
    // grand trou franchi par des poutres
    this.flat(2, false);
    const n = this.int(7, 9 + Math.round(d * 3));
    const x0 = this.x;
    for (let i = 0; i < n; i++) this.col(false);
    const y = this.gh - 2;
    for (let s = x0 + 1; s < x0 + n - 1; s += 5) { for (let k = 0; k < 3 && s + k < x0 + n; k++) this.put(s + k, y, '-'); this.coin(s + 1, y - 1); }
    this.flat(2, false);
  }
  crumble() {
    this.flat(2, false);
    const n = this.int(5, 7);
    const x0 = this.x;
    for (let i = 0; i < n; i++) { const c = this.col(false); c[this.gh] = 'x'; }
    this.arc(x0 + 1, n - 2, this.gh - 2);
    this.flat(2, false);
  }
  checkpoint() { this.flat(1, false); this.put(this.x - 1, this.gh - 1, 'C'); this.flat(2, false); }
}

const SEGMENTS = [
  ['flat', 3, 0], ['gap', 4, 0], ['step', 3, 0], ['slopeDown', 3, 0], ['slopeUp', 2, 0], ['spikes', 3, 0.1],
  ['enemy', 3, 0.15], ['spring', 2, 0.2], ['ice', 2, 0.25], ['beams', 2, 0.35], ['crumble', 2, 0.4],
];

/**
 * Génère un niveau.
 * opts : { seed, length (tuiles), checkpoints (tous les n tuiles, 0 = aucun), finish (drapeau d'arrivée), maxCoins, difficulty(x) }
 */
export function generateLevel({ seed, length = 200, checkpoints = 60, finish = true, maxCoins = 80, ramp = 400 }) {
  const r = rng(seed);
  const b = new Builder(r);
  b.maxCoins = maxCoins;
  // départ abrité
  b.flat(3, false);
  b.put(2, b.gh - 1, 'P');
  b.flat(6, false);
  let nextCp = checkpoints;
  let last = '';
  while (b.x < length) {
    const d = Math.min(1, b.x / ramp);
    const pool = SEGMENTS.filter(([name, , min]) => d >= min && name !== last);
    const tot = pool.reduce((a, s) => a + s[1], 0);
    let k = r() * tot, seg = pool[0];
    for (const s of pool) { k -= s[1]; if (k <= 0) { seg = s; break; } }
    b[seg[0]](d);
    last = seg[0];
    if (checkpoints && b.x >= nextCp) { b.checkpoint(); nextCp += checkpoints; }
  }
  if (finish) {
    b.flat(4, false);
    b.put(b.x - 2, b.gh - 1, 'G');
    b.flat(6, false);
  }
  const rows = Array.from({ length: H }, (_, y) => b.cols.map((c) => c[y]).join(''));
  return { height: H, chunks: [rows.join('\n')], coins: b.coins, width: b.x };
}
