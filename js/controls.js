import * as THREE from '../vendor/three.module.js';
import { groundY, RIM } from './world.js';

const clamp = THREE.MathUtils.clamp;

/* Height above the terrain where the flowers are. The bee drifts back to it,
   and the target lifts toward whichever flower is nearby so the tall ones
   are not a fight to reach. */
export const CRUISE_H = 5.0;
/* How much of forward thrust goes into climb/dive when the view is pitched. */
const PITCH_LIFT = 0.45;

/* ------------------------------------------------------------------ input */
export class Input {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.keys = new Set();
    this.move = new THREE.Vector3();   // x strafe, y climb, z forward
    this.look = { x: 0, y: 0 };
    this.yawKey = 0;
    this.activity = 0;                 // >0 when the player is driving
    this.pointerLocked = false;
    this.isTouch = matchMedia('(hover: none)').matches || 'ontouchstart' in window;

    addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.has(k) || k === ' ') { e.preventDefault(); this.keys.add(k); this.bump(); }
    }, { passive: false });
    addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());

    /* mouse: drag to steer, or click to lock the pointer for free look */
    let dragging = false, lx = 0, ly = 0;
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;
      dragging = true; lx = e.clientX; ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('grabbing');
    });
    canvas.addEventListener('pointerup', e => {
      if (e.pointerType === 'touch') return;
      dragging = false; canvas.classList.remove('grabbing');
    });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      if (this.pointerLocked) { this.look.x -= e.movementX * 0.0022; this.look.y -= e.movementY * 0.0016; this.bump(); return; }
      if (!dragging) return;
      this.look.x -= (e.clientX - lx) * 0.0042;
      this.look.y -= (e.clientY - ly) * 0.0030;
      lx = e.clientX; ly = e.clientY;
      this.bump();
    });
    canvas.addEventListener('dblclick', () => { if (!this.isTouch) canvas.requestPointerLock?.(); });
    document.addEventListener('pointerlockchange', () => { this.pointerLocked = document.pointerLockElement === canvas; });

    /* touch: left third is the stick, anywhere right of it steers */
    this.stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
    const stickEl = ui.stick, knobEl = ui.knob;
    const startStick = (e, t) => {
      this.stick.active = true; this.stick.id = t.identifier;
      const r = stickEl.getBoundingClientRect();
      this.stick.ox = r.left + r.width / 2; this.stick.oy = r.top + r.height / 2;
      stickEl.classList.add('on');
      this.bump();
    };
    const stickZone = ui.stickZone;
    stickZone.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) if (!this.stick.active) { startStick(e, t); this.updStick(t, knobEl); }
      e.preventDefault();
    }, { passive: false });
    stickZone.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) if (t.identifier === this.stick.id) { this.updStick(t, knobEl); this.bump(); }
      e.preventDefault();
    }, { passive: false });
    const endStick = e => {
      for (const t of e.changedTouches) if (t.identifier === this.stick.id) {
        this.stick.active = false; this.stick.id = null; this.stick.x = 0; this.stick.y = 0;
        knobEl.style.transform = 'translate(-50%,-50%)';
        stickEl.classList.remove('on');
      }
    };
    stickZone.addEventListener('touchend', endStick);
    stickZone.addEventListener('touchcancel', endStick);

    this.lookTouch = null;
    const lookZone = ui.lookZone;
    lookZone.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) if (this.lookTouch === null) { this.lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY }; }
      e.preventDefault();
    }, { passive: false });
    lookZone.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (this.lookTouch && t.identifier === this.lookTouch.id) {
          this.look.x -= (t.clientX - this.lookTouch.x) * 0.0055;
          this.look.y -= (t.clientY - this.lookTouch.y) * 0.0040;
          this.lookTouch.x = t.clientX; this.lookTouch.y = t.clientY;
          this.bump();
        }
      }
      e.preventDefault();
    }, { passive: false });
    const endLook = e => {
      for (const t of e.changedTouches) if (this.lookTouch && t.identifier === this.lookTouch.id) this.lookTouch = null;
    };
    lookZone.addEventListener('touchend', endLook);
    lookZone.addEventListener('touchcancel', endLook);

    /* altitude buttons on touch, kept out from under the thumbs */
    const hold = (el, fn) => {
      let on = false;
      el.addEventListener('touchstart', e => { on = true; el.classList.add('on'); this.bump(); e.preventDefault(); }, { passive: false });
      const off = () => { on = false; el.classList.remove('on'); };
      el.addEventListener('touchend', off); el.addEventListener('touchcancel', off);
      Object.defineProperty(this, fn, { get: () => on });
    };
    hold(ui.up, '_up');
    hold(ui.down, '_down');
  }

  updStick(t, knob) {
    const dx = t.clientX - this.stick.ox, dy = t.clientY - this.stick.oy;
    const max = 52;
    const d = Math.hypot(dx, dy);
    const k = d > max ? max / d : 1;
    this.stick.x = (dx * k) / max;
    this.stick.y = (dy * k) / max;
    knob.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
  }

  bump() { this.activity = 1; }

  sample() {
    const k = this.keys;
    let x = 0, y = 0, z = 0, yaw = 0;
    if (k.has('w') || k.has('arrowup')) z += 1;
    if (k.has('s') || k.has('arrowdown')) z -= 1;
    if (k.has('a')) x -= 1;
    if (k.has('d')) x += 1;
    if (k.has('arrowleft')) yaw += 1;
    if (k.has('arrowright')) yaw -= 1;
    if (k.has('q')) yaw += 1;
    if (k.has('e')) yaw -= 1;
    if (k.has(' ')) y += 1;
    if (k.has('shift')) y -= 1;
    if (this.stick.active) { x += this.stick.x; z += -this.stick.y; }
    if (this._up) y += 1;
    if (this._down) y -= 1;
    this.move.set(clamp(x, -1, 1), clamp(y, -1, 1), clamp(z, -1, 1));
    this.yawKey = yaw;
    const active = this.move.lengthSq() > 0.004 || yaw !== 0 || Math.abs(this.look.x) > 0.0001 || Math.abs(this.look.y) > 0.0001;
    return active;
  }
}
const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'q', 'e']);

