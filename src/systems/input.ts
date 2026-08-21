import Phaser from 'phaser';

export class InputHandler {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private spaceKey: Phaser.Input.Keyboard.Key | null = null;
  private wKey: Phaser.Input.Keyboard.Key | null = null;
  private sKey: Phaser.Input.Keyboard.Key | null = null;
  private aKey: Phaser.Input.Keyboard.Key | null = null;
  private dKey: Phaser.Input.Keyboard.Key | null = null;
  
  private walkFlyToggled: boolean = false;
  private lastToggleState: boolean = false;
  
  private moveVector: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  
  constructor(private scene: Phaser.Scene) {}
  
  public create(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;
    
    // Cursor keys for movement
    this.cursors = keyboard.createCursorKeys();
    
    // WASD alternative
    this.wKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.sKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.aKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.dKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    
    // Space for walk/fly toggle
    this.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }
  
  public update(): void {
    // Reset movement vector
    this.moveVector.set(0, 0);
    
    // Check cursor keys
    if (this.cursors) {
      if (this.cursors.left?.isDown) this.moveVector.x -= 1;
      if (this.cursors.right?.isDown) this.moveVector.x += 1;
      if (this.cursors.up?.isDown) this.moveVector.y -= 1;
      if (this.cursors.down?.isDown) this.moveVector.y += 1;
    }
    
    // Check WASD keys
    if (this.aKey?.isDown) this.moveVector.x -= 1;
    if (this.dKey?.isDown) this.moveVector.x += 1;
    if (this.wKey?.isDown) this.moveVector.y -= 1;
    if (this.sKey?.isDown) this.moveVector.y += 1;
    
    // Normalize diagonal movement
    if (this.moveVector.length() > 1) {
      this.moveVector.normalize();
    }
    
    // Handle walk/fly toggle on space press (edge-triggered, not level-triggered)
    if (this.spaceKey?.isDown && !this.lastToggleState) {
      this.walkFlyToggled = true;
    }
    this.lastToggleState = this.spaceKey?.isDown ?? false;
  }
  
  public getMoveVector(): Phaser.Math.Vector2 {
    return this.moveVector;
  }
  
  public isMoving(): boolean {
    return this.moveVector.length() > 0;
  }
  
  public getWalkFlyToggle(): boolean {
    const toggled = this.walkFlyToggled;
    this.walkFlyToggled = false; // Reset after reading
    return toggled;
  }
}
