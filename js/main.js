import * as THREE from '../vendor/three.module.js';
import { SECTIONS, HIRE, TOTAL, PERSON } from './content.js';
import { shared, MAX_SOURCES, setFeltQuality } from './felt.js';
import { buildWorld, groundY } from './world.js';
import { Flower, buildHive } from './flowers.js';
import { Bee } from './bee.js';
import { Input, Flight, shortAngle } from './controls.js';
import { Minimap } from './minimap.js';
import { Tour } from './tour.js';
import { AmbientLife } from './particles.js';
import { Glow } from './glow.js';
import { GardenAudio } from './audio.js';
import { UI } from './ui.js';

const $ = s => document.querySelector(s);
const clamp = THREE.MathUtils.clamp;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
let REDUCED = reduceMQ.matches;
reduceMQ.addEventListener?.('change', e => { REDUCED = e.matches; });

/* --------------------------------------------------------- device budget */
function detectQuality() {
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const coarse = matchMedia('(hover: none)').matches;
  const px = window.innerWidth * window.innerHeight * Math.min(devicePixelRatio || 1, 2);
  let s = 0;
  if (mem >= 8) s += 2; else if (mem >= 4) s += 1;
  if (cores >= 8) s += 2; else if (cores >= 4) s += 1;
  if (!coarse) s += 2;
  if (px < 1_400_000) s += 1;
  if (/iPhone OS ([1-9]|1[0-4])_/.test(navigator.userAgent)) s -= 3;
  return s >= 6 ? 'high' : s >= 3 ? 'med' : 'low';
}

const QUALITY = detectQuality();
setFeltQuality(QUALITY);
const IS_TOUCH = matchMedia('(hover: none)').matches || 'ontouchstart' in window;
if (IS_TOUCH) document.body.classList.add('touch');

/* ------------------------------------------------------------- renderer */
const canvas = $('#scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas, antialias: QUALITY === 'high', alpha: false,
    powerPreference: 'high-performance', stencil: false, depth: true
  });
} catch (e) {
  document.body.classList.add('text-mode');
  $('#loader')?.classList.add('hide');
  console.warn('WebGL unavailable, falling back to the text resume', e);
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.35, 900);
camera.layers.enable(0);

const state = {
  mode: 'attract',
  bloomed: new Set(),
  sources: [],
  finale: 0,
  finaleDone: false,
  hireFlower: null,
  panelFor: null,
  frames: 0, acc: 0, slow: 0, downgraded: 0, timeScale: 1
};

let world, bee, flight, input, tour, life, glow, ui, audio, minimap;
const flowers = [];
const byId = new Map();

