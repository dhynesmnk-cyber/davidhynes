# davidhynes — the garden

Personal site for David Hynes (AI Enablement & Responsible AI). An explorable
stop-motion diorama at neon dusk, navigated by a bee. Plain-text version at
`/static.html`.

## Run

```
npm install
npm run dev        # http://localhost:3000
npm run build      # tsc + vite → dist/
npm run preview    # serve dist/ at http://localhost:4173
```

Deploys to Netlify on push to `main` (see `netlify.toml`). Netlify's `URL`
env var makes the canonical / OG tags absolute; set `SITE_URL` to override.

## Controls

- Desktop: arrow keys / WASD move · Space walk/fly · E or Enter interact · Esc closes
- Mobile: joystick bottom-left · WALK/FLY switch above it · ✋ appears near set pieces

## Dropping in real assets

- **Art**: PNGs into `public/assets/sprites/`, listed in `sprites/manifest.json`.
  Keys, file names and sizes: `src/content/assets.ts`.
- **Foley**: `public/assets/audio/<id>.ogg` (+ `.mp3`), IDs per `docs/audio.md`.
  Procedural placeholder sounds play until a recording exists.

## Docs

`docs/handover.md` is the current status. `docs/spec.md`, `docs/design.md`,
`docs/content-map.md`, `docs/audio.md`, `docs/review.md` are the brief.
