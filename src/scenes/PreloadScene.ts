import Phaser from 'phaser';
import { optionalAssets, SPRITE_DIR, SPRITE_MANIFEST } from '../content/assets';

/**
 * PreloadScene
 *  1. Reads public/assets/sprites/manifest.json and loads whichever of
 *     David's custom sprites are listed there (see content/assets.ts).
 *  2. Generates procedural placeholder textures for everything else:
 *     multi-part bee, paper wing, petals, felt grain overlay.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.load.json('sprite-manifest', SPRITE_MANIFEST);
  }

  create(): void {
    const manifest = this.cache.json.get('sprite-manifest') as { files?: string[] } | undefined;
    const listed = new Set(manifest?.files ?? []);
    const toLoad = optionalAssets.filter((a) => listed.has(a.file));

    const finish = () => {
      this.makeBeeTextures();
      this.makeFlowerTexture();
      if (!this.textures.exists('grain')) this.makeGrainTexture();
      this.scene.start('WorldScene');
    };

    if (toLoad.length === 0) {
      finish();
      return;
    }

    // Second load pass for the custom art listed in the manifest.
    toLoad.forEach((a) => this.load.image(a.key, `${SPRITE_DIR}${a.file}`));
    this.load.once('complete', () => {
      const custom = toLoad.filter((a) => this.textures.exists(a.key)).map((a) => a.key);
      if (custom.length) console.log('🎨 Custom art loaded:', custom.join(', '));
      finish();
    });
    this.load.start();
  }

  private makeBeeTextures(): void {
    // Abdomen (the butt): plush ellipse with dark felt stripes. Origin is set
    // on the sprite at its FRONT (right) so it can swing from the waist.
    const ab = this.make.graphics({ x: 0, y: 0 });
    ab.fillStyle(0xC97B3D, 1);
    ab.fillEllipse(14, 10, 28, 20);
    ab.fillStyle(0x241A38, 1);
    ab.fillEllipse(9, 10, 5, 19);
    ab.fillEllipse(17, 10, 5, 20);
    // felt highlight
    ab.fillStyle(0xF3E9D6, 0.18);
    ab.fillEllipse(13, 6, 16, 5);
    ab.generateTexture('bee-abdomen', 28, 20);
    ab.destroy();

    // Thorax: fuzzy round body
    const th = this.make.graphics({ x: 0, y: 0 });
    th.fillStyle(0xC97B3D, 1);
    th.fillCircle(11, 11, 10);
    th.fillStyle(0xF3E9D6, 0.22);
    th.fillCircle(9, 8, 5);
    th.generateTexture('bee-thorax', 22, 22);
    th.destroy();

    // Head: dark plum with a paper eye
    const hd = this.make.graphics({ x: 0, y: 0 });
    hd.fillStyle(0x241A38, 1);
    hd.fillCircle(7, 7, 7);
    hd.fillStyle(0xF3E9D6, 1);
    hd.fillCircle(9, 6, 2.2);
    hd.fillStyle(0x241A38, 1);
    hd.fillCircle(9.6, 6, 1);
    hd.generateTexture('bee-head', 14, 14);
    hd.destroy();

    // Paper wing: root at the left edge, pointing right, with a vein.
    if (!this.textures.exists('bee-wing')) {
      const wg = this.make.graphics({ x: 0, y: 0 });
      wg.fillStyle(0xF3E9D6, 0.92);
      wg.fillEllipse(15, 8, 28, 14);
      wg.lineStyle(1, 0x6E4A2E, 0.45);
      wg.beginPath();
      wg.moveTo(2, 8);
      wg.lineTo(26, 6);
      wg.moveTo(2, 8);
      wg.lineTo(22, 11);
      wg.strokePath();
      wg.generateTexture('bee-wing', 30, 16);
      wg.destroy();
    }
  }

  private makeFlowerTexture(): void {
    // Soft five-petal head (tinted per flower colour at runtime)
    const f = this.make.graphics({ x: 0, y: 0 });
    f.fillStyle(0xFFFFFF, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      f.fillCircle(10 + Math.cos(a) * 5, 10 + Math.sin(a) * 5, 4.2);
    }
    f.generateTexture('petals', 20, 20);
    f.destroy();
  }

  private makeGrainTexture(): void {
    // Felt / paper grain: scattered specks, tiled across the world at low alpha.
    const g = this.make.graphics({ x: 0, y: 0 });
    const size = 256;
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const light = Math.random() > 0.5;
      g.fillStyle(light ? 0xF3E9D6 : 0x000000, light ? 0.5 : 0.35);
      g.fillRect(x, y, 1 + Math.random() * 1.5, 1);
    }
    g.generateTexture('grain', size, size);
    g.destroy();
  }
}