/* ------------------------------------------------------------ bootstrap */
const steps = [
  () => {
    renderer.setClearColor(0x070a18, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    applySize();
  },
  () => { world = buildWorld(scene, QUALITY); },
  () => {
    for (const s of SECTIONS) {
      const f = s.kind === 'hive' ? buildHive(s, QUALITY) : new Flower(s, QUALITY);
      scene.add(f.group);
      f.group.updateMatrixWorld(true);
      f.head.getWorldPosition(f.anchor);
      f.landPos.copy(f.anchor); f.landPos.y += f.landOffset;
      flowers.push(f); byId.set(f.id, f);
    }
  },
  () => {
    bee = new Bee(scene, QUALITY);
    flight = new Flight(bee, camera);
    const hive = byId.get('hive');
    /* centred behind the hive so its own landing board stays reachable */
    flight.obstacles.push({ x: hive.group.position.x, y: hive.group.position.y + 5, z: hive.group.position.z - 1.2, r: 4.6 });
    for (const [x, z, r] of [[-34, -30, 5], [-27, -35, 3.6], [-38, -22, 3.4], [-52, 8, 4], [42, -14, 3.5], [52, 22, 3.7]])
      flight.obstacles.push({ x, y: groundY(x, z) + 1.5, z, r: r + 1.4 });
    flight.spawn(3, groundY(3, 12) + 6.5, 13, Math.PI);
  },
  () => {
    life = new AmbientLife(scene, QUALITY, SECTIONS);
    glow = new Glow(renderer, QUALITY);
    glow.enabled = QUALITY !== 'low';
    glow.strength = QUALITY === 'high' ? 1.0 : 0.85;
    applySize();
  },
  () => {
    input = new Input(canvas, {
      stick: $('#stick'), knob: $('#knob'), stickZone: $('#stick-zone'),
      lookZone: $('#look-zone'), up: $('#alt-up'), down: $('#alt-down')
    });
    tour = new Tour(flight);
    audio = new GardenAudio();
    ui = new UI({ onClose: () => closePanel() });
    minimap = new Minimap($('#map'), byId);
    ui.setPollen(0, TOTAL);
    $('#pollen-t').textContent = TOTAL;
    wireUI();
  }
];

function boot() {
  if (!renderer) return;
  let i = 0;
  const fill = $('#bar-fill');
  const run = () => {
    try { steps[i](); } catch (err) { console.error('boot step failed', i, err); }
    i++;
    if (fill) fill.style.width = Math.round((i / steps.length) * 100) + '%';
    if (i < steps.length) requestAnimationFrame(run);
    else finishBoot();
  };
  requestAnimationFrame(run);
}

function finishBoot() {
  $('#loader').classList.add('hide');
  $('#intro-keys').innerHTML = IS_TOUCH
    ? `<span>Left stick to fly</span><span>Drag the right side to look</span><span>▲ ▼ for height</span><span>Land on a flower to read it</span>`
    : `<span><kbd>W A S D</kbd> fly</span><span>Drag the <kbd>mouse</kbd> to steer</span><span><kbd>Space</kbd> / <kbd>Shift</kbd> height</span><span>Fly into a flower to read it</span>`;
  exposeDebug();
  running = true;
  last = performance.now();
  requestAnimationFrame(loop);
}

/* ----------------------------------------------------------------- sizing */
function dprCap() {
  if (state.downgraded >= 2) return 1;
  if (QUALITY === 'low' || state.downgraded >= 1) return 1.25;
  if (QUALITY === 'med') return 1.6;
  return 2;
}
function applySize() {
  if (!renderer) return;
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap()));
  renderer.setSize(w, h, false);
  const aspect = w / h;
  camera.aspect = aspect;
  /* a tall phone screen sees almost nothing sideways at a fixed vertical
     FOV, so widen a little and stand further back rather than fisheye it */
  camera.fov = aspect >= 1.3 ? 58 : aspect >= 0.95 ? 62 : 66;
  camera.updateProjectionMatrix();
  if (flight) flight.frameScale = aspect >= 1.3 ? 1 : aspect >= 0.95 ? 1.22 : 1.7;
  if (glow) glow.setSize(Math.floor(w * renderer.getPixelRatio()), Math.floor(h * renderer.getPixelRatio()));
  if (minimap) minimap.resize();
}
addEventListener('resize', () => { clearTimeout(applySize._t); applySize._t = setTimeout(applySize, 120); });
addEventListener('orientationchange', () => setTimeout(applySize, 260));

/* ---------------------------------------------------------- bloom sources */
function addSource(x, z, radius, colorHex) {
  const i = state.sources.length;
  if (i >= MAX_SOURCES) return null;
  const src = { i, x, z, radius, cur: 0, target: 1, curR: radius * 0.12 };
  state.sources.push(src);
  shared.uSrcCol.value[i].set(colorHex);
  shared.uSrc.value[i].set(x, z, src.curR, 0);
  return src;
}
function updateSources(dt) {
  for (const s of state.sources) {
    if (Math.abs(s.cur - s.target) > 0.0005 || s.curR < s.radius - 0.01) {
      const k = Math.min(1, dt * (REDUCED ? 4.0 : 1.5));
      s.cur += (s.target - s.cur) * k;
      s.curR += (s.radius - s.curR) * Math.min(1, dt * (REDUCED ? 4.0 : 0.9));
      shared.uSrc.value[s.i].set(s.x, s.z, s.curR, s.cur);
    }
  }
}

/* ---------------------------------------------------------------- visits */
/* The hire-me flower blooms with the finale, so it must not count as pollen. */
const pollenCount = () => { let n = 0; for (const id of state.bloomed) if (id !== 'hire') n++; return n; };

function visit(f, fromTour) {
  const s = f.section;
  const already = state.bloomed.has(f.id);
  if (!already) {
    state.bloomed.add(f.id);
    const n = pollenCount();
    ui.setPollen(n, TOTAL);
    addSource(f.group.position.x, f.group.position.z, f.id === 'hive' ? 26 : 19, s.accent);
    life.bloomFlower(f.id, f.anchor, s.accent, f.height || 4);
    audio.chime(n - 1);
    bee.setTrailColor(s.accent);
    const shaftIdx = ['hive', 'projects', 'background', 'toolkit'].indexOf(f.id);
    if (world.shafts && shaftIdx >= 0) {
      const sh = world.shafts.children[shaftIdx];
      if (sh) sh.userData.target = sh.userData.baseIntensity;
    }
    if (s.hidden) ui.hint('The hidden one. Nice work.', 5000);
    if (n === TOTAL) setTimeout(() => startFinale(), 900);
  }
  showPanel(f, fromTour);
}

