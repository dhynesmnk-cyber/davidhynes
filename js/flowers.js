import * as THREE from '../vendor/three.module.js';
import { feltMaterial, emitMaterial } from './felt.js';
import { groundY } from './world.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const _pq = new THREE.Quaternion();

/* Halos hang off rotated stems, so cancel the parent rotation out. */
export function faceCamera(m, camera) {
  if (!m.parent) return;
  m.parent.getWorldQuaternion(_pq).invert();
  m.quaternion.copy(_pq).multiply(camera.quaternion);
}

/* A felt petal: rounded, cupped, and never quite symmetrical. */
function petalGeo(w = 1, h = 2, cup = 0.28, curl = 0.5, tipRound = 0.75) {
  const NU = 5, NV = 7;
  const vs = [], ns = [], uvs = [], ix = [];
  const wob = rnd(-0.10, 0.10);
  for (let j = 0; j <= NV; j++) {
    const v = j / NV;
    let prof = Math.sin(Math.pow(v, 0.62) * Math.PI);
    prof = Math.pow(prof, tipRound);
    prof = Math.max(prof, 0.06);
    for (let i = 0; i <= NU; i++) {
      const u = i / NU - 0.5;
      const x = u * w * prof * (1 + wob * v);
      const y = v * h;
      const z = -cup * (u * 2) * (u * 2) * prof * 0.5 - curl * v * v * 0.5;
      vs.push(x, y, z);
      ns.push(0, curl * 0.4, 1);
      uvs.push(i / NU, v);
    }
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
    const a = j * (NU + 1) + i;
    ix.push(a, a + 1, a + NU + 1, a + 1, a + NU + 2, a + NU + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vs, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(ns, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(ix);
  g.computeVertexNormals();
  return g;
}

function stemGeo(height, lean = 0.12, radius = 0.085) {
  const pts = [];
  const dir = rnd(0, TAU);
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const w = Math.sin(t * 3.1) * height * lean;
    pts.push(new THREE.Vector3(Math.cos(dir) * w, t * height, Math.sin(dir) * w));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, 10, radius, 6, false);
}

export function blobShadow(radius) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uOpacity: { value: 0.42 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `precision mediump float; varying vec2 vUv; uniform float uOpacity;
        void main(){ float d = length(vUv - 0.5) * 2.0; float a = 1.0 - smoothstep(0.2, 1.0, d);
        gl_FragColor = vec4(0.02, 0.03, 0.09, a * uOpacity); }`
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}

/* Soft billboard halo. Lives only on the glow layer. */
function halo(color, size, intensity = 1) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    emitMaterial({ color, intensity, transparent: true, additive: true, soft: 0.98, pulse: 0.10 })
  );
  m.layers.set(1);
  m.renderOrder = 4;
  m.userData.billboard = true;
  m.userData.isHalo = true;
  return m;
}

export class Flower {
  constructor(section, quality) {
    this.section = section;
    this.id = section.id;
    this.quality = quality;
    this.openness = 0;
    this.bloom = 0;
    this.group = new THREE.Group();
    const [x, z] = section.pos;
    this.group.position.set(x, groundY(x, z), z);
    this.group.rotation.y = rnd(0, TAU);
    this.petals = [];
    this.emitters = [];
    this.sway = rnd(0, TAU);

    const accent = section.accent, accent2 = section.accent2 || section.accent;
    this.mat = feltMaterial({ color: accent, colorTop: accent2, fuzz: 0.95, fibre: 1.15, side: THREE.DoubleSide, sway: 0.5 });
    this.mat2 = feltMaterial({ color: accent2, colorTop: accent, fuzz: 0.95, fibre: 1.1, side: THREE.DoubleSide, sway: 0.5 });
    this.stemMat = feltMaterial({ color: '#5a8a4e', colorTop: '#79ab5c', fuzz: 0.8, fibre: 1.0, sway: 0.4 });
    this.sepalMat = feltMaterial({ color: '#4d7a48', colorTop: '#68a05a', fuzz: 1.0, fibre: 1.0, side: THREE.DoubleSide, sway: 0.5 });

    const build = BUILDERS[section.kind] || BUILDERS.coneflower;
    this.height = build(this, accent, accent2);
    if (!this.viewDist) this.viewDist = 8.6;

    this.shadow = blobShadow(1.6);
    this.shadow.position.y = 0.07;
    this.group.add(this.shadow);

    /* light pools on the ground: what makes the garden read as lit by its
       own flowers rather than by a lamp somewhere off-screen */
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      emitMaterial({ color: accent, intensity: 1, transparent: true, additive: true, soft: 0.99, pulse: 0.08 })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.scale.setScalar(this.poolSize || 17);
    pool.position.y = 0.22;
    pool.layers.set(1);
    pool.renderOrder = 2;
    this.group.add(pool);
    this.addEmitter(pool, 0.26);

    if (!this.viewDist) this.viewDist = 8.6;
    this.head = this.head || new THREE.Object3D();
    this.landPos = new THREE.Vector3();
    this.anchor = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
    this.setOpenness(0);
    this.setBloom(0);   // dormant: the glow has to start switched off
  }

