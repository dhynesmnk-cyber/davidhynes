/* Procedural audio. Nothing to download, nothing autoplays, and the pad
   walks through four chords on a slow cycle so it never loops audibly. */

const CHORDS = [
  [110.00, 164.81, 220.00, 329.63],   // A
  [98.00,  146.83, 196.00, 293.66],   // G
  [123.47, 185.00, 246.94, 369.99],   // B
  [87.31,  130.81, 174.61, 261.63]    // F
];
const PENT = [523.25, 587.33, 698.46, 783.99, 880.0, 1046.5];

export class GardenAudio {
  constructor() {
    this.on = false;
    this.ctx = null;
    this.ready = false;
  }

  async enable() {
    if (this.ready) { await this.ctx.resume(); this.on = true; this.master.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.6); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = this.ctx = new AC();
    await ctx.resume();

    this.master = ctx.createGain();
    this.master.gain.value = 0.0001;
    this.master.connect(ctx.destination);

    /* pad */
    const padBus = ctx.createGain(); padBus.gain.value = 0.16;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 520; filt.Q.value = 0.7;
    padBus.connect(filt); filt.connect(this.master);

    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.035;
    const lfoG = ctx.createGain(); lfoG.gain.value = 260;
    lfo.connect(lfoG); lfoG.connect(filt.frequency); lfo.start();

    this.voices = [];
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator();
      o.type = i < 2 ? 'sine' : 'triangle';
      const g = ctx.createGain(); g.gain.value = i === 0 ? 0.4 : 0.22;
      const det = ctx.createOscillator(); det.frequency.value = 0.07 + i * 0.031;
      const detG = ctx.createGain(); detG.gain.value = 2.4 + i;
      det.connect(detG); detG.connect(o.detune); det.start();
      o.connect(g); g.connect(padBus); o.start();
      this.voices.push(o);
    }
    this.chordI = 0;
    this._setChord(0);
    this._chordTimer = setInterval(() => { this.chordI = (this.chordI + 1) % CHORDS.length; this._setChord(this.chordI); }, 21000);

    /* wing hum */
    const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 92;
    const humF = ctx.createBiquadFilter(); humF.type = 'lowpass'; humF.frequency.value = 340; humF.Q.value = 4;
    this.humG = ctx.createGain(); this.humG.gain.value = 0.0;
    hum.connect(humF); humF.connect(this.humG); this.humG.connect(this.master);
    hum.start();
    this.hum = hum; this.humF = humF;

    this.ready = true;
    this.on = true;
    this.master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.9);
    return true;
  }

  _setChord(i) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    CHORDS[i].forEach((f, k) => this.voices[k].frequency.setTargetAtTime(f, t, 3.2));
  }

  disable() {
    this.on = false;
    if (!this.ready) return;
    this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
    setTimeout(() => { if (!this.on && this.ctx) this.ctx.suspend(); }, 1200);
  }

  toggle() { return this.on ? (this.disable(), false) : (this.enable(), true); }

  setSpeed(v) {
    if (!this.ready || !this.on) return;
    const t = this.ctx.currentTime;
    const n = Math.min(1, v / 20);
    this.hum.frequency.setTargetAtTime(74 + n * 96, t, 0.12);
    this.humF.frequency.setTargetAtTime(240 + n * 620, t, 0.12);
    this.humG.gain.setTargetAtTime(0.006 + n * 0.055, t, 0.15);
  }

  chime(step = 0) {
    if (!this.ready || !this.on) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const f = PENT[step % PENT.length];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.30, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    g.connect(this.master);
    const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = f;
    const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = f * 2.01;
    const modG = ctx.createGain(); modG.gain.setValueAtTime(f * 1.6, t);
    modG.gain.exponentialRampToValueAtTime(1, t + 0.9);
    mod.connect(modG); modG.connect(car.frequency);
    car.connect(g);
    car.start(t); mod.start(t);
    car.stop(t + 2.8); mod.stop(t + 2.8);
  }

  fanfare() {
    if (!this.ready || !this.on) return;
    [0, 2, 4, 5, 3, 5].forEach((s, i) => setTimeout(() => this.chime(s), i * 190));
  }
}
