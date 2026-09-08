import * as THREE from '../vendor/three.module.js';
import { feltMaterial, emitMaterial, shared } from './felt.js';
import { groundY, RIM } from './world.js';

const MOTE_VERT = /* glsl */`
  attribute vec3 aAnchor; attribute vec4 aParam; attribute vec3 aColor; attribute float aOn;
  uniform float uTime; uniform float uSize; uniform float uMotion;
  varying vec3 vC; varying float vA;
  void main(){
    /* uMotion 0 freezes every mote in place: prefers-reduced-motion gets
       still points of light instead of drifting ones */
    float t = mix(aParam.z * 3.1, uTime * aParam.y + aParam.z, uMotion);
    float rise = mod(t * 0.45, 1.0);
    vec3 off = vec3(cos(t) * aParam.x, rise * aParam.w, sin(t * 1.27) * aParam.x);
    vec3 p = aAnchor + off;
    vC = aColor;
    float fade = smoothstep(0.0, 0.12, rise) * (1.0 - smoothstep(0.72, 1.0, rise));
    vA = aOn * fade * (0.55 + 0.45 * sin(t * 2.3)) * (0.7 + 0.3 * uMotion);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = clamp(uSize / max(-mv.z, 1.0), 1.0, 34.0);
    gl_Position = projectionMatrix * mv;
  }`;

const MOTE_FRAG = /* glsl */`
  precision mediump float; varying vec3 vC; varying float vA;
  void main(){
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = 1.0 - smoothstep(0.0, 1.0, d);
    a *= a;
    gl_FragColor = vec4(vC * a * vA * 1.6, a * vA);
  }`;

class MoteField {
  constructor(scene, count, size) {
    this.count = count;
    const g = new THREE.BufferGeometry();
    this.anchor = new Float32Array(count * 3);
    this.param = new Float32Array(count * 4);
    this.color = new Float32Array(count * 3);
    this.on = new Float32Array(count);
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aAnchor', new THREE.BufferAttribute(this.anchor, 3));
    g.setAttribute('aParam', new THREE.BufferAttribute(this.param, 4));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3));
    g.setAttribute('aOn', new THREE.BufferAttribute(this.on, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 400);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: shared.uTime, uSize: { value: size }, uMotion: { value: 1 } },
      vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.layers.set(1);
    scene.add(this.points);
    this.geo = g;
    this.next = 0;
  }
  seed(i, pos, col, radius, rise, speed) {
    this.anchor.set([pos.x, pos.y, pos.z], i * 3);
    this.param.set([radius, speed, Math.random() * 100, rise], i * 4);
    this.color.set([col.r, col.g, col.b], i * 3);
    this.geo.attributes.aAnchor.needsUpdate = true;
    this.geo.attributes.aParam.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
  }
  setOn(i, v) { this.on[i] = v; this.geo.attributes.aOn.needsUpdate = true; }
}

