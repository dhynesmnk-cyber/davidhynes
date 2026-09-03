import Phaser from 'phaser';
import { Bee } from '../entities/bee';
import { InputHandler } from '../systems/input';
import { ZoneManager, ZonePlacement } from '../systems/zones';
import { ModalManager } from '../ui/modal';
import { ProgressManager } from '../systems/progress';
import { MobileInput } from '../systems/mobile-input';
import { audio } from '../systems/audio';
import { settings } from '../systems/settings';
import { Hint } from '../ui/hint';
import { mountControls } from '../ui/controls';

const WORLD_W = 2000;
const WORLD_H = 1400;

/** Palette (docs/design.md) */
const C = {
  duskBase: 0x241A38,
  duskMid: 0x3A2B55,
  hill: 0x2D1B47,
  feltWarm: 0xC97B3D,
  feltDark: 0x6E4A2E,
  wood: 0x8B5A2B,
  pink: 0xFF6FB0,
  cyan: 0x5FE3DD,
  violet: 0xA78BFA,
  orange: 0xFF8C42,
  paper: 0xF3E9D6,
};

interface SetPiece {
  container: Phaser.GameObjects.Container;
  flowers: Phaser.GameObjects.Container[];
  litDetail: Phaser.GameObjects.Shape[];
}

export class WorldScene extends Phaser.Scene {
  private bee!: Bee;
  private inputHandler!: InputHandler;
  private mobileInput!: MobileInput;
  private zoneManager!: ZoneManager;
  private modalManager!: ModalManager;
  private progressManager!: ProgressManager;
  private hint: Hint | null = null;
  private worldBounds = new Phaser.Geom.Rectangle(0, 0, WORLD_W, WORLD_H);
  private isFlying = false;
  private readonly walkSpeed = 200;
  private readonly flySpeed = 300;
  private modeText!: Phaser.GameObjects.Text;
  private interactHint!: Phaser.GameObjects.Text;
  private setPieces = new Map<string, SetPiece>();
  private glowTweens: Phaser.Tweens.Tween[] = [];
  private isTouch = false;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    this.isTouch = this.sys.game.device.input.touch;
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setRoundPixels(true);

    this.createDioramaWorld();

    // --- Systems -------------------------------------------------------
    this.inputHandler = new InputHandler(this);
    this.inputHandler.create();

    this.mobileInput = new MobileInput(this);
    this.mobileInput.setOnInteractPress(() => this.zoneManager.triggerInteract());
    this.mobileInput.setOnTogglePress(() => this.toggleFlightMode());

    const spawnX = WORLD_W / 2;
    const spawnY = WORLD_H - 250;
    this.bee = new Bee(this, spawnX, spawnY);
    this.bee.setDepth(1000);

    this.cameras.main.startFollow(this.bee, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);

    // --- HUD (canvas text, non-essential) -------------------------------
    this.modeText = this.add.text(16, 16, 'WALK', {
      font: 'bold 14px Nunito, system-ui',
      color: '#FF6FB0',
      backgroundColor: '#241A38CC',
      padding: { x: 12, y: 6 },
    }).setScrollFactor(0).setDepth(10000).setVisible(false);

    this.interactHint = this.add.text(16, 16, 'E to look closer', {
      font: 'bold 14px Nunito, system-ui',
      color: '#5FE3DD',
      backgroundColor: '#241A38EE',
      padding: { x: 10, y: 5 },
    }).setScrollFactor(0).setDepth(10000).setVisible(false);

    // --- Zones ---------------------------------------------------------
    const placements: ZonePlacement[] = [
      { id: 'experience', x: 300, y: 900, markerX: 25, markerY: 20 },
      { id: 'skills', x: 1700, y: 800, markerX: 0, markerY: 0 },
      { id: 'projects', x: 1000, y: 300, markerX: 0, markerY: 20 },
      { id: 'blogs', x: 1700, y: 1150, markerX: -25, markerY: -15 },
      { id: 'tools', x: 300, y: 1150, markerX: 0, markerY: 20 },
      { id: 'contact', x: WORLD_W / 2, y: WORLD_H - 150, markerX: 82, markerY: 22, radius: 85 },
    ];
    this.zoneManager = new ZoneManager(this);
    this.zoneManager.create(placements);

