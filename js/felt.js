import * as THREE from '../vendor/three.module.js';

export const MAX_SOURCES = 10;

/* Set once at boot from the detected device class. */
export const feltDefines = {};
export function setFeltQuality(q) { if (q === 'low') feltDefines.FELT_CHEAP = ''; }

/* Shared uniform block. Every felt surface in the garden reads the same
   bloom sources, so colour bleeds across terrain, grass, stems and rocks
   from one place. */
export const shared = {
  uTime:      { value: 0 },
  uSrc:       { value: Array.from({ length: MAX_SOURCES }, () => new THREE.Vector4(0, 0, 1, 0)) },
  uSrcCol:    { value: Array.from({ length: MAX_SOURCES }, () => new THREE.Color(1, 1, 1)) },
  uGlobal:    { value: 0 },
  uFog:       { value: new THREE.Color('#141a3a') },
  uFogDens:   { value: 0.00030 },
  uCamPos:    { value: new THREE.Vector3() },
  uQuality:   { value: 1 }
};

const COMMON = /* glsl */`
  #define MAX_SOURCES ${MAX_SOURCES}
  uniform vec4  uSrc[MAX_SOURCES];
  uniform vec3  uSrcCol[MAX_SOURCES];
  uniform float uGlobal;
  uniform float uTime;
  uniform vec3  uFog;
  uniform float uFogDens;
  uniform vec3  uCamPos;
  uniform float uQuality;

  float hash21(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  /* How bloomed is this point, and whose colour is leaking into it.
     The nearest flower dominates hard — averaging every source together
     turns the whole garden brown. */
  void bloomAt(vec3 wp, out float amt, out vec3 tint){
    float best = 0.0; vec3 t = vec3(0.0); float wsum = 0.0;
    for(int i = 0; i < MAX_SOURCES; i++){
      vec4 s = uSrc[i];
      if(s.w <= 0.001) continue;
      float d = distance(wp.xz, s.xy);
      float f = 1.0 - smoothstep(s.z * 0.28, s.z, d);
      f *= s.w;
      best = max(best, f);
      float w = f * f * f * f + 0.0001;
      t += uSrcCol[i] * w; wsum += w;
    }
    tint = wsum > 0.0002 ? t / wsum : vec3(0.42, 0.50, 0.82);
    amt = clamp(max(best, uGlobal), 0.0, 1.0);
  }
`;

const FELT_FRAG = /* glsl */`
  precision highp float;
  ${COMMON}
  uniform vec3  uColor;
  uniform vec3  uColorTop;
  uniform float uFuzz;
  uniform float uFibre;
  uniform float uRough;
  uniform float uBloomBias;
  varying vec3 vWorld;
  varying vec3 vNormal2;
  varying vec3 vCol;

  const vec3 KEY_DIR  = vec3(0.34, 0.82, 0.46);
  const vec3 FILL_DIR = vec3(-0.62, 0.20, -0.55);

  void main(){
    vec3 N = normalize(vNormal2);
    vec3 V = normalize(uCamPos - vWorld);

    /* fibre: two scales of value noise, plus a fine directional weave.
       Weak hardware gets one octave — the silhouette fuzz carries it. */
    float n1 = vnoise(vWorld.xz * 5.5 + vWorld.y * 2.0);
    #ifdef FELT_CHEAP
      float n2 = n1;
      float weave = 0.0;
      float fib = (n1 - 0.5) * 1.05;
    #else
      float n2 = vnoise(vWorld.xz * 23.0 + vWorld.y * 9.0);
      float weave = sin(vWorld.x * 61.0 + vWorld.z * 24.0) * sin(vWorld.z * 57.0 - vWorld.y * 30.0);
      float fib = (n1 - 0.5) * 0.9 + (n2 - 0.5) * 0.55 + weave * 0.10;
    #endif

    /* fuzz breaks the normal up so no edge reads as machined */
    N = normalize(N + vec3(n2 - 0.5, n1 - 0.5, weave * 0.5) * (0.30 * uFibre));

    float amt; vec3 tint;
    bloomAt(vWorld, amt, tint);
    amt = clamp(amt + uBloomBias, 0.0, 1.0);

    vec3 base = uColor * vCol;
    base = mix(base, uColorTop * vCol, smoothstep(-0.1, 0.9, N.y) * 0.35);
    base *= 1.0 + fib * uFibre * 0.34;

    /* dormant: desaturated toward a cold grey-blue, and dimmer. sleeping, not dead */
    float luma = dot(base, vec3(0.299, 0.587, 0.114));
    vec3 dorm = mix(vec3(luma), base, 0.20);
    dorm = mix(dorm, vec3(0.345, 0.390, 0.510), 0.40) * 1.02;
    vec3 alb = mix(dorm, base, amt);

    /* hand-rolled matte lighting. wrapped lambert, zero specular:
       light lands on felt and is absorbed. that is the whole trick. */
    vec3 K = normalize(KEY_DIR), F = normalize(FILL_DIR);
    float key  = pow(clamp(dot(N, K) * 0.5 + 0.5, 0.0, 1.0), 1.35);
    float fill = clamp(dot(N, F) * 0.5 + 0.5, 0.0, 1.0);
    float sky  = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);

    vec3 keyCol  = mix(vec3(0.56, 0.62, 0.86), vec3(0.96, 0.94, 0.92), amt * 0.6);
    vec3 fillCol = mix(vec3(0.18, 0.26, 0.42), vec3(0.28, 0.46, 0.60), amt);
    vec3 ambCol  = mix(vec3(0.21, 0.24, 0.37), vec3(0.28, 0.29, 0.42), amt);

    vec3 lit = alb * (ambCol + keyCol * key * 0.85 + fillCol * fill * 0.55);
    lit += alb * mix(vec3(0.08, 0.10, 0.18), vec3(0.13, 0.15, 0.25), amt) * sky;

    /* coloured light thrown by nearby blooms — never emission, always received */
    lit += mix(alb, vec3(1.0), 0.42) * tint * amt * amt * 0.52;

    /* silhouette fuzz: pale fibre halo, no highlight */
    float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.4);
    vec3 fuzzCol = mix(vec3(0.46, 0.53, 0.74), mix(vec3(1.0), tint, 0.55), amt);
    lit += fuzzCol * rim * uFuzz * (0.42 + 0.58 * amt) * (0.72 + 0.28 * n2);

    /* haze */
    float dist = length(uCamPos - vWorld);
    float fogF = 1.0 - exp(-dist * dist * uFogDens);
    vec3 fogCol = mix(uFog, mix(uFog, tint, 0.35), amt * 0.6);
    lit = mix(lit, fogCol, clamp(fogF, 0.0, 0.92));

    gl_FragColor = vec4(max(lit, 0.0), 1.0);
  }
`;