function showPanel(f, fromTour) {
  state.panelFor = f;
  const extra = fromTour ? null : (f.id === 'hive' && pollenCount() === 1
    ? 'Fly out and find the flowers. Six of them, one is hiding.' : null);
  ui.show(f.section, extra);
}
function closePanel() {
  state.panelFor = null;
  ui.hide();
  if (tour.active) tour.stop();
  flight.takeOff();
}

/* ---------------------------------------------------------------- finale */
function startFinale() {
  if (state.finaleDone) return;
  state.finaleDone = true;
  const hive = byId.get('hive');
  life.triggerWave(hive.anchor.clone().setY(groundY(0, -7) + 1.5), '#ffd27a');
  audio.fanfare();

  const hf = new Flower(HIRE, QUALITY);
  scene.add(hf.group);
  state.bloomed.add('hire');
  hf.group.updateMatrixWorld(true);
  hf.head.getWorldPosition(hf.anchor);
  hf.landPos.copy(hf.anchor); hf.landPos.y += hf.landOffset;
  hf.group.scale.setScalar(0.001);
  state.hireFlower = hf;
  flowers.push(hf); byId.set('hire', hf);
  addSource(HIRE.pos[0], HIRE.pos[1], 22, HIRE.accent);
  life.bloomFlower('hire', hf.anchor, HIRE.accent, hf.height || 4);

  const cv = document.createElement('a');
  cv.className = 'btn accent';
  cv.id = 'cv-btn';
  cv.href = PERSON.cv; cv.setAttribute('download', '');
  cv.textContent = 'Download my CV';
  $('.bar').insertBefore(cv, $('#text-btn'));

  /* pull the camera back so the wave sweeping the whole garden is the
     thing you actually see. the card waits until it has finished. */
  if (REDUCED) {
    setTimeout(() => $('#finale').classList.remove('hide'), 900);
  } else {
    if (tour.active) tour.stop(true), markTourBtn(false);
    ui.hide(); state.panelFor = null;
    flight.takeOff();
    flight.camDist = 13;
    state.finaleCam = {
      t: 0,
      from: flight.pos.clone(),
      to: new THREE.Vector3(31, groundY(31, 49) + 23, 49)
    };
    state.mode = 'finale';
  }
}

/* -------------------------------------------------------------- UI wiring */
/* Hand control over from the idling attract orbit. The camera lerps, so the
   drop into position reads as the bee swooping down to start. */
function enterPlay() {
  $('#intro').classList.add('hide');
  if (state.mode !== 'attract') return;
  state.mode = 'play';
  flight.pos.set(7, groundY(7, 15) + 6.4, 15);
  flight.vel.set(0, 0, 0);
  flight.yaw = Math.atan2(0 - 7, -7 - 15);
  flight.pitch = -0.06;
}

function wireUI() {
  const dismiss = enterPlay;

  $('#start-fly').onclick = () => {
    dismiss();
    ui.hint(IS_TOUCH ? 'Left stick to fly, drag the right side to look.' : 'W A S D to fly, drag the mouse to steer.', 6000);
  };
  $('#start-tour').onclick = () => { dismiss(); startTour(); };
  $('#start-text').onclick = () => setTextMode(true);
  $('#text-btn').onclick = () => setTextMode(true);
  $('#world-btn').onclick = () => setTextMode(false);
  $('#skip-link').onclick = e => { e.preventDefault(); setTextMode(true); };
  $('#tour-btn').onclick = () => { tour.active ? stopTour() : startTour(); };
  $('#finale-go').onclick = () => {
    $('#finale').classList.add('hide');
    if (state.hireFlower) { tour.start([state.hireFlower]); markTourBtn(true); }
  };

  const sb = $('#sound-btn');
  sb.onclick = async () => {
    const on = audio.on;
    if (on) { audio.disable(); } else { await audio.enable(); }
    sb.classList.toggle('on', !on);
    sb.setAttribute('aria-pressed', String(!on));
    sb.title = !on ? 'Sound is on' : 'Sound is off';
    sb.setAttribute('aria-label', !on ? 'Sound is on. Turn sound off' : 'Sound is off. Turn sound on');
    ui.hint(!on ? 'Sound on. Ambient pad, chimes, and the wings.' : 'Sound off.', 2600);
  };

  addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$('#finale').classList.contains('hide')) { $('#finale').classList.add('hide'); return; }
      if (state.panelFor) closePanel();
      else if (tour.active) stopTour();
      if (document.pointerLockElement) document.exitPointerLock();
    }
    if (e.key === 't' && !e.metaKey && !e.ctrlKey) {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      tour.active ? stopTour() : startTour();
    }
  });

  tour.onArrive = f => visit(f, true);
  tour.onLeave = () => { if (state.panelFor) { ui.hide(); state.panelFor = null; } };
  tour.onEnd = () => { markTourBtn(false); ui.hint('Tour done. Fly wherever you like.', 4200); };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; }
    else if (!document.body.classList.contains('text-mode')) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  });
}