  addPetal(mesh, closed, open) {
    mesh.userData.closed = closed;
    mesh.userData.open = open;
    this.petals.push(mesh);
    return mesh;
  }

  addEmitter(mesh, base) {
    mesh.layers.enable(1);
    mesh.userData.baseIntensity = base;
    this.emitters.push(mesh);
    return mesh;
  }

  setOpenness(t) {
    this.openness = t;
    const e = t * t * (3 - 2 * t);
    for (const p of this.petals) {
      const c = p.userData.closed, o = p.userData.open;
      p.rotation.x = c.rx + (o.rx - c.rx) * e;
      p.rotation.z = c.rz + (o.rz - c.rz) * e;
      if (c.ry !== undefined) p.rotation.y = c.ry + (o.ry - c.ry) * e;
      const s = c.s + (o.s - c.s) * e;
      p.scale.setScalar(s);
      if (c.y !== undefined) p.position.y = c.y + (o.y - c.y) * e;
    }
  }

  setBloom(b) {
    this.bloom = b;
    for (const m of this.emitters) {
      /* Dormant keeps a spark in the flower cores so you can find them, but
         no halo at all — the bloom is what turns the lights on. */
      const floor = m.userData.isHalo ? 0.010 : 0.085;
      m.material.uniforms.uIntensity.value = m.userData.baseIntensity * (floor + (1 - floor) * b);
    }
  }

  update(dt, time, camera) {
    const s = Math.sin(time * 0.8 + this.sway);
    this.group.rotation.z = s * 0.018 * (0.4 + this.openness);
    this.group.rotation.x = Math.cos(time * 0.63 + this.sway) * 0.014;
    if (this.head) {
      this.head.getWorldPosition(this.anchor);
      this.landPos.copy(this.anchor).addScaledVector(this._tmp.set(0, 1, 0), this.landOffset || 0.9);
    }
    for (const m of this.emitters) if (m.userData.billboard) faceCamera(m, camera);
  }
}

