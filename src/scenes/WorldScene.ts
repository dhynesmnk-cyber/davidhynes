import Phaser from 'phaser';
import { Bee } from '../entities/bee';
import { InputHandler } from '../systems/input';
import { ZoneManager } from '../systems/zones';
import { ModalManager } from '../ui/modal';

export class WorldScene extends Phaser.Scene {
  private bee!: Bee;
  private inputHandler!: InputHandler;
  private zoneManager!: ZoneManager;
  private modalManager!: ModalManager;
  private worldBounds!: Phaser.Geom.Rectangle;
  private isFlying: boolean = false;
  private moveSpeed: number = 200;
  private flySpeed: number = 300;
  private modeText!: Phaser.GameObjects.Text;
  private interactHint!: Phaser.GameObjects.Text;
  
  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    this.worldBounds = new Phaser.Geom.Rectangle(0, 0, 2000, 1400);
    this.cameras.main.setBounds(0, 0, this.worldBounds.width, this.worldBounds.height);
    
    this.createDioramaWorld();
    
    this.inputHandler = new InputHandler(this);
    this.inputHandler.create();

    const spawnX = this.worldBounds.centerX;
    const spawnY = this.worldBounds.bottom - 150;
    
    this.bee = new Bee(this, spawnX, spawnY);
    this.bee.setDepth(1000);

    this.cameras.main.startFollow(this.bee, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);

    this.modeText = this.add.text(16, 16, 'WALK', {
      font: 'bold 14px system-ui',
      color: '#FF6FB0',
      backgroundColor: '#241A38CC',
      padding: { x: 12, y: 6 },
    });
    this.modeText.setScrollFactor(0);
    this.modeText.setDepth(10000);
    this.modeText.setVisible(false);

    // Interact hint text
    this.interactHint = this.add.text(0, 0, 'Press E to interact', {
      font: 'bold 14px system-ui',
      color: '#5FE3DD',
      backgroundColor: '#241A38EE',
      padding: { x: 10, y: 5 },
    });
    this.interactHint.setScrollFactor(0);
    this.interactHint.setDepth(10000);
    this.interactHint.setVisible(false);

    // Initialize zone manager
    this.zoneManager = new ZoneManager(this);
    this.zoneManager.create();
    
    // Initialize modal manager
    this.modalManager = new ModalManager();
    
    // Set up callbacks
    this.zoneManager.setProximityCallback((_zoneId) => {
      this.interactHint.setPosition(16, 50);
      this.interactHint.setVisible(true);
    });
    
    this.zoneManager.setInteractCallback(() => {
      const currentZone = this.zoneManager.getCurrentZone();
      if (currentZone) {
        this.modalManager.open(currentZone.id);
      }
    });
    
    this.modalManager.setOnOpen((zoneId) => {
      this.zoneManager.markZoneAsVisited(zoneId);
      this.interactHint.setVisible(false);
    });
    
    this.modalManager.setOnClose(() => {
      // Focus returns automatically via modal manager
    });

