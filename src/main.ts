import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene } from './scenes/WorldScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#241A38',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, WorldScene],
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  // Keep the canvas alive for a11y tooling; the world itself is described
  // by the container's aria-label in index.html and by /static.html.
  autoFocus: true,
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

// Expose for debugging in the console (e.g. GAME.scene.keys.WorldScene)
(window as unknown as { GAME: Phaser.Game }).GAME = game;
