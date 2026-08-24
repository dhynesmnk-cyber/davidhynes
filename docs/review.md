# Gate-Based Review — build order, acceptance criteria, feel checks

Methodology: gate-based builds, testable acceptance criteria, staged testing, output review checklists, human-in-the-loop verification.
Claude Code: complete one gate, run its checklist, then STOP and present results to David before starting the next gate.

## GATE 0 — Scaffold
- [ ] Vite + TS + Phaser 3 boots on Netlify preview with zero console errors
- [ ] Canvas fills viewport, responsive resize works (desktop + 375px mobile)
- [ ] Scene structure per claude.md file map
Feel check: n/a

## GATE 1 — Movement feel (MOST IMPORTANT GATE)
- [ ] Arrow keys move the bee in 8 directions, free-roam, world-bounded
- [ ] Walk/fly toggle on Space; modes are visibly and audibly distinct
- [ ] Walk cycle shows butt wiggle; fly shows wing flutter
- [ ] Animation snaps at 8–12fps with jitter; camera follow is smooth
- [ ] 60fps with the debug placeholder art
Feel check (David): "Does moving the bee make you smile? Rate the wiggle 1–10."
Nothing proceeds until wiggle ≥ 8.

## GATE 2 — World & art direction
- [ ] Full diorama laid out per design.md; palette matches spec
- [ ] Stop-motion texture rules visible (grain, imperfect edges, soft glows)
- [ ] Handheld camera drift on; disabled under prefers-reduced-motion
- [ ] 5 zone set pieces placed with distinct flower identities
Feel check: "Does it look like a handmade stage set at neon dusk?"

## GATE 3 — Interaction & modals
- [ ] Proximity affordance on each zone object (glow/sway + zone_tick)
- [ ] Interact opens modal: layered content renders from content data file
- [ ] Modal open/close smooth; focus trapped; Esc closes; focus returns
- [ ] All five zones populated with real content from content-map.md
- [ ] External links open new tab
Feel check: read every modal end-to-end. Typos? Voice drift? Layout breaks?

## GATE 4 — Progress & bloom
- [ ] Visiting a zone changes its visuals (open flowers, lit detail)
- [ ] Bloom burst places 15–30 new flowers in unvisited ground, staggered
- [ ] 5/5 triggers completion card with contact block
- [ ] State persists in localStorage; reload keeps the bloomed world
Feel check: "Is the completion moment earned, not annoying?"

## GATE 5 — Mobile controls
- [ ] Joystick appears on touch devices only; smooth 360° movement
- [ ] Walk/fly toggle integrated into joystick UI, thumb-reachable
- [ ] Interact button appears contextually near zones
- [ ] Hint text is device-aware ("swipe the joystick to move")
- [ ] Tested at 375px and 820px widths, portrait and landscape
Feel check: play the full loop on an actual phone.

## GATE 6 — Audio
- [ ] All foley implemented per audio.md; unlocks on first input
- [ ] Mute toggle works and persists
- [ ] Bloom pop throttling works during big bursts
- [ ] Total audio < 500KB
Feel check: eyes closed, listen to a full exploration. Anything grating?

## GATE 7 — Content completeness
- [ ] Tools & Creators lists populated (or [FILL] items flagged to David)
- [ ] Contact correct everywhere: signpost, modal footers, static view
- [ ] "Skip the garden" static view renders all content, print-friendly
- [ ] Meta tags, OG image, favicon (the bee)
Feel check: send the link to one non-technical person. What do they say?

## GATE 8 — Performance, a11y, ship
- [ ] 60fps on mid-range phone; particle auto-degrade verified
- [ ] Initial load < 2MB; Lighthouse a11y ≥ 95
- [ ] Keyboard-only playthrough complete (movement + all modals)
- [ ] prefers-reduced-motion path verified
- [ ] Netlify production deploy live
Final human-in-the-loop check: David plays start to finish on desktop and phone. Sign-off = shipped.

## Output review checklist (every gate)
- No lorem ipsum anywhere
- No console errors/warnings
- Palette respected — no default engine colours leaking through
- Voice consistent with content-map.md rules
- Nothing snapped that should be smooth, nothing smooth that should snap
