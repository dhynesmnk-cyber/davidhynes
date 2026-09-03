import Phaser from 'phaser';
import { audio } from './audio';
import { settings } from './settings';

/**
 * Progress & bloom (FR-4). Visited zones and every bloomed flower persist in
 * localStorage so returning visitors find the world as they left it.
 */
export interface ProgressData {
  visitedZones: string[];
  bloomFlowers: Array<{ x: number; y: number; color: number }>;
  isComplete: boolean;
}

const STORAGE_KEY = 'davidhynes_garden_progress';
const ZONE_COUNT = 5;
const BLOOM_COLORS = [0xFF6FB0, 0x5FE3DD, 0xA78BFA, 0xFF8C42];
const CUSTOM_FLOWER_KEY: Record<number, string> = {
  0xFF6FB0: 'flower-pink',
  0x5FE3DD: 'flower-cyan',
  0xA78BFA: 'flower-violet',
  0xFF8C42: 'flower-orange',
};

export class ProgressManager {
  private scene: Phaser.Scene;
  private data: ProgressData;
  private worldBounds: Phaser.Geom.Rectangle;
  private onCompletionCallback: (() => void) | null = null;
  /** Areas where bursts should not land (set pieces, hive). */
  private keepClear: Phaser.Geom.Circle[] = [];

  constructor(scene: Phaser.Scene, worldBounds: Phaser.Geom.Rectangle) {
    this.scene = scene;
    this.worldBounds = worldBounds;
    this.data = this.load();
  }

  private load(): ProgressData {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ProgressData;
        if (Array.isArray(parsed.visitedZones) && Array.isArray(parsed.bloomFlowers)) {
          console.log('📦 Loaded progress:', parsed.visitedZones.length, 'zones,', parsed.bloomFlowers.length, 'blooms');
          return parsed;
        }
      }
    } catch { /* corrupt or unavailable storage */ }
    return { visitedZones: [], bloomFlowers: [], isComplete: false };
  }

  save(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  }

  setKeepClear(circles: Phaser.Geom.Circle[]): void {
    this.keepClear = circles;
  }

  /** @returns true if this is the first visit. */
  markZoneVisited(zoneId: string): boolean {
    if (this.data.visitedZones.includes(zoneId)) return false;
    this.data.visitedZones.push(zoneId);
    this.triggerBloomBurst();
    if (this.data.visitedZones.length >= ZONE_COUNT && !this.data.isComplete) {
      this.data.isComplete = true;
      this.triggerCompletion();
    }
    this.save();
    return true;
  }

  isZoneVisited(zoneId: string): boolean {
    return this.data.visitedZones.includes(zoneId);
  }

  getVisitedZones(): string[] {
    return [...this.data.visitedZones];
  }

  isComplete(): boolean {
    return this.data.isComplete;
  }

  triggerBloomBurst(): void {
    // 15–30 flowers, scaled down on low-end devices (FR-8 particle degrade)
    const base = 15 + Math.floor(Math.random() * 16);
    const count = Math.max(8, Math.round(base * settings.particleScale));
    const placed: Array<{ x: number; y: number; color: number }> = [];

    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, ok = false;
      for (let attempt = 0; attempt < 24 && !ok; attempt++) {
        x = 60 + Math.random() * (this.worldBounds.width - 120);
        y = 60 + Math.random() * (this.worldBounds.height - 120);
        const cx = x, cy = y;
        const nearExisting = this.data.bloomFlowers.some((f) => Phaser.Math.Distance.Between(cx, cy, f.x, f.y) < 42)
          || placed.some((f) => Phaser.Math.Distance.Between(cx, cy, f.x, f.y) < 42);
        const onSetPiece = this.keepClear.some((c) => Phaser.Geom.Circle.Contains(c, cx, cy));
        ok = !nearExisting && !onSetPiece;
      }
      if (!ok) continue;
      const color = BLOOM_COLORS[Math.floor(Math.random() * BLOOM_COLORS.length)];
      placed.push({ x, y, color });
    }

    console.log(`🌸 Bloom burst: ${placed.length} new flowers`);
    placed.forEach((f, i) => {
      this.data.bloomFlowers.push(f);
      // Staggered pops — soft, not a fireworks show
      this.scene.time.delayedCall(120 + i * 70, () => this.createBloomFlower(f.x, f.y, f.color, true));
    });
  }

  private createBloomFlower(x: number, y: number, color: number, animate: boolean): void {
    const c = this.scene.add.container(x, y);
    const stemHeight = 8 + Math.random() * 8;
    const stem = this.scene.add.rectangle(0, 6, 2, stemHeight, 0x6E4A2E).setAlpha(0.8);

    const customKey = CUSTOM_FLOWER_KEY[color];
    const head = this.scene.textures.exists(customKey)
      ? this.scene.add.image(0, 0, customKey)
      : this.scene.add.image(0, 0, 'petals').setTint(color).setScale(0.55 + Math.random() * 0.3);
    const centre = this.scene.add.circle(0, 0, 2, 0xF3E9D6);
    const glow = this.scene.add.circle(0, 0, 9, color, 0.18);
    c.add([stem, glow, head, centre]);
    c.setDepth(12);
    c.setRotation((Math.random() - 0.5) * 0.3);

    if (!animate) return;
    c.setScale(0);
    this.scene.tweens.add({ targets: c, scale: 1, duration: 320, ease: 'Back.easeOut' });
    audio.play('bloom');
  }

  renderExistingBlooms(): void {
    this.data.bloomFlowers.forEach((f) => this.createBloomFlower(f.x, f.y, f.color, false));
    console.log(`🌼 Rendered ${this.data.bloomFlowers.length} existing blooms`);
  }

  private triggerCompletion(): void {
    console.log('🎉 All 5 zones visited');
    const cam = this.scene.cameras.main;
    const overlay = this.scene.add.rectangle(0, 0, cam.width, cam.height, 0xFF6FB0, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(998);
    // Gentle field-wide glow swell
    this.scene.tweens.add({
      targets: overlay,
      alpha: 0.16,
      duration: 1600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      onComplete: () => overlay.destroy(),
    });
    // Let the bloom burst breathe before the card lands
    this.scene.time.delayedCall(1800, () => {
      audio.play('completion');
      this.onCompletionCallback?.();
    });
  }

  setOnCompletion(cb: () => void): void {
    this.onCompletionCallback = cb;
  }

  resetProgress(): void {
    this.data = { visitedZones: [], bloomFlowers: [], isComplete: false };
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    console.log('🗑️ Progress reset — reload to see a fresh garden');
  }
}