export class AmbientLife {
  constructor(scene, quality, sections) {
    this.quality = quality;
    this.perFlower = quality === 'low' ? 10 : quality === 'med' ? 22 : 40;
    this.pollen = new MoteField(scene, this.perFlower * (sections.length + 1), quality === 'low' ? 110 : 150);
    this.slots = new Map();
    this.scene = scene;

    /* fireflies live at the edges from the start — the one hint that the
       garden is only asleep */
    const fcount = quality === 'low' ? 26 : quality === 'med' ? 60 : 110;
    this.fire = new MoteField(scene, fcount, quality === 'low' ? 110 : 150);
    const cols = ['#8ef7c5', '#7ddcff', '#c9f77a'].map(c => new THREE.Color(c));
    for (let i = 0; i < fcount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = RIM * (0.62 + Math.random() * 0.36);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      this.fire.seed(i, new THREE.Vector3(x, groundY(x, z) + 0.6 + Math.random() * 3.5, z),
        cols[i % 3], 1.4 + Math.random() * 3.4, 3.5 + Math.random() * 4, 0.12 + Math.random() * 0.30);
      this.fire.setOn(i, 0.18);
    }
    this.fireCount = fcount;

    /* butterflies show up once the garden has something to visit */
    this.butterflies = [];
    if (quality !== 'low') {
      for (let i = 0; i < 3; i++) this.butterflies.push(makeButterfly(scene, i));
    }

    /* the payoff ring */
    this.wave = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 1, 96, 1),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { uT: { value: 0 }, uColor: { value: new THREE.Color('#ffd27a') } },
        vertexShader: `varying float vR; void main(){ vR = (length(position.xy) - 0.55) / 0.45; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `precision mediump float; varying float vR; uniform float uT; uniform vec3 uColor;
          void main(){ float e = 1.0 - abs(vR - 0.5) * 2.0;
            float a = pow(e, 2.2) * (1.0 - uT);
            gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.35) * a * 2.4, a); }`
      })
    );
    this.wave.rotation.x = -Math.PI / 2;
    this.wave.visible = false;
    this.wave.layers.set(1);
    this.wave.frustumCulled = false;
    scene.add(this.wave);
    this.waveT = 1;
  }

  /* attach a pollen cloud to a flower that just bloomed */
  bloomFlower(id, worldPos, colorHex, height) {
    if (this.slots.has(id)) { this.slots.get(id).target = 1; return; }
    const start = this.slots.size * this.perFlower;
    const col = new THREE.Color(colorHex);
    for (let k = 0; k < this.perFlower; k++) {
      const i = start + k;
      if (i >= this.pollen.count) break;
      const a = Math.random() * Math.PI * 2, r = Math.random() * 2.2;
      this.pollen.seed(i,
        new THREE.Vector3(worldPos.x + Math.cos(a) * r, worldPos.y - height * 0.35, worldPos.z + Math.sin(a) * r),
        col, 0.7 + Math.random() * 2.6, height * 0.9 + 2.5, 0.25 + Math.random() * 0.6);
      this.pollen.setOn(i, 0);
    }
    this.slots.set(id, { start, cur: 0, target: 1 });
  }

  triggerWave(at, colorHex) {
    this.wave.position.copy(at);
    this.wave.material.uniforms.uColor.value.set(colorHex);
    this.wave.visible = true;
    this.waveT = 0;
  }

  update(dt, time, bloomCount, reducedMotion) {
    const m = reducedMotion ? 0 : 1;
    this.pollen.mat.uniforms.uMotion.value = m;
    this.fire.mat.uniforms.uMotion.value = m;
    for (const [, s] of this.slots) {
      if (Math.abs(s.cur - s.target) > 0.001) {
        s.cur += (s.target - s.cur) * Math.min(1, dt * 1.6);
        for (let k = 0; k < this.perFlower; k++) {
          const i = s.start + k;
          if (i < this.pollen.count) this.pollen.on[i] = s.cur;
        }
        this.pollen.geo.attributes.aOn.needsUpdate = true;
      }
    }
    const fireTarget = 0.18 + Math.min(1, bloomCount / 7) * 0.85;
    for (let i = 0; i < this.fireCount; i++) this.fire.on[i] += (fireTarget - this.fire.on[i]) * Math.min(1, dt * 0.9);
    this.fire.geo.attributes.aOn.needsUpdate = true;

    for (let i = 0; i < this.butterflies.length; i++) {
      const b = this.butterflies[i];
      b.visible = bloomCount >= i + 2;
      if (b.visible) b.tick(dt, time, m);
    }

    if (this.waveT < 1) {
      this.waveT = Math.min(1, this.waveT + dt * (reducedMotion ? 0.55 : 0.26));
      const e = 1 - Math.pow(1 - this.waveT, 2.2);
      const r = 2 + e * (RIM + 12);
      this.wave.scale.set(r, r, 1);
      this.wave.material.uniforms.uT.value = this.waveT;
      if (this.waveT >= 1) this.wave.visible = false;
    }
  }
}

function makeButterfly(scene, seed) {
  const g = new THREE.Group();
  const cols = ['#ff6ec7', '#b6ff3d', '#35f0ff'];
  const mat = feltMaterial({ color: cols[seed % 3], colorTop: '#ffffff', fuzz: 1.4, fibre: 1.2, side: THREE.DoubleSide });
  const bodyMat = feltMaterial({ color: '#3a3348', fuzz: 1.1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.26, 3, 6), bodyMat);
  body.rotation.x = Math.PI / 2; g.add(body);
  const wings = [];
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.bezierCurveTo(0.1, 0.42, 0.55, 0.52, 0.62, 0.16);
  shape.bezierCurveTo(0.68, -0.12, 0.42, -0.42, 0.14, -0.30);
  shape.lineTo(0, 0);
  const wg = new THREE.ShapeGeometry(shape, 8);
  for (const sx of [-1, 1]) {
    const p = new THREE.Group(); g.add(p);
    const w = new THREE.Mesh(wg, mat);
    w.scale.set(sx * 0.85, 0.85, 0.85);
    w.rotation.x = -Math.PI / 2;
    p.add(w);
    wings.push({ p, sx });
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), emitMaterial({ color: cols[seed % 3], intensity: 0.9, pulse: 0.3 }));
  core.layers.set(1); g.add(core);
  scene.add(g);
  const ph = seed * 2.1;
  g.tick = (dt, t, m) => {
    const tt = t * 0.13 + ph;
    const x = Math.sin(tt * 1.7) * 26 + Math.cos(tt * 0.7) * 12;
    const z = Math.cos(tt * 1.1) * 24 + Math.sin(tt * 1.9) * 9;
    const y = groundY(x, z) + 3.4 + Math.sin(t * 1.4 + ph) * 1.5 * m;
    const prev = g.position.clone();
    g.position.set(x, y, z);
    const d = g.position.clone().sub(prev);
    if (d.lengthSq() > 1e-6) g.lookAt(g.position.clone().add(d));
    const f = Math.sin(t * (m ? 13 : 3) + ph) * 0.85;
    for (const w of wings) w.p.rotation.z = w.sx * (0.35 + f);
  };
  return g;
}