    console.log('🌸 GATE 3 — Interaction & Modals ready');
  }
  
  private createDioramaWorld(): void {
    // Gradient background using rectangles
    for (let y = 0; y < this.worldBounds.height; y += 30) {
      const t = y / this.worldBounds.height;
      const r = Math.round(58 + (26 - 58) * t);
      const g = Math.round(43 + (14 - 43) * t);
      const b = Math.round(85 + (38 - 85) * t);
      this.add.rectangle(this.worldBounds.centerX, y, this.worldBounds.width, 30, Phaser.Display.Color.GetColor(r, g, b))
        .setOrigin(0.5, 0)
        .setDepth(0);
    }

    // Base felt ground
    this.add.rectangle(this.worldBounds.centerX, this.worldBounds.centerY, this.worldBounds.width, this.worldBounds.height, 0x3A2B55)
      .setAlpha(0.8)
      .setDepth(1);
    
    // Raised hills
    const hillPositions = [
      { x: 400, y: 400, w: 350, h: 200 },
      { x: 1600, y: 500, w: 300, h: 180 },
      { x: 800, y: 900, w: 400, h: 220 },
      { x: 1400, y: 1000, w: 320, h: 190 },
    ];
    
    hillPositions.forEach(hill => {
      this.add.ellipse(hill.x, hill.y, hill.w, hill.h, 0x2D1B47)
        .setStrokeStyle(2, 0xC97B3D, 0.3)
        .setDepth(2);
    });

    // Path network using curves
    const paths = [
      [{x: 1000, y: 1250}, {x: 700, y: 1200}, {x: 400, y: 1100}, {x: 300, y: 900}],
      [{x: 1000, y: 1250}, {x: 1300, y: 1150}, {x: 1600, y: 1000}, {x: 1700, y: 800}],
      [{x: 1000, y: 1250}, {x: 1000, y: 900}, {x: 1000, y: 600}, {x: 1000, y: 300}],
      [{x: 1000, y: 1250}, {x: 1200, y: 1300}, {x: 1500, y: 1250}, {x: 1700, y: 1150}],
      [{x: 1000, y: 1250}, {x: 800, y: 1300}, {x: 500, y: 1250}, {x: 300, y: 1150}],
    ];
    
    paths.forEach(pathData => {
      const points = pathData.map(p => new Phaser.Math.Vector2(p.x, p.y));
      const curve = new Phaser.Curves.Spline(points);
      const pathGraphics = this.add.graphics();
      pathGraphics.lineStyle(50, 0xC97B3D, 0.5);
      curve.draw(pathGraphics, 64);
      pathGraphics.setDepth(3);
    });

    // Zone set pieces
    this.createExperienceZone(300, 900);
    this.createSkillsZone(1700, 800);
    this.createProjectsZone(1000, 300);
    this.createBlogsZone(1700, 1150);
    this.createToolsZone(300, 1150);
    
    // Mushroom lamps
    const mushrooms = [
      { x: 500, y: 600 }, { x: 1500, y: 700 },
      { x: 700, y: 1000 }, { x: 1300, y: 1100 },
    ];
    
    mushrooms.forEach(pos => {
      this.add.circle(pos.x, pos.y - 10, 10, 0x5FE3DD).setDepth(20);
      this.add.rectangle(pos.x, pos.y, 5, 15, 0xF3E9D6).setDepth(20);
      
      const glow = this.add.circle(pos.x, pos.y - 10, 20, 0x5FE3DD, 0.3);
      glow.setDepth(19);
      this.tweens.add({
        targets: glow,
        alpha: 0.2,
        duration: 1500 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
      });
    });
    
    // Paper grass tufts
    for (let i = 0; i < 60; i++) {
      const gx = Math.random() * this.worldBounds.width;
      const gy = Math.random() * this.worldBounds.height;
      this.add.triangle(gx, gy, 3, 10, 0x3A2B55)
        .setRotation((Math.random() - 0.5) * 0.5)
        .setAlpha(0.5)
        .setDepth(10);
    }
    
    this.createHive();
  }
  
  private createExperienceZone(x: number, y: number): void {
    const container = this.add.container(x, y);
    
    // Vine trellis
    this.add.rectangle(0, 0, 10, 120, 0x6E4A2E);
    for (let i = -2; i <= 2; i++) {
      this.add.rectangle(i * 20, -40, 6, 100, 0x6E4A2E);
    }
    
    // Wine bar counter (using polygon instead of trapezoid)
    const counterPoints = [
      { x: -10, y: 30 }, { x: 60, y: 30 },
      { x: 50, y: 70 }, { x: 0, y: 70 }
    ];
    this.add.polygon(25, 50, counterPoints, 0xC97B3D);
    
    // Pink roses
    this.createFlowerCluster(container, -35, 40, 0xFF6FB0, 5);
    this.createFlowerCluster(container, 45, 35, 0xFF6FB0, 5);
    
    // Zone glow
    const glow = this.add.circle(0, 0, 90, 0xA78BFA, 0.12);
    glow.setDepth(-1);
    
    container.setDepth(50);
  }
  
  private createSkillsZone(x: number, y: number): void {
    const container = this.add.container(x, y);
    
    // Felt awning (polygon)
    const awningPoints = [
      { x: -65, y: -15 }, { x: 65, y: -15 },
      { x: 55, y: -65 }, { x: -55, y: -65 }
    ];
    this.add.polygon(0, -40, awningPoints, 0xC97B3D);
    
    for (let i = -3; i <= 3; i++) {
      this.add.rectangle(i * 18, -40, 10, 55, 0x8B5A2B).setAlpha(0.5);
    }
    
    // Workbench
    this.add.rectangle(0, 25, 90, 45, 0x6E4A2E);
    
    // Tools
    this.add.circle(-18, 15, 7, 0x5FE3DD);
    this.add.rectangle(8, 20, 14, 5, 0xA78BFA);
    this.add.triangle(22, 10, 10, 14, 0xFF6FB0);
    
    // Cyan bells
    this.createFlowerCluster(container, -45, 35, 0x5FE3DD, 5);
    this.createFlowerCluster(container, 50, 30, 0x5FE3DD, 5);
    
    const glow = this.add.circle(0, 0, 90, 0x5FE3DD, 0.15);
    glow.setDepth(-1);
    
    container.setDepth(50);
  }
  
  private createProjectsZone(x: number, y: number): void {
    const container = this.add.container(x, y);
    
    // Greenhouse base
    this.add.rectangle(0, 35, 90, 55, 0x6E4A2E);
    
    // Glass panels
    const glass = this.add.rectangle(0, -5, 80, 65, 0x5FE3DD);
    glass.setAlpha(0.25);
    
    // Frame
    this.add.rectangle(0, -5, 3, 65, 0x8B5A2B);
    this.add.rectangle(0, -5, 80, 3, 0x8B5A2B);
    
    // Glowing interior
    const interior = this.add.circle(0, 15, 25, 0xFF6FB0, 0.35);
    interior.setAlpha(0.35);
    
    // Wildflowers
    this.createFlowerCluster(container, -50, 45, 0xFF6FB0, 4);
    this.createFlowerCluster(container, 50, 40, 0xA78BFA, 4);
    this.createFlowerCluster(container, 0, 55, 0x5FE3DD, 4);
    
    const glow = this.add.circle(0, 0, 100, 0xFF6FB0, 0.18);
    glow.setDepth(-1);
    
    container.setDepth(50);
  }
  
  private createBlogsZone(x: number, y: number): void {
    const container = this.add.container(x, y);
    
    // Letterbox post
    this.add.rectangle(-25, 25, 10, 70, 0x6E4A2E);
    
    // Letterbox
    this.add.rectangle(-25, -15, 45, 30, 0xC97B3D);
    this.add.rectangle(-25, -20, 25, 3, 0x241A38);
    
    // Noticeboard
    this.add.rectangle(45, 5, 70, 80, 0x8B5A2B);
    
    // Pinned notes
    const noteColors = [0xF3E9D6, 0xFF6FB0, 0x5FE3DD, 0xA78BFA];
    noteColors.forEach((color, i) => {
      const nx = 30 + (i % 2) * 28;
      const ny = -10 + Math.floor(i / 2) * 32;
      this.add.rectangle(nx, ny, 22, 26, color);
      this.add.circle(nx, ny - 16, 2, 0xFF6FB0);
    });
    
    // Violet daisies
    this.createFlowerCluster(container, -55, 35, 0xA78BFA, 5);
    this.createFlowerCluster(container, 70, 45, 0xA78BFA, 5);
    
    const glow = this.add.circle(15, 0, 90, 0xA78BFA, 0.14);
    glow.setDepth(-1);
    
    container.setDepth(50);
  }
  
  private createToolsZone(x: number, y: number): void {
    const container = this.add.container(x, y);
    
    // Market stall canopy (polygon)
    const canopyPoints = [
      { x: -70, y: -20 }, { x: 70, y: -20 },
      { x: 60, y: -70 }, { x: -60, y: -70 }
    ];
    this.add.polygon(0, -50, canopyPoints, 0xC97B3D);
    
    for (let i = -3; i <= 3; i++) {
      this.add.rectangle(i * 20, -50, 12, 65, 0x8B5A2B).setAlpha(0.5);
    }
    
    // Posts
    this.add.rectangle(-55, 15, 8, 80, 0x6E4A2E);
    this.add.rectangle(55, 15, 8, 80, 0x6E4A2E);
    
    // Counter
    this.add.rectangle(0, 45, 120, 45, 0x8B5A2B);
    
    // Signs
    this.add.rectangle(-28, -20, 35, 22, 0xF3E9D6);
    this.add.rectangle(28, -20, 35, 22, 0xF3E9D6);
    
    // Marigolds
    this.createFlowerCluster(container, -65, 55, 0xFF8C42, 5);
    this.createFlowerCluster(container, 65, 60, 0xFF8C42, 5);
    
    const glow = this.add.circle(0, 0, 95, 0xFF8C42, 0.15);
    glow.setDepth(-1);
    
    container.setDepth(50);
  }
  
  private createFlowerCluster(container: Phaser.GameObjects.Container, offsetX: number, offsetY: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const fx = offsetX + (Math.random() - 0.5) * 45;
      const fy = offsetY + (Math.random() - 0.5) * 35;
      
      const petals = this.add.circle(fx, fy, 5 + Math.random() * 3, color);
      const center = this.add.circle(fx, fy, 2, 0xF3E9D6);
      
      const stem = this.add.rectangle(fx, fy + 8, 2, 12, 0x6E4A2E);
      stem.setAlpha(0.7);
      
      container.add([stem, petals, center]);
    }
  }
  
  private createHive(): void {
    const hiveX = this.worldBounds.centerX;
    const hiveY = this.worldBounds.bottom - 150;
    
    const hive = this.add.container(hiveX, hiveY);
    
    // Skep body
    this.add.ellipse(0, 20, 65, 45, 0xC97B3D);
    
    // Woven lines
    for (let i = -2; i <= 2; i++) {
      this.add.arc(0, 20 + i * 10, 30 - Math.abs(i) * 4, 0, Math.PI, false, 0x8B5A2B)
        .setStrokeStyle(2, 0x8B5A2B);
    }
    
    // Entrance
    this.add.circle(0, 35, 7, 0x241A38);
    
    // Warm glow
    const glow = this.add.circle(0, 20, 35, 0xFF8C42, 0.28);
    glow.setAlpha(0.28);
    
    this.tweens.add({
      targets: glow,
      alpha: 0.22,
      duration: 2000,
      yoyo: true,
      repeat: -1,
    });
    
    // Contact signpost
    this.add.rectangle(45, 15, 7, 55, 0x6E4A2E);
    this.add.rectangle(45, -18, 50, 32, 0xF3E9D6);
    
    const signText = this.add.text(45, -18, 'Contact\nSign', {
      font: '9px system-ui',
      color: '#241A38',
      align: 'center',
    });
    signText.setOrigin(0.5);
    
    hive.setDepth(100);
  }

  update(_time: number, delta: number): void {
    this.inputHandler.update();

    if (this.inputHandler.getWalkFlyToggle()) {
      this.isFlying = !this.isFlying;
      this.bee.setFlying(this.isFlying);
      this.modeText.setText(this.isFlying ? 'FLY' : 'WALK');
      
      this.modeText.setVisible(true);
      this.time.delayedCall(1500, () => {
        this.tweens.add({
          targets: this.modeText,
          alpha: 0,
          duration: 500,
          onComplete: () => this.modeText.setVisible(false),
        });
      });
    }

    const moveVector = this.inputHandler.getMoveVector();
    const isMoving = this.inputHandler.isMoving();
    const speed = this.isFlying ? this.flySpeed : this.moveSpeed;

    if (isMoving) {
      this.bee.x += moveVector.x * speed * (delta / 1000);
      this.bee.y += moveVector.y * speed * (delta / 1000);

      if (moveVector.x < -0.1) {
        this.bee.setScale(-1, 1);
      } else if (moveVector.x > 0.1) {
        this.bee.setScale(1, 1);
      }
    }

    this.bee.x = Phaser.Math.Clamp(this.bee.x, this.worldBounds.left + 20, this.worldBounds.right - 20);
    this.bee.y = Phaser.Math.Clamp(this.bee.y, this.worldBounds.top + 20, this.worldBounds.bottom - 20);

    this.bee.update(delta, isMoving, moveVector);
    
    // Update zone manager with bee position
    this.zoneManager.update(this.bee.x, this.bee.y);
    
    // Handle interact input
    if (this.inputHandler.getInteract()) {
      this.zoneManager.triggerInteract();
    }
  }
}
