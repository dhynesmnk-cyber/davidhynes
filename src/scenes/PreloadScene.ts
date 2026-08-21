import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // For GATE 1, we create simple placeholder assets programmatically
    
    // Create a simple placeholder bee texture programmatically
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Bee body (felt orange circle)
    graphics.fillStyle(0xC97B3D, 1);
    graphics.fillCircle(16, 16, 12);
    
    // Bee wings (paper white ovals)
    graphics.fillStyle(0xF3E9D6, 0.9);
    graphics.fillEllipse(10, 10, 8, 5);
    graphics.fillEllipse(22, 10, 8, 5);
    
    // Generate texture
    graphics.generateTexture('bee-placeholder', 32, 32);
    graphics.destroy();
    
    // Create placeholder wing texture
    const wingGraphics = this.make.graphics({ x: 0, y: 0 });
    wingGraphics.fillStyle(0xF3E9D6, 0.9);
    wingGraphics.fillEllipse(8, 4, 10, 6);
    wingGraphics.generateTexture('bee-wing-placeholder', 16, 8);
    wingGraphics.destroy();
    
    // Create placeholder flower texture
    const flowerGraphics = this.make.graphics({ x: 0, y: 0 });
    flowerGraphics.fillStyle(0xFF6FB0, 1);
    flowerGraphics.fillCircle(8, 8, 6);
    flowerGraphics.fillStyle(0x5FE3DD, 1);
    flowerGraphics.fillCircle(8, 8, 3);
    flowerGraphics.generateTexture('flower-placeholder', 16, 16);
    flowerGraphics.destroy();
    
    // Create placeholder zone object texture
    const zoneGraphics = this.make.graphics({ x: 0, y: 0 });
    zoneGraphics.fillStyle(0x6E4A2E, 1);
    zoneGraphics.fillRect(0, 10, 40, 30);
    zoneGraphics.fillStyle(0xC97B3D, 1);
    zoneGraphics.fillRect(5, 0, 30, 15);
    zoneGraphics.generateTexture('zone-placeholder', 40, 40);
    zoneGraphics.destroy();
  }

  create(): void {
    this.scene.start('WorldScene');
  }
}
