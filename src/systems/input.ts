import Phaser from 'phaser';

/**
 * Desktop keyboard input. Arrow keys / WASD move, Space toggles walk/fly,
 * E or Enter interacts. `setEnabled(false)` releases key capture while a DOM
 * modal is open so Tab/Space/Enter behave normally inside it.
 */
export class InputHandler {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private walkFlyToggled = false;
  private lastSpace = false;
  private interactPressed = false;
  private lastInteract = false;
  private enabled = true;
  private moveVector = new Phaser.Math.Vector2();

  constructor(private scene: Phaser.Scene) {}

  public create(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;
    this.cursors = keyboard.createCursorKeys();
    const K = Phaser.Input.Keyboard.KeyCodes;
    (['W', 'A', 'S', 'D'] as const).forEach((name) => {
      this.keys[name] = keyboard.addKey(K[name]);
    });
    // Interact keys are NOT captured so Enter still activates focused DOM
    // controls (mute toggle, links) normally.
    this.keys.E = keyboard.addKey(K.E, false);
    this.keys.ENTER = keyboard.addKey(K.ENTER, false);

    // When a DOM control (mute button, skip link) has focus, hand the
    // keyboard back to the browser so Space/Enter/arrows behave natively.
    document.addEventListener('focusin', () => this.syncCapture());
    document.addEventListener('focusout', () => this.syncCapture());
  }

  /** True when keyboard focus is on a DOM control rather than the game. */
  private domHasFocus(): boolean {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    return el.tagName !== 'CANVAS' && el.id !== 'game-container';
  }

  private syncCapture(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard || !this.enabled) return;
    if (this.domHasFocus()) {
      keyboard.disableGlobalCapture();
      keyboard.resetKeys();
    } else {
      keyboard.enableGlobalCapture();
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;
    keyboard.enabled = enabled;
    if (enabled) {
      keyboard.enableGlobalCapture();
    } else {
      keyboard.disableGlobalCapture();
      keyboard.resetKeys();
    }
    this.moveVector.set(0, 0);
    this.walkFlyToggled = false;
    this.interactPressed = false;
    this.lastSpace = true; // swallow the key that opened/closed the modal
    this.lastInteract = true;
  }

  public update(): void {
    this.moveVector.set(0, 0);
    if (!this.enabled || this.domHasFocus()) return;

    const c = this.cursors;
    if (c) {
      if (c.left.isDown) this.moveVector.x -= 1;
      if (c.right.isDown) this.moveVector.x += 1;
      if (c.up.isDown) this.moveVector.y -= 1;
      if (c.down.isDown) this.moveVector.y += 1;
    }
    if (this.keys.A?.isDown) this.moveVector.x -= 1;
    if (this.keys.D?.isDown) this.moveVector.x += 1;
    if (this.keys.W?.isDown) this.moveVector.y -= 1;
    if (this.keys.S?.isDown) this.moveVector.y += 1;
    if (this.moveVector.length() > 1) this.moveVector.normalize();

    // Edge-triggered toggles
    const spaceDown = c?.space.isDown ?? false;
    if (spaceDown && !this.lastSpace) this.walkFlyToggled = true;
    this.lastSpace = spaceDown;

    const interactDown = (this.keys.E?.isDown ?? false) || (this.keys.ENTER?.isDown ?? false);
    if (interactDown && !this.lastInteract) this.interactPressed = true;
    this.lastInteract = interactDown;
  }

  public getMoveVector(): Phaser.Math.Vector2 {
    return this.moveVector;
  }

  public isMoving(): boolean {
    return this.moveVector.length() > 0;
  }

  public getWalkFlyToggle(): boolean {
    const t = this.walkFlyToggled;
    this.walkFlyToggled = false;
    return t;
  }

  public getInteract(): boolean {
    const p = this.interactPressed;
    this.interactPressed = false;
    return p;
  }
}
