# Handover

State as of commit `0f7fbbd`, branch `claude/3d-resume-garden-7hizyy`,
PR [#2](https://github.com/dhynesmnk-cyber/davidhynes/pull/2) — open, green, mergeable.

## Where things stand

The old Phaser/Vite project was deleted and replaced with a 3D interactive
resume: you fly a bee around a felt garden at night, and the hive plus six
flowers are the resume sections. The garden starts dormant and blooms outward
from whatever you visit. There is a full text version behind a "Read as text"
toggle for anyone who does not want a game.

Everything asked for is built and working. The deploy preview is confirmed
serving the current build.

**Verified:** all thirty checks in `tests/suite.js` pass — flight, the guided
tour reaching all seven sections in order, the text escape hatch, audio being
opt-in, the completion sequence and reward flower, resize survival, phone
control layout, and tab-visibility pausing. No console errors in any scenario.

**Not verified:** how it looks and feels on real GPU hardware. Every
screenshot in this project came from a software rasteriser at roughly two
frames a second, so colour, bloom intensity and motion feel are all reasoned
rather than seen. Frame-rate targets are budgeted, never measured on a device.

## Architecture

No build step. Vanilla ES modules, Three.js vendored into `vendor/`. Serve the
repo root over HTTP and it runs; `file://` will not work.

```
index.html      shell, chrome, and the whole text resume as real markup
styles.css      all UI and text-resume styling
build.sh        stages the site into dist/ and stamps the commit (see Netlify)
js/content.js   every word of copy for the 3D side, one entry per section
js/felt.js      the felt shader + the shared bloom-source uniform block
js/world.js     terrain, grass, rocks, sky, light shafts
js/flowers.js   six species, the hive, the hire-me flower
js/bee.js       the bee rig and its idle life
js/controls.js  input (desktop + touch) and the flight model
js/tour.js      the guided tour
js/particles.js pollen, fireflies, butterflies, the bloom wave
js/glow.js      selective bloom
js/minimap.js   the corner chart
js/audio.js     procedural audio, no files
js/ui.js        panel rendering and the HUD
js/main.js      wiring, quality budget, render loop
tests/          Playwright checks (dev only, never shipped)
```

### Three ideas that are easy to break

**Felt never glows.** This is the entire art direction. Light lands on felt
and is absorbed; the glow comes from separate emissive elements. It is
enforced structurally: emissive objects sit on render layer 1, `js/glow.js`
renders *only* layer 1 into a quarter-resolution buffer, blurs it and adds it
over the finished frame. If you put a felt material on layer 1, or add an
emissive term to the felt shader, the whole look collapses into generic
neon. Don't.

**One shared bloom-source uniform block.** `shared` in `js/felt.js` holds up
to ten sources (position, radius, strength, colour). Terrain, grass, stems,
rocks and petals all read the same block, which is why colour bleeds across
surfaces from a single place rather than being painted per object. The
nearest source dominates by a fourth-power weight — averaging them turns the
whole garden brown, which it did at one point.

**Cruise height, not gravity.** There is no gravity. Release the altitude
keys and the bee eases toward a cruise height, and that height bends toward
whichever flower is within 20 units so tall ones come to meet you. See
`CRUISE_H` and `cruiseY` in `js/controls.js`. Reintroducing gravity or
removing the settle will bring back the vertical jank the owner reported.

## Decisions worth keeping

- **No build step, Three.js vendored.** Deliberate: static hosting, nothing
  from a CDN, no dependency that can rot. 255 KB gzipped for the first load.
  `build.sh` is a `cp`, not a bundler.
- **System fonts for content.** Panels and the text resume use
  `ui-serif, Georgia` for headings and the system sans stack for body. Zero
  bytes, and it reads as a document. Nunito and the handwritten Caveat
  wordmark are kept for *game* chrome only — that contrast is intentional.
- **Bloom progress is not persisted.** A returning visitor gets the dormant
  garden again, because watching it wake up is the point.
- **`/cv.pdf` is a placeholder.** The owner supplies the real file; every
  download button already points there. Until then those buttons 404.

## Netlify — read this before touching deploy config

This cost most of a session. The site publishes from **`dist/`**, staged by
`build.sh`. It is not published from the repo root, and that is not an
accident.

The Netlify project carries build settings entered in its UI by the old
project (`npm run build`, publish `dist`). `netlify.toml` overrides the
command, but publishing from the repo root (`publish = "."`) resulted in
Netlify reporting a *successful* deploy of the right commit while serving the
**old tree**. Publishing to a real `dist/` folder — which also happens to
match the stale UI setting — fixed it immediately.

`build.sh` writes `dist/build-info.txt` containing the commit SHA, served
`no-store`. **`/build-info.txt` is the only reliable way to ask a deploy which
commit it actually is.** It exists because "the deploy is green" turned out
not to mean "the deploy is correct".

Diagnostic that settled it: request a path that only exists in one version.
The old build answers every unknown path with its own `index.html` (it had a
catch-all `/* → /index.html 200`), so a fresh request for `/js/main.js`
rendering the old site proved the server, not the browser cache, was at fault.

## Environment gotchas

- **`netlify.app` and `app.netlify.com` are blocked by the egress proxy** in
  this remote environment. Neither `curl` nor `WebFetch` can reach the deploy
  preview, so the live page cannot be inspected from a session. The owner was
  asked to unblock them and had not confirmed doing so. If they are reachable
  now, point the tests at one: `BASE_URL=https://… node tests/suite.js`.
- **Software rasteriser only**, around two frames a second. Real time and
  simulated time diverge badly, which will make naive waits look like bugs.
  Use the clock hook instead of sleeping.
- **Debug hooks.** `main.js` exposes `window.__gardenDebug`:
  `bloomAll()`, `goto(id)`, `flight()`, `tour()`, `ui()`, `groundY`,
  `flowers` (id → flower), and `state` — whose `timeScale` multiplies the
  simulation clock. The tests lean on all of it.

## Open items

1. **Merge PR #2.** Production builds from `main`, which is still the old
   site. Nothing reaches the live domain until this merges. Deliberately left
   for the owner — it publishes to their personal site.
2. **Unblock the two Netlify hostnames** so a session can verify the live
   page rather than a local server.
3. **Supply `/cv.pdf`.**
4. The PR description still says it removed `netlify.toml`, which was true
   when the PR opened and is no longer. Left alone rather than editing the
   owner's text.

## Known weaknesses, in the order worth fixing

- **Draw calls.** Every petal is a separate mesh so it can animate
  independently — roughly 350 draw calls in a busy frame. Merging each flower
  into one mesh with per-vertex petal indices, animated in the vertex shader,
  would cut that by an order of magnitude. This is the biggest single win.
- **Grass fill cost** is the real mobile risk, not the bloom. Up to 20,000
  double-sided instanced blades run the full felt shader with two octaves of
  noise and a ten-source loop per fragment. Phones get 9,000 and low-end
  devices 3,200 plus a single-octave path; the runtime halves it again if
  frame time stays above 28 ms. Untested on actual hardware.
- **Procedural fibre is scale-dependent**, so felt reads differently on a
  petal than on terrain. One tiling fibre texture would be more consistent
  and cheaper.
- **Ground light pools are flat planes** and show as ellipses at a low angle.
  Projecting them onto the terrain would fix it.
- **The bellflower and moonflower are the weakest silhouettes.** Both took
  several iterations to become readable and would benefit from hand-built
  geometry rather than parameterised primitives.

## Copy

All 3D copy lives in `js/content.js`. Each section has `lead`, `body`, and an
optional `list` in one of five shapes: `bullets`, `facts`, `groups`,
`timeline`, `links`. A section's `accent` drives its flower colour, its panel,
its light pool, and the colour it bleeds into the ground.

The text resume in `index.html` is hand-written rather than generated, so it
stays correct with JavaScript disabled. **If you change `content.js`, change
the matching `<section>` too** — nothing enforces this.

The copy was written from notes in the old repo's `docs/content-map.md`
(deleted in the rewrite; recoverable from `main`). The owner left the brief's
content fields blank, so tone and structure were a judgement call: warm, dry,
first person, no corporate filler.
