// Kong : contrôleur de plateforme précis. Module pur (aucune dépendance DOM) pour être testé sous Node.
import { T, isSlopeChar } from './tilemap.js';
import { approach, clamp } from '../engine/util.js';

export const PHYS = {
  w: 10, h: 14,
  gravity: 1500, fallMul: 1.32, apexHang: 0.55, apexBand: 60,
  maxFall: 470, fastFall: 640,
  run: 150, accel: 1500, turnAccel: 2600, decel: 1900,
  airAccel: 1150, airDecel: 650,
  airDrag: 35, airOverDecel: 170, // en l'air, l'élan se conserve (à la Mario) : seul un léger frottement
  iceAccel: 330, iceDecel: 95,
  overDecel: 240,
  jumpV: 430, djumpV: 390, cut: 0.45,
  wallJumpVX: 205, wallJumpVY: 415, wallSlide: 85, wallLock: 0.16,
  coyote: 0.1, buffer: 0.13,
  spring: 720, springHeld: 860, springGrace: 0.16,
  slideAccel: 720, slideMax: 320, slideFriction: 230, slideJumpBonus: 1.08,
  stompBounce: 330, stompHeld: 470,
  stepUp: 7, slopeSnap: 8,
};

const NO_INPUT = { held: {}, pressed: {} };

export class Player {
  constructor(x, y) {
    this.w = PHYS.w;
    this.h = PHYS.h;
    this.canDouble = false;
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.grounded = false; this.wasGrounded = false;
    this.facing = 1; this.coyote = 0; this.buffer = 0;
    this.jumping = false; this.usedDouble = false;
    this.wallDir = 0; this.wallSliding = false; this.wallLock = 0;
    this.sliding = false; this.slopeDir = 0; this.onIce = false; this.groundChar = '.';
    this.riding = null; this.dropT = 0; this.carryVx = 0; this.rideVx = 0; this.rideVy = 0;
    this.dead = false; this.deadT = 0; this.won = false; this.winT = 0;
    this.sx = 1; this.sy = 1; this.animDist = 0; this.rot = 0; this.tilt = 0;
    this.airVy = 0; this.t = 0; this.airTime = 0;
    this.springT = 0; this.springBoost = false; this.zip = null; this.zipCool = 0;
  }

  get cx() { return this.x + this.w / 2; }
  get bottom() { return this.y + this.h; }
  box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  squash(sx, sy) { this.sx = sx; this.sy = sy; }