    // --- Progress ------------------------------------------------------
    this.progressManager = new ProgressManager(this, this.worldBounds);
    this.progressManager.setKeepClear([
      ...placements.map((p) => new Phaser.Geom.Circle(p.x, p.y, 120)),
    ]);
    this.progressManager.renderExistingBlooms();
    this.progressManager.getVisitedZones().forEach((id) => {
      this.zoneManager.markZoneAsVisited(id);
      this.setVisitedVisuals(id, false);
    });

    // --- Modals --------------------------------------------------------
    this.modalManager = new ModalManager();
    mountControls();

    this.zoneManager.setProximityCallback((zoneId) => {
      audio.play('zone_tick');
      if (!this.isTouch) {
        this.interactHint.setText(zoneId === 'contact' ? 'E to say hello' : 'E to look closer');
        this.interactHint.setPosition(16, this.modeText.visible ? 52 : 16);
        this.interactHint.setVisible(true);
      }
      this.mobileInput.showInteractButton(true);
    });
    this.zoneManager.setProximityExitCallback(() => {
      this.interactHint.setVisible(false);
      this.mobileInput.showInteractButton(false);
    });
    this.zoneManager.setInteractCallback((zoneId) => {
      if (this.modalManager.isOpen()) return;
      audio.play('interact');
      this.bee.lean();
      if (zoneId === 'contact') this.modalManager.openContact();
      else this.modalManager.open(zoneId);
    });

    this.modalManager.setOnOpen((zoneId) => {
      const first = this.progressManager.markZoneVisited(zoneId);
      if (first) {
        this.zoneManager.markZoneAsVisited(zoneId);
        this.setVisitedVisuals(zoneId, true);
      }
    });
    this.modalManager.setOnStateChange((open) => this.onModalState(open));
    this.progressManager.setOnCompletion(() => this.modalManager.openCompletion());

    // --- Onboarding hint (FR-5) ---------------------------------------
    this.hint = new Hint(this.isTouch);

    // --- Quality degrade hook (FR-8) ----------------------------------
    settings.onQualityChange((q) => {
      if (q === 'low') this.glowTweens.forEach((t) => t.pause());
    });