/* ---------------------------------------------------------------- species */
const BUILDERS = {

  /* tall, drooping ray petals around a domed spiky cone */
  coneflower(F, a, a2) {
    const H = 6.4;
    F.group.add(new THREE.Mesh(stemGeo(H, 0.09, 0.10), F.stemMat));
    const head = new THREE.Group(); head.position.y = H; F.group.add(head); F.head = head;

    const cone = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10, 0, TAU, 0, 1.15), F.mat2);
    cone.scale.y = 1.25; cone.position.y = 0.18; head.add(cone);
    const SPIKES = F.quality === 'low' ? 0 : 26;
    for (let i = 0; i < SPIKES; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 5), F.mat2);
      const ph = Math.acos(1 - (i + 0.5) / SPIKES * 0.9), th = i * 2.399;
      sp.position.set(Math.sin(ph) * 0.6 * Math.cos(th), 0.2 + Math.cos(ph) * 0.72, Math.sin(ph) * 0.6 * Math.sin(th));
      sp.lookAt(sp.position.clone().multiplyScalar(2.4).add(head.position));
      sp.rotateX(Math.PI / 2);
      head.add(sp);
    }
    const core = halo(a2, 5.2, 1.0); core.position.y = 0.5; head.add(core); F.addEmitter(core, 0.85);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 10), emitMaterial({ color: a2, intensity: 1, pulse: 0.12 }));
    bead.position.y = 0.72; head.add(bead); F.addEmitter(bead, 1.15);

    const N = F.quality === 'low' ? 10 : 14;
    for (let i = 0; i < N; i++) {
      const p = new THREE.Mesh(petalGeo(0.85, 2.7, 0.34, 0.85, 0.7), F.mat);
      const pivot = new THREE.Group();
      pivot.rotation.y = (i / N) * TAU + rnd(-0.06, 0.06);
      head.add(pivot); pivot.add(p);
      p.position.set(0, 0.05, 0.42);
      F.addPetal(p, { rx: -0.06, rz: rnd(-0.05, 0.05), s: 0.55 }, { rx: -1.58 + rnd(-0.14, 0.14), rz: rnd(-0.12, 0.12), s: 1 });
    }
    leaves(F, H, 2, 1.5);
    F.landOffset = 0.95; F.viewDist = 8.4;
    return H;
  },

  /* the tall spiky orange one */
  spire(F, a, a2) {
    const H = 9.2;
    F.group.add(new THREE.Mesh(stemGeo(H, 0.05, 0.14), F.stemMat));
    const head = new THREE.Group(); head.position.y = H * 0.66; F.group.add(head); F.head = head;

    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.30, H * 0.52, 8), F.mat2);
    col.position.y = H * 0.24; head.add(col);

    const rings = F.quality === 'low' ? 5 : 8;
    for (let r = 0; r < rings; r++) {
      const t = r / (rings - 1);
      const y = t * H * 0.46;
      const rad = 0.62 * (1 - t * 0.72) + 0.12;
      const n = 8 - Math.floor(t * 3);
      for (let i = 0; i < n; i++) {
        const pivot = new THREE.Group();
        pivot.position.y = y;
        pivot.rotation.y = (i / n) * TAU + r * 0.5;
        head.add(pivot);
        const p = new THREE.Mesh(petalGeo(0.34, 1.25 * (1 - t * 0.42), 0.42, 0.30, 0.55), r % 2 ? F.mat : F.mat2);
        p.position.set(0, 0, rad);
        pivot.add(p);
        F.addPetal(p, { rx: -0.06, rz: 0, s: 0.5 }, { rx: -1.62 + t * 0.55, rz: rnd(-0.14, 0.14), s: 1 });
      }
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 8), emitMaterial({ color: a2, intensity: 1, pulse: 0.14 }));
    tip.position.y = H * 0.50; head.add(tip); F.addEmitter(tip, 1.2);
    const gl = halo(a, 8.0, 1); gl.position.y = H * 0.28; head.add(gl); F.addEmitter(gl, 0.75);
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), emitMaterial({ color: a2, intensity: 1, pulse: 0.2 }));
      b.position.set(Math.cos(i * 1.9) * 0.5, i * H * 0.10 + 0.2, Math.sin(i * 1.9) * 0.5);
      head.add(b); F.addEmitter(b, 0.9);
    }
    leaves(F, H, 3, 2.2);
    F.landOffset = H * 0.32; F.viewDist = 11.5;
    return H;
  },

  /* low, wide, concentric — geometric where the others are loose */
  dahlia(F, a, a2) {
    const H = 2.5;
    F.group.add(new THREE.Mesh(stemGeo(H, 0.06, 0.11), F.stemMat));
    const head = new THREE.Group(); head.position.y = H; F.group.add(head); F.head = head;

    const disc = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8, 0, TAU, 0, 1.1), F.mat2);
    disc.scale.y = 0.55; head.add(disc);
    const rings = F.quality === 'low'
      ? [[10, 2.6, 0.92, 0.30], [8, 1.7, 0.5, 0.7]]
      : [[14, 2.6, 0.92, 0.30], [11, 1.85, 0.62, 0.55], [8, 1.15, 0.34, 0.85]];
    rings.forEach(([n, len, rad, lift], ri) => {
      for (let i = 0; i < n; i++) {
        const pivot = new THREE.Group();
        pivot.rotation.y = (i / n) * TAU + ri * 0.42;
        head.add(pivot);
        const p = new THREE.Mesh(petalGeo(1.05, len, 0.30, 0.30, 1.25), ri % 2 ? F.mat2 : F.mat);
        p.position.set(0, lift * 0.28, rad * 0.5);
        pivot.add(p);
        F.addPetal(p, { rx: -0.10, rz: 0, s: 0.45 }, { rx: -1.30 + ri * 0.30, rz: rnd(-0.10, 0.10), s: 1 });
      }
    });
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), emitMaterial({ color: a2, intensity: 1, pulse: 0.1 }));
    bead.position.y = 0.22; head.add(bead); F.addEmitter(bead, 1.1);
    const gl = halo(a, 5.6, 1); gl.position.y = 0.3; head.add(gl); F.addEmitter(gl, 0.8);
    leaves(F, H, 3, 1.1);
    F.landOffset = 0.55; F.viewDist = 9.0;
    return H;
  },

  /* a spiky globe of filaments on a bare stalk */
  allium(F, a, a2) {
    const H = 7.6;
    F.group.add(new THREE.Mesh(stemGeo(H, 0.07, 0.10), F.stemMat));
    const head = new THREE.Group(); head.position.y = H; F.group.add(head); F.head = head;

    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 10), F.mat2);
    head.add(hub);
    const N = F.quality === 'low' ? 44 : 84;
    const fil = new THREE.CylinderGeometry(0.018, 0.032, 1, 4);
    fil.translate(0, 0.5, 0);
    const filMat = feltMaterial({ color: a, colorTop: a2, fuzz: 1.1, fibre: 0.7 });
    const beadGeo = new THREE.SphereGeometry(0.075, 6, 5);
    const beadMat = emitMaterial({ color: a2, intensity: 1, pulse: 0.16 });
    const beads = new THREE.InstancedMesh(beadGeo, beadMat, N);
    const stalks = new THREE.InstancedMesh(fil, filMat, N);
    const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < N; i++) {
      const ph = Math.acos(1 - 2 * (i + 0.5) / N), th = i * 2.39996;
      dir.set(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
      const len = rnd(1.05, 1.45);
      qq.setFromUnitVectors(up, dir);
      m4.compose(new THREE.Vector3(), qq, sc.set(1, len, 1));
      stalks.setMatrixAt(i, m4);
      m4.compose(dir.clone().multiplyScalar(len), qq, sc.set(1, 1, 1));
      beads.setMatrixAt(i, m4);
    }
    stalks.frustumCulled = false; beads.frustumCulled = false;
    head.add(stalks); head.add(beads);
    F.addEmitter(beads, 1.05);
    F.petalBall = head;
    /* the globe itself is what opens: it packs into a tight bud */
    F.addPetal(stalks, { rx: 0, rz: 0, s: 0.22 }, { rx: 0, rz: 0, s: 1 });
    F.addPetal(beads, { rx: 0, rz: 0, s: 0.22 }, { rx: 0, rz: 0, s: 1 });
    const sheath = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 9), F.sepalMat);
    sheath.scale.set(1, 1.5, 1); head.add(sheath);
    F.addPetal(sheath, { rx: 0, rz: 0, s: 1.0 }, { rx: 0, rz: 0, s: 0.001 });
    const gl = halo(a, 8.0, 1); head.add(gl); F.addEmitter(gl, 0.7);
    F.landOffset = 1.7; F.viewDist = 8.6;
    return H;
  },

  /* an arch of hanging bells */
  bellflower(F, a, a2) {
    const H = 5.6;
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push(new THREE.Vector3(Math.sin(t * 1.62) * 4.3, t * H - t * t * 1.5, Math.cos(t * 1.1) * 1.1 - 1.1));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    F.group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.105, 6, false), F.stemMat));
    const head = new THREE.Group();
    head.position.copy(curve.getPoint(0.75)); F.group.add(head); F.head = head;

    for (let i = 0; i < 5; i++) {
      const t = 0.34 + i * 0.162;
      const at = curve.getPoint(t);
      const hang = new THREE.Group();
      hang.position.copy(at).sub(head.position);
      head.add(hang);
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.5, 5), F.stemMat);
      stalk.position.y = -0.25; hang.add(stalk);
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.56, 1.1, 12, 1, true), F.mat);
      bell.material.side = THREE.DoubleSide;
      bell.position.y = -1.02; hang.add(bell);
      F.addPetal(bell, { rx: 0, rz: 0, s: 0.35, y: -0.60 }, { rx: 0, rz: rnd(-0.16, 0.16), s: 1, y: -1.05 });
      for (let k = 0; k < 5; k++) {
        const lobe = new THREE.Mesh(petalGeo(0.40, 0.60, 0.30, 0.42, 0.9), i % 2 ? F.mat2 : F.mat);
        const pv = new THREE.Group();
        pv.position.y = -1.58; pv.rotation.y = (k / 5) * TAU;
        hang.add(pv); pv.add(lobe);
        lobe.position.z = 0.38;
        F.addPetal(lobe, { rx: -0.1, rz: 0, s: 0.4 }, { rx: -2.25, rz: rnd(-0.1, 0.1), s: 1 });
      }
      const bd = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), emitMaterial({ color: a2, intensity: 1, pulse: 0.2 }));
      bd.position.y = -1.52; hang.add(bd); F.addEmitter(bd, 1.0);
      const gl = halo(a2, 3.2, 1); gl.position.y = -1.5; hang.add(gl); F.addEmitter(gl, 0.55);
    }
    leaves(F, 2.8, 3, 1.5);
    F.landOffset = 0.6; F.viewDist = 10.5;
    return H;
  },

  /* the hidden one: a wide pale trumpet */
  moonflower(F, a, a2) {
    const H = 2.2;
    F.group.add(new THREE.Mesh(stemGeo(H, 0.10, 0.12), F.stemMat));
    const head = new THREE.Group();
    head.position.y = H; head.rotation.x = -0.16; F.group.add(head); F.head = head;

    const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.15, 1.35, 16, 1, true), F.mat2);
    throat.material.side = THREE.DoubleSide;
    throat.position.y = 0.72; head.add(throat);
    F.addPetal(throat, { rx: 0, rz: 0, s: 0.30, y: 0.3 }, { rx: 0, rz: 0, s: 1, y: 0.72 });

    for (let i = 0; i < 8; i++) {
      const pv = new THREE.Group();
      pv.position.y = 1.24; pv.rotation.y = (i / 8) * TAU;
      head.add(pv);
      const p = new THREE.Mesh(petalGeo(1.30, 1.70, 0.26, 0.24, 1.35), F.mat);
      p.position.z = 0.44; pv.add(p);
      F.addPetal(p, { rx: -0.08, rz: 0, s: 0.35 }, { rx: -1.18 + rnd(-0.12, 0.12), rz: rnd(-0.1, 0.1), s: 1 });
    }
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), emitMaterial({ color: a2, intensity: 1, pulse: 0.09 }));
    bead.position.y = 0.85; head.add(bead); F.addEmitter(bead, 1.5);
    const gl = halo(a2, 6.2, 1); gl.position.y = 1.1; head.add(gl); F.addEmitter(gl, 0.9);
    leaves(F, 1.5, 4, 1.1);
    F.landOffset = 1.35; F.viewDist = 8.8;
    return H;
  },

  /* the reward */
  hire(F, a, a2) {
    const H = 3.4;
    F.group.add(new THREE.Mesh(stemGeo(H, 0.07, 0.13), F.stemMat));
    const head = new THREE.Group(); head.position.y = H; F.group.add(head); F.head = head;
    const rings = [[13, 2.2, 0.85, 0.0], [11, 1.7, 0.6, 0.35], [9, 1.2, 0.4, 0.65], [7, 0.8, 0.24, 0.9]];
    rings.forEach(([n, len, rad, lift], ri) => {
      for (let i = 0; i < n; i++) {
        const pv = new THREE.Group();
        pv.rotation.y = (i / n) * TAU + ri * 0.55;
        head.add(pv);
        const p = new THREE.Mesh(petalGeo(1.15, len, 0.42, 0.44, 1.1), ri % 2 ? F.mat : F.mat2);
        p.position.set(0, lift * 0.42, rad * 0.5);
        pv.add(p);
        F.addPetal(p, { rx: -0.06, rz: 0, s: 0.4 }, { rx: -1.42 + ri * 0.30, rz: rnd(-0.1, 0.1), s: 1 });
      }
    });
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), emitMaterial({ color: a2, intensity: 1, pulse: 0.15 }));
    bead.position.y = 0.55; head.add(bead); F.addEmitter(bead, 1.4);
    const gl = halo(a, 9.0, 1); gl.position.y = 0.6; head.add(gl); F.addEmitter(gl, 1.0);
    leaves(F, H, 3, 1.3);
    F.landOffset = 0.9; F.viewDist = 8.0;
    return H;
  }
};