  /**
   * lvl doit fournir : map, platforms (array), fx(name, data).
   * Le dt de la frame est découpé en micro-pas égaux (≤ 1/240 s) : la trajectoire est
   * identique de 30 à 240 fps sans imposer de pas de temps fixe.
   */
  update(dt, input, lvl) {
    if (this.zip) return; // suspendu à une tyrolienne : géré par le niveau
    // Plateforme mobile : on suit son déplacement UNE fois par frame (dx = déplacement de la frame).
    this.zipCool = Math.max(0, this.zipCool - dt);
    if (this.riding && !this.dead) {
      const p = this.riding;
      if (!p.hidden && this.x + this.w > p.x && this.x < p.x + p.w) {
        this.y = p.y - this.h;
        this.collideX(p.dx, lvl.map);
        // vitesse de l'objet porteur, transmise à Kong quand il le quitte (saut ou sortie par le bord)
        if (dt > 0) { this.rideVx = p.dx / dt; this.rideVy = p.dy / dt; }
      } else { this.carryVx = this.rideVx; this.riding = null; }
    }
    const n = Math.max(1, Math.ceil(dt * 240 - 1e-6));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.tick(h, i === 0 ? input : { held: input.held, pressed: {} }, lvl);
    }
  }

  tick(dt, input, lvl) {
    this.t += dt;
    const relax = Math.min(1, dt * 13);
    this.sx += (1 - this.sx) * relax;
    this.sy += (1 - this.sy) * relax;

    if (this.dead) {
      this.deadT += dt;
      this.vy += 1300 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rot += 11 * dt * this.facing;
      return;
    }

    let inp = input;
    if (this.won) {
      this.winT += dt;
      inp = NO_INPUT;
      if (this.grounded && this.winT > 0.35 && this.vx === 0) {
        this.vy = -260; this.grounded = false; this.squash(0.8, 1.25); lvl.fx('hop', this);
      }
    }
    const map = lvl.map;
    const L = !!inp.held.left, R = !!inp.held.right, D = !!inp.held.down;
    const dir = (R ? 1 : 0) - (L ? 1 : 0);

    if (inp.pressed.jump) this.buffer = PHYS.buffer;
    else this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = this.grounded ? PHYS.coyote : Math.max(0, this.coyote - dt);
    this.wallLock = Math.max(0, this.wallLock - dt);
    this.dropT = Math.max(0, this.dropT - dt);
    this.springT = Math.max(0, (this.springT || 0) - dt);

    // Ressort : SAUT pressé juste après le rebond = bond plus haut (fenêtre de tolérance).
    if (this.springT > 0 && !this.springBoost && this.buffer > 0) {
      this.vy -= PHYS.springHeld - PHYS.spring;
      this.springBoost = true; this.buffer = 0; this.springT = 0;
      this.squash(0.6, 1.5);
      lvl.fx('springBoost', this);
    }

    // Descendre d'une poutre : ↓ (ou ↓ + SAUT)
    if (this.grounded && this.groundChar === '-' && (inp.pressed.down || (D && this.buffer > 0))) {
      this.dropT = 0.22; this.buffer = 0; this.y += 1; this.grounded = false; this.coyote = 0;
    }

    // Glissade
    const wasSliding = this.sliding;
    // Glissade automatique dès qu'on s'engage dans une pente (sauf si on remonte volontairement),
    // l'élan se prolonge ensuite sur le plat tant qu'on va plus vite que la course et qu'on ne freine pas.
    const opposing = dir !== 0 && Math.sign(this.vx) !== 0 && dir !== Math.sign(this.vx);
    const downhill = this.slopeDir !== 0 && dir !== -this.slopeDir;
    const coast = wasSliding && !opposing && (Math.abs(this.vx) > PHYS.run || (D && Math.abs(this.vx) > 20));
    this.sliding = this.grounded && (downhill || coast || (D && Math.abs(this.vx) > 70));
    if (this.sliding && !wasSliding) lvl.fx('slideStart', this);
    if (dir !== 0 && !this.sliding && this.wallLock <= 0) this.facing = dir;

    // Horizontal
    let accel, decel;
    if (this.grounded) {
      if (this.onIce) { accel = PHYS.iceAccel; decel = PHYS.iceDecel; }
      else { accel = PHYS.accel; decel = PHYS.decel; }
    } else { accel = PHYS.airAccel; decel = PHYS.airDecel; }
    if (this.wallLock > 0) accel *= 0.25;

    if (this.sliding) {
      if (this.slopeDir !== 0) this.vx += this.slopeDir * PHYS.slideAccel * dt;
      else this.vx = approach(this.vx, 0, (this.onIce ? 30 : PHYS.slideFriction) * dt);
      this.vx = clamp(this.vx, -PHYS.slideMax, PHYS.slideMax);
      if (this.vx !== 0) this.facing = Math.sign(this.vx);
    } else if (dir !== 0) {
      const max = PHYS.run;
      if (Math.sign(this.vx) === dir && Math.abs(this.vx) > max) this.vx = approach(this.vx, dir * max, (this.grounded ? PHYS.overDecel : PHYS.airOverDecel) * dt);
      else {
        const turning = this.vx !== 0 && Math.sign(this.vx) !== dir;
        const a = turning ? (this.onIce && this.grounded ? accel * 1.5 : PHYS.turnAccel) : accel;
        this.vx = approach(this.vx, dir * max, a * dt);
      }
    } else if (!this.grounded) {
      // flèche relâchée en l'air : on garde sa vitesse (seul le contre-braquage freine vraiment)
      this.vx = approach(this.vx, 0, PHYS.airDrag * dt);
    } else {
      const d = Math.abs(this.vx) > PHYS.run ? Math.min(decel, PHYS.overDecel) : decel;
      this.vx = approach(this.vx, 0, d * dt);
    }

    // Sauts (sol + coyote time, mur, double saut) avec buffer
    if (this.buffer > 0) {
      if (this.grounded || this.coyote > 0) {
        const bonus = this.sliding || Math.abs(this.vx) > PHYS.run * 1.3 ? PHYS.slideJumpBonus : 1;
        this.vy = -PHYS.jumpV * bonus;
        if (this.riding) { this.vy += Math.min(0, this.rideVy); this.carryVx = this.rideVx; }
        this.grounded = false; this.coyote = 0; this.buffer = 0; this.jumping = true;
        this.riding = null; this.sliding = false;
        this.squash(0.68, 1.36);
        lvl.fx('jump', this);
      } else if (this.wallDir !== 0) {
        this.vx = -this.wallDir * PHYS.wallJumpVX;
        this.vy = -PHYS.wallJumpVY;
        this.facing = -this.wallDir;
        this.wallLock = PHYS.wallLock;
        this.buffer = 0; this.jumping = true; this.usedDouble = false;
        this.squash(0.75, 1.3);
        lvl.fx('walljump', this);
      } else if (this.canDouble && !this.usedDouble) {
        this.vy = -PHYS.djumpV;
        this.usedDouble = true; this.buffer = 0; this.jumping = true;
        if (dir !== 0 && Math.sign(this.vx) !== dir) this.vx = dir * PHYS.run * 0.6;
        this.squash(0.7, 1.35);
        lvl.fx('djump', this);
      }
    }
    // Hauteur de saut variable
    if (!inp.held.jump && this.jumping && this.vy < 0) { this.vy *= PHYS.cut; this.jumping = false; }
    if (this.vy >= 0) this.jumping = false;

    // Gravité (plus forte en descente, flottement à l'apex si SAUT maintenu)
    let g = PHYS.gravity;
    if (this.vy > 0) g *= PHYS.fallMul;
    else if (inp.held.jump && Math.abs(this.vy) < PHYS.apexBand) g *= PHYS.apexHang;
    this.vy += g * dt;

    this.wallSliding = false;
    if (!this.grounded && this.wallDir !== 0 && dir === this.wallDir && this.vy > 0) {
      this.vy = Math.min(this.vy, PHYS.wallSlide);
      this.wallSliding = true;
    }
    this.vy = Math.min(this.vy, D && !this.grounded ? PHYS.fastFall : PHYS.maxFall);
    // Vent : pousse surtout en l'air
    const wind = lvl.windAt ? lvl.windAt(this) : 0;
    if (wind) this.vx += wind * dt * (this.grounded ? 0.5 : 1);

    // Intégration en sous-pas (≤ 4 px) : pas de tunneling, indépendant du framerate.
    this.wasGrounded = this.grounded;
    if (!this.grounded) this.airVy = Math.max(this.airVy, this.vy);
    // Élan d'un objet en mouvement : conservé en l'air (léger freinage de l'air), perdu à l'atterrissage.
    const carry = this.grounded ? 0 : this.carryVx;
    const steps = Math.max(1, Math.ceil((Math.max(Math.abs(this.vx + carry), Math.abs(this.vy)) * dt) / 4));
    const h = dt / steps;
    this.grounded = false;
    this.slopeDir = 0;

    for (let i = 0; i < steps; i++) {
      this.collideX((this.vx + this.carryVx) * h, map);
      this.moveY(this.vy * h, map, lvl.platforms);
      this.slopeSnap(map);
    }

    this.carryVx = approach(this.carryVx, 0, 40 * dt);
    // État après mouvement
    if (this.grounded) {
      if (this.groundChar !== 'M') { this.carryVx = 0; this.rideVx = 0; this.rideVy = 0; }
      else this.carryVx = 0;
      this.airTime = 0;
      this.usedDouble = false;
      const tx0 = Math.floor(this.x / T), tx1 = Math.floor((this.x + this.w - 0.01) / T);
      const ty = Math.floor((this.bottom + 1) / T);
      this.onIce = false;
      for (let tx = tx0; tx <= tx1; tx++) {
        const c = map.get(tx, ty);
        if (c === '=') this.onIce = true;
        if (c === 'x' && map.triggerCrumble(tx, ty)) lvl.fx('crumbleStart', { tx, ty });
      }
      if (!this.wasGrounded) {
        lvl.fx('land', { player: this, vy: this.airVy });
        this.airVy = 0;
      }
      if (Math.abs(this.vx) > 10) this.animDist += Math.abs(this.vx) * dt;
    } else {
      this.airTime += dt;
      this.onIce = false;
    }

    this.wallDir = 0;
    if (!this.grounded) {
      const ys = [this.y + 3, this.y + this.h - 3];
      if (ys.some((y) => map.solidAtPoint(this.x - 1, y))) this.wallDir = -1;
      else if (ys.some((y) => map.solidAtPoint(this.x + this.w + 1, y))) this.wallDir = 1;
    }

    const targetTilt = this.grounded ? this.slopeDir * 0.3 : clamp(this.vy / 2000, -0.15, 0.15) * this.facing;
    this.tilt += (targetTilt - this.tilt) * Math.min(1, dt * 14);
  }

  collideX(dx, map) {
    if (dx === 0) return;
    this.x += dx;
    const top = this.y, bot = this.y + this.h;
    const tx = dx > 0 ? Math.floor((this.x + this.w - 1e-4) / T) : Math.floor(this.x / T);
    const ty0 = Math.floor(top / T), ty1 = Math.floor((bot - 1e-4) / T);
    let stepTop = null;
    const canStep = this.grounded || this.wasGrounded;
    for (let ty = ty0; ty <= ty1; ty++) {
      if (!map.solid(tx, ty)) continue;
      const tileTop = ty * T;
      if (canStep && tileTop >= bot - PHYS.stepUp && !map.solid(tx, ty - 1)) {
        stepTop = stepTop === null ? tileTop : Math.min(stepTop, tileTop);
        continue;
      }
      if (dx > 0) this.x = tx * T - this.w;
      else this.x = (tx + 1) * T;
      this.vx = 0; this.carryVx = 0;
      return;
    }
    if (stepTop !== null) this.y = stepTop - this.h;
  }

  moveY(dy, map, platforms) {
    const prevBot = this.y + this.h;
    this.y += dy;
    const x0 = Math.floor(this.x / T), x1 = Math.floor((this.x + this.w - 1e-4) / T);
    if (dy > 0) {
      const bot = this.y + this.h;
      const ty = Math.floor((bot - 1e-4) / T);
      const centerTile = map.get(Math.floor(this.cx / T), ty);
      if (!isSlopeChar(centerTile)) {
        for (let tx = x0; tx <= x1; tx++) {
          const c = map.get(tx, ty);
          const oneWay = c === '-' && prevBot <= ty * T + 0.01 && this.dropT <= 0;
          if (map.solid(tx, ty) || oneWay) {
            this.y = ty * T - this.h;
            this.vy = 0;
            this.grounded = true;
            this.groundChar = c;
            this.riding = null;
            break;
          }
        }
      }
      if (!this.grounded && platforms) {
        for (const p of platforms) {
          if (p.hidden) continue;
          if (prevBot <= p.y + 0.5 && this.y + this.h >= p.y && this.x + this.w > p.x && this.x < p.x + p.w && this.dropT <= 0) {
            this.y = p.y - this.h; this.vy = 0; this.grounded = true; this.riding = p; this.groundChar = 'M';
            break;
          }
        }
      }
    } else if (dy < 0) {
      const ty = Math.floor(this.y / T);
      for (let tx = x0; tx <= x1; tx++) {
        if (map.solid(tx, ty)) {
          this.y = (ty + 1) * T;
          if (this.vy < -60) this.bonked = true;
          this.vy = 0;
          this.jumping = false;
          break;
        }
      }
    }
  }

  slopeSnap(map) {
    if (this.vy < 0) return;
    const cx = this.cx;
    const tx = Math.floor(cx / T);
    const bot = this.y + this.h;
    const r0 = Math.floor((bot - 1e-4) / T);
    const snapping = this.grounded || this.wasGrounded;
    const rows = snapping ? [r0, r0 + 1] : [r0];
    for (const ty of rows) {
      const c = map.get(tx, ty);
      if (!isSlopeChar(c)) continue;
      const lx = clamp(cx - tx * T, 0, T);
      const surf = ty * T + (c === '/' ? T - lx : lx);
      const tol = snapping ? PHYS.slopeSnap : 0;
      if (bot >= surf - tol && bot <= surf + T) {
        this.y = surf - this.h;
        this.vy = 0;
        this.grounded = true;
        this.groundChar = c;
        this.slopeDir = c === '/' ? -1 : 1;
        this.riding = null;
        return;
      }
    }
  }
}
