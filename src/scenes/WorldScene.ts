import Phaser from 'phaser';
import { Bee } from '../entities/bee';
import { InputHandler } from '../systems/input';

export class WorldScene extends Phaser.Scene {
  private bee!: Bee;
  private inputHandler!: InputHandler;
  private worldBounds!: Phaser.Geom.Rectangle;
  private isFlying: boolean = false;
  private moveSpeed: number = 200;
  private flySpeed: number = 300;
  private modeText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    // World bounds (2000x1400 as per design.md)
    this.worldBounds = new Phaser.Geom.Rectangle(0, 0, 2000, 1400);

    // Set camera bounds
    this.cameras.main.setBounds(0, 0, this.worldBounds.width, this.worldBounds.height);
    
    // Background color - dusk base
    this.cameras.main.setBackgroundColor('#241A38');

    // Initialize input handler
    this.inputHandler = new InputHandler(this);
    this.inputHandler.create();

    // Spawn bee at the hive (center-bottom)
    const spawnX = this.worldBounds.centerX;
    const spawnY = this.worldBounds.bottom - 100;
    
    this.bee = new Bee(this, spawnX, spawnY);
    this.bee.setDepth(100);

    // Camera follows bee smoothly
    this.cameras.main.startFollow(this.bee, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);

    // Debug info
    const debugText = this.add.text(10, 10, 'GATE 1 — Movement Feel\nArrows/WASD: Move | Space: Walk/Fly', {
      font: '16px system-ui',
      color: '#F3E9D6',
      backgroundColor: '#241A38',
      padding: { x: 10, y: 5 },
    });
    debugText.setScrollFactor(0);
    debugText.setDepth(1000);

    // Mode indicator
    this.modeText = this.add.text(10, 50, 'Mode: WALK', {
      font: '14px system-ui',
      color: '#FF6FB0',
      backgroundColor: '#241A38',
      padding: { x: 10, y: 5 },
    });
    this.modeText.setScrollFactor(0);
    this.modeText.setDepth(1000);

    console.log('🐝 GATE 1 — Movement Feel ready');
  }

  update(_time: number, delta: number): void {
    // Update input
    this.inputHandler.update();

    // Check for walk/fly toggle
    if (this.inputHandler.getWalkFlyToggle()) {
      this.isFlying = !this.isFlying;
      this.bee.setFlying(this.isFlying);
      this.modeText.setText(`Mode: ${this.isFlying ? 'FLY' : 'WALK'}`);
      console.log(`🐝 Mode switched: ${this.isFlying ? 'FLY' : 'WALK'}`);
    }

    // Get movement input
    const moveVector = this.inputHandler.getMoveVector();
    const isMoving = this.inputHandler.isMoving();
    const speed = this.isFlying ? this.flySpeed : this.moveSpeed;

    // Apply movement
    if (isMoving) {
      this.bee.x += moveVector.x * speed * (delta / 1000);
      this.bee.y += moveVector.y * speed * (delta / 1000);

      // Flip sprite based on horizontal direction
      if (moveVector.x < 0) {
        this.bee.setScale(-1, 1);
      } else if (moveVector.x > 0) {
        this.bee.setScale(1, 1);
      }
    }

    // Keep bee within world bounds
    this.bee.x = Phaser.Math.Clamp(this.bee.x, this.worldBounds.left + 20, this.worldBounds.right - 20);
    this.bee.y = Phaser.Math.Clamp(this.bee.y, this.worldBounds.top + 20, this.worldBounds.bottom - 20);

    // Update bee animation
    this.bee.update(delta, isMoving, moveVector);
  }
}
