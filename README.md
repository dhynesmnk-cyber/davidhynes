# the garden

An interactive resume for David Hynes. You are a bee. Each flower and the hive
is a section. The garden starts dormant and colourless; visiting a section
blooms it, and colour bleeds outward from what you have found.

A full text version of the same content lives in the page from the first byte,
behind a **Read as text** toggle that is visible on every frame.

## Running it

There is no build step. Serve the directory over HTTP:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

It must be served over HTTP, not opened as a `file://` URL, because the code is
ES modules.

## Hosting

Upload the whole directory to any static host — Netlify, Cloudflare Pages,
GitHub Pages, S3, nginx. Nothing needs a server, a database, or a build.
`_headers` sets long cache lifetimes for the vendored library and fonts and
short ones for the rest; Netlify and Cloudflare Pages both read it, other hosts
ignore it harmlessly.

Drop the real CV at `/cv.pdf` in the site root. Every download button already
points there.

## What is where

```
index.html      shell, chrome, and the full semantic text resume
styles.css      all UI and text-resume styling
js/content.js   every word of copy, one entry per section
js/felt.js      the felt shader and the shared bloom-source uniforms
js/world.js     terrain, grass, rocks, sky, light shafts
js/flowers.js   six flower species, the hive, the hire-me flower
js/bee.js       the bee rig and its idle life
js/controls.js  desktop and touch input, and the flight model
js/tour.js      the guided tour
js/particles.js pollen, fireflies, butterflies, the bloom wave
js/glow.js      selective bloom: only emissive elements go through it
js/audio.js     procedural ambience, chimes and wing hum. No audio files
js/ui.js        panel rendering and the HUD
js/main.js      wiring, quality budget, the render loop
vendor/         three.js r169, vendored so nothing is fetched from a CDN
```

## Editing the copy

`js/content.js` is the only file with words in it for the 3D side. Each section
has `lead`, `body`, and an optional `list` in one of five shapes: `bullets`,
`facts`, `groups`, `timeline`, `links`. Changing a section's `accent` changes
its flower colour, its panel, its light pool and the colour it bleeds into the
ground.

The text resume in `index.html` is deliberately hand-written rather than
generated, so it stays fast and correct with JavaScript disabled. If you change
`content.js`, change the matching `<section>` too.

## Controls

- **Desktop** — `W A S D` or `↑ ↓` to move, `← →` or `Q E` to turn, drag the
  mouse to steer, double-click to lock the pointer, `Space` / `Shift` for
  height, `T` for the tour, `Esc` to close things.
- **Touch** — stick bottom left, drag the right side to look, `▲ ▼` for height.
- Fly close to a flower and it opens. Get closer still and you land on it and
  the panel appears. Move again and you take off.

## Accessibility and performance

- `prefers-reduced-motion` cuts the camera swing and the drifting particles,
  and turns blooms into fades.
- Rendering pauses when the tab is hidden.
- Device class is detected at boot and again from the running frame time: the
  glow pass, particle counts, grass density, terrain resolution and pixel ratio
  all step down on weaker hardware, and the glow pass switches off entirely if
  frames stay slow.
- No trackers, no analytics, no third-party requests at all.