    console.log('🌷 World ready —', settings.qualityTier, 'quality', settings.prefersReducedMotion ? '(reduced motion)' : '');
  }

  // ======================================================================
  // Modes
  // ======================================================================

  private toggleFlightMode(): void {
    if (this.modalManager.isOpen()) return;
    this.isFlying = !this.isFlying;
    this.bee.setFlying(this.isFlying);
    this.mobileInput.setFlying(this.isFlying);
    audio.play(this.isFlying ? 'takeoff' : 'land');
    if (!this.isFlying) audio.stopWingLoop();

    this.modeText.setText(this.isFlying ? 'FLY' : 'WALK');
    this.modeText.setColor(this.isFlying ? '#5FE3DD' : '#FF6FB0');
    this.tweens.killTweensOf(this.modeText);
    this.modeText.setAlpha(1).setVisible(true);
    this.interactHint.setPosition(16, 52);
    this.tweens.add({
      targets: this.modeText,
      alpha: 0,
      delay: 1200,
      duration: 400,
      onComplete: () => {
        this.modeText.setVisible(false);
        this.interactHint.setPosition(16, 16);
      },
    });
  }

  private onModalState(open: boolean): void {
    this.inputHandler.setEnabled(!open);
    this.mobileInput.setUiVisible(!open);
    if (open) {
      audio.stopWingLoop();
      this.interactHint.setVisible(false);
    }
  }

  // ======================================================================
  // World construction
  // ======================================================================

  private createDioramaWorld(): void {
    const scale = settings.particleScale;

    // Dusk gradient: deep plum, lighter toward the horizon (top)
    const rows = 28;
    const rowH = Math.ceil(WORLD_H / rows);
    for (let i = 0; i < rows; i++) {
      const t = i / rows;
      const r = Math.round(58 + (36 - 58) * t);
      const g = Math.round(43 + (26 - 43) * t);
      const b = Math.round(85 + (56 - 85) * t);
      this.add.rectangle(WORLD_W / 2, i * rowH, WORLD_W, rowH + 1, Phaser.Display.Color.GetColor(r, g, b))
        .setOrigin(0.5, 0)
        .setDepth(0);
    }

    // Raised felt hills
    const hills = [
      { x: 420, y: 420, w: 380, h: 210 },
      { x: 1580, y: 480, w: 320, h: 190 },
      { x: 780, y: 880, w: 360, h: 200 },
      { x: 1380, y: 1000, w: 300, h: 180 },
      { x: 1000, y: 120, w: 700, h: 220 },
    ];
    hills.forEach((h) => {
      this.add.ellipse(h.x, h.y + 6, h.w, h.h, 0x1C1230, 0.5).setDepth(1); // long soft shadow
      this.add.ellipse(h.x, h.y, h.w, h.h, C.hill).setStrokeStyle(2, C.feltWarm, 0.22).setDepth(2);
    });

    // Worn felt paths from the hive to each zone — stroked once so the
    // alpha doesn't stack per segment.
    const hive = { x: WORLD_W / 2, y: WORLD_H - 150 };
    const paths = [
      [hive, { x: 760, y: 1180 }, { x: 460, y: 1060 }, { x: 330, y: 930 }],
      [hive, { x: 1300, y: 1120 }, { x: 1560, y: 960 }, { x: 1690, y: 840 }],
      [hive, { x: 1010, y: 900 }, { x: 990, y: 600 }, { x: 1000, y: 360 }],
      [hive, { x: 1220, y: 1290 }, { x: 1480, y: 1230 }, { x: 1660, y: 1160 }],
      [hive, { x: 780, y: 1300 }, { x: 520, y: 1240 }, { x: 340, y: 1170 }],
    ];
    const pathGfx = this.add.graphics().setDepth(3);
    paths.forEach((pts) => {
      const curve = new Phaser.Curves.Spline(pts.map((p) => new Phaser.Math.Vector2(p.x, p.y)));
      const points = curve.getPoints(48);
      pathGfx.lineStyle(54, C.feltWarm, 0.28);
      pathGfx.strokePoints(points);
      pathGfx.lineStyle(38, C.feltWarm, 0.22);
      pathGfx.strokePoints(points);
    });

    // Felt / paper grain over everything on the ground
    this.add.tileSprite(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 'grain')
      .setAlpha(0.09)
      .setDepth(4);

    // Felt rocks
    for (let i = 0; i < Math.round(26 * scale); i++) {
      const rx = 40 + Math.random() * (WORLD_W - 80);
      const ry = 40 + Math.random() * (WORLD_H - 80);
      const rw = 10 + Math.random() * 16;
      this.add.ellipse(rx + 3, ry + 3, rw, rw * 0.7, 0x1C1230, 0.5).setDepth(8);
      this.add.ellipse(rx, ry, rw, rw * 0.7, C.duskMid).setStrokeStyle(1, C.feltWarm, 0.25).setDepth(9);
    }

    // Paper grass tufts
    for (let i = 0; i < Math.round(140 * scale); i++) {
      const gx = Math.random() * WORLD_W;
      const gy = Math.random() * WORLD_H;
      const h = 8 + Math.random() * 8;
      this.add.triangle(gx, gy, 0, h, 3, 0, 6, h, 0x4A3A6A)
        .setOrigin(0.5, 1)
        .setRotation((Math.random() - 0.5) * 0.5)
        .setAlpha(0.7)
        .setDepth(10);
    }

    // Zone set pieces
    this.createExperienceZone(300, 900);
    this.createSkillsZone(1700, 800);
    this.createProjectsZone(1000, 300);
    this.createBlogsZone(1700, 1150);
    this.createToolsZone(300, 1150);

    // Mushroom lamps (glow cyan)
    const mushrooms = [
      { x: 520, y: 640 }, { x: 1480, y: 700 }, { x: 700, y: 1040 },
      { x: 1290, y: 1110 }, { x: 860, y: 480 }, { x: 1180, y: 520 },
    ];
    mushrooms.forEach((m) => {
      this.add.rectangle(m.x, m.y, 5, 16, C.paper).setDepth(20);
      this.add.ellipse(m.x, m.y - 10, 22, 12, C.cyan).setDepth(21);
      this.add.ellipse(m.x, m.y - 12, 10, 5, C.paper, 0.35).setDepth(22);
      const glow = this.add.circle(m.x, m.y - 10, 26, C.cyan, 0.16).setDepth(19);
      this.glowTweens.push(this.tweens.add({
        targets: glow,
        alpha: 0.28,
        scale: 1.15,
        duration: 1500 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));
    });

    // Fireflies (cyan) — a handful drifting slowly
    for (let i = 0; i < Math.round(10 * scale); i++) {
      const fx = Math.random() * WORLD_W;
      const fy = Math.random() * WORLD_H * 0.8;
      const fly = this.add.circle(fx, fy, 2, C.cyan, 0.9).setDepth(30);
      if (settings.prefersReducedMotion) continue;
      this.tweens.add({
        targets: fly,
        x: fx + (Math.random() - 0.5) * 120,
        y: fy + (Math.random() - 0.5) * 80,
        alpha: { from: 0.9, to: 0.2 },
        duration: 3000 + Math.random() * 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.createHive();
  }

  /** Register a set piece so visited-state visuals can be applied later. */
  private registerSetPiece(id: string, container: Phaser.GameObjects.Container, litDetail: Phaser.GameObjects.Shape[]): SetPiece {
    const sp: SetPiece = { container, flowers: [], litDetail };
    litDetail.forEach((d) => d.setVisible(false));
    this.setPieces.set(id, sp);
    return sp;
  }

  private setVisitedVisuals(id: string, animate: boolean): void {
    const sp = this.setPieces.get(id);
    if (!sp) return;
    sp.litDetail.forEach((d) => {
      d.setVisible(true);
      if (animate) {
        d.setAlpha(0);
        this.tweens.add({ targets: d, alpha: 1, duration: 700, ease: 'Cubic.easeOut' });
      }
    });
    sp.flowers.forEach((f, i) => {
      if (animate) {
        this.tweens.add({ targets: f, scale: 1.15, alpha: 1, duration: 500, delay: i * 40, ease: 'Back.easeOut' });
      } else {
        f.setScale(1.15).setAlpha(1);
      }
    });
  }

  /** Uses David's `set-<id>` texture if present; otherwise the drawn set. */
  private useCustom(id: string, container: Phaser.GameObjects.Container): boolean {
    const key = `set-${id}`;
    if (!this.textures.exists(key)) return false;
    container.add(this.add.image(0, 0, key).setOrigin(0.5, 0.75));
    return true;
  }

  private zoneGlow(x: number, y: number, color: number, alpha: number, radius = 95): void {
    const g = this.add.circle(x, y, radius, color, alpha).setDepth(40);
    this.glowTweens.push(this.tweens.add({
      targets: g, alpha: alpha * 0.6, scale: 1.06, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    }));
  }

  private createExperienceZone(x: number, y: number): void {
    this.zoneGlow(x, y, C.violet, 0.14);
    const c = this.add.container(x, y).setDepth(50);
    const lit: Phaser.GameObjects.Shape[] = [];
    if (!this.useCustom('experience', c)) {
      // Old vine trellis
      c.add(this.add.rectangle(-30, -20, 10, 130, C.feltDark));
      for (let i = -2; i <= 2; i++) c.add(this.add.rectangle(-30 + i * 20, -40, 5, 100, C.feltDark, 0.85));
      for (let i = 0; i < 3; i++) c.add(this.add.rectangle(-30, -75 + i * 30, 90, 4, C.wood));
      // vine
      const vine = this.add.graphics();
      vine.lineStyle(3, 0x3F6B4A, 1);
      vine.beginPath();
      vine.moveTo(-70, 40);
      vine.lineTo(-58, 0);
      vine.lineTo(-40, -30);
      vine.lineTo(-20, -60);
      vine.lineTo(0, -80);
      vine.strokePath();
      c.add(vine);
      // Tiny wine bar counter
      c.add(this.add.polygon(35, 40, [{ x: -40, y: -20 }, { x: 40, y: -20 }, { x: 34, y: 20 }, { x: -34, y: 20 }], C.feltWarm));
      c.add(this.add.rectangle(35, 20, 84, 6, C.wood));
      // bottles
      [-12, 0, 12].forEach((bx) => {
        c.add(this.add.rectangle(35 + bx, 8, 6, 16, 0x2E4A3F));
        c.add(this.add.rectangle(35 + bx, -2, 3, 6, 0x2E4A3F));
      });
      // Lit detail: a candle on the counter
      const candle = this.add.rectangle(58, 8, 4, 10, C.paper);
      const flame = this.add.circle(58, 0, 3, C.orange);
      const flameGlow = this.add.circle(58, 0, 12, C.orange, 0.3);
      c.add([flameGlow, candle, flame]);
      lit.push(flameGlow, candle, flame);
    }
    const sp = this.registerSetPiece('experience', c, lit);
    this.flowerCluster(sp, -60, 45, C.pink, 5);
    this.flowerCluster(sp, 60, 60, C.pink, 5);
  }

  private createSkillsZone(x: number, y: number): void {
    this.zoneGlow(x, y, C.cyan, 0.14);
    const c = this.add.container(x, y).setDepth(50);
    const lit: Phaser.GameObjects.Shape[] = [];
    if (!this.useCustom('skills', c)) {
      // Felt awning on two posts
      c.add(this.add.rectangle(-55, -15, 7, 90, C.feltDark));
      c.add(this.add.rectangle(55, -15, 7, 90, C.feltDark));
      c.add(this.add.polygon(0, -55, [{ x: -70, y: 12 }, { x: 70, y: 12 }, { x: 58, y: -22 }, { x: -58, y: -22 }], C.feltWarm));
      for (let i = -3; i <= 3; i++) c.add(this.add.rectangle(i * 18, -55, 8, 34, C.wood, 0.35));
      // scalloped edge
      for (let i = -3; i <= 3; i++) c.add(this.add.circle(i * 20, -43, 7, C.feltWarm));
      // Workbench
      c.add(this.add.rectangle(0, 22, 96, 10, C.wood));
      c.add(this.add.rectangle(-38, 40, 8, 30, C.feltDark));
      c.add(this.add.rectangle(38, 40, 8, 30, C.feltDark));
      // Tools on the bench
      c.add(this.add.circle(-24, 12, 6, C.cyan));
      c.add(this.add.rectangle(-24, 6, 3, 14, C.feltDark));
      c.add(this.add.rectangle(6, 14, 18, 4, C.violet));
      c.add(this.add.triangle(26, 10, 0, 12, 6, 0, 12, 12, C.pink));
      // Lit detail: a hanging work lamp switches on
      const cord = this.add.rectangle(0, -30, 2, 20, C.feltDark);
      const shade = this.add.triangle(0, -14, 0, 8, 8, 0, 16, 8, C.paper).setOrigin(0.5, 0.5);
      const lampGlow = this.add.circle(0, 0, 30, C.paper, 0.22);
      c.add([lampGlow, cord, shade]);
      lit.push(lampGlow, cord, shade);
    }
    const sp = this.registerSetPiece('skills', c, lit);
    this.flowerCluster(sp, -75, 55, C.cyan, 5);
    this.flowerCluster(sp, 75, 50, C.cyan, 5);
  }

  private createProjectsZone(x: number, y: number): void {
    this.zoneGlow(x, y, C.pink, 0.16, 105);
    const c = this.add.container(x, y).setDepth(50);
    const lit: Phaser.GameObjects.Shape[] = [];
    if (!this.useCustom('projects', c)) {
      // Greenhouse: base, glass, frame, roof
      c.add(this.add.rectangle(0, 40, 100, 24, C.feltDark));
      const glass = this.add.rectangle(0, -2, 90, 64, C.cyan, 0.22);
      c.add(glass);
      c.add(this.add.polygon(0, -46, [{ x: -50, y: 12 }, { x: 0, y: -22 }, { x: 50, y: 12 }], C.cyan, 0.28));
      c.add(this.add.rectangle(0, -2, 3, 64, C.wood));
      c.add(this.add.rectangle(0, -2, 90, 3, C.wood));
      c.add(this.add.rectangle(-45, -2, 3, 64, C.wood));
      c.add(this.add.rectangle(45, -2, 3, 64, C.wood));
      const roofL = this.add.rectangle(-25, -50, 60, 3, C.wood).setRotation(-0.6);
      const roofR = this.add.rectangle(25, -50, 60, 3, C.wood).setRotation(0.6);
      c.add([roofL, roofR]);
      // seedlings inside
      [-28, -10, 8, 26].forEach((sx, i) => {
        c.add(this.add.rectangle(sx, 18, 10, 8, C.feltWarm));
        c.add(this.add.circle(sx, 8, 5, [C.pink, C.violet, C.cyan, C.orange][i], 0.9));
      });
      // Lit detail: the greenhouse light turns on
      const interior = this.add.circle(0, 6, 36, C.orange, 0.32);
      const bulb = this.add.circle(0, -26, 4, C.paper);
      c.add([interior, bulb]);
      lit.push(interior, bulb);
    }
    const sp = this.registerSetPiece('projects', c, lit);
    this.flowerCluster(sp, -70, 50, C.pink, 4);
    this.flowerCluster(sp, 70, 45, C.violet, 4);
    this.flowerCluster(sp, 0, 70, C.cyan, 4);
  }

  private createBlogsZone(x: number, y: number): void {
    this.zoneGlow(x + 15, y, C.violet, 0.14);
    const c = this.add.container(x, y).setDepth(50);
    const lit: Phaser.GameObjects.Shape[] = [];
    if (!this.useCustom('blogs', c)) {
      // Letterbox on a post
      c.add(this.add.rectangle(-30, 25, 9, 70, C.feltDark));
      c.add(this.add.rectangle(-30, -15, 46, 30, C.feltWarm));
      c.add(this.add.ellipse(-30, -30, 46, 14, C.feltWarm));
      c.add(this.add.rectangle(-30, -18, 26, 3, C.duskBase));
      c.add(this.add.rectangle(-8, -14, 4, 18, C.pink)); // little flag
      // Noticeboard
      c.add(this.add.rectangle(45, 5, 76, 86, C.wood));
      c.add(this.add.rectangle(45, 5, 66, 76, 0x5C3A1E));
      c.add(this.add.rectangle(20, 40, 5, 40, C.feltDark));
      c.add(this.add.rectangle(70, 40, 5, 40, C.feltDark));
      // Lit detail: pinned notes appear
      const noteColors = [C.paper, C.pink, C.cyan, C.violet];
      noteColors.forEach((color, i) => {
        const nx = 30 + (i % 2) * 30;
        const ny = -14 + Math.floor(i / 2) * 34;
        const note = this.add.rectangle(nx, ny, 22, 26, color).setRotation((Math.random() - 0.5) * 0.25);
        const pin = this.add.circle(nx, ny - 12, 2.5, C.pink);
        c.add([note, pin]);
        lit.push(note, pin);
      });
    }
    const sp = this.registerSetPiece('blogs', c, lit);
    this.flowerCluster(sp, -70, 40, C.violet, 5);
    this.flowerCluster(sp, 95, 45, C.violet, 5);
  }

  private createToolsZone(x: number, y: number): void {
    this.zoneGlow(x, y, C.orange, 0.14, 100);
    const c = this.add.container(x, y).setDepth(50);
    const lit: Phaser.GameObjects.Shape[] = [];
    if (!this.useCustom('tools', c)) {
      // Market stall: posts, canopy, counter, two hanging boards
      c.add(this.add.rectangle(-58, 10, 8, 100, C.feltDark));
      c.add(this.add.rectangle(58, 10, 8, 100, C.feltDark));
      c.add(this.add.polygon(0, -55, [{ x: -76, y: 14 }, { x: 76, y: 14 }, { x: 64, y: -22 }, { x: -64, y: -22 }], C.feltWarm));
      for (let i = -3; i <= 3; i++) c.add(this.add.rectangle(i * 20, -55, 10, 36, C.pink, 0.35));
      c.add(this.add.rectangle(0, 44, 124, 40, C.wood));
      c.add(this.add.rectangle(0, 26, 130, 6, C.feltDark));
      // Two wooden boards hanging from the canopy
      [-30, 30].forEach((bx) => {
        c.add(this.add.rectangle(bx, -30, 2, 16, C.feltDark));
        c.add(this.add.rectangle(bx, -12, 40, 22, C.paper));
        c.add(this.add.rectangle(bx, -16, 28, 2, C.feltDark, 0.5));
        c.add(this.add.rectangle(bx, -10, 22, 2, C.feltDark, 0.5));
        c.add(this.add.rectangle(bx, -4, 26, 2, C.feltDark, 0.5));
      });
      // Wares
      [-40, -20, 0, 20, 40].forEach((wx, i) => {
        c.add(this.add.circle(wx, 20, 6, [C.orange, C.cyan, C.pink, C.violet, C.orange][i]));
      });
      // Lit detail: a paper lantern under the canopy
      const lanternGlow = this.add.circle(0, -40, 26, C.orange, 0.32);
      const lantern = this.add.ellipse(0, -40, 14, 18, C.orange);
      c.add([lanternGlow, lantern]);
      lit.push(lanternGlow, lantern);
    }
    const sp = this.registerSetPiece('tools', c, lit);
    this.flowerCluster(sp, -85, 60, C.orange, 5);
    this.flowerCluster(sp, 85, 65, C.orange, 5);
  }

  /** Flower cluster: closed & muted until the zone is visited. */
  private flowerCluster(sp: SetPiece, ox: number, oy: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const fx = ox + (Math.random() - 0.5) * 48;
      const fy = oy + (Math.random() - 0.5) * 34;
      const f = this.add.container(fx, fy);
      f.add(this.add.rectangle(0, 8, 2, 14, C.feltDark).setAlpha(0.8));
      f.add(this.add.image(0, 0, 'petals').setTint(color).setScale(0.6 + Math.random() * 0.25));
      f.add(this.add.circle(0, 0, 2, C.paper));
      f.setScale(0.85).setAlpha(0.55);
      sp.container.add(f);
      sp.flowers.push(f);
    }
  }

  private createHive(): void {
    const hx = WORLD_W / 2;
    const hy = WORLD_H - 150;
    const c = this.add.container(hx, hy).setDepth(100);

    const warm = this.add.circle(hx, hy + 16, 60, C.orange, 0.16).setDepth(40);
    this.glowTweens.push(this.tweens.add({ targets: warm, alpha: 0.24, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));

    if (this.textures.exists('hive')) {
      c.add(this.add.image(0, 0, 'hive').setOrigin(0.5, 0.7));
    } else {
      // Skep: stacked woven rings, dark entrance
      c.add(this.add.ellipse(0, 36, 70, 22, C.feltDark, 0.9));
      [26, 14, 2, -10].forEach((ry, i) => {
        c.add(this.add.ellipse(0, ry, 66 - i * 10, 26, C.feltWarm).setStrokeStyle(2, C.wood, 0.8));
      });
      c.add(this.add.ellipse(0, -22, 24, 14, C.feltWarm).setStrokeStyle(2, C.wood, 0.8));
      c.add(this.add.circle(0, 30, 7, C.duskBase));
      c.add(this.add.circle(0, 30, 4, C.orange, 0.6));

      // Contact signpost — a paper sign on a wooden post
      c.add(this.add.rectangle(50, 10, 7, 60, C.feltDark));
      const sign = this.add.rectangle(50, -22, 58, 30, C.paper).setRotation(-0.05);
      c.add(sign);
      const signText = this.add.text(50, -22, 'say hello', {
        font: '700 15px Caveat, "Comic Sans MS", cursive',
        color: '#241A38',
      }).setOrigin(0.5).setRotation(-0.05);
      c.add(signText);
    }
  }

  // ======================================================================
  // Update loop
  // ======================================================================

  update(time: number, delta: number): void {
    settings.sampleFrame(delta);
    this.inputHandler.update();
    const modalOpen = this.modalManager.isOpen();

    if (!modalOpen && this.inputHandler.getWalkFlyToggle()) this.toggleFlightMode();

    let moveVector = this.inputHandler.getMoveVector();
    let isMoving = this.inputHandler.isMoving();
    if (!modalOpen && this.mobileInput.isEnabled) {
      const jv = this.mobileInput.getMoveVector();
      if (jv.length() > 0) { moveVector = jv; isMoving = true; }
    }
    if (modalOpen) isMoving = false;

    if (isMoving) {
      const speed = this.isFlying ? this.flySpeed : this.walkSpeed;
      this.bee.x += moveVector.x * speed * (delta / 1000);
      this.bee.y += moveVector.y * speed * (delta / 1000);
      if (moveVector.x < -0.1) this.bee.setScale(-1, 1);
      else if (moveVector.x > 0.1) this.bee.setScale(1, 1);
      this.hint?.dismiss();
      if (!this.isFlying) audio.step(time);
    }
    if (this.isFlying && !modalOpen) audio.startWingLoop();

    this.bee.x = Phaser.Math.Clamp(this.bee.x, 20, WORLD_W - 20);
    this.bee.y = Phaser.Math.Clamp(this.bee.y, 20, WORLD_H - 20);
    this.bee.update(delta, isMoving, moveVector);

    // Handheld camera drift — tiny, smooth, off under reduced motion
    if (!settings.prefersReducedMotion) {
      const t = time * 0.001;
      const dx = Math.sin(t * 0.37) * 2.2 + Math.sin(t * 0.91 + 1.3) * 1.4;
      const dy = Math.cos(t * 0.29 + 0.7) * 1.8 + Math.sin(t * 0.83) * 1.1;
      this.cameras.main.setFollowOffset(dx, dy);
    }

    this.zoneManager.update(this.bee.x, this.bee.y);
    if (!modalOpen && this.inputHandler.getInteract()) this.zoneManager.triggerInteract();
  }
}
