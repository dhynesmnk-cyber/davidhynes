import Phaser from 'phaser';
import { zones } from '../content/zones';

export interface ZoneData {
  id: string;
  x: number;
  y: number;
  radius: number;
  container: Phaser.GameObjects.Container;
  interactable: Phaser.GameObjects.Container;
  isVisited: boolean;
}

export class ZoneManager {
  private scene: Phaser.Scene;
  private zones: ZoneData[] = [];
  private currentZone: ZoneData | null = null;
  private proximityCallback: ((zoneId: string) => void) | null = null;
  private interactCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    // Define zone positions matching the set pieces in WorldScene
    const zoneConfigs: Array<{ id: string; x: number; y: number }> = [
      { id: 'experience', x: 300, y: 900 },
      { id: 'skills', x: 1700, y: 800 },
      { id: 'projects', x: 1000, y: 300 },
      { id: 'blogs', x: 1700, y: 1150 },
      { id: 'tools', x: 300, y: 1150 },
    ];

    zoneConfigs.forEach((config) => {
      const zoneContent = zones.find(z => z.id === config.id);
      if (!zoneContent) return;

      const container = this.scene.add.container(config.x, config.y);
      
      // Create interactable object (glowing orb near the set piece)
      const interactable = this.createInteractableObject(0, 0, config.id);
      container.add(interactable);
      
      const zoneData: ZoneData = {
        id: config.id,
        x: config.x,
        y: config.y,
        radius: 80,
        container,
        interactable,
        isVisited: false,
      };

      this.zones.push(zoneData);
    });

    console.log(`🎯 GATE 3 — ${this.zones.length} zones created`);
  }

  private createInteractableObject(x: number, y: number, _zoneId: string): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    
    // Glowing orb
    const orb = this.scene.add.circle(0, 0, 12, 0x5FE3DD, 0.8);
    orb.setStrokeStyle(2, 0xFFFFFF, 0.6);
    
    // Outer glow
    const glow = this.scene.add.circle(0, 0, 25, 0x5FE3DD, 0.2);
    
    // Subtle pulse animation
    this.scene.tweens.add({
      targets: [orb, glow],
      scale: 1.1,
      alpha: 0.6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    container.add([glow, orb]);
    container.setDepth(100);
    
    return container;
  }

  update(beeX: number, beeY: number): void {
    let minDistance = Infinity;
    let nearestZoneIndex = -1;

    for (let i = 0; i < this.zones.length; i++) {
      const zone = this.zones[i];
      const distance = Phaser.Math.Distance.Between(beeX, beeY, zone.x, zone.y);
      
      if (distance < zone.radius && distance < minDistance) {
        minDistance = distance;
        nearestZoneIndex = i;
      }
      
      // Reset affordance
      zone.interactable.setScale(1);
      zone.interactable.setVisible(true);
    }

    if (nearestZoneIndex >= 0 && minDistance < this.zones[nearestZoneIndex].radius) {
      const currentNearest = this.zones[nearestZoneIndex];
      if (this.currentZone !== currentNearest) {
        this.currentZone = currentNearest;
        
        // Enhance affordance on current zone
        currentNearest.interactable.setScale(1.3);
        
        // Play proximity tick sound (placeholder - actual audio in GATE 6)
        console.log(`📍 Near zone: ${currentNearest.id}`);
        
        if (this.proximityCallback) {
          this.proximityCallback(currentNearest.id);
        }
      }
    } else {
      this.currentZone = null;
    }
  }

  getCurrentZone(): ZoneData | null {
    return this.currentZone;
  }

  markZoneAsVisited(zoneId: string): void {
    const zone = this.zones.find(z => z.id === zoneId);
    if (zone) {
      zone.isVisited = true;
      // Visual change for visited state
      zone.interactable.removeAll(true);
      
      // Create visited indicator (brighter, different color)
      const visitedOrb = this.scene.add.circle(0, 0, 14, 0xFF6FB0, 0.9);
      visitedOrb.setStrokeStyle(3, 0xFFFFFF, 0.8);
      
      const visitedGlow = this.scene.add.circle(0, 0, 30, 0xFF6FB0, 0.3);
      
      zone.interactable.add([visitedGlow, visitedOrb]);
      
      console.log(`✅ Zone ${zoneId} marked as visited`);
    }
  }

  setProximityCallback(callback: (zoneId: string) => void): void {
    this.proximityCallback = callback;
  }

  setInteractCallback(callback: () => void): void {
    this.interactCallback = callback;
  }

  triggerInteract(): boolean {
    if (this.currentZone && this.interactCallback) {
      this.interactCallback();
      return true;
    }
    return false;
  }
}
