import Phaser from 'phaser';

export class Bee extends Phaser.GameObjects.Container {
  private bodySprite: Phaser.GameObjects.Sprite;
  private wingLeft: Phaser.GameObjects.Sprite;
  private wingRight: Phaser.GameObjects.Sprite;
  private isFlying: boolean = false;
  private frameAccumulator: number = 0;
  private walkFrame: number = 0;
  private wingFrame: number = 0;
  private jitterSeed: number = Math.random() * 1000;

  // Animation timing for stop-motion feel (8-12fps)
  private readonly WALK_FPS = 10;
  private readonly FLY_FPS = 12;
  private readonly JITTER_AMOUNT = 1.5; // degrees

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.setDepth(100);

    // Create bee body (will be replaced with actual sprite later)
    this.bodySprite = scene.add.sprite(0, 0, 'bee-placeholder');
    this.bodySprite.setOrigin(0.5, 0.5);
    this.bodySprite.setScale(2);
    this.add(this.bodySprite);

    // Create wings (separate sprites for animation)
    this.wingLeft = scene.add.sprite(-8, -4, 'bee-wing-placeholder');
    this.wingRight = scene.add.sprite(8, -4, 'bee-wing-placeholder');
    this.wingLeft.setOrigin(0.5, 0.5);
    this.wingRight.setOrigin(0.5, 0.5);
    this.wingLeft.setScale(1.5);
    this.wingRight.setScale(1.5);
    this.wingLeft.setFlipX(true);
    this.add(this.wingLeft);
    this.add(this.wingRight);

    scene.add.existing(this);
  }

  public setFlying(flying: boolean): void {
    this.isFlying = flying;
    this.frameAccumulator = 0;
    this.walkFrame = 0;
    this.wingFrame = 0;
  }

  public update(delta: number, moving: boolean, direction: Phaser.Math.Vector2): void {
    // Stop-motion animation snapping
    const targetFPS = this.isFlying ? this.FLY_FPS : this.WALK_FPS;
    const frameDuration = 1000 / targetFPS;

    this.frameAccumulator += delta;

    if (this.frameAccumulator >= frameDuration) {
      this.frameAccumulator = 0;

      if (this.isFlying) {
        // Wing flutter animation
        this.wingFrame = (this.wingFrame + 1) % 4;
        const wingAngle = this.wingFrame < 2 ? -30 : 30;
        this.wingLeft.setRotation(Phaser.Math.DegToRad(wingAngle));
        this.wingRight.setRotation(Phaser.Math.DegToRad(-wingAngle));

        // Body tilt into movement direction
        if (moving) {
          const tilt = direction.x * 15;
          this.setRotation(Phaser.Math.DegToRad(tilt));
        } else {
          this.setRotation(0);
        }
      } else {
        // Walk cycle with butt wiggle
        this.walkFrame = (this.walkFrame + 1) % 4;

        if (moving) {
          // Butt wiggle: abdomen sways side to side on 2-beat cycle
          // The wiggle is strongest when feet are on the ground (frames 0 and 2)
          const wigglePhase = this.walkFrame * 90; // 0, 90, 180, 270
          const wiggleAmount = Math.sin(Phaser.Math.DegToRad(wigglePhase)) * 8;

          // Rotate body for butt wiggle effect
          this.setRotation(Phaser.Math.DegToRad(wiggleAmount));

          // Subtle squash and stretch on steps
          const squash = this.walkFrame % 2 === 0 ? 1.05 : 0.95;
          this.bodySprite.setScale(2 * squash, 2 * (2 - squash));
        } else {
          // Idle - slow bob with antenna twitch
          const bob = Math.sin(this.scene.time.now * 0.003) * 3;
          this.setRotation(Phaser.Math.DegToRad(bob));
          this.bodySprite.setScale(2, 2);
        }

        // Wings relaxed when walking
        this.wingLeft.setRotation(Phaser.Math.DegToRad(-10));
        this.wingRight.setRotation(Phaser.Math.DegToRad(10));
      }

      // Add per-frame rotation jitter for stop-motion feel
      const jitter = (Math.sin((this.scene.time.now + this.jitterSeed) * 0.01) * this.JITTER_AMOUNT);
      this.rotation += Phaser.Math.DegToRad(jitter);
    }
  }

  public getIsFlying(): boolean {
    return this.isFlying;
  }
}
