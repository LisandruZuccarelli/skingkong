// Musique 100% synthétisée : séquenceur Web Audio à anticipation, morceaux en données, couches adaptatives.
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function midi(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

function chord(name, oct) {
  const m = /^([A-G])(#|b)?(m)?$/.exec(name);
  const root = 12 * (oct + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return m[3] ? [root, root + 3, root + 7] : [root, root + 4, root + 7];
}

/*
 Format d'un morceau :
  bpm, chords (1 accord par mesure de 16 doubles-croches),
  drums : motifs 'x' (frappe) / 'o' (frappe accentuée) / '.' (silence) sur 16 pas,
  bass  : motif sur 16 pas — R = fondamentale, 3 = tierce, 5 = quinte, 8 = octave, '.' = silence,
  arp   : indices des notes de l'accord (0..5), '.' = silence,
  lead  : une chaîne par mesure, 16 jetons : note (C5, F#4, Bb3), '.' silence, '-' tenue,
  layers: seuil d'intensité (0..1) à partir duquel chaque couche est audible.
*/
export const TRACKS = {
  title: {
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
  w1: {
    bpm: 132, chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
    drums: { kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', hat16: '.x.x.x.x.x.x.xxx' },
    bass: { pattern: 'R.R.5.R.R.R.5.8.', oct: 2, type: 'triangle' },
    arp: { pattern: '0120120120120121', oct: 5, type: 'square' },
    pad: { oct: 4 },
    lead: { type: 'square', notes: [
      'E5 . G5 . C6 - B5 . A5 . G5 . E5 - - .', 'D5 . G5 . B5 - A5 . G5 . D5 . B4 - - .',
      'C5 . E5 . A5 - G5 . E5 . A5 . C6 - - .', 'A5 - G5 - F5 . E5 . F5 . A5 . C6 - - -',
      'E5 . E5 . G5 . C6 . E6 - D6 . C6 . G5 .', 'D6 - B5 . G5 . B5 . D6 - C6 . B5 . A5 .',
      'A5 . C6 . F6 - E6 . D6 . C6 . A5 . C6 .', 'B5 - - . D6 - - . G6 - - - - - . .'] },
    layers: { pad: 0, bass: 0, drums: 0, lead: 0.15, arp: 0.55, hat16: 0.75 },
  },
  w2: {
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
  w3: {
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
  w4: {
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

const LAYER_NAMES = ['drums', 'hat16', 'bass', 'pad', 'arp', 'lead'];

export class Music {
  constructor(engine) {
    this.e = engine;
    this.trackId = null;
    this.pending = null;
    this.intensity = 0.3;
    this.current = null;
    setInterval(() => this.tick(), 25);
  }

  get ctx() { return this.e.ctx; }

  play(id, fade = 0.8) {
    if (this.trackId === id && (this.current || this.pending)) return;
    this.trackId = id;
    if (!this.ctx) { this.pending = id; return; }
    this.start(id, fade);
  }

  start(id, fade) {
    const ctx = this.ctx;
    this.pending = null;
    if (this.current) this.fadeOutGroup(this.current, fade);
    const tr = TRACKS[id];
    if (!tr) { this.current = null; return; }
    const group = ctx.createGain();
    group.gain.setValueAtTime(0.0001, ctx.currentTime);
    group.gain.exponentialRampToValueAtTime(1, ctx.currentTime + fade);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 18000;
    group.connect(filter).connect(this.e.musicBus);
    const layers = {};
    for (const n of LAYER_NAMES) {
      const g = ctx.createGain();
      g.gain.value = (tr.layers[n] ?? 0) <= this.intensity ? 1 : 0;
      g.connect(group);
      layers[n] = g;
    }
    this.current = { id, tr, group, filter, layers, step: 0, next: ctx.currentTime + 0.08 };
  }

  fadeOutGroup(cur, fade) {
    const t = this.ctx.currentTime;
    cur.group.gain.cancelScheduledValues(t);
    cur.group.gain.setValueAtTime(cur.group.gain.value || 0.5, t);
    cur.group.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, fade));
    setTimeout(() => { try { cur.group.disconnect(); } catch (_) { /* déjà détaché */ } }, fade * 1000 + 200);
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
      const on = (cur.tr.layers[n] ?? 0) <= this.intensity + 1e-6;
      cur.layers[n].gain.setTargetAtTime(on ? 1 : 0, t, 0.4);
    }
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
    cur.group.gain.setValueAtTime(amount, t);
    cur.group.gain.setTargetAtTime(1, t + dur, 0.25);
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
    play(j.notes, j.type, 0.13);
    if (j.bass) play(j.bass, 'triangle', 0.18);
  }

  tick() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.pending) this.start(this.pending, 0.8);
    const cur = this.current;
    if (!cur) return;
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
    if (d.hat[s] === 'x') this.hat(t, L.drums, 0.05, d.clap ? 0.09 : 0.035);
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
    const ac = tr.arp.pattern[s];
    if (ac && ac !== '.') {
      const tones = chord(tr.chords[bar], tr.arp.oct);
      const all = [...tones, tones[0] + 12, tones[1] + 12, tones[2] + 12];
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
