# CLAUDE.md — David Hynes Personal Site

## What this is
A personal website for David Hynes — AI Enablement consultant, builder, and
author of "The AI Playbook for Small Business in Australia." It is not a
template portfolio. It is an explorable stop-motion diorama world with a
glowwave palette, navigated by a controllable bee character.

The site exists to ESTABLISH: thought leadership, credibility, and memorability.
Every decision favours "unforgettable but professional" over "flashy but empty."

## Read before doing anything
- docs/spec.md     → requirements and acceptance criteria
- docs/design.md   → art direction, layout, motion rules
- docs/content-map.md → all copy, zone by zone
- docs/audio.md    → foley sound spec
- docs/review.md   → gate-based build order. BUILD IN GATES. Do not skip ahead.

## Locked decisions (do not revisit without asking)
1. One cohesive diorama. Stop-motion texture + glowwave lighting.
2. Five zones: Experience, Skills, Projects, Blogs, Tools & Creators.
3. Free-roam movement. Arrow keys on desktop. On-screen joystick on mobile
   with a walk/fly toggle built into the joystick UI.
4. Bee interacts with an object at each zone → modal popup over the world.
5. Progress: visiting a zone changes it; flowers bloom and spread after visits.
6. Copy is LAYERED: warm in-world intro line, then professional detail.
7. Sound: foley only, ASMR-textured. No music track.
8. Transitions smooth; character animation snapped (see design.md §Motion).

## Tech stack (your choice, this is the recommendation — deviate only with reason)
- Vite + TypeScript
- Phaser 3 (scenes, arcade physics for collision zones, tweens, particles)
- Plain DOM/CSS modals layered above the canvas (better for accessibility,
  text selection, and SEO than rendering text in-canvas)
- Deploy: Netlify

## Working rules
- Build gate by gate per docs/review.md. At the end of each gate, stop and
  present: what was built, acceptance criteria status, and a "feel check"
  prompt for David.
- Never ship placeholder lorem ipsum into a modal — all copy lives in
  docs/content-map.md and should be pulled in verbatim unless told otherwise.
- Performance budget: 60fps on a mid-range phone, < 2MB initial load,
  sprites as compressed spritesheets. Lazy-load audio and non-critical assets.
- Accessibility is not optional: keyboard-only playthrough must work,
  modals must trap focus, prefers-reduced-motion must be respected.
- Keep the world state in localStorage (visited zones, bloom progress).

## File structure
src/
  main.ts              # boot
  scenes/              # Boot, Preload, World, UI overlay scene
  entities/            # bee.ts, zones.ts, flowers.ts
  systems/             # input.ts (keys + joystick), progress.ts, audio.ts
  ui/                  # modal DOM components, hint, joystick markup
  content/             # zone content as typed data (from content-map.md)
public/assets/         # sprites, textures, sounds
docs/                  # these documents
