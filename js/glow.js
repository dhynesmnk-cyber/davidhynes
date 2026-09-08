import * as THREE from '../vendor/three.module.js';

/* Selective glow. Only layer 1 (emissive elements) is drawn into a small
   buffer, blurred, and added over the finished frame. Felt is never in it —
   which is exactly why felt reads as felt. */

const QUAD_VERT = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const BLUR_FRAG = /* glsl */`
  precision mediump float;
  uniform sampler2D tMap; uniform vec2 uDir; varying vec2 vUv;
  void main(){
    vec4 c = texture2D(tMap, vUv) * 0.227027;
    c += (texture2D(tMap, vUv + uDir * 1.3846) + texture2D(tMap, vUv - uDir * 1.3846)) * 0.316216;
    c += (texture2D(tMap, vUv + uDir * 3.2308) + texture2D(tMap, vUv - uDir * 3.2308)) * 0.070270;
    gl_FragColor = c;
  }
`;

const COMP_FRAG = /* glsl */`
  precision mediump float;
  uniform sampler2D tA; uniform sampler2D tB; uniform float uStrength;
  varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tA, vUv).rgb * 0.62 + texture2D(tB, vUv).rgb * 0.38;
    /* keep it soft-shouldered so hot pink does not clip to white */
    c = c / (1.0 + c * 0.35);
    gl_FragColor = vec4(c * uStrength, 1.0);
  }
`;

function rt(w, h) {
  return new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false
  });
}

export class Glow {
  constructor(renderer, quality) {
    this.renderer = renderer;
    this.enabled = true;
    this.strength = 1.0;
    this.div = quality === 'low' ? 6 : quality === 'med' ? 5 : 4;

    this.scene = new THREE.Scene();
    this.cam = new THREE.Camera();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));

    this.blurMat = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: QUAD_VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false
    });
    this.compMat = new THREE.ShaderMaterial({
      uniforms: { tA: { value: null }, tB: { value: null }, uStrength: { value: 1 } },
      vertexShader: QUAD_VERT, fragmentShader: COMP_FRAG,
      depthTest: false, depthWrite: false, transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.quad = new THREE.Mesh(g, this.blurMat);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    this.setSize(1, 1);
  }

  setSize(w, h) {
    const d = this.div;
    const bw = Math.max(2, Math.floor(w / d));
    const bh = Math.max(2, Math.floor(h / d));
    const hw = Math.max(2, Math.floor(w / (d * 2)));
    const hh = Math.max(2, Math.floor(h / (d * 2)));
    [this.src, this.a, this.b, this.c, this.d2].forEach(t => t && t.dispose());
    this.src = rt(bw, bh);
    this.a = rt(bw, bh);
    this.b = rt(bw, bh);
    this.c = rt(hw, hh);
    this.d2 = rt(hw, hh);
    this.w = bw; this.h = bh; this.hw = hw; this.hh = hh;
  }

  _blur(from, to, dx, dy, w, h) {
    this.quad.material = this.blurMat;
    this.blurMat.uniforms.tMap.value = from.texture;
    this.blurMat.uniforms.uDir.value.set(dx / w, dy / h);
    this.renderer.setRenderTarget(to);
    this.renderer.clear(true, false, false);
    this.renderer.render(this.scene, this.cam);
  }

  /* Draw only the glowing things, blur at two scales. */
  prepare(scene, camera) {
    if (!this.enabled) return;
    const r = this.renderer;
    const mask = camera.layers.mask;
    const oldClear = r.getClearColor(new THREE.Color());
    const oldAlpha = r.getClearAlpha();

    camera.layers.set(1);
    r.setRenderTarget(this.src);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, false);
    r.render(scene, camera);

    camera.layers.mask = mask;
    r.setClearColor(oldClear, oldAlpha);

    this._blur(this.src, this.a, 1, 0, this.w, this.h);
    this._blur(this.a, this.b, 0, 1, this.w, this.h);
    this._blur(this.b, this.c, 2, 0, this.hw, this.hh);
    this._blur(this.c, this.d2, 0, 2, this.hw, this.hh);

    r.setRenderTarget(null);
  }

  /* Add it over the finished frame. */
  composite() {
    if (!this.enabled) return;
    const r = this.renderer;
    this.quad.material = this.compMat;
    this.compMat.uniforms.tA.value = this.b.texture;
    this.compMat.uniforms.tB.value = this.d2.texture;
    this.compMat.uniforms.uStrength.value = this.strength;
    const ac = r.autoClear;
    r.autoClear = false;
    r.setRenderTarget(null);
    r.render(this.scene, this.cam);
    r.autoClear = ac;
  }
}
