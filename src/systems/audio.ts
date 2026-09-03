/**
 * Audio engine — foley only, per docs/audio.md.
 *
 * Two layers:
 *  1. Optional recorded foley from public/assets/audio/<id>.ogg (or .mp3).
 *     If a file exists it is fetched lazily after unlock and used verbatim.
 *  2. Procedural Web Audio fallbacks synthesised in-engine (felt scritches,
 *     paper flutters, wooden ticks) so the world is never silent while real
 *     recordings are still being made.
 *
 * Rules implemented:
 *  - Unlocks on first user input (autoplay policy).
 *  - Persistent mute toggle (localStorage).
 *  - Bloom pops throttle to ~4 overlapping, oldest wins.
 *  - Master gain sits low (~ -18 dB) so foley stays under conversation level.
 */

export type SoundId =
  | 'step_walk'
  | 'wing_loop'
  | 'takeoff'
  | 'land'
  | 'zone_tick'
  | 'interact'
  | 'modal_open'
  | 'modal_close'
  | 'bloom'
  | 'completion'
  | 'hint_fade';

const MUTE_KEY = 'davidhynes_garden_muted';
const MASTER_GAIN = 0.16; // ≈ -16 dB
const BLOOM_MAX_OVERLAP = 4;
const AUDIO_DIR = '/assets/audio/';

const RECORDED_IDS: SoundId[] = [
  'step_walk', 'wing_loop', 'takeoff', 'land', 'zone_tick', 'interact',
  'modal_open', 'modal_close', 'bloom', 'completion', 'hint_fade',
];

interface ActiveVoice {
  stop: () => void;
  startedAt: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private lowpass: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private recorded = new Map<SoundId, AudioBuffer>();
  private recordedProbeDone = false;
  private muted: boolean;
  private unlocked = false;
  private wingSource: { stop: () => void } | null = null;
  private bloomVoices: ActiveVoice[] = [];
  private stepToggle = false;
  private lastStepAt = 0;
  private muteListeners: Array<(muted: boolean) => void> = [];

  constructor() {
    let saved: string | null = null;
    try { saved = localStorage.getItem(MUTE_KEY); } catch { /* private mode */ }
    this.muted = saved === '1';

    // Unlock on first meaningful user input.
    const unlock = () => this.unlock();
    ['pointerdown', 'keydown', 'touchstart'].forEach((evt) => {
      window.addEventListener(evt, unlock, { once: true, passive: true });
    });
  }

  // ---------------------------------------------------------------- state

