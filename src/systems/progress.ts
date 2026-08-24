import Phaser from 'phaser';

export interface ProgressData {
  visitedZones: string[];
  bloomFlowers: Array<{ x: number; y: number; color: number }>;
  isComplete: boolean;
}

const STORAGE_KEY = 'davidhynes_garden_progress';

export class ProgressManager {
  private scene: Phaser.Scene;
  private data: ProgressData;
  private bloomGraphics: Phaser.GameObjects.Graphics;
  private completionCard: Phaser.GameObjects.Container | null = null;
  private onCompletionCallback: (() => void) | null = null;
  private worldBounds: Phaser.Geom.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.worldBounds = new Phaser.Geom.Rectangle(0, 0, 2000, 1400);
    this.bloomGraphics = scene.add.graphics();
    this.bloomGraphics.setDepth(999);
    
    // Load from localStorage or initialize
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.data = JSON.parse(saved);
        console.log('📦 Loaded progress:', this.data.visitedZones.length, 'zones visited,', this.data.bloomFlowers.length, 'blooms');
      } catch {
        this.data = this.createDefaultData();
      }
    } else {
      this.data = this.createDefaultData();
    }
  }

  private createDefaultData(): ProgressData {
    return {
      visitedZones: [],
      bloomFlowers: [],
      isComplete: false,
    };
  }

  save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  markZoneVisited(zoneId: string): boolean {
    if (!this.data.visitedZones.includes(zoneId)) {
      this.data.visitedZones.push(zoneId);
      
      // Trigger bloom burst for this visit
      this.triggerBloomBurst();
      
      // Check completion
      if (this.data.visitedZones.length >= 5 && !this.data.isComplete) {
        this.data.isComplete = true;
        this.triggerCompletion();
      }
      
      this.save();
      return true;
    }
    return false;
  }

  isZoneVisited(zoneId: string): boolean {
    return this.data.visitedZones.includes(zoneId);
  }

  getVisitedZones(): string[] {
    return [...this.data.visitedZones];
  }

  triggerBloomBurst(): void {
    const count = 15 + Math.floor(Math.random() * 16); // 15-30 flowers
    
    console.log(`🌸 Bloom burst: ${count} new flowers`);
    
    for (let i = 0; i < count; i++) {
      // Find random position not too close to existing blooms
      let attempts = 0;
      let x: number, y: number;
      let tooClose: boolean;
      
      do {
        const worldWidth = this.worldBounds.width;
        const worldHeight = this.worldBounds.height;
        
        x = 50 + Math.random() * (worldWidth - 100);
        y = 50 + Math.random() * (worldHeight - 100);
        
        tooClose = this.data.bloomFlowers.some(flower => {
          const dist = Phaser.Math.Distance.Between(x, y, flower.x, flower.y);
          return dist < 40;
        });
        
        attempts++;
      } while (tooClose && attempts < 20);
      
      if (!tooClose) {
        // Pick a glowwave color
        const colors = [0xFF6FB0, 0x5FE3DD, 0xA78BFA, 0xFF8C42];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        this.data.bloomFlowers.push({ x, y, color });
        
        // Animate the bloom with stagger
        this.scene.time.delayedCall(i * 50, () => {
          this.createBloomFlower(x, y, color);
        });
      }
    }
  }

  private createBloomFlower(x: number, y: number, color: number): void {
    const container = this.scene.add.container(x, y);
    
    // Flower petals
    const petals = this.scene.add.circle(0, 0, 4 + Math.random() * 3, color);
    const center = this.scene.add.circle(0, 0, 2, 0xF3E9D6);
    
    // Stem
    const stemHeight = 8 + Math.random() * 8;
    const stem = this.scene.add.rectangle(0, 6, 2, stemHeight, 0x6E4A2E);
    stem.setAlpha(0.8);
    
    container.add([stem, petals, center]);
    container.setDepth(10);
    
    // Pop animation
    container.setScale(0);
    this.scene.tweens.add({
      targets: container,
      scale: 1,
      duration: 300,
      ease: 'Back.out',
    });
    
    // Play bloom sound (placeholder - actual audio in GATE 6)
    console.log('🔊 Bloom pop');
  }

  renderExistingBlooms(): void {
    // Clear existing
    this.bloomGraphics.clear();
    
    // Render all saved blooms
    this.data.bloomFlowers.forEach(flower => {
      this.createBloomFlower(flower.x, flower.y, flower.color);
    });
    
    console.log(`🌼 Rendered ${this.data.bloomFlowers.length} existing blooms`);
  }

  private triggerCompletion(): void {
    console.log('🎉 COMPLETION! All 5 zones visited!');
    
    // Field-wide glow swell
    const glowOverlay = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0xFF6FB0,
      0
    );
    glowOverlay.setDepth(998);
    
    this.scene.tweens.add({
      targets: glowOverlay,
      alpha: 0.15,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.scene.tweens.add({
          targets: glowOverlay,
          alpha: 0,
          duration: 1500,
        });
      },
    });
    
    // Show completion card
    this.showCompletionCard();
    
    // Callback
    if (this.onCompletionCallback) {
      this.onCompletionCallback();
    }
  }

  private showCompletionCard(): void {
    if (this.completionCard) return; // Already shown
    
    const card = this.scene.add.container(
      this.scene.cameras.main.scrollX + this.scene.cameras.main.width / 2,
      this.scene.cameras.main.scrollY + this.scene.cameras.main.height / 2
    );
    card.setDepth(10000);
    
    // Card background with torn edge effect
    const cardBg = this.scene.add.rectangle(0, 0, 420, 280, 0xF3E9D6);
    cardBg.setStrokeStyle(3, 0xA78BFA);
    
    // Hand-lettered style text
    const titleText = this.scene.add.text(0, -60, "You've seen the whole garden.", {
      font: 'bold 22px "Comic Sans MS", "Chalkboard SE", cursive',
      color: '#241A38',
      align: 'center',
      wordWrap: { width: 380 },
    });
    titleText.setOrigin(0.5);
    
    const subtitleText = this.scene.add.text(0, -20, "If you want something like it growing in your organisation — say hello.", {
      font: '16px "Comic Sans MS", "Chalkboard SE", cursive',
      color: '#6E4A2E',
      align: 'center',
      wordWrap: { width: 360 },
    });
    subtitleText.setOrigin(0.5);
    
    // Contact block
    const contactText = this.scene.add.text(0, 50, 
      "David Hynes\nMelbourne, VIC\n0411 039 718\nd.hynes.mnk@gmail.com\n@dave.likeswine",
      {
        font: '14px system-ui',
        color: '#241A38',
        align: 'center',
        lineSpacing: 22,
      }
    );
    contactText.setOrigin(0.5);
    
    // Close button
    const closeBtn = this.scene.add.text(0, 110, "✕ Close", {
      font: 'bold 14px system-ui',
      color: '#A78BFA',
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerover', () => {
      closeBtn.setStyle({ color: '#FF6FB0' });
    });
    
    closeBtn.on('pointerout', () => {
      closeBtn.setStyle({ color: '#A78BFA' });
    });
    
    closeBtn.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: card,
        alpha: 0,
        scale: 0.9,
        duration: 300,
        onComplete: () => card.destroy(),
      });
    });
    
    card.add([cardBg, titleText, subtitleText, contactText, closeBtn]);
    
    // Entrance animation
    card.setScale(0.8);
    card.setAlpha(0);
    this.scene.tweens.add({
      targets: card,
      scale: 1,
      alpha: 1,
      duration: 600,
      ease: 'Back.out',
    });
    
    this.completionCard = card;
  }

  setOnCompletion(callback: () => void): void {
    this.onCompletionCallback = callback;
  }

  resetProgress(): void {
    this.data = this.createDefaultData();
    this.save();
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Progress reset');
  }
}
