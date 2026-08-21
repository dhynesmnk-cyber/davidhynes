import Phaser from 'phaser';

export class WorldScene extends Phaser.Scene {
  private bee!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private isFlying: boolean = false;
  private worldBounds!: Phaser.Geom.Rectangle;
  private frameAccumulator: number = 0;
  private animationFrame: number = 0;
  private animationFrames: number[] = [0, 1, 2, 1]; // Simple walk cycle

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

    // Spawn bee at the hive (center-bottom)
    const spawnX = this.worldBounds.centerX;
    const spawnY = this.worldBounds.bottom - 100;
    
    this.bee = this.add.sprite(spawnX, spawnY, 'bee-placeholder');
    this.bee.setDepth(100);
    this.bee.setScale(2);

    // Camera follows bee
    this.cameras.main.startFollow(this.bee, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);

    // Input setup
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Walk/fly toggle
    this.spaceKey.on('down', () => {
      this.isFlying = !this.isFlying;
      console.log(`Mode: ${this.isFlying ? 'FLY' : 'WALK'}`);
    });

    // Debug info
    const debugText = this.add.text(10, 10, 'GATE 0 — Movement Test\nArrows: Move | Space: Walk/Fly', {
      font: '16px system-ui',
      color: '#F3E9D6',
      backgroundColor: '#241A38',
      padding: { x: 10, y: 5 },
    });
    debugText.setScrollFactor(0);
    debugText.setDepth(1000);

    console.log('🐝 WorldScene created — GATE 0 ready for movement testing');
  }

  update(time: number, delta: number): void {
    // Animation snapping at ~10fps for stop-motion feel
    this.frameAccumulator += delta;
    const frameDuration = 100; // 10fps
    
    if (this.frameAccumulator >= frameDuration) {
      this.frameAccumulator = 0;
      this.animationFrame = (this.animationFrame + 1) % this.animationFrames.length;
    }

    // Movement
    const speed = this.isFlying ? 300 : 200;
    let moving = false;

    if (this.cursors.left?.isDown) {
      this.bee.x -= speed * (delta / 1000);
      this.bee.setFlipX(true);
      moving = true;
    }
    if (this.cursors.right?.isDown) {
      this.bee.x += speed * (delta / 1000);
      this.bee.setFlipX(false);
      moving = true;
    }
    if (this.cursors.up?.isDown) {
      this.bee.y -= speed * (delta / 1000);
      moving = true;
    }
    if (this.cursors.down?.isDown) {
      this.bee.y += speed * (delta / 1000);
      moving = true;
    }

    // Keep bee within world bounds
    this.bee.x = Phaser.Math.Clamp(this.bee.x, this.worldBounds.left, this.worldBounds.right);
    this.bee.y = Phaser.Math.Clamp(this.bee.y, this.worldBounds.top, this.worldBounds.bottom);

    // Simple butt-wiggle animation when walking
    if (moving && !this.isFlying) {
      // Rotate slightly side to side for wiggle effect
      const wiggle = Math.sin(time * 0.02) * 5;
      this.bee.setRotation(Phaser.Math.DegToRad(wiggle));
    } else if (this.isFlying) {
      // Slight tilt when flying
      const tilt = (this.cursors.left?.isDown ? -10 : this.cursors.right?.isDown ? 10 : 0);
      this.bee.setRotation(Phaser.Math.DegToRad(tilt));
    } else {
      // Idle - slight bob
      const bob = Math.sin(time * 0.005) * 2;
      this.bee.setRotation(Phaser.Math.DegToRad(bob));
    }
  }
}
