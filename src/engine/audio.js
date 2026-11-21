// Moteur audio 100% synthétisé (Web Audio API) : aucun fichier son.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.volumes = { master: 0.8, music: 0.55, sfx: 0.8 };
    this.slideGain = null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(this.comp).connect(ctx.destination);
    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    this.initSlideLoop();
    if (this.onUnlock) this.onUnlock();
  }

  setVolume(kind, v) { this.volumes[kind] = v; this.applyVolumes(); }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.volumes.master;
    this.sfxBus.gain.value = this.volumes.sfx;
    this.musicBus.gain.value = this.volumes.music;
  }

  tone(type, f0, f1, dur, vol = 0.2, { delay = 0, attack = 0.004, bus = null, vibrato = 0 } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = vibrato;
      lg.gain.value = f0 * 0.06;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus || this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(dur, vol = 0.2, { type = 'lowpass', freq = 1200, freq1 = null, q = 1, delay = 0 } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (freq1) f.frequency.exponentialRampToValueAtTime(freq1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  initSlideLoop() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2400;
    f.Q.value = 0.7;
    this.slideFilter = f;
    this.slideGain = ctx.createGain();
    this.slideGain.gain.value = 0;
    src.connect(f).connect(this.slideGain).connect(this.sfxBus);
    src.start();
  }

  /** Grondement continu de l'avalanche (0 = silence). */
  setRumble(intensity) {
    if (!this.ctx) return;
    if (!this.rumbleGain) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf; src.loop = true;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
      this.rumbleGain = this.ctx.createGain(); this.rumbleGain.gain.value = 0;
      src.connect(f).connect(this.rumbleGain).connect(this.sfxBus); src.start();
    }
    this.rumbleGain.gain.setTargetAtTime(Math.min(0.5, intensity * 0.5), this.ctx.currentTime, 0.15);
  }

  /** Bruit de glisse continu (0 = silence). */
  setSlide(intensity) {
    if (!this.slideGain) return;
    const t = this.ctx.currentTime;
    this.slideGain.gain.setTargetAtTime(Math.min(0.12, intensity * 0.12), t, 0.05);
    this.slideFilter.frequency.setTargetAtTime(1600 + intensity * 2400, t, 0.1);
  }

  play(name, p = 1) {
    if (!this.ctx) return;
    switch (name) {
      case 'jump': this.tone('square', 260, 560, 0.13, 0.09); break;
      case 'djump':
        this.tone('triangle', 520, 1150, 0.16, 0.16);
        this.tone('square', 1040, 1560, 0.08, 0.04, { delay: 0.04 });
        break;
      case 'walljump':
        this.noise(0.04, 0.15, { type: 'highpass', freq: 3000 });
        this.tone('square', 300, 640, 0.11, 0.09);
        break;
      case 'land': this.noise(0.09, 0.12 * p, { freq: 520, freq1: 140 }); break;
      case 'step': this.noise(0.03, 0.03, { type: 'highpass', freq: 4000 }); break;
      case 'coin': {
        const m = p;
        this.tone('square', 988 * m, 988 * m, 0.06, 0.07);
        this.tone('square', 1319 * m, 1319 * m, 0.18, 0.07, { delay: 0.055 });
        break;
      }
      case 'star': {
        const notes = [1047, 1319, 1568, 2093, 2637];
        notes.forEach((f, i) => this.tone('triangle', f, f, 0.22, 0.13, { delay: i * 0.06 }));
        this.noise(0.5, 0.05, { type: 'highpass', freq: 6000, delay: 0.1 });
        break;
      }
      case 'stomp':
        this.tone('square', 420, 90, 0.14, 0.14);
        this.noise(0.1, 0.18, { freq: 900, freq1: 200 });
        break;
      case 'spring': this.tone('sine', 180, 980, 0.28, 0.2, { vibrato: 30 }); break;
      case 'death':
        this.tone('square', 660, 70, 0.55, 0.12, { vibrato: 14 });
        this.noise(0.25, 0.16, { freq: 1400, freq1: 120 });
        break;
      case 'respawn': this.tone('triangle', 400, 900, 0.12, 0.08); break;
      case 'checkpoint':
        [784, 1047, 1319].forEach((f, i) => this.tone('square', f, f, 0.12, 0.08, { delay: i * 0.07 }));
        break;
      case 'powerup':
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone('square', f, f * 1.01, 0.1, 0.07, { delay: i * 0.05 }));
        break;
      case 'crumble': this.noise(0.25, 0.1, { type: 'bandpass', freq: 1800, freq1: 500, q: 2 }); break;
      case 'splash':
        this.noise(0.4, 0.25, { type: 'lowpass', freq: 2500, freq1: 300 });
        this.tone('sine', 600, 150, 0.25, 0.1);
        break;
      case 'skid': this.noise(0.18, 0.1, { type: 'bandpass', freq: 3200, freq1: 1500, q: 1.5 }); break;
      case 'shatter':
        this.noise(0.3, 0.18, { type: 'highpass', freq: 3000 });
        [2400, 3100, 2800].forEach((f, i) => this.tone('triangle', f, f * 0.9, 0.08, 0.05, { delay: i * 0.03 }));
        break;
      case 'key': [880, 1175, 1568].forEach((f, i) => this.tone('square', f, f, 0.1, 0.07, { delay: i * 0.06 })); break;
      case 'door': this.noise(0.35, 0.15, { type: 'lowpass', freq: 600, freq1: 200 }); this.tone('square', 220, 330, 0.2, 0.06, { delay: 0.1 }); break;
      case 'locked': this.tone('square', 160, 140, 0.12, 0.08); break;
      case 'zip': this.tone('sawtooth', 300, 500, 0.15, 0.05); break;
      case 'bonk': this.tone('square', 180, 120, 0.08, 0.08); break;
      case 'sign': this.tone('square', 880, 880, 0.04, 0.04); break;
      case 'select': this.tone('square', 660, 990, 0.06, 0.06); break;
      case 'move': this.tone('square', 520, 520, 0.03, 0.04); break;
      case 'pause': this.tone('triangle', 700, 350, 0.12, 0.1); break;
      case 'rate': this.tone('square', 784 * p, 1568 * p, 0.12, 0.1); this.noise(0.2, 0.06, { type: 'highpass', freq: 5000 }); break;
      // --- boss ---
      case 'roar':
        this.noise(0.7, 0.22, { type: 'bandpass', freq: 500 * p, freq1: 180 * p, q: 1.2 });
        this.tone('sawtooth', 140 * p, 70 * p, 0.6, 0.12, { vibrato: 18 });
        break;
      case 'boom':
        this.noise(0.5, 0.3, { type: 'lowpass', freq: 900, freq1: 60 });
        this.tone('sine', 120, 35, 0.45, 0.3);
        break;
      case 'bossHit':
        this.tone('square', 900, 200, 0.25, 0.16);
        this.noise(0.3, 0.25, { freq: 2400, freq1: 300 });
        [523, 392, 262].forEach((f, i) => this.tone('triangle', f, f, 0.1, 0.1, { delay: 0.12 + i * 0.07 }));
        break;
      case 'throw': this.noise(0.18, 0.1 * p, { type: 'bandpass', freq: 1200 * p, freq1: 400, q: 1 }); break;
      case 'engine': this.tone('sawtooth', 60, 110, 0.6, 0.1, { vibrato: 25 }); this.noise(0.5, 0.08, { type: 'lowpass', freq: 400, freq1: 300 }); break;
      case 'charge': this.tone('sine', 300, 1400, 0.7, 0.06, { vibrato: 40 }); break;
      case 'laser': this.tone('sawtooth', 1800, 200, 0.35, 0.08); this.noise(0.3, 0.08, { type: 'highpass', freq: 3000 }); break;
      case 'bass': this.tone('sine', 110, 40, 0.35, 0.35); this.noise(0.08, 0.1, { type: 'lowpass', freq: 300 }); break;
      case 'win': {
        const mel = [523, 659, 784, 1047, 0, 784, 1047];
        mel.forEach((f, i) => { if (f) this.tone('square', f, f, i === 6 ? 0.5 : 0.11, 0.09, { delay: i * 0.1 }); });
        [262, 330, 392].forEach((f, i) => this.tone('triangle', f, f, 0.6, 0.1, { delay: 0.6 + i * 0.01 }));
        break;
      }
      default: break;
    }
  }
}