function markTourBtn(on) {
  const b = $('#tour-btn');
  b.textContent = on ? 'Stop the tour' : 'Take me on a tour';
  b.classList.toggle('running', on);
}
function startTour() {
  enterPlay();
  const order = ['hive', 'work', 'toolkit', 'method', 'projects', 'background', 'writing'];
  const stops = order.map(id => byId.get(id)).filter(Boolean);
  if (state.hireFlower) stops.push(state.hireFlower);
  tour.dwell = REDUCED ? 7.5 : 9.5;
  input.activity = 0;
  input.look.x = 0; input.look.y = 0;
  tour.start(stops);
  markTourBtn(true);
  ui.hint('Touch the controls at any time to take over.', 4600);
}
function stopTour() {
  tour.stop(true);
  markTourBtn(false);
  ui.hide(); state.panelFor = null;
  flight.takeOff();
}

function setTextMode(on) {
  document.body.classList.toggle('text-mode', on);
  if (on) {
    running = false;
    if (tour.active) stopTour();
    document.documentElement.scrollTop = 0;
    setTimeout(() => $('#text-resume h1')?.focus?.(), 0);
  } else {
    running = true; last = performance.now();
    if (state.mode === 'attract') $('#intro').classList.remove('hide');
    requestAnimationFrame(loop);
  }
  try { localStorage.setItem('garden.text', on ? '1' : '0'); } catch (e) { /* private mode */ }
}

/* ------------------------------------------------------------- main loop */
let running = false, last = 0, time = 0;

