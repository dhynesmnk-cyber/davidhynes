import * as THREE from '../vendor/three.module.js';
import { feltMaterial, emitMaterial, shared } from './felt.js';

export const R = 62;           // radius of the diorama
export const RIM = R - 3;

/* One height function, used by the mesh, the grass, the flowers and the
   bee's soft floor. Gentle rolls, one real slope, a rise behind the hive. */
export function groundY(x, z) {
  const r = Math.hypot(x, z);
  let h = 0;
  h += Math.sin(x * 0.052) * Math.cos(z * 0.041) * 2.4;
  h += Math.sin(x * 0.021 + 1.1) * 2.0;
  h += Math.cos(z * 0.026 - 0.6) * 1.6;
  h += -z * 0.052;                                   // the long slope
  h += 5.4 * Math.exp(-((x + 2) ** 2 + (z + 13) ** 2) / 340);   // rise behind the hive
  h += 6.6 * Math.exp(-((x + 30) ** 2 + (z + 34) ** 2) / 420);  // ridge hiding the moonflower
  h += 3.0 * Math.exp(-((x - 34) ** 2 + (z - 30) ** 2) / 520);
  h -= 2.6 * Math.exp(-((x - 14) ** 2 + (z - 12) ** 2) / 900);  // shallow bowl
  const edge = Math.max(0, (r - (R - 20)) / 20);
  h += edge * edge * 3.4;                            // lip curls up at the rim
  return h;
}

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

