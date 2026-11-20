// Entrées unifiées : clavier (codes physiques, AZERTY/QWERTY), manette (Gamepad API), tactile.
export const DEFAULT_BINDINGS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'ArrowUp', 'KeyW', 'KeyK', 'KeyC'],
  pause: ['Escape', 'KeyP'],
  restart: ['KeyR'],
  debug: ['F3', 'Backquote'],
  confirm: ['Enter', 'Space', 'NumpadEnter'],
  fullscreen: ['KeyF'],
  share: ['KeyX'],
};
const ACTIONS = Object.keys(DEFAULT_BINDINGS);
const BLOCK = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F3', 'Backquote']);

export class Input {
  constructor(game) {
    this.game = game;
    this.bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
    this.keys = new Set();
    this.held = {};
    this.pressed = {};
    this.released = {};
    for (const a of ACTIONS) this.held[a] = this.pressed[a] = this.released[a] = false;
    this.pointers = new Map();
    this.pendingTaps = [];
    this.taps = [];
    this.touchButtons = [];
    this.touchMode = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    this.lastDevice = this.touchMode ? 'touch' : 'keyboard';
    this.anyKey = false;

    window.addEventListener('keydown', (e) => {
      if (this.blocked) return; // formulaire ouvert : les touches servent à écrire
      if (BLOCK.has(e.code)) e.preventDefault();
      if (this.capture) { const cb = this.capture; this.capture = null; e.preventDefault(); cb(e.code); this.swallow = e.code; return; }
      this.keys.add(e.code);
      this.touchMode = false;
      this.lastDevice = 'keyboard';
      this.anyKeyPending = true;
      game.audio.unlock();
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); if (this.swallow === e.code) this.swallow = null; });
    window.addEventListener('blur', () => { this.keys.clear(); this.pointers.clear(); });
    const c = game.canvas;
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { c.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      const p = game.toLogical(e.clientX, e.clientY);
      this.pointers.set(e.pointerId, p);
      this.pendingTaps.push({ x: p.x, y: p.y, type: e.pointerType });
      if (e.pointerType === 'touch') { this.touchMode = true; this.lastDevice = 'touch'; }
      game.audio.unlock();
    });
    this.mouse = null; // dernière position de la souris (survol, éditeur)
    this.wheel = 0;
    c.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    c.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') this.mouse = game.toLogical(e.clientX, e.clientY);
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, game.toLogical(e.clientX, e.clientY));
    });
    const up = (e) => this.pointers.delete(e.pointerId);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** La prochaine touche pressée est passée à cb (remappage des commandes) au lieu d'agir dans le jeu. */
  captureNext(cb) { this.capture = cb; }
  /** Commandes personnalisées sauvegardées (les actions inconnues gardent leurs touches par défaut). */
  loadBindings(saved) {
    if (!saved) return;
    for (const a of ACTIONS) if (Array.isArray(saved[a]) && saved[a].length) this.bindings[a] = saved[a].slice();
  }

  /** Boutons tactiles en coordonnées logiques : {action, x, y, r} */
  setTouchButtons(btns) { this.touchButtons = btns; }

  update() {
    const now = {};
    for (const a of ACTIONS) now[a] = this.bindings[a].some((k) => this.keys.has(k));
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
      const ax = gp.axes[0] || 0;
      const ay = gp.axes[1] || 0;
      let used = false;
      if (b(14) || ax < -0.4) { now.left = true; used = true; }
      if (b(15) || ax > 0.4) { now.right = true; used = true; }
      if (b(13) || ay > 0.5) { now.down = true; used = true; }
      if (b(12) || ay < -0.5) { now.up = true; used = true; }
      if (b(0) || b(1)) { now.jump = true; now.confirm = true; used = true; }
      if (b(9)) { now.pause = true; used = true; }
      if (b(3)) { now.restart = true; used = true; }
      if (b(8)) { now.debug = true; used = true; }
      if (used) { this.lastDevice = 'gamepad'; this.touchMode = false; }
    }
    if (this.touchButtons.length) {
      for (const p of this.pointers.values()) {
        for (const btn of this.touchButtons) {
          const dx = p.x - btn.x;
          const dy = p.y - btn.y;
          if (dx * dx + dy * dy <= btn.r * btn.r) now[btn.action] = true;
        }
      }
    }
    if (this.blocked) { for (const a of ACTIONS) now[a] = false; this.pendingTaps = []; }
    for (const a of ACTIONS) {
      this.pressed[a] = now[a] && !this.held[a];
      this.released[a] = !now[a] && this.held[a];
      this.held[a] = now[a];
    }
    this.taps = this.pendingTaps;
    this.pendingTaps = [];
    this.anyKey = !!this.anyKeyPending || this.pressed.jump || this.pressed.confirm;
    this.anyKeyPending = false;
  }

  /** Vrai si un tap a eu lieu dans le rectangle logique donné. */
  tapIn(x, y, w, h) {
    return this.taps.some((t) => t.x >= x && t.x <= x + w && t.y >= y && t.y <= y + h);
  }
}
