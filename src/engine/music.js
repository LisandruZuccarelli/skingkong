// Musique 100% synthétisée : séquenceur Web Audio à anticipation, morceaux en données, couches adaptatives.
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function midi(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Accords : C, Cm, C7, Cm7, Cmaj7 (les 3 premières notes servent à la basse et à l'arpège, la 4e colore les nappes et les stabs)
function chord(name, oct) {
  const m = /^([A-G])(#|b)?(m)?(maj7|7)?$/.exec(name);
  const root = 12 * (oct + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const tri = m[3] ? [root, root + 3, root + 7] : [root, root + 4, root + 7];
  if (m[4] === '7') tri.push(root + 10);
  if (m[4] === 'maj7') tri.push(root + 11);
  return tri;
}

/*
 Format d'un morceau :
  bpm, chords (1 accord par mesure de 16 doubles-croches),
  drums : motifs 'x' (frappe) / 'o' (frappe accentuée) / '.' (silence) sur 16 pas,
  bass  : motif sur 16 pas — R = fondamentale, 3 = tierce, 5 = quinte, 8 = octave, '.' = silence,
  arp   : indices des notes de l'accord (0..5), '.' = silence,
  lead  : une chaîne par mesure, 16 jetons : note (C5, F#4, Bb3), '.' silence, '-' tenue,
  stab  : accords plaqués « filter house » sur 16 pas ('x'), filtre qui s'ouvre avec l'intensité (cut: [fermé, ouvert] en Hz),
  drums.open : charleston ouverte (contretemps disco),
  file  : morceau enregistré (MP3) joué en boucle à la place du séquenceur (gain : volume relatif),
  layers: seuil d'intensité (0..1) à partir duquel chaque couche est audible.

 ADN commun de la bande-son (calé sur le morceau d'accueil : sol, ~109 BPM, disco / French house) :
  - tonalités autour de sol (G, Em, C, D) avec la couleur funky si bémol / fa ;
  - grosse caisse sur chaque temps, clap sur 2 et 4, charleston ouverte en contretemps, basse disco en octaves ;
  - leitmotiv tiré de la mélodie d'accueil : A . C . E - - . G . B . C - A . (transposé et transformé selon le monde).
*/
export const TRACKS = {
  title: { file: './music/accueil.mp3', gain: 1, layers: {} },
  // ancien thème synthétisé de l'écran titre (conservé pour l'hors-ligne sans le fichier)
  titleSynth: {
    bpm: 112, chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'],
    drums: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: '..x...x...x...x.', hat16: 'x.x.x.x.x.x.x.x.' },
    bass: { pattern: 'R...R.5.R...8.5.', oct: 2, type: 'triangle' },
    arp: { pattern: '0124012401240124', oct: 4, type: 'square' },
    pad: { oct: 4 },
    lead: { type: 'square', notes: [
      'C5 - F5 - A5 - - - G5 - F5 - G5 - A5 -', 'B5 - - - G5 - - - D5 - G5 - B5 - D6 -',
      'E6 - - - D6 - B5 - G5 - - - E5 - G5 -', 'A5 - - - - - - - E5 - A5 - C6 - E6 -',
      'F6 - - - E6 - C6 - A5 - - - C6 - F6 -', 'D6 - - - B5 - G5 - D6 - - - G6 - - -',
      'E6 - - - D6 - C6 - G5 - - - E5 - G5 -', 'C6 - - - - - - - - - - - . . . .'] },
    layers: { pad: 0, bass: 0, lead: 0, drums: 0.2, arp: 0.5, hat16: 0.75 },
  },
  // Monde 1 - L'aube sur la station : morceau enregistré (même artiste que l'accueil, mi mineur)
  w1: { file: './music/monde1.mp3', gain: 1, layers: {} },
  // ancienne version synthétisée du monde 1 (disco), conservée pour essais
  w1Synth: {
    bpm: 116, chords: ['Gmaj7', 'C', 'Gmaj7', 'C', 'Em7', 'C', 'A7', 'D'],
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', clap: true, hat: '', open: '..x...x...x...x.', hat16: 'x.xxx.xxx.xxx.xx' },
    bass: { pattern: 'R..8..R.R..8.5.8', oct: 2, type: 'triangle' },
    stab: { pattern: '...x..x....x..x.', oct: 4, cut: [700, 3200] },
    arp: { pattern: '0.1.2.3.4.3.2.1.', oct: 5, type: 'bell' },
    pad: { oct: 4 },
    lead: { type: 'square', notes: [
      'A5 . C6 . E6 - - . G5 . B5 . C6 - A5 .', 'G5 - - - E5 . G5 . C6 - - - . . . .',
      'A5 . C6 . E6 - - . G6 . E6 . D6 - B5 .', 'C6 - - - - - . . E5 . G5 . A5 . C6 .',
      'B5 . B5 . E6 - D6 . B5 - - - G5 . A5 .', 'C6 - - - E6 - - - G6 - - - E6 . C6 .',
      'A5 . C#6 . E6 - - . G6 . E6 . C#6 - A5 .', 'D6 - - - - - - - F#5 . A5 . D6 . F#6 .'] },
    layers: { pad: 0, bass: 0, drums: 0, stab: 0.1, lead: 0.2, arp: 0.5, hat16: 0.7 },
  },
  // Monde 2 - La tempête : nappes cinématiques mystérieuses (synthés)
  w2: { file: './music/monde2.mp3', gain: 1, layers: {} },
  w2Synth: {
    bpm: 100, chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'E', 'E'],
    drums: { kick: 'x.......x.....x.', snare: '....x.......x..x', hat: '..x...x...x...x.', hat16: 'xxx.xxx.xxx.xxxx' },
    bass: { pattern: 'R.....R.5...R...', oct: 2, type: 'sawtooth' },
    arp: { pattern: '0.1.2.4.2.1.0.1.', oct: 4, type: 'triangle' },
    pad: { oct: 3 },
    lead: { type: 'flute', notes: [
      'A4 - - - C5 - E5 - D5 - C5 - B4 - - -', 'A4 - - - F4 - A4 - C5 - - - . . . .',
      'G4 - - - C5 - E5 - G5 - F5 - E5 - - -', 'D5 - - - B4 - G4 - B4 - D5 - - - . .',
      'E5 - - - A5 - - - G5 - E5 - D5 - C5 -', 'C5 - - - A4 - - - F4 - A4 - C5 - - -',
      'B4 - - - G#4 - B4 - E5 - - - D5 - - -', 'E5 - - - - - - - . . . . . . . .'] },
    layers: { pad: 0, bass: 0, lead: 0, drums: 0.3, arp: 0.5, hat16: 0.78 },
  },
  // Monde 3 - Le glacier : ambient doux et lumineux
  w3: { file: './music/monde3.mp3', gain: 1, layers: {} },
  w3Synth: {
    bpm: 110, chords: ['Dm', 'G', 'Dm', 'C', 'Bb', 'C', 'Dm', 'Dm'],
    drums: { kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hat16: '.xx..xx..xx..xxx' },
    bass: { pattern: 'R..R..5.R..R..8.', oct: 2, type: 'triangle' },
    arp: { pattern: '0124201242012420', oct: 5, type: 'bell' },
    pad: { oct: 4 },
    lead: { type: 'bell', notes: [
      'D5 . F5 . A5 . . . G5 . F5 . E5 . . .', 'D5 . B4 . D5 . G5 . . . F5 . E5 . D5 .',
      'A5 . . . F5 . . . D5 . E5 . F5 . A5 .', 'G5 . . . E5 . C5 . E5 . G5 . C6 . . .',
      'D6 . . . Bb5 . . . F5 . Bb5 . D6 . F6 .', 'E6 . . . C6 . . . G5 . C6 . E6 . G6 .',
      'F6 . E6 . D6 . A5 . F5 . A5 . D6 . . .', 'D6 - - - - - - - . . . . . . . .'] },
    layers: { pad: 0, arp: 0, bass: 0.2, lead: 0.1, drums: 0.35, hat16: 0.75 },
  },
  // Monde 4 - La nuit / la fête : électro swing
  w4: { file: './music/monde4.mp3', gain: 1, layers: {} },
  w4Synth: {
    bpm: 124, chords: ['Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Ab', 'Eb'],
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', hat16: 'xxxxxxxxxxxxxxxx', clap: true },
    bass: { pattern: '..R...R...R...R8', oct: 2, type: 'sawtooth' },
    arp: { pattern: '0.1.2.1.0.1.2.4.', oct: 5, type: 'square' },
    pad: { oct: 4 },
    lead: { type: 'saw', notes: [
      'C5 . C5 . Ab4 . C5 . Eb5 . C5 . Bb4 . Ab4 .', 'F5 . F5 . Db5 . F5 . Ab5 . F5 . Eb5 . Db5 .',
      'Eb5 . Eb5 . C5 . Eb5 . Ab5 . G5 . F5 . Eb5 .', 'G5 - - . Bb5 - - . Eb6 - - - Db6 . C6 .',
      'C5 . C5 . Ab4 . C5 . Eb5 . C5 . Bb4 . Ab4 .', 'F5 . F5 . Db5 . F5 . Ab5 . F5 . Eb5 . Db5 .',
      'Eb5 . Eb5 . C5 . Eb5 . Ab5 . G5 . F5 . Eb5 .', 'G5 - Bb5 - Eb6 - G6 - - - - - . . . .'] },
    layers: { drums: 0, bass: 0, pad: 0, lead: 0.3, arp: 0.55, hat16: 0.72 },
  },
  // Boss : un morceau enregistré par monde
  boss1: { file: './music/boss1.mp3', gain: 1, layers: {} },
  boss2: { file: './music/boss2.mp3', gain: 1, layers: {} },
  boss3: { file: './music/boss3.mp3', gain: 1, layers: {} },
  boss4: { file: './music/boss4.mp3', gain: 1, layers: {} },
  // ancienne musique de boss synthétisée (conservée pour comparaison : ?ecoute=boss)
  boss: {
    bpm: 150, chords: ['Em', 'C', 'D', 'B'],
    drums: { kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hat16: 'xxxxxxxxxxxxxxxx' },
    bass: { pattern: 'RRRRRRRRRRRRRR8R', oct: 2, type: 'sawtooth' },
    arp: { pattern: '0101210121012101', oct: 5, type: 'square' },
    pad: { oct: 3 },
    lead: { type: 'square', notes: [
      'E5 . E5 . G5 . E5 . B5 . A5 . G5 . F#5 .', 'E5 . E5 . G5 . C6 . B5 . G5 . E5 . G5 .',
      'F#5 . F#5 . A5 . D6 . C6 . A5 . F#5 . A5 .', 'B5 - - - D#6 - - - F#6 - - - B5 . A5 .'] },
    layers: { drums: 0, bass: 0, pad: 0, lead: 0.2, arp: 0.5, hat16: 0.65 },
  },
};

const JINGLES = {
  victory: { bpm: 160, type: 'square', notes: 'C5 E5 G5 C6 - G5 C6 E6 - - - -', bass: 'C3 . . . . . G2 . C3 - - -' },
  death: { bpm: 220, type: 'square', notes: 'E5 C5 A4 F4 D4 - - -', bass: '' },
  gameover: { bpm: 90, type: 'triangle', notes: 'G4 - E4 - C4 - B3 - C4 - - - - - - -', bass: 'C3 - - - G2 - - - C2 - - - - - - -' },
  unlock: { bpm: 200, type: 'square', notes: 'C6 E6 G6 C7 - - - -', bass: '' },
};

/** Dosage de la musique selon l'écran (× volume MUSIQUE du joueur). */
export const MIX = { menu: 0.5, map: 0.5, level: 0.2 };
// les fichiers sont normalisés à -14 LUFS ; les morceaux synthétisés sont ramenés au même volume perçu
const SYNTH_GAIN = 1;
// un morceau arrêté depuis moins longtemps reprend là où il était (victoire → retour à la carte)
const RESUME_MS = 45000;
// jingles (victoire...) : même volume qu'avant le passage de MUSIQUE à 100 % par défaut
const JINGLE_GAIN = 0.6;
// 0,1 s de silence (WAV) pour débloquer les lecteurs audio sur iOS
const SILENCE = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

const LAYER_NAMES = ['drums', 'hat16', 'bass', 'pad', 'stab', 'arp', 'lead'];

export class Music {
  constructor(engine) {
    this.e = engine;
    this.trackId = null;
    this.pending = null;
    this.intensity = 0.3;
    this.current = null;
    this.mix = MIX.menu;
    engine.onUnlock = () => this.bless();
    setInterval(() => this.tick(), 25);
  }

  get ctx() { return this.e.ctx; }

  /**
   * Lance un morceau. mix : dosage du contexte (MIX.menu, MIX.map, MIX.level), multiplié par le volume MUSIQUE du joueur.
   * Le même morceau déjà en cours n'est pas relancé : seul son dosage glisse vers le nouveau (carte → niveau sans coupure).
   */
  play(id, mix = MIX.menu, fade = 1.2) {
    this.mix = mix;
    if (this.trackId === id && (this.current || this.pending)) { this.rampMix(fade); return; }
    this.trackId = id;
    if (!this.ctx) { this.pending = id; return; }
    this.start(id, fade);
  }

  /** Fait glisser le volume du morceau en cours vers le dosage courant. */
  rampMix(dur = 1.2) {
    const cur = this.current;
    if (!cur || !this.ctx) return;
    const t = this.ctx.currentTime, g = cur.group.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(0.0001, g.value), t);
    g.linearRampToValueAtTime(this.level(cur.tr), t + dur);
  }

  /** Gain du groupe : dosage du contexte × correction propre au morceau (les synthés et les fichiers sont calés au même volume perçu). */
  level(tr) { return Math.max(0.0001, this.mix * (tr.file ? tr.gain ?? 1 : SYNTH_GAIN)); }

  start(id, fade) {
    const ctx = this.ctx;
    this.pending = null;
    if (this.current) this.fadeOutGroup(this.current, fade);
    const tr = TRACKS[id];
    if (!tr) { this.current = null; return; }
    const group = ctx.createGain();
    group.gain.setValueAtTime(0.0001, ctx.currentTime);
    group.gain.linearRampToValueAtTime(this.level(tr), ctx.currentTime + fade);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 18000;
    group.connect(filter).connect(this.e.musicBus);
    if (tr.file) { this.current = this.startFile(id, tr, group, filter); return; }
    const layers = {};
    for (const n of LAYER_NAMES) {
      const g = ctx.createGain();
      g.gain.value = (tr.layers[n] ?? 0) <= this.intensity ? 1 : 0;
      g.connect(group);
      layers[n] = g;
    }
    // stabs « filter house » : un filtre commun qui s'ouvre avec l'intensité
    let stabBus = null;
    if (tr.stab) {
      stabBus = ctx.createBiquadFilter();
      stabBus.type = 'lowpass'; stabBus.Q.value = 6;
      stabBus.frequency.value = this.stabCut(tr);
      stabBus.connect(layers.stab);
    }
    this.current = { id, tr, group, filter, layers, stabBus, step: 0, next: ctx.currentTime + 0.08 };
  }

  stabCut(tr) { const [a, b] = tr.stab.cut || [600, 3000]; return a * Math.pow(b / a, this.intensity); }

  /**
   * Deux lecteurs <audio> en alternance, débloqués au premier toucher (iOS), pour les fondus enchaînés.
   * Chacun est branché une fois pour toutes dans le Web Audio (volume, étouffement en pause).
   */
  players() {
    if (this.pool) return this.pool;
    const ctx = this.ctx;
    this.pool = [0, 1].map(() => {
      const el = new Audio();
      el.loop = true; el.preload = 'auto';
      const src = ctx.createMediaElementSource(el);
      const out = ctx.createGain();
      src.connect(out);
      return { el, out, file: null, stoppedAt: 0, owner: null };
    });
    return this.pool;
  }

  /** Débloque les lecteurs pendant un geste du joueur (sinon iOS refuse de les lancer plus tard). */
  bless() {
    if (this.blessed || !this.ctx) return;
    this.blessed = true;
    for (const p of this.players()) {
      if (p.file) continue;
      p.el.src = SILENCE;
      p.el.play().then(() => { if (!p.file) p.el.pause(); }).catch(() => {});
    }
  }

  startFile(id, tr, group, filter) {
    const pool = this.players();
    const prev = this.current && this.current.player;
    // le lecteur qui a déjà ce morceau (même s'il est en train de s'éteindre), sinon celui qui est libre
    let p = pool.find((q) => q.file === tr.file) || pool.find((q) => q !== prev) || pool[0];
    const resume = p.file === tr.file && (!p.el.paused || Date.now() - p.stoppedAt < RESUME_MS);
    if (p.file !== tr.file) { p.file = tr.file; p.el.src = tr.file; }
    if (!resume) { try { p.el.currentTime = 0; } catch (_) { /* pas encore chargé */ } }
    try { p.out.disconnect(); } catch (_) { /* pas encore branché */ }
    p.out.connect(group);
    p.owner = group;
    if (p.el.paused) p.el.play().catch(() => {});
    return { id, tr, group, filter, layers: {}, file: true, player: p };
  }

  fadeOutGroup(cur, fade) {
    const t = this.ctx.currentTime;
    cur.group.gain.cancelScheduledValues(t);
    cur.group.gain.setValueAtTime(Math.max(0.0001, cur.group.gain.value), t);
    cur.group.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.05, fade));
    setTimeout(() => {
      try { cur.group.disconnect(); } catch (_) { /* déjà détaché */ }
      const p = cur.player;
      // on n'arrête le lecteur que s'il n'a pas été repris entre-temps par un autre morceau
      if (p && p.owner === cur.group) { p.el.pause(); p.stoppedAt = Date.now(); p.owner = null; }
    }, fade * 1000 + 200);
  }

  stop(fade = 0.5) {
    this.trackId = null;
    this.pending = null;
    if (this.current && this.ctx) this.fadeOutGroup(this.current, fade);
    this.current = null;
  }

  /** 0 = calme, 1 = intense : les couches s'ajoutent progressivement. */
  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(1, v));
    const cur = this.current;
    if (!cur || !this.ctx) return;
    const t = this.ctx.currentTime;
    for (const n of LAYER_NAMES) {
      if (!cur.layers[n]) continue;
      const on = (cur.tr.layers[n] ?? 0) <= this.intensity + 1e-6;
      cur.layers[n].gain.setTargetAtTime(on ? 1 : 0, t, 0.4);
    }
    if (cur.stabBus) cur.stabBus.frequency.setTargetAtTime(this.stabCut(cur.tr), t, 0.6);
  }

  /** Assourdit la musique (pause, menus). */
  muffle(on) {
    const cur = this.current;
    if (!cur || !this.ctx) return;
    cur.filter.frequency.setTargetAtTime(on ? 700 : 18000, this.ctx.currentTime, 0.08);
  }

  /** Baisse brièvement le volume (ex. à la mort). */
  duck(amount = 0.3, dur = 0.6) {
    const cur = this.current;
    if (!cur || !this.ctx) return;
    const t = this.ctx.currentTime;
    cur.group.gain.cancelScheduledValues(t);
    const full = this.level(cur.tr);
    cur.group.gain.setValueAtTime(Math.max(0.0001, amount * full), t);
    cur.group.gain.setTargetAtTime(full, t + dur, 0.25);
  }

  jingle(name) {
    const j = JINGLES[name];
    if (!j || !this.ctx) return;
    const ctx = this.ctx;
    const stepDur = 60 / j.bpm / 2;
    const t0 = ctx.currentTime + 0.03;
    const play = (str, type, vol, oct = 0) => {
      const toks = str.split(/\s+/).filter(Boolean);
      toks.forEach((tok, i) => {
        if (tok === '.' || tok === '-') return;
        let len = 1;
        while (toks[i + len] === '-') len++;
        const m = midi(tok);
        if (m !== null) this.voice(type, m + oct, t0 + i * stepDur, len * stepDur * 0.95, vol, this.e.musicBus);
      });
    };
    play(j.notes, j.type, 0.13 * JINGLE_GAIN);
    if (j.bass) play(j.bass, 'triangle', 0.18 * JINGLE_GAIN);
  }

  tick() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.pending) this.start(this.pending, 1.2);
    const cur = this.current;
    if (!cur || cur.file) return;
    const stepDur = 60 / cur.tr.bpm / 4;
    if (cur.next < ctx.currentTime - 0.5) cur.next = ctx.currentTime + 0.05;
    while (cur.next < ctx.currentTime + 0.15) {
      this.scheduleStep(cur, cur.step, cur.next, stepDur);
      cur.next += stepDur;
      cur.step++;
    }
  }

  scheduleStep(cur, step, t, sd) {
    const tr = cur.tr;
    const bars = tr.chords.length;
    const s = step % 16;
    const bar = Math.floor(step / 16) % bars;
    const ch = chord(tr.chords[bar], 0);
    const rootPc = ch[0] - 12;
    const L = cur.layers;
    const d = tr.drums;
    if (d.kick[s] === 'x' || d.kick[s] === 'o') this.kick(t, L.drums);
    if (d.snare[s] === 'x') d.clap ? this.clap(t, L.drums) : this.snare(t, L.drums);
    if (d.hat && d.hat[s] === 'x') this.hat(t, L.drums, 0.05, d.clap ? 0.09 : 0.035);
    if (d.open && d.open[s] === 'x') this.hat(t, L.drums, 0.06, 0.16);
    if (d.hat16 && d.hat16[s] === 'x') this.hat(t, L.hat16, 0.03, 0.025);

    const bc = tr.bass.pattern[s];
    if (bc && bc !== '.') {
      const base = 12 * (tr.bass.oct + 1) + rootPc;
      const off = bc === 'R' ? 0 : bc === '3' ? ch[1] - ch[0] : bc === '5' ? 7 : bc === '8' ? 12 : 0;
      this.voice(tr.bass.type, base + off, t, sd * 1.8, 0.2, L.bass, 900);
    }
    if (s === 0) {
      const notes = chord(tr.chords[bar], tr.pad.oct);
      for (const n of notes) this.pad(n, t, sd * 16, L.pad);
    }
    if (tr.stab && tr.stab.pattern[s] === 'x') {
      const notes = chord(tr.chords[bar], tr.stab.oct);
      this.stab(notes, t, sd * 1.6, cur.stabBus);
    }
    const ac = tr.arp.pattern[s];
    if (ac && ac !== '.') {
      const tones = chord(tr.chords[bar], tr.arp.oct);
      const all = tones.length > 3 ? [...tones, tones[0] + 12, tones[1] + 12] : [...tones, tones[0] + 12, tones[1] + 12, tones[2] + 12];
      this.voice(tr.arp.type, all[+ac] ?? tones[0], t, sd * 0.9, tr.arp.type === 'bell' ? 0.07 : 0.045, L.arp);
    }
    const line = tr.lead.notes[bar];
    if (line) {
      const toks = line.split(/\s+/);
      const tok = toks[s];
      if (tok && tok !== '.' && tok !== '-') {
        let len = 1;
        while (toks[s + len] === '-') len++;
        const m = midi(tok);
        if (m !== null) this.voice(tr.lead.type, m, t, sd * len * 0.92, 0.085, L.lead);
      }
    }
  }

  // ---------- instruments ----------
  voice(type, m, t, dur, vol, out, cutoff = 0) {
    const ctx = this.ctx;
    const f = freq(m);
    const g = ctx.createGain();
    let dest = g;
    if (cutoff) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(cutoff * 2, t);
      lp.frequency.exponentialRampToValueAtTime(cutoff * 0.5, t + dur);
      g.connect(lp); lp.connect(out); dest = g;
    } else g.connect(out);
    const oscs = [];
    const mk = (wave, fr, detune = 0) => { const o = ctx.createOscillator(); o.type = wave; o.frequency.value = fr; o.detune.value = detune; o.connect(dest); oscs.push(o); return o; };
    let attack = 0.005, release = Math.min(0.12, dur * 0.5), sustain = vol;
    if (type === 'bell') {
      mk('sine', f); const o2 = mk('sine', f * 2.76); o2.connect(dest);
      attack = 0.002; dur = Math.max(dur, 0.6); sustain = vol * 0.3; release = dur;
    } else if (type === 'flute') {
      const o = mk('triangle', f);
      const lfo = ctx.createOscillator(); const lg = ctx.createGain();
      lfo.frequency.value = 5.5; lg.gain.value = f * 0.012; lfo.connect(lg).connect(o.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.2);
      attack = 0.06;
    } else if (type === 'saw') {
      mk('sawtooth', f, -8); mk('sawtooth', f, 8); vol *= 0.6; sustain = vol;
    } else if (type === 'square') {
      const o = mk('square', f);
      if (dur > 0.3) { const lfo = ctx.createOscillator(); const lg = ctx.createGain(); lfo.frequency.value = 6; lg.gain.value = f * 0.008; lfo.connect(lg).connect(o.frequency); lfo.start(t + 0.15); lfo.stop(t + dur + 0.2); }
      vol *= 0.7; sustain = vol * 0.8;
    } else {
      mk(type, f);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, sustain), t + attack + 0.05);
    g.gain.setValueAtTime(Math.max(0.0002, sustain), t + Math.max(attack + 0.05, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02);
    for (const o of oscs) { o.start(t); o.stop(t + dur + 0.05); }
  }

  pad(m, t, dur, out) {
    const ctx = this.ctx;
    const f = freq(m);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1100;
    g.connect(lp).connect(out);
    for (const det of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      o.connect(g); o.start(t); o.stop(t + dur + 0.1);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.022, t + 0.25);
    g.gain.setValueAtTime(0.022, t + dur - 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
  }

  /** Accord plaqué court (scies désaccordées), passé dans le filtre « filter house » du morceau. */
  stab(notes, t, dur, out) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.connect(out);
    for (const m of notes) for (const det of [-9, 9]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = freq(m); o.detune.value = det;
      o.connect(g); o.start(t); o.stop(t + dur + 0.08);
    }
    const v = 0.05 / Math.sqrt(notes.length);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(v * 0.35, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
  }

  noiseHit(t, out, vol, dur, type, f, q = 1) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.e.noiseBuf;
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  kick(t, out) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + 0.22);
  }

  snare(t, out) {
    this.noiseHit(t, out, 0.22, 0.14, 'bandpass', 1900, 0.8);
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.12);
  }

  clap(t, out) {
    for (let i = 0; i < 3; i++) this.noiseHit(t + i * 0.011, out, 0.16, 0.05 + i * 0.03, 'bandpass', 1400, 1.2);
  }

  hat(t, out, vol, dur) { this.noiseHit(t, out, vol, dur, 'highpass', 7500); }
}