export function buildWorld(scene, quality) {
  const grp = new THREE.Group();
  scene.add(grp);
  const seg = quality === 'low' ? 56 : quality === 'med' ? 88 : 128;

  /* ---- terrain -------------------------------------------------------- */
  const g = new THREE.PlaneGeometry(R * 2, R * 2, seg, seg);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r > RIM) { const s = RIM / r; x *= s; z *= s; pos.setX(i, x); pos.setZ(i, z); }
    pos.setY(i, groundY(x, z));
    /* patchwork: felt gardens are cut from more than one bolt of cloth */
    const p = Math.sin(x * 0.13) * Math.cos(z * 0.11) + Math.sin(x * 0.045 + z * 0.06) * 0.8;
    const v = 0.86 + p * 0.13;
    c.setRGB(v, v * (1 + p * 0.05), v * (1 - p * 0.06));
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('acolor', new THREE.BufferAttribute(cols, 3));
  g.computeVertexNormals();
  const groundMat = feltMaterial({ color: '#2f7350', colorTop: '#64b45e', vertexColors: true, fuzz: 0.42, fibre: 1.0 });
  const ground = new THREE.Mesh(g, groundMat);
  ground.renderOrder = 0;
  grp.add(ground);

  /* ---- the plinth: this is a thing on a table, not a landscape --------- */
  const wallH = 14;
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(RIM, RIM * 0.93, wallH, 72, 1, true),
    feltMaterial({ color: '#5a4436', colorTop: '#6d5342', fuzz: 0.7, fibre: 1.2, side: THREE.DoubleSide })
  );
  wall.position.y = groundY(0, RIM) - wallH / 2 + 1.2;
  grp.add(wall);
  const cap = new THREE.Mesh(
    new THREE.CircleGeometry(RIM * 0.93, 64),
    feltMaterial({ color: '#3b2f28', fuzz: 0.3 })
  );
  cap.rotation.x = Math.PI / 2;
  cap.position.y = wall.position.y - wallH / 2;
  grp.add(cap);

  /* ---- grass ---------------------------------------------------------- */
  const bladeCount = quality === 'low' ? 3200 : quality === 'med' ? 9000 : 20000;
  const blade = new THREE.BufferGeometry();
  {
    const w = 0.135, h = 1.0;
    const vs = [], ns = [], ix = [];
    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const ww = w * Math.pow(1 - t, 0.55) * (1 - t * 0.2);
      const bend = t * t * 0.42;
      vs.push(-ww, h * t, bend, ww, h * t, bend);
      ns.push(0, 0.35, 1, 0, 0.35, 1);
    }
    for (let s = 0; s < steps; s++) {
      const a = s * 2;
      ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    blade.setAttribute('position', new THREE.Float32BufferAttribute(vs, 3));
    blade.setAttribute('normal', new THREE.Float32BufferAttribute(ns, 3));
    blade.setIndex(ix);
  }
  const grassMat = feltMaterial({ color: '#568f4c', colorTop: '#86ca63', vertexColors: true, instanced: true, fuzz: 0.34, fibre: 0.8, sway: 1, side: THREE.DoubleSide });
  const grass = new THREE.InstancedMesh(blade, grassMat, bladeCount);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pv = new THREE.Vector3();
  const gcol = new Float32Array(bladeCount * 3);
  for (let i = 0; i < bladeCount; i++) {
    let x, z, r;
    do { x = (Math.random() * 2 - 1) * RIM; z = (Math.random() * 2 - 1) * RIM; r = Math.hypot(x, z); } while (r > RIM - 1.5);
    const dens = 0.35 + 0.65 * (1 - smoothstep(0, RIM, r));
    if (Math.random() > dens + 0.3) { sc.set(0, 0, 0); } else { const s = 0.50 + Math.random() * 0.85; sc.set(s * (0.75 + Math.random() * 0.7), s, s); }
    pv.set(x, groundY(x, z) - 0.12, z);
    e.set((Math.random() - 0.5) * 0.42, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.42);
    q.setFromEuler(e);
    m4.compose(pv, q, sc);
    grass.setMatrixAt(i, m4);
    const v = 0.72 + Math.random() * 0.5;
    gcol[i * 3] = v * (0.9 + Math.random() * 0.2);
    gcol[i * 3 + 1] = v;
    gcol[i * 3 + 2] = v * (0.75 + Math.random() * 0.3);
  }
  blade.setAttribute('acolor', new THREE.InstancedBufferAttribute(gcol, 3));
  grass.instanceMatrix.needsUpdate = true;
  grass.frustumCulled = false;
  grp.add(grass);

  /* ---- rocks & fallen leaves: wonky, hand-cut ------------------------- */
  const rockMat = feltMaterial({ color: '#57607d', colorTop: '#6d789a', fuzz: 0.55, fibre: 1.3 });
  const rockSpots = [
    [-33, -30, 4.4], [-26, -35, 3.0], [-20, -33, 2.3], [-37, -22, 2.9],
    [25, 40, 2.7], [-46, 8, 3.4], [40, -14, 3.0], [11, -34, 2.1],
    [-14, 43, 2.5], [42, 26, 3.1], [-38, -44, 2.7], [30, -38, 2.4]
  ];
  for (const [x, z, s] of rockSpots) {
    const rg = new THREE.IcosahedronGeometry(s, 1);
    const rp = rg.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const n = 0.62 + Math.random() * 0.62;
      rp.setXYZ(i, rp.getX(i) * n * (0.8 + Math.random() * 0.5), rp.getY(i) * n * 0.86, rp.getZ(i) * n * (0.8 + Math.random() * 0.5));
    }
    rg.computeVertexNormals();
    const rock = new THREE.Mesh(rg, rockMat);
    rock.position.set(x, groundY(x, z) + s * 0.10, z);
    rock.rotation.set((Math.random() - .5) * .5, Math.random() * 6.28, (Math.random() - .5) * .5);
    grp.add(rock);
  }

  /* ---- mushrooms, a little ambient life ------------------------------- */
  const stalkMat = feltMaterial({ color: '#d8cbb4', fuzz: 0.8, fibre: 0.7 });
  const capMats = ['#b8536e', '#7b6bd0', '#c98a4a'].map(col => feltMaterial({ color: col, colorTop: col, fuzz: 0.8, fibre: 1.1 }));
  for (let i = 0; i < (quality === 'low' ? 10 : 26); i++) {
    const a = Math.random() * 6.28, rr = 8 + Math.random() * (RIM - 12);
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const s = 0.5 + Math.random() * 0.9;
    const m = new THREE.Group();
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.2 * s, 0.9 * s, 7), stalkMat);
    st.position.y = 0.45 * s; m.add(st);
    const cp = new THREE.Mesh(new THREE.SphereGeometry(0.45 * s, 10, 7, 0, 6.283, 0, 1.35), capMats[i % 3]);
    cp.position.y = 0.86 * s; cp.scale.y = 0.8; m.add(cp);
    m.position.set(x, groundY(x, z), z);
    m.rotation.z = (Math.random() - 0.5) * 0.24;
    grp.add(m);
  }

  /* ---- sky ------------------------------------------------------------ */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTime: shared.uTime, uGlobal: shared.uGlobal },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      precision mediump float;
      uniform float uTime; uniform float uGlobal; varying vec3 vP;
      float h21(vec2 p){ p = fract(p*vec2(443.897,441.423)); p += dot(p,p+19.19); return fract(p.x*p.y); }
      void main(){
        vec3 d = normalize(vP);
        float y = d.y;
        float az = atan(d.z, d.x);

        /* Not the purple-to-blue gradient every "wave" thing lands on:
           ink-teal overhead, violet through the body, a narrow teal band
           sitting on the horizon, and only a sliver of ember beneath it. */
        vec3 zenith = mix(vec3(0.018, 0.040, 0.072), vec3(0.026, 0.052, 0.100), uGlobal);
        vec3 mid    = mix(vec3(0.062, 0.052, 0.132), vec3(0.098, 0.070, 0.196), uGlobal);
        vec3 low    = mix(vec3(0.100, 0.082, 0.168), vec3(0.138, 0.102, 0.212), uGlobal);
        vec3 teal   = mix(vec3(0.045, 0.115, 0.142), vec3(0.070, 0.190, 0.212), uGlobal);
        vec3 ember  = mix(vec3(0.175, 0.104, 0.110), vec3(0.300, 0.168, 0.152), uGlobal);

        vec3 col = mix(mid, zenith, smoothstep(0.12, 0.92, y));
        col = mix(col, low, smoothstep(0.30, 0.02, y));
        col = mix(col, teal, smoothstep(0.20, 0.02, y) * 0.62);
        col = mix(col, ember, smoothstep(0.030, -0.12, y) * 0.72);

        /* a slow wash so the upper half is never dead flat */
        float band = sin(y * 5.0 + az * 0.7 + uTime * 0.035) * 0.5 + 0.5;
        col += vec3(0.008, 0.026, 0.030) * band * smoothstep(-0.05, 0.7, y);

        /* stars, thinning as the garden wakes up */
        vec2 sp = vec2(az * 3.0, asin(clamp(y, -1.0, 1.0)) * 3.4) * 42.0;
        vec2 gid = floor(sp), gf = fract(sp) - 0.5;
        float r = h21(gid);
        float pt = step(0.972, r) * (1.0 - smoothstep(0.0, 0.30, length(gf)));
        float tw = 0.55 + 0.45 * sin(uTime * 1.6 + r * 120.0);
        col += vec3(0.72, 0.82, 1.0) * pt * tw * smoothstep(0.02, 0.40, y) * (1.0 - uGlobal * 0.5);
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 20), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  /* horizon glow: a thin additive ring that the bloom pass picks up */
  const ringMat = emitMaterial({ color: '#ff6aa0', intensity: 0.13, transparent: true, additive: true, soft: 0.95, pulse: 0.05 });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(300, 340, 78, 40, 1, true), ringMat);
  ring.position.y = -52;
  ring.material.side = THREE.BackSide;
  ring.frustumCulled = false;
  ring.layers.set(1);
  scene.add(ring);

  /* ---- light shafts: haze catching light, never touching felt --------- */
  const shafts = new THREE.Group();
  if (quality !== 'low') {
    const shaftSpec = [[0, -7, '#ffb03a', 9], [20, 36, '#ff7a1a', 7], [-35, 19, '#8b5cf6', 6.5], [7, 33, '#35f0ff', 6]];
    for (const [x, z, col, rad] of shaftSpec) {
      const sm = emitMaterial({ color: col, intensity: 0.0, transparent: true, additive: true, soft: 0.85, side: THREE.DoubleSide });
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.35, rad, 46, 14, 1, true), sm);
      cone.position.set(x, groundY(x, z) + 23, z);
      cone.layers.set(1);
      cone.renderOrder = 3;
      cone.userData.baseIntensity = 0.16;
      shafts.add(cone);
    }
    scene.add(shafts);
  }

  return { group: grp, ground, grass, sky, shafts, groundMat, grassMat };
}
