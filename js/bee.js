import * as THREE from '../vendor/three.module.js';
import { feltMaterial, emitMaterial } from './felt.js';
import { blobShadow } from './flowers.js';
import { groundY } from './world.js';

const TAU = Math.PI * 2;

export class Bee {
  constructor(scene, quality) {
    this.quality = quality;
    this.root = new THREE.Group();       // position + heading
    this.tilt = new THREE.Group();       // bank / pitch, so the body leans
    this.body = new THREE.Group();       // squash & bob
    this.tilt.scale.setScalar(0.46);   // a bee, not an aircraft
    this.root.add(this.tilt);
    this.tilt.add(this.body);
    scene.add(this.root);

    const yellow = feltMaterial({ color: '#f5c542', colorTop: '#ffe08a', fuzz: 1.35, fibre: 1.4, bloomBias: 1 });
    const dark = feltMaterial({ color: '#2b2536', colorTop: '#443b56', fuzz: 1.25, fibre: 1.3, bloomBias: 1 });
    const ruffMat = feltMaterial({ color: '#fff0c4', colorTop: '#ffffff', fuzz: 1.6, fibre: 1.5, bloomBias: 1 });
    this.yellow = yellow;

    /* abdomen: fat, tapered, banded */
    const abd = new THREE.Group();
    abd.position.set(0, 0, -0.55);
    this.body.add(abd);
    const seg = [[0.52, 0.0, yellow], [0.50, -0.34, dark], [0.44, -0.66, yellow], [0.35, -0.94, dark], [0.24, -1.16, yellow]];
    for (const [r, z, m] of seg) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 11), m);
      s.position.z = z; s.scale.z = 0.9;
      abd.add(s);
    }
    const sting = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 7), dark);
    sting.rotation.x = Math.PI / 2; sting.position.z = -1.44; abd.add(sting);
    this.abdomen = abd;

    /* thorax */
    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 12), yellow);
    thorax.scale.set(1, 0.92, 1.05);
    this.body.add(thorax);
    const ruff = new THREE.Mesh(new THREE.SphereGeometry(0.60, 14, 10), ruffMat);
    ruff.scale.set(1.02, 0.94, 0.42); ruff.position.z = 0.30;
    this.body.add(ruff);

    /* head: big, round, cute */
    const head = new THREE.Group();
    head.position.set(0, 0.10, 0.78);
    this.body.add(head);
    this.headG = head;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 13), dark);
    skull.scale.set(1.08, 1.0, 0.94);
    head.add(skull);
    const faceMat = feltMaterial({ color: '#3a3348', colorTop: '#544a68', fuzz: 1.1, bloomBias: 1 });
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), faceMat);
      eye.position.set(sx * 0.26, 0.06, 0.32); eye.scale.set(0.85, 1.15, 0.55);
      head.add(eye);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), emitMaterial({ color: '#ffffff', intensity: 0.85 }));
      shine.position.set(sx * 0.30, 0.13, 0.44);
      shine.layers.enable(1);
      head.add(shine);
    }
    /* antennae */
    this.antennae = [];
    for (const sx of [-1, 1]) {
      const a = new THREE.Group();
      a.position.set(sx * 0.16, 0.36, 0.22);
      a.rotation.set(-0.5, 0, sx * 0.45);
      head.add(a);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, 0.52, 5), dark);
      st.position.y = 0.26; a.add(st);
      const tipG = new THREE.Group(); tipG.position.y = 0.52; a.add(tipG);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), dark);
      tip.position.y = 0.08; tipG.add(tip);
      this.antennae.push(a);
    }

    /* legs */
    this.legs = [];
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
      const l = new THREE.Group();
      l.position.set(sx * 0.34, -0.34, 0.34 - i * 0.42);
      l.rotation.set(0.3 + i * 0.12, 0, sx * (0.7 + i * 0.08));
      this.body.add(l);
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.030, 0.34, 5), dark);
      up.position.y = -0.17; l.add(up);
      const kn = new THREE.Group(); kn.position.y = -0.34; kn.rotation.x = -0.9; l.add(kn);
      const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.32, 5), dark);
      lo.position.y = -0.16; kn.add(lo);
      this.legs.push({ g: l, knee: kn, base: l.rotation.clone(), i });
    }

    /* wings: soft, translucent, and blurred by their own speed */
    this.wings = [];
    const wingMat = emitMaterial({ color: '#dff4ff', intensity: 0.42, transparent: true, additive: true, soft: 0.62, side: THREE.DoubleSide });
    const wingBlurMat = emitMaterial({ color: '#bfe6ff', intensity: 0.16, transparent: true, additive: true, soft: 0.9, side: THREE.DoubleSide });
    this.wingMat = wingMat; this.wingBlurMat = wingBlurMat;
    const wg = new THREE.PlaneGeometry(1.5, 0.62, 1, 1);
    wg.translate(0.75, 0, 0);
    for (const sx of [-1, 1]) for (let p = 0; p < 2; p++) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * 0.20, 0.44, 0.10 - p * 0.34);
      this.body.add(pivot);
      const w = new THREE.Mesh(wg, wingMat);
      w.scale.set(sx * (1 - p * 0.25), 1 - p * 0.2, 1);
      w.rotation.x = -Math.PI / 2;
      pivot.add(w);
      w.layers.enable(1);
      const wb = new THREE.Mesh(wg, wingBlurMat);
      wb.scale.set(sx * (1.12 - p * 0.25), 1.35 - p * 0.2, 1);
      wb.rotation.x = -Math.PI / 2;
      pivot.add(wb);
      wb.layers.enable(1);
      this.wings.push({ pivot, sx, pair: p, blur: wb });
    }

    /* glow trail */
    const N = quality === 'low' ? 26 : 54;
    this.trailN = N;
    const tp = new Float32Array(N * 3), ta = new Float32Array(N);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(tp, 3));
    tg.setAttribute('aAge', new THREE.BufferAttribute(ta, 1));
    this.trailGeo = tg;
    this.trailMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color('#ffd27a') }, uSize: { value: 46 }, uAmt: { value: 1 } },
      vertexShader: `
        attribute float aAge; varying float vA; uniform float uSize;
        void main(){ vA = aAge;
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = clamp(uSize * aAge / max(-mv.z, 1.0), 0.0, 26.0);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `precision mediump float; varying float vA; uniform vec3 uColor; uniform float uAmt;
        void main(){ float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = 1.0 - smoothstep(0.0, 1.0, d);
          gl_FragColor = vec4(uColor * a * vA * uAmt, a * vA * uAmt); }`
    });
    this.trail = new THREE.Points(tg, this.trailMat);
    this.trail.frustumCulled = false;
    this.trail.layers.set(1);
    scene.add(this.trail);
    this.trailPos = tp; this.trailAge = ta; this.trailHead = 0;

    this.shadow = blobShadow(0.72);
    this.shadow.material.uniforms.uOpacity.value = 0.34;
    scene.add(this.shadow);

    this.flap = 0;
    this.land = 0;
    this.landTarget = 0;
    this.bobT = Math.random() * TAU;
    this.reactT = 0;
    this._q = new THREE.Quaternion();
  }

  /* called with world state each frame */
  update(dt, time, state) {
    const { speed, turnRate, climb, landed, reducedMotion } = state;
    const rm = reducedMotion ? 0.35 : 1;

    /* wings: flap rate tracks effort, and fold when perched */
    this.landTarget = landed ? 1 : 0;
    this.land += (this.landTarget - this.land) * Math.min(1, dt * 7);
    const rate = (landed ? 6 : 34 + speed * 1.9);
    this.flap += dt * rate;
    const swing = (landed ? 0.10 : 0.62 + Math.min(0.5, speed * 0.03));
    for (const w of this.wings) {
      const ph = this.flap + w.pair * 0.5;
      const a = Math.sin(ph) * swing;
      w.pivot.rotation.z = w.sx * (0.16 + a);
      w.pivot.rotation.x = Math.cos(ph) * 0.22 - this.land * 0.5;
      w.pivot.rotation.y = -w.sx * this.land * 1.15;
      w.blur.visible = !landed && this.quality !== 'low';
    }
    const wb = landed ? 0.10 : Math.min(0.55, 0.32 + speed * 0.012);
    this.wingMat.uniforms.uIntensity.value = wb;
    this.wingBlurMat.uniforms.uIntensity.value = landed ? 0.02 : Math.min(0.26, 0.11 + speed * 0.010);

    /* idle life: a hovering bob, and the abdomen pulses like it is breathing */
    this.bobT += dt * (landed ? 1.6 : 3.4);
    const bob = Math.sin(this.bobT) * (landed ? 0.035 : 0.10) * rm;
    this.body.position.y = bob;
    const breathe = 1 + Math.sin(this.bobT * 0.8) * 0.035;
    this.abdomen.scale.set(breathe, breathe, 1 / breathe);

    /* landing squash, then a small overshoot back */
    if (this.landTarget && this.reactT < 1) this.reactT = Math.min(1, this.reactT + dt * 2.6);
    if (!this.landTarget) this.reactT = 0;
    const sq = Math.sin(this.reactT * Math.PI) * 0.22 * rm;
    this.body.scale.set(1 + sq, 1 - sq, 1 + sq * 0.6);

    /* tilt into turns and climbs */
    const bank = THREE.MathUtils.clamp(-turnRate * 0.55, -0.7, 0.7) * rm;
    const pitch = THREE.MathUtils.clamp(-climb * 0.10, -0.45, 0.45) * rm;
    const fwd = THREE.MathUtils.clamp(speed * 0.010, 0, 0.30) * rm;
    this.tilt.rotation.z += (bank - this.tilt.rotation.z) * Math.min(1, dt * 5);
    this.tilt.rotation.x += ((pitch + fwd) * (landed ? 0.2 : 1) - this.tilt.rotation.x) * Math.min(1, dt * 5);

    /* antennae trail behind, legs tuck in flight and splay on landing */
    for (let i = 0; i < 2; i++) {
      const a = this.antennae[i];
      a.rotation.x = -0.5 - Math.min(0.6, speed * 0.022) + Math.sin(time * 3 + i) * 0.09 * rm;
    }
    for (const l of this.legs) {
      const t = this.land;
      l.g.rotation.x = l.base.x + (1 - t) * 0.55 + Math.sin(time * 2.2 + l.i) * 0.05 * rm;
      l.knee.rotation.x = -0.9 + t * 0.55;
    }

    /* trail */
    const amt = reducedMotion ? 0 : THREE.MathUtils.clamp((speed - 3) / 14, 0, 1);
    this.trailMat.uniforms.uAmt.value = amt;
    if (amt > 0.01) {
      this.trailHead = (this.trailHead + 1) % this.trailN;
      const i = this.trailHead;
      this.trailPos[i * 3] = this.root.position.x;
      this.trailPos[i * 3 + 1] = this.root.position.y - 0.12;
      this.trailPos[i * 3 + 2] = this.root.position.z;
      this.trailAge[i] = 1;
    }
    const decay = Math.pow(0.05, dt);
    for (let i = 0; i < this.trailN; i++) this.trailAge[i] *= decay;
    this.trailGeo.attributes.position.needsUpdate = true;
    this.trailGeo.attributes.aAge.needsUpdate = true;

    /* shadow rides the terrain and fades with altitude */
    const gy = groundY(this.root.position.x, this.root.position.z);
    const alt = Math.max(0, this.root.position.y - gy);
    this.shadow.position.set(this.root.position.x, gy + 0.09, this.root.position.z);
    const k = THREE.MathUtils.clamp(1 - alt / 16, 0, 1);
    this.shadow.scale.setScalar(1 + alt * 0.10);
    this.shadow.material.uniforms.uOpacity.value = 0.36 * k * k;
  }

  setTrailColor(hex) { this.trailMat.uniforms.uColor.value.set(hex); }
}
