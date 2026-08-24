# Design Spec

## Art direction
Stop-motion diorama (Fantastic Mr. Fox) lit with glowwave.
Everything looks handmade — felt, wood, paper, wire armatures — but the light
is neon dusk. Think: a handcrafted stage set photographed at twilight with
pink and cyan practicals rigged behind it.

### Palette (starting points — tune in-engine)
| Role | Hex | Note |
|---|---|---|
| Dusk base | #241A38 | deep plum, world background/floor |
| Dusk mid | #3A2B55 | raised ground, hills |
| Felt warm | #C97B3D | Fox-mustard: set pieces, paths, bee accents |
| Felt dark | #6E4A2E | wood, stems, frames |
| Glow pink | #FF6FB0 | flowers, UI accents |
| Glow cyan | #5FE3DD | fireflies, interactive affordances |
| Glow violet | #A78BFA | zone glows, modal accents |
| Paper | #F3E9D6 | modal cards, hint text backgrounds |

### Texture rules
- Visible fabric grain / paper fibre on all fills. No clean vectors.
- Imperfect edges, slightly misaligned layers (handmade charm).
- Lighting: soft radial glows, long gentle shadows. No hard rim light.

## Motion rules (critical — read carefully)
- CHARACTER animation snaps: animate sprites at 8–12fps with 1–2° of random
  per-frame rotation jitter. It should feel like a puppet being repositioned
  by hand each frame. That IS the stop-motion illusion.
- CAMERA and UI stay smooth: camera follow, modal transitions, and flower
  blooms tween at full framerate with gentle easing (ease-out cubic).
- Contrast between snapped character and smooth world = the whole aesthetic.
- Add a barely-perceptible handheld camera drift (perlin noise, tiny amplitude).
  Disable under prefers-reduced-motion.

## The bee
- Round, plush body; oversized paper wings; visible little wire-leg charm.
- States: idle (slow bob, occasional antenna twitch), walk (butt wiggle —
  abdomen sways side to side on a 2-beat cycle, legs scuttle), fly (wings
  blur-flutter at snap rate, body tilts into movement), interact (leans in).
- The butt wiggle is non-negotiable. It is the soul of the site.
- Squash-and-stretch on takeoff/landing, snapped not tweened.

## World layout (~2000×1400, tune freely)
Bee spawns at THE HIVE (small glowing skep, centre-bottom; contact signpost here).

| Zone | Set piece | Position | Flower character |
|---|---|---|---|
| Experience | Old vine trellis + tiny wine bar counter | West | Deep pink roses |
| Skills | Workbench under a felt awning | East | Cyan bells |
| Projects | Mini greenhouse, glowing inside | North | Mixed wildflowers |
| Blogs | Letterbox + noticeboard | South-east | Violet daisies |
| Tools & Creators | Market stall with tiny signs | South-west | Warm marigolds |

Paths worn in the felt connect zones loosely, but free-roam is unrestricted.
Scatter felt rocks, mushroom lamps (glow cyan), and paper grass tufts.

## Progress visuals
- Unvisited zone: flowers closed, muted, dim glow.
- Visited: flowers open, saturated, glow up; set piece gains a small lit detail
  (e.g., the greenhouse light turns on, the noticeboard gets pinned notes).
- Bloom burst: on each visit, 15–30 flowers pop up across previously empty
  ground (staggered, soft pop sounds). By 5/5, the field is alive.
- Completion: gentle field-wide glow swell + a hand-lettered card appears:
  "You've seen the whole garden. — David" with the contact block.

## UI
- Hint: small paper scrap, hand-lettered text, fades after first move.
- Joystick (mobile): felt disc + wooden knob, bottom-left; walk/fly toggle
  as a small wing/foot switch attached to the joystick base. Bottom-right:
  context interact button that appears near zones.
- Modals: paper card with torn edges, drop shadow onto the dimmed world,
  glow-violet header accent. Layered structure: intro line in a handwritten
  face; professional content in a clean, highly readable face.
- Fonts: one handwritten display face for world/headers; one clean readable
  face (e.g., a warm grotesque) for body. Self-hosted.

## Meta & Sharing Assets

### Favicon
- Concept: A single, top-down view of the bee's face, or a tiny glowing glowwave-pink flower. 
- Execution: Must be legible at 16x16px. High contrast. No text. 
- Vibe: Looks like a tiny felt stamp or a neon pin.

### OG Image (Social Share Card - 1200x630)
- Visual: A wide, beautifully lit shot of the diorama world at "dusk". The bee is mid-flight near the center. The world is fully bloomed (5/5 progress state) with all the glowwave neon pinks and cyans glowing warmly against the deep plum dusk base.
- Overlay Text (Hand-lettered style, Paper #F3E9D6 color): 
  "David Hynes" (large)
  "AI Enablement & Responsible AI" (smaller, underneath)
- Border: A subtle torn-paper or felt edge around the 1200x630 canvas so it doesn't look like a sterile digital graphic when dropped into LinkedIn or X.
