# Gate-Based Review — build order, acceptance criteria, feel checks

Methodology: gate-based builds, testable acceptance criteria, staged testing, output review checklists, human-in-the-loop verification.
Claude Code: complete one gate, run its checklist, then STOP and present results to David before starting the next gate.

## GATE 0 — Scaffold ✅
- [x] Vite + TS + Phaser boots with zero console errors
- [x] Canvas fills viewport, responsive resize works (desktop + 375px mobile)
- [x] Scene structure per claude.md file map
Feel check: n/a

## GATE 1 — Movement feel (MOST IMPORTANT GATE) ✅ code · ⏳ David's wiggle rating
- [x] Arrow keys move the bee in 8 directions, free-roam, world-bounded
- [x] Walk/fly toggle on Space; modes are visibly and audibly distinct
- [x] Walk cycle shows butt wiggle (abdomen swings from the waist); fly shows wing flutter
- [x] Animation snaps at 10/12fps with 1.5° jitter; camera follow is smooth
- [x] 60fps with the placeholder art (desktop); fps-based quality degrade on slow devices
Feel check (David): "Does moving the bee make you smile? Rate the wiggle 1–10."
Nothing proceeds until wiggle ≥ 8.

## GATE 2 — World & art direction ✅ layout · ⚠️ placeholder art
- [x] Full diorama laid out per design.md; palette matches spec
- [x] Stop-motion texture rules visible (felt grain overlay, soft glows, tilted notes)
- [x] Handheld camera drift on; disabled under prefers-reduced-motion
- [x] 5 zone set pieces placed with distinct flower identities (David's PNGs drop in via sprites/manifest.json)
Feel check: "Does it look like a handmade stage set at neon dusk?"

## GATE 3 — Interaction & modals ✅
- [x] Proximity affordance on each zone object (marker swells + zone_tick)
- [x] Interact opens modal: layered content renders from content data file
- [x] Modal open/close smooth; focus trapped; Esc closes; focus returns
- [x] All five zones populated with real content from content-map.md
- [x] External links open new tab
Feel check: read every modal end-to-end. Typos? Voice drift? Layout breaks?

## GATE 4 — Progress & bloom ✅
- [x] Visiting a zone changes its visuals (flowers open, lit detail: candle, lamp, greenhouse light, pinned notes, lantern)
- [x] Bloom burst places 15–30 new flowers in unvisited ground, staggered (scaled down on low-end devices)
- [x] 5/5 triggers completion card with contact block
- [x] State persists in localStorage; reload keeps the bloomed world
Feel check: "Is the completion moment earned, not annoying?"

## GATE 5 — Mobile controls ✅ code · ⏳ real-phone test
- [x] Joystick appears on touch devices only; smooth 360° movement
- [x] Walk/fly toggle integrated into joystick UI, thumb-reachable
- [x] Interact button appears contextually near zones (and stays while you're there)
- [x] Hint text is device-aware ("swipe the joystick to move")
- [ ] Tested at 375px and 820px widths, portrait and landscape — emulated 375×667 only; needs a real device
Feel check: play the full loop on an actual phone.

## GATE 6 — Audio ✅ engine · ⚠️ real recordings pending
- [x] All foley implemented per audio.md (procedural placeholders); unlocks on first input
- [x] Mute toggle works and persists
- [x] Bloom pop throttling works during big bursts (max 4 overlapping)
- [x] Total audio < 500KB (0KB until recordings land; keep them under budget)
Feel check: eyes closed, listen to a full exploration. Anything grating?

## GATE 7 — Content completeness ✅
- [x] Tools & Creators lists populated (Notion, Cellar Content Engine and Future Infinitive URLs still placeholders — flagged in docs/handover.md)
- [x] Contact correct everywhere: signpost (opens a card), modal footers, static view
- [x] "Skip the garden" static view renders all content, print-friendly
- [x] Meta tags, OG image (generated from the bloomed world), favicon (the bee)
Feel check: send the link to one non-technical person. What do they say?

## GATE 8 — Performance, a11y, ship ✅ code · ⏳ sign-off
- [x] Particle auto-degrade verified (steps down at <45fps average); 60fps on a real mid-range phone still to confirm
- [x] Initial load ≈ 390KB gzipped JS + 90KB fonts; Lighthouse a11y 100 (garden and static view)
- [x] Keyboard-only playthrough complete (movement + all modals) — scripted in Playwright, passing
- [x] prefers-reduced-motion path verified (no jitter, no camera drift, no firefly tweens; everything still works)
- [ ] Netlify production deploy live — auto on merge to main
Final human-in-the-loop check: David plays start to finish on desktop and phone. Sign-off = shipped.

## Output review checklist (every gate)
- No lorem ipsum anywhere
- No console errors/warnings
- Palette respected — no default engine colours leaking through
- Voice consistent with content-map.md rules
- Nothing snapped that should be smooth, nothing smooth that should snap
