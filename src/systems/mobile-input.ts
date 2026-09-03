import Phaser from 'phaser';

/**
 * Mobile input (FR-1, GATE 5): felt-disc joystick with a wooden knob in the
 * lower-left, a wing/foot walk-fly switch attached above it, and a
 * context interact button bottom-right that appears near zones.
 *
 * Only created on touch devices. The joystick is "floating": touch anywhere
 * in the lower-left half and it re-centres under your thumb.
 */
export class MobileInput {
  private scene: Phaser.Scene;
  private enabled = false;
  private joystickBase!: Phaser.GameObjects.Container;
  private joystickKnob!: Phaser.GameObjects.Ellipse;
  private toggle!: Phaser.GameObjects.Container;
  private toggleIcon!: Phaser.GameObjects.Container;
  private interactButton!: Phaser.GameObjects.Container;

  private activePointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private restX = 84;
  private restY = 0;
  private readonly maxDistance = 42;
  private moveVector = new Phaser.Math.Vector2(0, 0);
  private isFlying = false;

  private onInteractPress: (() => void) | null = null;
  private onTogglePress: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    if (!scene.sys.game.device.input.touch) return;
    this.enabled = true;
    scene.input.addPointer(2);
    this.createJoystick();
    this.createToggle();
    this.createInteractButton();
    this.setupListeners();
    this.layout();
    scene.scale.on('resize', () => this.layout());
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    this.restX = 84;
    this.restY = h - 92;
    if (this.activePointerId === null) this.joystickBase.setPosition(this.restX, this.restY);
    this.toggle.setPosition(this.restX + 72, this.restY - 62);
    this.interactButton.setPosition(w - 76, h - 92);
  }

  private createJoystick(): void {
    this.joystickBase = this.scene.add.container(0, 0);
    const disc = this.scene.add.circle(0, 0, 50, 0x6E4A2E, 0.85);
    disc.setStrokeStyle(3, 0x8B5A2B, 0.9);
    const grain = this.scene.add.circle(0, 0, 44, 0x8B5A2B, 0.25);
    const ring = this.scene.add.circle(0, 0, 30, 0x000000, 0).setStrokeStyle(1, 0xF3E9D6, 0.15);
    this.joystickKnob = this.scene.add.ellipse(0, 0, 30, 30, 0xC97B3D);
    this.joystickKnob.setStrokeStyle(2, 0x6E4A2E);
    this.joystickBase.add([disc, grain, ring, this.joystickKnob]);
    this.joystickBase.setScrollFactor(0).setDepth(5000).setAlpha(0.75);
  }

  private createToggle(): void {
    this.toggle = this.scene.add.container(0, 0);
    const bg = this.scene.add.rectangle(0, 0, 64, 34, 0x3A2B55, 0.95);
    bg.setStrokeStyle(2, 0x6E4A2E);
    bg.setRounded?.(10);
    this.toggleIcon = this.scene.add.container(0, 0);
    this.toggle.add([bg, this.toggleIcon]);
    this.toggle.setScrollFactor(0).setDepth(5001);
    this.toggle.setSize(64, 34);
    this.toggle.setInteractive({ useHandCursor: true });
    this.toggle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation?.();
      this.onTogglePress?.();
    });
    this.drawToggleIcon();
  }

  private drawToggleIcon(): void {
    this.toggleIcon.removeAll(true);
    const label = this.scene.add.text(0, 0, this.isFlying ? 'FLY' : 'WALK', {
      font: 'bold 11px Nunito, system-ui',
      color: this.isFlying ? '#5FE3DD' : '#FF6FB0',
    }).setOrigin(0.5);
    this.toggleIcon.add(label);
  }

  private createInteractButton(): void {
    this.interactButton = this.scene.add.container(0, 0);
    const bg = this.scene.add.circle(0, 0, 36, 0xFF6FB0, 0.95);
    bg.setStrokeStyle(3, 0xF3E9D6, 0.8);
    const hand = this.scene.add.text(0, 1, '✋', { fontSize: '26px' }).setOrigin(0.5);
    this.interactButton.add([bg, hand]);
    this.interactButton.setScrollFactor(0).setDepth(5001);
    this.interactButton.setSize(80, 80);
    this.interactButton.setInteractive({ useHandCursor: true });
    this.interactButton.setVisible(false);
    this.interactButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation?.();
      this.onInteractPress?.();
    });
  }

  private setupListeners(): void {
    const input = this.scene.input;

    input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: unknown[]) => {
      if (this.activePointerId !== null) return;
      if (over && over.length > 0) return; // tapped a button / marker
      const w = this.scene.scale.width;
      const h = this.scene.scale.height;
      if (pointer.x > w * 0.6 || pointer.y < h * 0.4) return;
      this.activePointerId = pointer.id;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.joystickBase.setPosition(pointer.x, pointer.y).setAlpha(1);
      this.joystickKnob.setPosition(0, 0);
    });

    input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.activePointerId) return;
      const dx = pointer.x - this.dragStartX;
      const dy = pointer.y - this.dragStartY;
      const dist = Math.min(Math.hypot(dx, dy), this.maxDistance);
      const angle = Math.atan2(dy, dx);
      this.joystickKnob.setPosition(Math.cos(angle) * dist, Math.sin(angle) * dist);
      const force = dist / this.maxDistance;
      // small dead zone so a resting thumb doesn't creep
      if (force < 0.12) { this.moveVector.set(0, 0); return; }
      this.moveVector.set(Math.cos(angle) * force, Math.sin(angle) * force);
    });

    const release = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.activePointerId) return;
      this.activePointerId = null;
      this.moveVector.set(0, 0);
      this.joystickKnob.setPosition(0, 0);
      this.scene.tweens.add({
        targets: this.joystickBase,
        x: this.restX,
        y: this.restY,
        alpha: 0.75,
        duration: 250,
        ease: 'Cubic.easeOut',
      });
    };
    input.on('pointerup', release);
    input.on('pointerupoutside', release);
  }

  setFlying(flying: boolean): void {
    this.isFlying = flying;
    if (this.enabled) this.drawToggleIcon();
  }

  setOnInteractPress(cb: () => void): void { this.onInteractPress = cb; }
  setOnTogglePress(cb: () => void): void { this.onTogglePress = cb; }

  showInteractButton(show: boolean): void {
    if (!this.enabled) return;
    if (show && !this.interactButton.visible) {
      this.interactButton.setVisible(true).setScale(0.6);
      this.scene.tweens.add({ targets: this.interactButton, scale: 1, duration: 220, ease: 'Back.easeOut' });
    } else if (!show) {
      this.interactButton.setVisible(false);
    }
  }

  getMoveVector(): Phaser.Math.Vector2 {
    return this.moveVector;
  }

  setUiVisible(visible: boolean): void {
    if (!this.enabled) return;
    this.joystickBase.setVisible(visible);
    this.toggle.setVisible(visible);
    if (!visible) this.interactButton.setVisible(false);
  }
}
