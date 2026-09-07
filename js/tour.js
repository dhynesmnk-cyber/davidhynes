import * as THREE from '../vendor/three.module.js';
import { shortAngle } from './controls.js';

/* "Take me on a tour" — the path of least resistance. Flies the bee through
   every section in a sensible order and pauses long enough to read. */
export class Tour {
  constructor(flight) {
    this.flight = flight;
    this.active = false;
    this.stops = [];
    this.i = -1;
    this.phase = 'idle';
    this.t = 0;
    this.dur = 0;
    this.curve = null;
    this.dwell = 9.5;
    this.onArrive = null;
    this.onLeave = null;
    this.onEnd = null;
    this._v = new THREE.Vector3();
    this._p = new THREE.Vector3();
  }

  start(stops) {
    if (!stops.length) return;
    this.stops = stops;
    this.active = true;
    this.i = -1;
    this._next();
  }

  stop(silent) {
    if (!this.active) return;
    this.active = false;
    this.phase = 'idle';
    if (this.onLeave && this.current) this.onLeave(this.current);
    this.current = null;
    if (!silent && this.onEnd) this.onEnd();
  }

  _next() {
    if (this.onLeave && this.current) this.onLeave(this.current);
    this.current = null;
    this.i++;
    if (this.i >= this.stops.length) { this.active = false; this.phase = 'idle'; if (this.onEnd) this.onEnd(); return; }
    const target = this.stops[this.i];
    const from = this.flight.pos.clone();
    const to = target.landPos.clone();
    const dist = from.distanceTo(to);
    const up = Math.min(14, 5 + dist * 0.24);
    const a = from.clone().lerp(to, 0.30); a.y = Math.max(from.y, to.y) + up;
    const b = from.clone().lerp(to, 0.70); b.y = Math.max(from.y, to.y) + up * 0.72;
    const pre = to.clone().addScaledVector(new THREE.Vector3(to.x - b.x, 0, to.z - b.z).normalize(), -3.2);
    pre.y = to.y + 1.6;
    this.curve = new THREE.CatmullRomCurve3([from, a, b, pre, to], false, 'catmullrom', 0.4);
    this.dur = THREE.MathUtils.clamp(dist / 11, 2.4, 6.0);
    this.t = 0;
    this.phase = 'travel';
    this.flight.takeOff();
  }

  update(dt) {
    if (!this.active) return false;
    const F = this.flight;
    if (this.phase === 'travel') {
      this.t += dt;
      const raw = Math.min(1, this.t / this.dur);
      const e = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
      this.curve.getPoint(e, this._p);
      F.vel.copy(this._p).sub(F.pos).divideScalar(Math.max(dt, 0.001)).clampLength(0, 26);
      F.pos.copy(this._p);
      this.curve.getTangent(Math.min(0.999, e), this._v);
      const wantYaw = Math.atan2(this._v.x, this._v.z);
      F.yaw += shortAngle(F.yaw, wantYaw) * Math.min(1, dt * 3.2);
      F.pitch += (THREE.MathUtils.clamp(-this._v.y * 0.5, -0.5, 0.5) - F.pitch) * Math.min(1, dt * 2.5);
      if (raw >= 1) {
        const fl = this.stops[this.i];
        F.landOn(fl);
        this.current = fl;
        this.phase = 'dwell';
        this.t = 0;
        if (this.onArrive) this.onArrive(fl);
      }
    } else if (this.phase === 'dwell') {
      this.t += dt;
      /* slow orbit so the pause is not a freeze frame */
      F.yaw += dt * 0.10;
      if (this.t >= this.dwell) this._next();
    }
    return true;
  }

  get progress() {
    return { index: Math.max(0, this.i), total: this.stops.length, phase: this.phase };
  }
}