function loop(now) {
  if (!running) return;
  requestAnimationFrame(loop);
  const raw = (now - last) / 1000;
  last = now;
  const dt = Math.min(raw, 1 / 20) * state.timeScale;
  time += dt;
  shared.uTime.value = time;
  flight.sideBias = (IS_TOUCH || window.innerWidth <= 720) ? 0 : -2.2;

  /* adaptive quality: two steps down, never back up mid-session */
  state.acc += raw; state.frames++;
  if (state.frames >= 20) {
    const avg = state.acc / state.frames;
    state.acc = 0; state.frames = 0;
    /* 28ms is the 30fps floor with headroom; a really bad window counts twice */
    if (avg > 0.090) state.slow += 2;
    else if (avg > 0.028) state.slow++;
    else state.slow = Math.max(0, state.slow - 1);
    if (state.slow >= 2 && state.downgraded < 2) {
      state.downgraded++;
      state.slow = 0;
      if (state.downgraded === 1) {
        glow.strength *= 0.7;
        world.grass.count = Math.floor(world.grass.count * 0.45);
        if (world.shafts) world.shafts.visible = false;
        applySize();
      } else {
        glow.enabled = false;
        world.grass.count = Math.floor(world.grass.count * 0.6);
        applySize();
      }
    }
  }

  /* --- drive ------------------------------------------------------ */
  let st;
  if (state.mode === 'attract') {
    const a = time * (REDUCED ? 0.035 : 0.10);
    const rr = 19;
    flight.landed = null;
    flight.pos.set(Math.sin(a) * rr, groundY(0, -7) + 10 + Math.sin(time * 0.35) * (REDUCED ? 0.3 : 1.4), -7 + Math.cos(a) * rr);
    flight.yaw = Math.atan2(-flight.pos.x, -7 - flight.pos.z);
    flight.pitch = -0.12;
    flight.vel.set(Math.cos(a) * rr * 0.10, 0, -Math.sin(a) * rr * 0.10);
    input.look.x = 0; input.look.y = 0;
    input.keys.clear();
    rigOnly(dt);
    st = { active: false, speed: 5, turnRate: 0.25, climb: 0 };
  } else if (state.mode === 'finale') {
    const c = state.finaleCam;
    c.t += dt;
    const k = clamp(c.t / 6.8, 0, 1);
    const e = 1 - Math.pow(1 - k, 3);
    flight.landed = null;
    flight.pos.lerpVectors(c.from, c.to, e);
    flight.yaw = Math.atan2(0 - flight.pos.x, -7 - flight.pos.z);
    flight.pitch = -0.10 - 0.30 * e;
    flight.vel.set(0, 0, 0);
    input.look.x = 0; input.look.y = 0; input.keys.clear();
    rigOnly(dt);
    st = { active: false, speed: 7, turnRate: 0, climb: 0 };
    if (c.t > 8.2) {
      state.mode = 'play';
      flight.camDist = 6.4;
      $('#finale').classList.remove('hide');
    }
  } else if (tour.active) {
    tour.update(dt);
    /* an input event hands control back even if no frame lands while the key
       is down, which matters on a slow device */
    const active = input.sample() || input.activity > 0.3;
    input.look.x = 0; input.look.y = 0;
    st = { active, speed: flight.vel.length(), turnRate: flight.turnRate, climb: flight.vel.y };
    /* run the rig without letting the player steer */
    rigOnly(dt);
    if (active) { stopTour(); ui.hint('You have it. Fly where you like.', 3200); }
  } else {
    st = flight.step(dt, input, { reducedMotion: REDUCED });
  }
  input.activity *= Math.pow(0.02, dt);

  /* --- flowers ---------------------------------------------------- */
  let nearest = null, nearestD = 1e9;
  for (const f of flowers) {
    const d = f.anchor.distanceTo(flight.pos);
    const openR = f.id === 'hive' ? 13 : 9.5;
    /* proximity opens a sleeping flower; blooming keeps it open for good */
    const target = Math.max(clamp(1 - (d - 2.4) / (openR - 2.4), 0, 1), f.bloom);
    const k = REDUCED ? Math.min(1, dt * 9) : Math.min(1, dt * 3.4);
    f.setOpenness(f.openness + (target - f.openness) * k);
    const wantBloom = state.bloomed.has(f.id) ? 1 : 0;
    if (Math.abs(f.bloom - wantBloom) > 0.002) f.setBloom(f.bloom + (wantBloom - f.bloom) * Math.min(1, dt * (REDUCED ? 5 : 1.8)));
    f.update(dt, time, camera);
    if (d < nearestD) { nearestD = d; nearest = f; }
  }
  /* The height the bee settles at bends toward whatever flower is close, so
     the tall ones come to meet you instead of needing Space held down. */
  flight.cruiseY = (nearest && nearestD < 20) ? nearest.landPos.y : null;
  if (state.hireFlower && state.hireFlower.group.scale.x < 1) {
    const s = Math.min(1, state.hireFlower.group.scale.x + dt * (REDUCED ? 1.6 : 0.32));
    state.hireFlower.group.scale.setScalar(s < 0.999 ? s : 1);
  }

  /* land / take off */
  if (state.mode === 'play' && !tour.active) {
    const landR = nearest && nearest.id === 'hive' ? 6.0 : 4.0;
    if (!flight.landed && nearest && nearestD < landR) {
      flight.landOn(nearest);
      visit(nearest, false);
    } else if (flight.landed && state.panelFor !== flight.landed) {
      visit(flight.landed, false);
    }
    if (!flight.landed && state.panelFor) { state.panelFor = null; ui.hide(); }
  }

  /* nudge toward the hive if the player wanders */
  if (state.mode === 'play' && !tour.active && !flight.landed) {
    hintTick(dt);
  }

  /* --- world & life ------------------------------------------------- */
  updateSources(dt);
  const globalTarget = state.finaleDone ? 1 : 0;
  if (Math.abs(shared.uGlobal.value - globalTarget) > 0.001)
    shared.uGlobal.value += (globalTarget - shared.uGlobal.value) * Math.min(1, dt * (REDUCED ? 1.4 : 0.55));
  shared.uCamPos.value.copy(camera.position);
  if (world.shafts) for (const sh of world.shafts.children) {
    const want = sh.userData.target || 0;
    const u = sh.material.uniforms.uIntensity;
    if (Math.abs(u.value - want) > 0.001) u.value += (want - u.value) * Math.min(1, dt * 0.7);
  }
  life.update(dt, time, pollenCount(), REDUCED);
  minimap.update(dt, flight, state.bloomed);
  bee.update(dt, time, { speed: st.speed, turnRate: st.turnRate, climb: st.climb, landed: !!flight.landed, reducedMotion: REDUCED });
  audio.setSpeed(st.speed);

  /* --- render ------------------------------------------------------- */
  world.sky.position.copy(camera.position);
  if (glow.enabled) glow.prepare(scene, camera);
  renderer.setRenderTarget(null);
  camera.layers.set(0);
  renderer.render(scene, camera);
  if (glow.enabled) glow.composite();
}