function leaves(F, h, n, size) {
  for (let i = 0; i < n; i++) {
    const pv = new THREE.Group();
    pv.position.y = h * (0.18 + i * 0.20) + 0.3;
    pv.rotation.y = rnd(0, TAU);
    F.group.add(pv);
    const l = new THREE.Mesh(petalGeo(0.68 * size, 1.15 * size, 0.30, 0.55, 1.2), F.sepalMat);
    l.rotation.x = -0.86 + rnd(-0.18, 0.18);
    l.position.z = 0.1;
    pv.add(l);
  }
}

/* ------------------------------------------------------------------ hive */
export function buildHive(section, quality) {
  const F = Object.create(Flower.prototype);
  F.section = section; F.id = section.id; F.quality = quality;
  F.openness = 0; F.bloom = 0; F.petals = []; F.emitters = []; F.sway = 0;
  F._tmp = new THREE.Vector3();
  F.group = new THREE.Group();
  const [x, z] = section.pos;
  F.group.position.set(x, groundY(x, z), z);

  const bodyMat = feltMaterial({ color: '#c99a4e', colorTop: '#e8c179', fuzz: 1.0, fibre: 1.35 });
  const bandMat = feltMaterial({ color: '#a9793a', colorTop: '#c99a4e', fuzz: 1.0, fibre: 1.35 });
  const postMat = feltMaterial({ color: '#6b533f', colorTop: '#836650', fuzz: 0.75, fibre: 1.2 });

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 3.0, 8), postMat);
  post.position.y = 1.5; F.group.add(post);

  /* stacked skeps, each one a slightly wonky felt coil */
  const tiers = [[2.9, 1.5, 3.2], [2.55, 1.35, 4.5], [2.05, 1.15, 5.6], [1.45, 0.95, 6.5]];
  tiers.forEach(([r, hh, y], i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.93, r, hh, 20, 1), i % 2 ? bandMat : bodyMat);
    m.position.y = y;
    m.rotation.y = i * 0.3;
    m.scale.x = 1 + (i % 2 ? 0.03 : -0.02);
    F.group.add(m);
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.42, 18, 12, 0, TAU, 0, 1.35), bodyMat);
  dome.position.y = 6.95; F.group.add(dome);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), bandMat);
  knob.position.y = 8.05; F.group.add(knob);

  /* little felt roof so it reads as home base from a distance */
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.35, 2.4, 9), feltMaterial({ color: '#8d5a4a', colorTop: '#b0705a', fuzz: 0.9, fibre: 1.2 }));
  roof.position.y = 9.7; F.group.add(roof);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 6), postMat);
  pole.position.y = 8.7; F.group.add(pole);

  /* landing board and the doorway, which is the one light that never dies */
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 1.1), postMat);
  board.position.set(0, 3.05, 2.55); F.group.add(board);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16), emitMaterial({ color: '#ffb03a', intensity: 1, pulse: 0.06 }));
  door.position.set(0, 3.85, 2.86); F.group.add(door);
  door.layers.enable(1); door.userData.baseIntensity = 0.9;
  F.emitters.push(door);
  const dh = halo('#ffb03a', 6.5, 1); dh.position.set(0, 3.9, 3.0); F.group.add(dh);
  dh.userData.baseIntensity = 0.55; F.emitters.push(dh); dh.userData.billboard = true;
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), emitMaterial({ color: '#ffd27a', intensity: 1, pulse: 0.25 }));
  beacon.position.y = 10.5; F.group.add(beacon);
  beacon.layers.enable(1); beacon.userData.baseIntensity = 1.2; F.emitters.push(beacon);
  const bh = halo('#ffb03a', 10.0, 1); bh.position.y = 10.5; F.group.add(bh);
  bh.userData.baseIntensity = 0.6; F.emitters.push(bh); bh.userData.billboard = true;

  F.shadow = blobShadow(4.2); F.shadow.position.y = 0.08; F.group.add(F.shadow);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    emitMaterial({ color: '#ffb03a', intensity: 1, transparent: true, additive: true, soft: 0.99, pulse: 0.06 })
  );
  pool.rotation.x = -Math.PI / 2; pool.scale.setScalar(22); pool.position.y = 0.25;
  pool.layers.set(1); pool.renderOrder = 2; F.group.add(pool);
  pool.userData.baseIntensity = 0.34; F.emitters.push(pool);
  F.head = new THREE.Object3D(); F.head.position.set(0, 3.25, 3.15); F.group.add(F.head);
  F.landOffset = 0.42;
  F.viewDist = 16.5;
  F.height = 10.5;
  F.landPos = new THREE.Vector3();
  F.anchor = new THREE.Vector3();

  /* the hive never fully sleeps — one dim light, always */
  F.setBloom = function (b) {
    this.bloom = b;
    for (const m of this.emitters) {
      m.material.uniforms.uIntensity.value = m.userData.baseIntensity * (0.26 + 0.74 * b);
    }
  };
  F.setOpenness = function () {};
  F.setBloom(0);
  return F;
}
