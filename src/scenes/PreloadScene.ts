import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // For GATE 0, we just load placeholder assets
    // Real assets will be added in GATE 2
    
    // Create a simple placeholder bee texture programmatically
    const graphics = this.make.graphics();
    
    // Bee body (felt orange)
    graphics.fillStyle(0xC97B3D);
    graphics.fillCircle(16, 16, 12);
    
    // Bee wings (paper white)
    graphics.fillStyle(0xF3E9D6, 0.8);
    graphics.fillEllipse(10, 10, 8, 4);
    graphics.fillEllipse(22, 10, 8, 4);
    
    // Generate texture
    graphics.generateTexture('bee-placeholder', 32, 32);
    graphics.destroy();
    
    // Create placeholder flower texture
    const flowerGraphics = this.make.graphics();
    flowerGraphics.fillStyle(0xFF6FB0);
    flowerGraphics.fillCircle(8, 8, 6);
    flowerGraphics.fillStyle(0x5FE3DD);
    flowerGraphics.fillCircle(8, 8, 3);
    flowerGraphics.generateTexture('flower-placeholder', 16, 16);
    flowerGraphics.destroy();
    
    // Create placeholder zone object texture
    const zoneGraphics = this.make.graphics();
    zoneGraphics.fillStyle(0x6E4A2E);
    zoneGraphics.fillRect(0, 10, 40, 30);
    zoneGraphics.fillStyle(0xC97B3D);
    zoneGraphics.fillRect(5, 0, 30, 15);
    zoneGraphics.generateTexture('zone-placeholder', 40, 40);
    zoneGraphics.destroy();
  }

  create(): void {
    this.scene.start('WorldScene');
  }
}
