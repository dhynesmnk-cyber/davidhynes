import { R, RIM } from './world.js';

/* A small top-down chart of the garden. Fixed orientation, so "the tall
   orange one is over on the right" stays true from one visit to the next.
   Drawn on a 2D canvas at a low frame rate: it costs nothing next to WebGL. */

const FPS = 12;

export class Minimap {
  constructor(canvas, flowers) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.flowers = flowers;
    this.acc = 0;
    this.dpr = 1;
    this.resize();
  }

  resize() {
    const cssW = this.canvas.clientWidth || 116;
    const cssH = this.canvas.clientHeight || 116;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.w = cssW; this.h = cssH;
  }

  update(dt, flight, bloomed) {
    this.acc += dt;
    if (this.acc < 1 / FPS) return;
    this.acc = 0;
    this.draw(flight, bloomed);
  }

  draw(flight, bloomed) {
    const ctx = this.ctx, w = this.w, h = this.h;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    const rad = Math.min(w, h) / 2 - 3;
    const scale = rad / R;
    const toX = wx => cx + wx * scale;
    const toY = wz => cy + wz * scale;

    /* the ground of the diorama */
    ctx.beginPath();
    ctx.arc(cx, cy, RIM * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8, 11, 28, 0.86)';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.stroke();

    /* flowers: hollow while sleeping, filled and lit once found */
    for (const f of this.flowers.values()) {
      const s = f.section;
      if (!s || !s.pos) continue;
      const x = toX(s.pos[0]), y = toY(s.pos[1]);
      const found = bloomed.has(f.id);
      const isHive = f.id === 'hive';
      const r = isHive ? 5.0 : 3.6;

      if (found) {
        ctx.beginPath();
        ctx.arc(x, y, r + 4.0, 0, Math.PI * 2);
        ctx.fillStyle = hexA(s.accent, 0.30);
        ctx.fill();
      }
      ctx.beginPath();
      if (isHive) {
        ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
        ctx.closePath();
      } else {
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      if (found) {
        ctx.fillStyle = s.accent;
        ctx.fill();
      } else {
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = hexA(s.accent, s.hidden ? 0.45 : 0.8);
        ctx.stroke();
      }
    }

    /* the bee, pointing where it is facing */
    const bx = toX(flight.pos.x), by = toY(flight.pos.z);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(Math.PI - flight.yaw);
    ctx.beginPath();
    ctx.moveTo(0, -6.2);
    ctx.lineTo(4.2, 3.9);
    ctx.lineTo(0, 1.9);
    ctx.lineTo(-4.2, 3.9);
    ctx.closePath();
    ctx.fillStyle = '#ffd98a';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(10, 12, 30, 0.85)';
    ctx.stroke();
    ctx.restore();
  }
}

/* #rrggbb -> rgba() at the given alpha */
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
