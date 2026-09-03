import Phaser from 'phaser';
import { zones } from '../content/zones';

/**
 * Zone proximity + affordance (FR-2). Each zone has one interactable
 * object: a small glowing marker on the set piece. Near it, the marker
 * swells and a wooden tick plays; interact opens the modal. The hive
 * signpost is registered as the special `contact` zone (FR-7).
 */
export interface ZoneData {
  id: string;
  x: number;
  y: number;
  radius: number;
  marker: Phaser.GameObjects.Container;
  isVisited: boolean;
}

export interface ZonePlacement {
  id: string;
  x: number;
  y: number;
  /** Where the interact marker sits, relative to the zone origin. */
  markerX?: number;
  markerY?: number;
  radius?: number;
}

export class ZoneManager {
  private scene: Phaser.Scene;
  private zones: ZoneData[] = [];
  private currentZone: ZoneData | null = null;
  private proximityCallback: ((zoneId: string) => void) | null = null;
  private proximityExitCallback: (() => void) | null = null;
  private interactCallback: ((zoneId: string) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(placements: ZonePlacement[]): void {
    placements.forEach((p) => {
      const isContent = zones.some((z) => z.id === p.id);
      if (!isContent && p.id !== 'contact') return;
      const mx = p.x + (p.markerX ?? 0);
      const my = p.y + (p.markerY ?? 0);
      const marker = this.createMarker(mx, my, p.id);
      const zone: ZoneData = { id: p.id, x: mx, y: my, radius: p.radius ?? 90, marker, isVisited: false };
      this.zones.push(zone);
    });
    console.log(`🎯 ${this.zones.length} zones created`);
  }

  private createMarker(x: number, y: number, zoneId: string): Phaser.GameObjects.Container {
    const c = this.scene.add.container(x, y);
    const glow = this.scene.add.circle(0, 0, 22, 0x5FE3DD, 0.18);
    const orb = this.scene.add.circle(0, 0, 8, 0x5FE3DD, 0.9);
    orb.setStrokeStyle(2, 0xF3E9D6, 0.7);
    c.add([glow, orb]);
    c.setDepth(120);
    c.setName(`marker-${zoneId}`);

    // Slow breathing glow — the "affordance" before you're close.
    this.scene.tweens.add({
      targets: glow,
      scale: 1.25,
      alpha: 0.28,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Tap the object directly on touch (FR-2). Only works while in range.
    orb.setInteractive(new Phaser.Geom.Circle(0, 0, 26), Phaser.Geom.Circle.Contains);
    orb.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.currentZone?.id === zoneId) {
        pointer.event?.stopPropagation?.();
        this.triggerInteract();
      }
    });
    return c;
  }

  update(beeX: number, beeY: number): void {
    let nearest: ZoneData | null = null;
    let minDistance = Infinity;
    for (const zone of this.zones) {
      const d = Phaser.Math.Distance.Between(beeX, beeY, zone.x, zone.y);
      if (d < zone.radius && d < minDistance) {
        minDistance = d;
        nearest = zone;
      }
    }

    if (nearest === this.currentZone) return;

    if (this.currentZone) {
      this.setNear(this.currentZone, false);
      this.proximityExitCallback?.();
    }
    this.currentZone = nearest;
    if (nearest) {
      this.setNear(nearest, true);
      this.proximityCallback?.(nearest.id);
    }
  }

  private setNear(zone: ZoneData, near: boolean): void {
    this.scene.tweens.killTweensOf(zone.marker);
    this.scene.tweens.add({
      targets: zone.marker,
      scale: near ? 1.45 : 1,
      duration: 220,
      ease: 'Cubic.easeOut',
    });
  }

  getCurrentZone(): ZoneData | null {
    return this.currentZone;
  }

  markZoneAsVisited(zoneId: string): void {
    const zone = this.zones.find((z) => z.id === zoneId);
    if (!zone || zone.isVisited) return;
    zone.isVisited = true;
    const orb = zone.marker.list[1] as Phaser.GameObjects.Arc | undefined;
    const glow = zone.marker.list[0] as Phaser.GameObjects.Arc | undefined;
    orb?.setFillStyle(0xFF6FB0, 0.95);
    orb?.setStrokeStyle(2, 0xF3E9D6, 0.9);
    glow?.setFillStyle(0xFF6FB0, 0.3);
  }

  setProximityCallback(cb: (zoneId: string) => void): void { this.proximityCallback = cb; }
  setProximityExitCallback(cb: () => void): void { this.proximityExitCallback = cb; }
  setInteractCallback(cb: (zoneId: string) => void): void { this.interactCallback = cb; }

  triggerInteract(): boolean {
    if (this.currentZone && this.interactCallback) {
      this.interactCallback(this.currentZone.id);
      return true;
    }
    return false;
  }
}
