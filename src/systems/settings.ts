/**
 * Settings & capability detection shared across systems.
 *
 * - prefers-reduced-motion (FR-8): disables camera drift and stop-motion
 *   jitter, keeps all functionality.
 * - Quality tier (FR-8): auto-degrades particle counts on slow devices.
 *   Starts from a device heuristic, then adjusts from measured frame rate.
 */

export type QualityTier = 'high' | 'medium' | 'low';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

class SettingsStore {
  private reducedMotion: boolean;
  private quality: QualityTier;
  private listeners: Array<(q: QualityTier) => void> = [];

  constructor() {
    const mq = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(REDUCED_MOTION_QUERY)
      : null;
    this.reducedMotion = mq ? mq.matches : false;
    mq?.addEventListener?.('change', (e) => { this.reducedMotion = e.matches; });

    this.quality = this.guessQuality();
  }

  private guessQuality(): QualityTier {
    if (typeof navigator === 'undefined') return 'high';
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (cores <= 2 || memory <= 2) return 'low';
    if (isTouch && (cores <= 4 || memory <= 4)) return 'medium';
    return 'high';
  }

  get prefersReducedMotion(): boolean {
    return this.reducedMotion;
  }

  get qualityTier(): QualityTier {
    return this.quality;
  }

  /** Multiplier applied to particle / decoration counts. */
  get particleScale(): number {
    switch (this.quality) {
      case 'low': return 0.4;
      case 'medium': return 0.7;
      default: return 1;
    }
  }

  onQualityChange(cb: (q: QualityTier) => void): void {
    this.listeners.push(cb);
  }

  /**
   * Feed measured frame time. Called every frame by the world scene.
   * Averages over ~2 seconds; if the average falls below 45fps we step the
   * tier down (never up — avoids oscillation).
   */
  private sampleAccum = 0;
  private sampleCount = 0;
  private settled = false;
  private downgrades = 0;

  sampleFrame(deltaMs: number): void {
    if (this.downgrades >= 2) return;
    this.sampleAccum += deltaMs;
    this.sampleCount += 1;
    if (this.sampleAccum < 2000) return;
    const avgFps = 1000 / (this.sampleAccum / this.sampleCount);
    this.sampleAccum = 0;
    this.sampleCount = 0;
    // Ignore the very first window: it includes load stutter.
    if (!this.settled) { this.settled = true; return; }
    if (avgFps < 45) {
      const next: QualityTier = this.quality === 'high' ? 'medium' : 'low';
      if (next !== this.quality) {
        this.quality = next;
        this.downgrades += 1;
        console.log(`⚙️ Quality degraded to "${next}" (avg ${avgFps.toFixed(0)}fps)`);
        this.listeners.forEach((l) => l(next));
      }
    }
  }
}

export const settings = new SettingsStore();