/* during the tour the rig still needs to follow the bee */
function rigOnly(dt) {
  const F = flight;
  bee.root.position.copy(F.pos);
  const wantYaw = F.landed ? F.landYaw : F.yaw;
  bee.root.rotation.y += shortAngle(bee.root.rotation.y, wantYaw) * Math.min(1, dt * 6);
  const f = new THREE.Vector3(Math.sin(F.yaw) * Math.cos(F.pitch), Math.sin(F.pitch), Math.cos(F.yaw) * Math.cos(F.pitch));
  let camT, lookT;
  if (F.landed) {
    const back = new THREE.Vector3(Math.sin(F.yaw), 0, Math.cos(F.yaw));
    const vd = (F.landed.viewDist || 8.6) * F.frameScale;
    camT = F.landed.anchor.clone().addScaledVector(back, -vd); camT.y = F.landed.anchor.y + vd * 0.30;
    lookT = F.landed.anchor.clone().lerp(F.pos, 0.35);
    lookT.addScaledVector(new THREE.Vector3(Math.cos(F.yaw), 0, -Math.sin(F.yaw)), F.sideBias);
    lookT.y += (F.frameScale - 1) * vd * 0.50;
  } else {
    camT = F.pos.clone().addScaledVector(f, -F.camDist * F.frameScale); camT.y += (2.4 + F.camDist * 0.12) * F.frameScale;
    lookT = F.pos.clone().addScaledVector(f, 7.5); lookT.y += 2.5;
    lookT.addScaledVector(new THREE.Vector3(Math.cos(F.yaw), 0, -Math.sin(F.yaw)), 1.3);
  }
  const gy = groundY(camT.x, camT.z) + 1.4;
  if (camT.y < gy) camT.y = gy;
  F.camPos.lerp(camT, Math.min(1, dt * (REDUCED ? 6 : 2.2)));
  F.camLook.lerp(lookT, Math.min(1, dt * (REDUCED ? 7 : 3.0)));
  camera.position.copy(F.camPos);
  camera.lookAt(F.camLook);
}

/* gentle wayfinding, never nagging */
let hintT = 0, hintStage = 0;
function hintTick(dt) {
  hintT += dt;
  if (pollenCount() === 0 && hintT > 14 && hintStage === 0) {
    hintStage = 1; ui.hint('The hive is the glowing one. Start there.', 5200);
  } else if (pollenCount() >= 1 && pollenCount() < TOTAL && hintT > 42 && hintStage < 2) {
    hintStage = 2;
    const left = TOTAL - pollenCount();
    ui.hint(`${left} to find. Or press the tour button and put your feet up.`, 5200);
    hintT = 0;
  } else if (hintT > 70 && hintStage >= 2 && pollenCount() < TOTAL) {
    hintT = 0;
    const missing = SECTIONS.filter(s => !state.bloomed.has(s.id));
    const m = missing[0];
    if (m && !m.hidden) ui.hint(`Still out there: ${m.label}.`, 4200);
    else if (m) ui.hint('One of them is behind the ridge, on the far side.', 4600);
  }
}

/* Small hooks so the garden can be driven from a test harness or the console. */
function exposeDebug() {
  window.__gardenDebug = {
    bloomAll() { for (const f of flowers) visit(f, true); ui.hide(); state.panelFor = null; flight.takeOff(); },
    goto(id) {
      const f = byId.get(id); if (!f) return;
      $('#intro').classList.add('hide'); state.mode = 'play';
      flight.pos.copy(f.landPos); flight.vel.set(0, 0, 0);
      flight.landOn(f); visit(f, false);
    },
    state, flowers: byId, flight: () => flight, tour: () => tour, ui: () => ui, groundY
  };
}

/* ----------------------------------------------------------------- start */
try { if (localStorage.getItem('garden.text') === '1') document.body.classList.add('text-mode'); } catch (e) { /* ignore */ }
if (renderer) boot();
else { document.body.classList.add('text-mode'); }