const FELT_VERT = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uSway;
  varying vec3 vWorld;
  varying vec3 vNormal2;
  varying vec3 vCol;
  #ifdef USE_VCOL
    attribute vec3 acolor;
  #endif

  void main(){
    #ifdef USE_VCOL
      vCol = acolor;
    #else
      vCol = vec3(1.0);
    #endif
    vec3 tp = position;
    vec4 wp;
    vec3 nrm = normal;
    #ifdef USE_INSTANCING
      wp = modelMatrix * instanceMatrix * vec4(tp, 1.0);
      nrm = normalize(mat3(instanceMatrix) * normal);
    #else
      wp = modelMatrix * vec4(tp, 1.0);
    #endif
    if(uSway > 0.0){
      float h = max(tp.y, 0.0);
      #ifdef USE_INSTANCING
        h = max(wp.y, 0.0);
      #endif
      float ph = wp.x * 0.35 + wp.z * 0.27;
      wp.x += sin(uTime * 0.72 + ph) * uSway * h * 0.055;
      wp.z += cos(uTime * 0.58 + ph * 1.3) * uSway * h * 0.045;
    }
    vWorld = wp.xyz;
    vNormal2 = normalize(mat3(modelMatrix) * nrm);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export function feltMaterial(opts = {}) {
  /* three defines USE_INSTANCING and declares instanceMatrix itself */
  const defines = Object.assign({}, feltDefines);
  if (opts.vertexColors) defines.USE_VCOL = '';
  const m = new THREE.ShaderMaterial({
    defines,
    uniforms: {
      ...shared,
      uColor:     { value: new THREE.Color(opts.color || '#8f93a8') },
      uColorTop:  { value: new THREE.Color(opts.colorTop || opts.color || '#8f93a8') },
      uFuzz:      { value: opts.fuzz !== undefined ? opts.fuzz : 0.5 },
      uFibre:     { value: opts.fibre !== undefined ? opts.fibre : 1.0 },
      uRough:     { value: 1 },
      uSway:      { value: opts.sway || 0 },
      uBloomBias: { value: opts.bloomBias || 0 }
    },
    vertexShader: FELT_VERT,
    fragmentShader: FELT_FRAG,
    side: opts.side || THREE.FrontSide
  });
  m.userData.felt = true;
  return m;
}

/* Emissive: unlit, saturated, and the only thing allowed near the glow buffer. */
const EMIT_VERT = /* glsl */`
  precision mediump float;
  varying vec2 vUv; varying vec3 vWorld;
  void main(){
    vUv = uv;
    vec4 wp;
    #ifdef USE_INSTANCING
      wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    #else
      wp = modelMatrix * vec4(position, 1.0);
    #endif
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const EMIT_FRAG = /* glsl */`
  precision mediump float;
  uniform vec3 uColor; uniform float uIntensity; uniform float uTime;
  uniform float uPulse; uniform float uSoft;
  varying vec2 vUv; varying vec3 vWorld;
  void main(){
    float p = 1.0 + sin(uTime * 1.7 + vWorld.x * 0.4 + vWorld.z * 0.3) * uPulse;
    float a = 1.0;
    if(uSoft > 0.0){
      float d = length(vUv - 0.5) * 2.0;
      a = 1.0 - smoothstep(1.0 - uSoft, 1.0, d);
    }
    gl_FragColor = vec4(uColor * uIntensity * p, a * uIntensity);
  }
`;

export function emitMaterial(opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor:     { value: new THREE.Color(opts.color || '#35f0ff') },
      uIntensity: { value: opts.intensity !== undefined ? opts.intensity : 1 },
      uPulse:     { value: opts.pulse || 0 },
      uSoft:      { value: opts.soft || 0 },
      uTime:      shared.uTime
    },
    vertexShader: EMIT_VERT,
    fragmentShader: EMIT_FRAG,
    transparent: !!opts.transparent,
    depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : !opts.transparent,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: opts.side || THREE.FrontSide
  });
}

