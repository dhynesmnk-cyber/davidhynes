import Phaser from 'phaser';
import { settings } from '../systems/settings';

/**
 * The bee. Multi-part puppet: abdomen (the butt), thorax, head, two paper
 * wings, wire legs and antennae. Every part snaps at 8–12fps with a little
 * rotation jitter — the stop-motion illusion. Under prefers-reduced-motion
 * the jitter is off; the walk/fly poses still change so the modes read.
 *
 * If David's `bee-body` texture is present it replaces the drawn body parts
 * (wings stay separate so they can flutter).
 */
export class Bee extends Phaser.GameObjects.Container {
  private abdomen: Phaser.GameObjects.Sprite | null = null;
  private customBody: Phaser.GameObjects.Sprite | null = null;
  private legs: Phaser.GameObjects.Graphics | null = null;
  private antennae: Phaser.GameObjects.Graphics | null = null;
  private wingBack: Phaser.GameObjects.Sprite;
  private wingFront: Phaser.GameObjects.Sprite;
  private puppet: Phaser.GameObjects.Container;

  private isFlying = false;
  private frameAccumulator = 0;
  private frame = 0;
  private jitterSeed = Math.random() * 1000;
  private interactLean = 0;

  private readonly WALK_FPS = 10;
  private readonly FLY_FPS = 12;
  private readonly JITTER_DEG = 1.5;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Everything except the shadow lives in `puppet` so squash/stretch and
    // tilt don't affect the ground shadow.
    this.puppet = scene.add.container(0, 0);

    const shadow = scene.add.ellipse(0, 14, 30, 10, 0x000000, 0.22);
    shadow.setName('shadow');
    this.add(shadow);

    const custom = scene.textures.exists('bee-body');

    // Wings sit behind the body; roots near the shoulder.
    this.wingBack = scene.add.sprite(-2, -7, 'bee-wing').setOrigin(0.08, 0.5).setAlpha(0.75);
    this.wingFront = scene.add.sprite(0, -9, 'bee-wing').setOrigin(0.08, 0.5);

    if (custom) {
      this.customBody = scene.add.sprite(0, 0, 'bee-body').setOrigin(0.5, 0.5);
      this.puppet.add([this.wingBack, this.customBody, this.wingFront]);
    } else {
      this.legs = scene.add.graphics();
      this.abdomen = scene.add.sprite(-6, 2, 'bee-abdomen').setOrigin(1, 0.5);
      const thorax = scene.add.sprite(2, 0, 'bee-thorax').setOrigin(0.5, 0.5);
      const head = scene.add.sprite(14, -2, 'bee-head').setOrigin(0.5, 0.5);
      this.antennae = scene.add.graphics();
      this.puppet.add([this.legs, this.abdomen, this.wingBack, thorax, head, this.antennae, this.wingFront]);
      this.drawLegs(0);
      this.drawAntennae(0);
    }