/* ----------------------------------------------------------------- flight */
export class Flight {
  constructor(bee, camera) {
    this.bee = bee;
    this.camera = camera;
    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI;
    this.pitch = -0.08;
    this.turnRate = 0;
    this.landed = null;              // flower we are sitting on
    this.landT = 0;
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this._f = new THREE.Vector3();
    this._r = new THREE.Vector3();
    this._t = new THREE.Vector3();
    this.obstacles = [];
    this.camDist = 7.4;
    this.frameScale = 1;   // portrait screens need more room to breathe
    this.cruiseY = null;   // main sets this to a nearby flower's landing height
    this._cruise = null;
    this.sideBias = 0;   // set by main: shifts the subject left when a card is beside it
  }

  spawn(x, y, z, yaw) {
    this.pos.set(x, y, z);
    this.yaw = yaw;
    this.camPos.set(x - Math.sin(yaw) * 9, y + 3.4, z - Math.cos(yaw) * 9);
  }

  forward(out) { return out.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); }
  right(out) { return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }

  step(dt, input, opts) {
    const active = input.sample();
    const reduced = opts.reducedMotion;

    /* look */
    const prevYaw = this.yaw;
    this.yaw += input.look.x + input.yawKey * dt * 1.7;
    this.pitch = clamp(this.pitch + input.look.y, -0.95, 0.85);
    input.look.x *= 0.0; input.look.y *= 0.0;

    if (this.landed && active) this.takeOff();

    const f = this.forward(this._f), r = this.right(this._r);
    const acc = this._t.set(0, 0, 0);
    if (!this.landed) {
      /* Thrust follows the view, but only weakly in Y: looking down should
         angle the flight, not drop the bee out of the garden. */
      acc.x += f.x * input.move.z * 34;
      acc.z += f.z * input.move.z * 34;
      acc.y += f.y * input.move.z * 34 * PITCH_LIFT;
      acc.addScaledVector(r, input.move.x * 25);
      acc.y += input.move.y * 26;
    }

    this.vel.addScaledVector(acc, dt);
    const damp = Math.pow(0.16, dt);       // floaty: it glides for a beat after you let go
    this.vel.multiplyScalar(damp);
    const maxSpd = 24;
    if (this.vel.length() > maxSpd) this.vel.setLength(maxSpd);

    if (this.landed) {
      /* ease onto the landing spot and stay there */
      this.landT = Math.min(1, this.landT + dt * 2.4);
      this.pos.lerp(this.landed.landPos, Math.min(1, dt * 6));
      this.vel.multiplyScalar(0.8);
    } else {
      /* Settle back to the height the garden lives at. Only when the player
         is not asking for altitude, and slowly enough that it reads as the
         bee finding its level rather than the camera being taken away. */
      const target = this.cruiseY !== null
        ? this.cruiseY
        : groundY(this.pos.x, this.pos.z) + CRUISE_H;
      if (this._cruise === null) this._cruise = target;
      this._cruise += (target - this._cruise) * Math.min(1, dt * 1.6);
      if (input.move.y === 0) {
        const wantVY = clamp((this._cruise - this.pos.y) * 0.8, -4.5, 4.5);
        this.vel.y += (wantVY - this.vel.y) * Math.min(1, dt * 2.2);
      }
      this.pos.addScaledVector(this.vel, dt);
    }

    /* --- soft collision: everything pushes, nothing blocks -------------- */
    const gy = groundY(this.pos.x, this.pos.z) + 0.75;
    if (this.pos.y < gy) {
      const push = (gy - this.pos.y);
      this.pos.y += push * Math.min(1, dt * 12);
      if (this.vel.y < 0) this.vel.y *= 0.35;
      this.vel.y += push * 3 * dt;
    }
    if (this.pos.y > 52) { this.pos.y += (52 - this.pos.y) * Math.min(1, dt * 3); this.vel.y = Math.min(this.vel.y, 0); }

    const rr = Math.hypot(this.pos.x, this.pos.z);
    const lim = RIM - 3;
    if (rr > lim) {
      const k = (rr - lim);
      const nx = this.pos.x / rr, nz = this.pos.z / rr;
      this.pos.x -= nx * k * Math.min(1, dt * 6);
      this.pos.z -= nz * k * Math.min(1, dt * 6);
      const vd = this.vel.x * nx + this.vel.z * nz;
      if (vd > 0) { this.vel.x -= nx * vd * 0.9; this.vel.z -= nz * vd * 0.9; }
    }
    for (const o of (this.landed ? [] : this.obstacles)) {
      const dx = this.pos.x - o.x, dy = this.pos.y - o.y, dz = this.pos.z - o.z;
      const d = Math.hypot(dx, dy * 0.5, dz);
      if (d < o.r && d > 0.001) {
        const k = (o.r - d) / o.r;
        this.pos.x += (dx / d) * k * 22 * dt;
        this.pos.y += (dy / d) * k * 10 * dt;
        this.pos.z += (dz / d) * k * 22 * dt;
        this.vel.multiplyScalar(1 - Math.min(0.7, k));
      }
    }

    /* --- rig -------------------------------------------------------- */
    this.turnRate = ((this.yaw - prevYaw + Math.PI * 3) % (Math.PI * 2) - Math.PI) / Math.max(dt, 0.001);
    const bee = this.bee;
    bee.root.position.copy(this.pos);
    const targetYaw = this.landed ? this.landYaw : this.yaw;
    bee.root.rotation.y += shortAngle(bee.root.rotation.y, targetYaw) * Math.min(1, dt * 9);

    /* camera: chase, or a framed portrait when perched */
    let camTarget, lookTarget;
    if (this.landed) {
      const fl = this.landed;
      const back = this._t.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      camTarget = this._camA = (this._camA || new THREE.Vector3());
      const vd = (fl.viewDist || 8.6) * this.frameScale;
      camTarget.copy(fl.anchor).addScaledVector(back, -vd);
      camTarget.y = fl.anchor.y + vd * 0.30;
      lookTarget = this._camB = (this._camB || new THREE.Vector3());
      lookTarget.copy(fl.anchor).lerp(this.pos, 0.35);
      lookTarget.addScaledVector(this.right(this._r), this.sideBias);
      /* on a tall screen the card owns the top half, so aim high and let the
         flower sit in the clear space underneath it */
      lookTarget.y += (this.frameScale - 1) * vd * 0.50;
    } else {
      const f2 = this.forward(this._f);
      camTarget = this._camA = (this._camA || new THREE.Vector3());
      camTarget.copy(this.pos).addScaledVector(f2, -this.camDist * this.frameScale);
      camTarget.y += 2.3 * this.frameScale;
      lookTarget = this._camB = (this._camB || new THREE.Vector3());
      lookTarget.copy(this.pos).addScaledVector(f2, 7.5);
      lookTarget.y += 2.5;
      /* nudge the bee off dead centre: better composition, and it keeps the
         tour button from sitting on top of it */
      lookTarget.addScaledVector(this.right(this._r), 1.3);
    }
    const cgy = groundY(camTarget.x, camTarget.z) + 1.4;
    if (camTarget.y < cgy) camTarget.y = cgy;
    const lag = reduced ? 9 : (this.landed ? 2.6 : 4.4);
    this.camPos.lerp(camTarget, Math.min(1, dt * lag));
    this.camLook.lerp(lookTarget, Math.min(1, dt * (lag * 1.4)));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    return { active, speed: this.vel.length(), turnRate: this.turnRate, climb: this.vel.y };
  }

  landOn(flower) {
    this.landed = flower;
    this.landT = 0;
    this.landYaw = Math.atan2(flower.anchor.x - this.pos.x, flower.anchor.z - this.pos.z);
  }
  takeOff() {
    if (!this.landed) return;
    this.landed = null;
    this.vel.y += 4;
  }
}

export function shortAngle(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
