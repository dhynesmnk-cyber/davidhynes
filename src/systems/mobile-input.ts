/**
 * Mobile Input Handler - Virtual Joystick & Touch Controls
 */

export class MobileInput {
  private scene: Phaser.Scene;
  private joystickBase: Phaser.GameObjects.Container | null = null;
  private joystickKnob: Phaser.GameObjects.Ellipse | null = null;
  private walkFlyToggle: Phaser.GameObjects.Container | null = null;
  private interactButton: Phaser.GameObjects.Container | null = null;
  private iconContainer: Phaser.GameObjects.Container | null = null;
  
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private currentForce: number = 0;
  
  private moveVector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private onMoveChange: ((vector: Phaser.Math.Vector2) => void) | null = null;
  private onInteractPress: (() => void) | null = null;
  private onTogglePress: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Only create on touch devices
    if (!this.scene.sys.game.device.input.touch) {
      return;
    }
    
    this.createJoystick();
    this.createWalkFlyToggle();
    this.createInteractButton();
    this.setupTouchListeners();
  }

  private createJoystick(): void {
    const baseX = 80;
    const baseY = this.scene.scale.height - 80;
    
    // Joystick base (felt disc)
    this.joystickBase = this.scene.add.container(baseX, baseY);
    const baseCircle = this.scene.add.circle(0, 0, 50, 0x8B4513); // Brown felt
    baseCircle.setStrokeStyle(3, 0x6E4A2E);
    
    // Add texture grain
    const grain = this.scene.add.circle(0, 0, 48, 0x965638);
    grain.setAlpha(0.3);
    
    this.joystickBase.add([baseCircle, grain]);
    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setDepth(1000);
    
    // Joystick knob (wooden)
    this.joystickKnob = this.scene.add.ellipse(0, 0, 25, 25, 0xC97B3D);
    this.joystickKnob.setStrokeStyle(2, 0x6E4A2E);
    this.joystickBase.add(this.joystickKnob);
    
    this.joystickBase.setVisible(false);
  }

  private createWalkFlyToggle(): void {
    const toggleX = 80;
    const toggleY = this.scene.scale.height - 140;
    
    this.walkFlyToggle = this.scene.add.container(toggleX, toggleY);
    
    // Toggle background (rounded rectangle using ellipse + rect combo)
    const bg = this.scene.add.rectangle(0, 0, 50, 30, 0x3A2B55);
    bg.setStrokeStyle(2, 0x6E4A2E);
    bg.setRounded(8);
    
    // Icon container
    this.iconContainer = this.scene.add.container(0, 0);
    
    // Foot icon (walk mode)
    const foot = this.scene.add.ellipse(0, 0, 12, 18, 0xFF6FB0);
    this.iconContainer.add(foot);
    
    this.walkFlyToggle.add([bg, this.iconContainer]);
    this.walkFlyToggle.setScrollFactor(0);
    this.walkFlyToggle.setDepth(1000);
    this.walkFlyToggle.setVisible(false);
    
    // Make toggle interactive
    this.walkFlyToggle.setSize(50, 30);
    this.walkFlyToggle.setInteractive({ useHandCursor: true });
  }

  private createInteractButton(): void {
    const buttonX = this.scene.scale.width - 80;
    const buttonY = this.scene.scale.height - 80;
    
    this.interactButton = this.scene.add.container(buttonX, buttonY);
    
    // Button background
    const bg = this.scene.add.circle(0, 0, 40, 0xFF6FB0);
    bg.setStrokeStyle(3, 0xA78BFA);
    
    // Hand icon
    const hand = this.scene.add.text(0, 0, '✋', {
      fontSize: '24px',
      fontFamily: 'handwritten'
    }).setOrigin(0.5);
    
    this.interactButton.add([bg, hand]);
    this.interactButton.setScrollFactor(0);
    this.interactButton.setDepth(1000);
    this.interactButton.setVisible(false);
    
    // Make button interactive
    this.interactButton.setSize(80, 80);
    this.interactButton.setInteractive({ useHandCursor: true });
  }

  private setupTouchListeners(): void {
    const input = this.scene.input;
    
    // Joystick touch handling
    input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < this.scene.scale.width / 2 && pointer.y > this.scene.scale.height / 2) {
        // Left bottom quadrant - activate joystick
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        
        if (this.joystickBase) {
          this.joystickBase.setPosition(pointer.x, pointer.y);
          this.joystickBase.setVisible(true);
          this.joystickKnob?.setPosition(0, 0);
        }
        
        if (this.walkFlyToggle) {
          this.walkFlyToggle.setPosition(pointer.x, pointer.y - 60);
          this.walkFlyToggle.setVisible(true);
        }
      }
    });
    
    input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.joystickKnob) return;
      
      const dx = pointer.x - this.dragStartX;
      const dy = pointer.y - this.dragStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 40;
      
      const clampedDistance = Math.min(distance, maxDistance);
      const angle = Math.atan2(dy, dx);
      
      const knobX = Math.cos(angle) * clampedDistance;
      const knobY = Math.sin(angle) * clampedDistance;
      
      this.joystickKnob.setPosition(knobX, knobY);
      
      // Calculate normalized move vector
      this.currentForce = clampedDistance / maxDistance;
      
      this.moveVector.x = Math.cos(angle) * this.currentForce;
      this.moveVector.y = Math.sin(angle) * this.currentForce;
      
      if (this.onMoveChange) {
        this.onMoveChange(this.moveVector);
      }
    });
    
    input.on('pointerup', () => {
      this.isDragging = false;
      this.moveVector.set(0, 0);
      
      if (this.onMoveChange) {
        this.onMoveChange(this.moveVector);
      }
      
      if (this.joystickBase) {
        this.joystickBase.setVisible(false);
      }
      if (this.walkFlyToggle) {
        this.walkFlyToggle.setVisible(false);
      }
      if (this.interactButton) {
        this.interactButton.setVisible(false);
      }
    });
    
    // Interact button press
    if (this.interactButton) {
      this.interactButton.on('pointerdown', () => {
        if (this.onInteractPress) {
          this.onInteractPress();
        }
      });
    }
    
    // Walk/fly toggle press
    if (this.walkFlyToggle) {
      this.walkFlyToggle.on('pointerdown', () => {
        if (this.onTogglePress) {
          this.onTogglePress();
        }
        this.updateToggleIcon();
      });
    }
  }

  private updateToggleIcon(): void {
    if (!this.iconContainer) return;
    
    this.iconContainer.removeAll(true);
    
    // Toggle between foot and wing icons
    const isFlying = this.scene.registry.get('isFlying') || false;
    
    if (isFlying) {
      // Wing icon for fly mode (using triangle)
      const wing = this.scene.add.triangle(0, 0, 8, -6, 0, -12, -8, -6, 0x5FE3DD);
      this.iconContainer.add(wing);
    } else {
      // Foot icon for walk mode
      const foot = this.scene.add.ellipse(0, 0, 12, 18, 0xFF6FB0);
      this.iconContainer.add(foot);
    }
  }

  public setOnMoveChange(callback: (vector: Phaser.Math.Vector2) => void): void {
    this.onMoveChange = callback;
  }

  public setOnInteractPress(callback: () => void): void {
    this.onInteractPress = callback;
  }

  public setOnTogglePress(callback: () => void): void {
    this.onTogglePress = callback;
  }

  public showInteractButton(show: boolean): void {
    if (this.interactButton && this.scene.sys.game.device.input.touch) {
      this.interactButton.setVisible(show);
    }
  }

  public getMoveVector(): Phaser.Math.Vector2 {
    return this.moveVector.clone();
  }

  public destroy(): void {
    this.joystickBase?.destroy(true);
    this.walkFlyToggle?.destroy(true);
    this.interactButton?.destroy(true);
  }
}