    this.add(this.puppet);
    this.setSize(48, 40);
    scene.add.existing(this);
  }

  public setFlying(flying: boolean): void {
    if (this.isFlying === flying) return;
    this.isFlying = flying;
    this.frameAccumulator = 0;
    this.frame = 0;
    // Squash-and-stretch on takeoff / landing: snapped, not tweened.
    const puppet = this.puppet;
    const shadow = this.getByName('shadow') as Phaser.GameObjects.Ellipse;
    if (flying) {
      puppet.setScale(0.9, 1.15);
      this.scene.time.delayedCall(90, () => puppet.setScale(1.05, 0.95));
      this.scene.time.delayedCall(180, () => { puppet.setScale(1, 1); puppet.y = -10; });
      shadow.setScale(0.7).setAlpha(0.12);
    } else {
      puppet.y = 0;
      puppet.setScale(1.15, 0.85);
      this.scene.time.delayedCall(90, () => puppet.setScale(0.95, 1.05));
      this.scene.time.delayedCall(180, () => puppet.setScale(1, 1));
      shadow.setScale(1).setAlpha(0.22);
    }
  }

  /** Brief lean-in when interacting with a set piece. */
  public lean(): void {
    this.interactLean = 4;
  }

  public update(delta: number, moving: boolean, direction: Phaser.Math.Vector2): void {
    const fps = this.isFlying ? this.FLY_FPS : this.WALK_FPS;
    const frameDuration = 1000 / fps;
    this.frameAccumulator += delta;
    if (this.frameAccumulator < frameDuration) return;
    this.frameAccumulator -= frameDuration;
    this.frame = (this.frame + 1) % 4;

    const reduced = settings.prefersReducedMotion;
    let bodyRotation = 0;
    let wiggle = 0;

    if (this.isFlying) {
      // Wing flutter: 2 frames up, 2 frames down at the snap rate.
      const up = this.frame < 2;
      this.wingFront.setRotation(Phaser.Math.DegToRad(up ? -38 : -8));
      this.wingBack.setRotation(Phaser.Math.DegToRad(up ? -12 : -42));
      // Body tilts into movement.
      if (moving) bodyRotation = Phaser.Math.DegToRad(direction.x * 10 + direction.y * -4);
      // Slight hover bob
      this.puppet.y = -10 + (this.frame % 2 === 0 ? -1 : 1);
      if (this.abdomen) this.abdomen.setRotation(Phaser.Math.DegToRad(this.frame % 2 === 0 ? 2 : -2));
      this.drawLegs(2);
    } else {
      // Wings folded back while walking
      this.wingFront.setRotation(Phaser.Math.DegToRad(-14));
      this.wingBack.setRotation(Phaser.Math.DegToRad(-24));
      if (moving) {
        // THE BUTT WIGGLE: abdomen sways side to side on a 2-beat cycle.
        // frames 0..3 → +, 0, -, 0 (a wide swing, then centre, then the other side)
        const swing = [1, 0, -1, 0][this.frame];
        wiggle = swing * 14;
        // Legs scuttle on alternate frames; body bobs with the step.
        this.drawLegs(this.frame % 2);
        this.puppet.y = this.frame % 2 === 0 ? -1 : 0;
      } else {
        // Idle: slow bob, occasional antenna twitch
        const t = this.scene.time.now * 0.002;
        wiggle = Math.sin(t) * 3;
        this.puppet.y = 0;
        this.drawLegs(0);
        this.drawAntennae(Math.random() < 0.12 ? 1 : 0);
      }
    }

    if (this.abdomen && !this.isFlying) {
      this.abdomen.setRotation(Phaser.Math.DegToRad(wiggle));
    } else if (!this.abdomen && !this.isFlying) {
      // Custom single-layer body: the whole puppet wiggles instead.
      bodyRotation += Phaser.Math.DegToRad(wiggle * 0.5);
    }

    if (this.interactLean > 0) {
      bodyRotation += Phaser.Math.DegToRad(12);
      this.interactLean -= 1;
    }

    // Stop-motion jitter: 1–2° per frame (off under reduced motion)
    const jitter = reduced ? 0 : Math.sin((this.scene.time.now + this.jitterSeed) * 0.013) * this.JITTER_DEG;
    this.puppet.setRotation(bodyRotation + Phaser.Math.DegToRad(jitter));
    if (!reduced) {
      // A pixel of positional jitter — the puppet being re-placed by hand.
      this.puppet.x = Math.round(Math.sin(this.scene.time.now * 0.017 + this.jitterSeed) * 0.8);
    }
  }

  private drawLegs(pose: number): void {
    if (!this.legs) return;
    const g = this.legs;
    g.clear();
    g.lineStyle(1.5, 0x6E4A2E, 1);
    // three legs per side, drawn as wire "L"s under the thorax
    const spread = pose === 2 ? 4 : 0; // flying: legs tucked back
    for (let i = 0; i < 3; i++) {
      const baseX = -6 + i * 7;
      const step = pose === 1 ? (i % 2 === 0 ? 3 : -3) : (pose === 0 ? (i % 2 === 0 ? -1 : 1) : 0);
      const footY = pose === 2 ? 8 : 12;
      g.beginPath();
      g.moveTo(baseX, 6);
      g.lineTo(baseX - 3 - spread + step, 9);
      g.lineTo(baseX - 1 - spread + step, footY);
      g.strokePath();
    }
  }

  private drawAntennae(twitch: number): void {
    if (!this.antennae) return;
    const g = this.antennae;
    g.clear();
    g.lineStyle(1.2, 0x241A38, 1);
    const t = twitch ? 3 : 0;
    g.beginPath();
    g.moveTo(15, -7);
    g.lineTo(19 + t, -13);
    g.moveTo(16, -8);
    g.lineTo(22, -11 - t);
    g.strokePath();
    g.fillStyle(0xFF6FB0, 1);
    g.fillCircle(19 + t, -13, 1.4);
    g.fillCircle(22, -11 - t, 1.4);
  }

  public getIsFlying(): boolean {
    return this.isFlying;
  }
}