  get isMuted(): boolean {
    return this.muted;
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ignore */ }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_GAIN, this.ctx.currentTime, 0.05);
    }
    if (muted) this.stopWingLoop();
    this.muteListeners.forEach((l) => l(muted));
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  onMuteChange(cb: (muted: boolean) => void): void {
    this.muteListeners.push(cb);
  }

  unlock(): void {
    if (this.unlocked) return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_GAIN;
      // Gentle low-pass for warmth (audio.md: ~6kHz)
      this.lowpass = this.ctx.createBiquadFilter();
      this.lowpass.type = 'lowpass';
      this.lowpass.frequency.value = 6000;
      this.master.connect(this.lowpass);
      this.lowpass.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoiseBuffer(1.0);
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      this.unlocked = true;
      void this.probeRecorded();
      console.log('🔊 GATE 6 — audio unlocked');
    } catch (err) {
      console.warn('Audio unavailable', err);
    }
  }

  // ------------------------------------------------------------ playback

  play(id: SoundId, opts: { pitch?: number; gain?: number } = {}): void {
    if (!this.ctx || !this.master || this.muted) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();

    if (id === 'bloom') {
      this.playBloom(opts.pitch);
      return;
    }
    if (id === 'wing_loop') {
      this.startWingLoop();
      return;
    }

    const rec = this.recorded.get(id);
    if (rec) {
      this.playBuffer(rec, opts.gain ?? 1, opts.pitch ?? 1);
      return;
    }
    this.playProcedural(id, opts);
  }

  /** Alternating felt steps, rate-limited to the walk cadence. */
  step(now: number): void {
    if (now - this.lastStepAt < 220) return;
    this.lastStepAt = now;
    this.stepToggle = !this.stepToggle;
    this.play('step_walk', { pitch: this.stepToggle ? 1 : 0.92 });
  }

  startWingLoop(): void {
    if (!this.ctx || !this.master || this.muted || this.wingSource) return;
    const rec = this.recorded.get('wing_loop');
    if (rec) {
      const src = this.ctx.createBufferSource();
      src.buffer = rec;
      src.loop = true;
      const g = this.ctx.createGain();
      g.gain.value = 0.7;
      src.connect(g).connect(this.master);
      src.start();
      this.wingSource = { stop: () => { try { src.stop(); } catch { /* */ } } };
      return;
    }
    // Procedural: papery flutter — filtered noise amplitude-modulated at ~22Hz, slightly uneven
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 0.8;
    const amp = ctx.createGain();
    amp.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.type = 'triangle';
    lfo.frequency.value = 22;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.22;
    const wobble = ctx.createOscillator();
    wobble.type = 'sine';
    wobble.frequency.value = 0.7;
    const wobbleDepth = ctx.createGain();
    wobbleDepth.gain.value = 3;
    wobble.connect(wobbleDepth).connect(lfo.frequency);
    lfo.connect(lfoDepth).connect(amp.gain);
    const base = ctx.createGain();
    base.gain.setValueAtTime(0, ctx.currentTime);
    base.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 0.15);
    src.connect(bp).connect(amp).connect(base).connect(this.master);
    src.start();
    lfo.start();
    wobble.start();
    this.wingSource = {
      stop: () => {
        const t = ctx.currentTime;
        base.gain.cancelScheduledValues(t);
        base.gain.setValueAtTime(base.gain.value, t);
        base.gain.linearRampToValueAtTime(0, t + 0.12);
        setTimeout(() => { try { src.stop(); lfo.stop(); wobble.stop(); } catch { /* */ } }, 200);
      },
    };
  }

  stopWingLoop(): void {
    if (!this.wingSource) return;
    this.wingSource.stop();
    this.wingSource = null;
  }

  // -------------------------------------------------------- procedural

  private playProcedural(id: SoundId, opts: { pitch?: number; gain?: number }): void {
    const pitch = opts.pitch ?? 1;
    const gain = opts.gain ?? 1;
    switch (id) {
      case 'step_walk':
        // soft felt scritch: short noise burst through a low bandpass
        this.noiseBurst({ dur: 0.07, freq: 900 * pitch, q: 1.2, gain: 0.5 * gain, attack: 0.005 });
        break;
      case 'takeoff':
        // small paper snap + flutter-in
        this.noiseBurst({ dur: 0.04, freq: 2600, q: 2, gain: 0.7 * gain, attack: 0.001 });
        this.noiseBurst({ dur: 0.25, freq: 1400, q: 0.8, gain: 0.35 * gain, attack: 0.05, delay: 0.03 });
        break;
      case 'land':
        // soft thump + settle rustle
        this.thump({ freq: 110, dur: 0.16, gain: 0.8 * gain });
        this.noiseBurst({ dur: 0.18, freq: 700, q: 0.9, gain: 0.3 * gain, attack: 0.02, delay: 0.04 });
        break;
      case 'zone_tick':
        // one warm wooden tick
        this.woodTick({ freq: 620 * pitch, dur: 0.06, gain: 0.55 * gain });
        break;
      case 'interact':
        // wooden click like a small latch: two quick ticks
        this.woodTick({ freq: 540, dur: 0.05, gain: 0.7 * gain });
        this.woodTick({ freq: 780, dur: 0.06, gain: 0.5 * gain, delay: 0.045 });
        break;
      case 'modal_open':
        // paper unfolding, slow — rising filtered noise sweep
        this.noiseSweep({ dur: 0.42, from: 500, to: 2200, gain: 0.35 * gain });
        break;
      case 'modal_close':
        // paper fold, quicker — falling sweep
        this.noiseSweep({ dur: 0.22, from: 2200, to: 600, gain: 0.3 * gain });
        break;
      case 'completion':
        // layered bloom pops + one low warm chime
        for (let i = 0; i < 6; i++) {
          this.pop({ freq: 520 + Math.random() * 400, gain: 0.5 * gain, delay: i * 0.09 });
        }
        this.chime({ freq: 220, dur: 2.4, gain: 0.5 * gain, delay: 0.2 });
        this.chime({ freq: 330, dur: 2.0, gain: 0.25 * gain, delay: 0.35 });
        break;
      case 'hint_fade':
        // barely-there paper whisper
        this.noiseBurst({ dur: 0.3, freq: 1800, q: 0.6, gain: 0.12 * gain, attack: 0.1 });
        break;
      default:
        break;
    }
  }

  private playBloom(pitch?: number): void {
    if (!this.ctx) return;
    // Throttle: max ~4 overlapping, oldest wins (stop the newest-most extra)
    const now = this.ctx.currentTime;
    this.bloomVoices = this.bloomVoices.filter((v) => now - v.startedAt < 0.25);
    if (this.bloomVoices.length >= BLOOM_MAX_OVERLAP) return;
    const p = pitch ?? (0.85 + Math.random() * 0.35);
    const rec = this.recorded.get('bloom');
    const voice = rec
      ? this.playBuffer(rec, 0.8, p)
      : this.pop({ freq: 640 * p, gain: 0.55 });
    if (voice) this.bloomVoices.push({ stop: voice.stop, startedAt: now });
  }

  // ------------------------------------------------------- synth utils

  private makeNoiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private noiseBurst(o: { dur: number; freq: number; q: number; gain: number; attack: number; delay?: number }): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = o.freq;
    bp.Q.value = o.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(o.gain, t0 + o.attack);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + o.dur);
    src.connect(bp).connect(g).connect(this.master!);
    src.start(t0);
    src.stop(t0 + o.dur + 0.02);
  }

  private noiseSweep(o: { dur: number; from: number; to: number; gain: number }): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(o.from, t0);
    bp.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(o.gain, t0 + o.dur * 0.3);
    g.gain.linearRampToValueAtTime(0, t0 + o.dur);
    src.connect(bp).connect(g).connect(this.master!);
    src.start(t0);
    src.stop(t0 + o.dur + 0.02);
  }

  private woodTick(o: { freq: number; dur: number; gain: number; delay?: number }): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(o.freq, t0);
    osc.frequency.exponentialRampToValueAtTime(o.freq * 0.6, t0 + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + o.dur);
    osc.connect(g).connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.01);
    // tiny transient for the "wood" character
    this.noiseBurst({ dur: 0.02, freq: 3000, q: 1, gain: o.gain * 0.4, attack: 0.001, delay: o.delay });
  }

  private thump(o: { freq: number; dur: number; gain: number }): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    osc.frequency.exponentialRampToValueAtTime(o.freq * 0.5, t0 + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + o.dur);
    osc.connect(g).connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.01);
  }

  private pop(o: { freq: number; gain: number; delay?: number }): { stop: () => void } {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(o.freq * 0.7, t0);
    osc.frequency.exponentialRampToValueAtTime(o.freq, t0 + 0.03);
    osc.frequency.exponentialRampToValueAtTime(o.freq * 0.8, t0 + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(o.gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
    osc.connect(g).connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + 0.12);
    return { stop: () => { try { osc.stop(); } catch { /* */ } } };
  }

  private chime(o: { freq: number; dur: number; gain: number; delay?: number }): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(o.gain, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + o.dur);
    g.connect(this.master!);
    [1, 2.01, 3.0].forEach((mult, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = o.freq * mult;
      const pg = ctx.createGain();
      pg.gain.value = 1 / (i + 1) / 2;
      osc.connect(pg).connect(g);
      osc.start(t0);
      osc.stop(t0 + o.dur + 0.05);
    });
  }

  private playBuffer(buf: AudioBuffer, gain: number, pitch: number): { stop: () => void } {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = pitch;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.master!);
    src.start();
    return { stop: () => { try { src.stop(); } catch { /* */ } } };
  }

  // ------------------------------------------------- recorded foley

  /**
   * Look for real recordings in /assets/audio/. Missing files are expected
   * until David records them; 404s are silently ignored.
   */
  private async probeRecorded(): Promise<void> {
    if (this.recordedProbeDone || !this.ctx) return;
    this.recordedProbeDone = true;
    const ctx = this.ctx;
    await Promise.all(RECORDED_IDS.map(async (id) => {
      for (const ext of ['ogg', 'mp3']) {
        try {
          const res = await fetch(`${AUDIO_DIR}${id}.${ext}`, { cache: 'force-cache' });
          const type = res.headers.get('content-type') || '';
          if (!res.ok || type.includes('text/html')) continue;
          const arr = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arr);
          this.recorded.set(id, decoded);
          console.log(`🎙️ Using recorded foley: ${id}.${ext}`);
          return;
        } catch {
          /* fall through to procedural */
        }
      }
    }));
  }
}

export const audio = new AudioEngine();
