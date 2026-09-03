# Handover — status, what changed, what's left

Last updated: 2026-09-03 (branch `claude/david-hynes-site-handover-5fvap2`).

## Where things actually stand

The previous handover summary listed GATE 6 (audio) and FR-5 (onboarding
hint) as complete. Neither existed in the repository — the last commit was
GATE 5. Worse, the production build was throwing `Phaser is not defined`
on load (a missing import in `mobile-input.ts`), so the live site rendered a
black screen. That, plus the GATE 2 set pieces all being drawn at world
origin instead of inside their containers, is fixed in this pass.

| Gate | Status | Notes |
|---|---|---|
| 0 Scaffold | ✅ | Vite 8 + TS 7 + Phaser 4.2 (the API used is the Phaser 3 API; nothing 4-specific). |
| 1 Movement | ✅ | Multi-part bee puppet: abdomen swings from the waist (the butt wiggle), legs scuttle, wings flutter at 12fps, squash/stretch on takeoff/land, lean-in on interact. |
| 2 World | ✅ (placeholder art) | Set pieces now render at their zones. Felt grain overlay, felt rocks, mushroom lamps, fireflies, handheld camera drift. Custom art drops in via `public/assets/sprites/` — see below. |
| 3 Interaction | ✅ | Close buttons fixed (they dispatched an event nobody listened to). Persistent focus trap. Game input released while a modal is open. Enter also interacts. Links open in a new tab. |
| 4 Progress | ✅ | Blooms avoid set pieces; count scales with device quality. Completion card is now a DOM modal (keyboard reachable). |
| 5 Mobile | ✅ (needs a real-phone pass) | Floating joystick, persistent WALK/FLY switch, context ✋ button. Fixed: the ✋ button vanished whenever the joystick was released; tap-through into the joystick from the toggle. Verified in an emulated 375×667 touch context only. |
| 6 Audio | ✅ engine, ⚠️ recordings | `src/systems/audio.ts`: procedural Web Audio foley for all 11 sounds in `docs/audio.md`, unlock on first input, persisted mute toggle (top-right), bloom pops capped at 4 overlapping. Drop real `.ogg`/`.mp3` files into `public/assets/audio/<id>.ogg` and they take over automatically. |
| 7 Content | ✅ | `/static.html` plain-text, print-friendly view. Contact in 3 places: hive signpost (opens a card), every modal footer, static view. Meta/OG/Twitter tags, generated 1200×630 OG image, favicon PNGs. |
| 8 Ship | ✅ code, ⏳ David's sign-off | Reduced motion respected, fps-based quality degrade, axe-core clean, keyboard playthrough scripted and passing. Netlify deploys on push to `main`. |

## Verification run (headless Chromium, Playwright)

A scripted playthrough exercises: hint shows and fades, arrow keys move,
Space toggles fly, E/Enter open modals, focus trapped over 25 Tabs, game
input locked while a modal is open, Esc/×/Close/overlay all close, visit
persisted, bloom burst 8–30 flowers, hive signpost opens the contact card
with tel/mailto/instagram links, all five zones open, the 5/5 completion
card appears, mute toggle works from the keyboard and persists, and the
mobile joystick + ✋ button path. Zero console errors. The same run passes
under `prefers-reduced-motion`.

axe-core (WCAG 2.1 AA + best-practice rules) reports zero violations on the
garden at spawn, with a modal open, with the completion card open, and on
the static view.

Lighthouse could not complete inside this sandbox (its Chrome session stalls
before the first gather step, unrelated to the site). Run it locally:

```
npm run build && npm run preview
npx lighthouse http://localhost:4173/ --view
npx lighthouse http://localhost:4173/static.html --view
```

## Things only David can do

1. **Play it.** Desktop + a real phone (375px and 820px, portrait and
   landscape). Rate the wiggle. Is the completion moment earned?
2. **Art.** Replace placeholders — see "Custom art" below. Nothing else
   blocks on this.
3. **Foley.** Record the sounds in `docs/audio.md`, export `.ogg` (+ `.mp3`
   fallback) under 500KB total into `public/assets/audio/`. File names must
   match the IDs (`step_walk.ogg`, `bloom.ogg`, …).
4. **Real links.** Three placeholders remain in `src/content/zones.ts` and
   `static.html`: the Notion playbook URL (currently `https://notion.so`),
   the Cellar Content Engine link (`#`), and Future Infinitive (`#`).
5. **Set the site URL.** Netlify provides `URL` automatically so OG/canonical
   tags become absolute on deploy. If you use a custom domain, set
   `SITE_URL=https://yourdomain` in Netlify env vars to be explicit.

## Custom art (no code changes)

1. Export PNGs with the exact names in `src/content/assets.ts` (sizing guide
   is in that file's header comment).
2. Copy them into `public/assets/sprites/`.
3. Add each file name to the `files` array in
   `public/assets/sprites/manifest.json`.
4. Build. Listed files replace the procedural placeholders; anything not
   listed keeps its placeholder. Wings are separate from the bee body so the
   flutter animation still works; if `bee-body.png` is single-layer, the whole
   body wiggles instead of just the abdomen.

## Repository map (current)

```
index.html               garden shell: meta, fonts, DOM UI styles
static.html              "skip the garden" plain-text view (second Vite entry)
netlify.toml             SPA redirect, /static → /static.html, asset caching
src/
  main.ts                Phaser boot
  scenes/BootScene.ts    loading bar
  scenes/PreloadScene.ts manifest-driven custom art + procedural textures
  scenes/WorldScene.ts   diorama, set pieces, hive, HUD, update loop, camera drift
  entities/bee.ts        the puppet
  systems/input.ts       keyboard (arrows/WASD, Space, E/Enter), DOM-focus aware
  systems/mobile-input.ts joystick, WALK/FLY switch, ✋ button
  systems/zones.ts       proximity + markers, contact signpost
  systems/progress.ts    visited zones, blooms, completion, localStorage
  systems/audio.ts       foley engine (procedural + recorded), mute
  systems/settings.ts    reduced-motion flag, quality tier + fps sampling
  ui/modal.ts            zone / contact / completion cards
  ui/hint.ts             onboarding paper scrap
  ui/controls.ts         mute toggle + "skip the garden" link
  content/zones.ts       all copy (from docs/content-map.md)
  content/assets.ts      optional sprite manifest keys
public/assets/
  fonts/                 Caveat 700, Nunito variable (self-hosted)
  sprites/manifest.json  list David's PNGs here
  audio/                 drop recorded foley here
  og-image.png, favicon.svg, favicon-32.png, apple-touch-icon.png
```

## Locked decisions — unchanged

One diorama, five zones, free roam, one object per zone → modal, blooms as
progress, layered copy, foley only, gate-by-gate. Nothing here revisits them.
