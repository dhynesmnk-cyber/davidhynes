# Product Requirements — dave.likeswine

## Goals
- Establish David as an AI enablement thought leader through an experience
  no recruiter, client, or peer forgets.
- Deliver the full substance of the resume and projects without friction.
- Work flawlessly on phone (joystick) and desktop (arrow keys).

## Non-goals
- No accounts, no backend, no CMS in v1.
- No music. No voiceover.
- No minigames or puzzles. Exploration only.

## User stories
1. As a recruiter on my phone, I can understand what to do within 3 seconds
   and reach professional detail within 20.
2. As a curious visitor, I can wander freely and discover every zone.
3. As a returning visitor, my progress (bloomed flowers) persists.
4. As a keyboard-only user, I can complete the entire experience.
5. As someone in a hurry, I can bypass the world and reach content/contacts.

## Functional requirements

### FR-1 Movement
- Free-roam within world bounds. Arrow keys on desktop.
- Walk mode (grounded, butt-wiggle gait) and fly mode (airborne, wing flutter).
- Toggle via joystick control on mobile; Space bar on desktop.
- Collision: world edges block movement; set-piece objects block in walk mode,
  can be flown over in fly mode (nice-to-have — cut if scope pressure).

### FR-2 Zones (5)
- Experience, Skills, Projects, Blogs, Tools & Creators.
- Each zone = flower cluster + one interactable set-piece object.
- Proximity → subtle affordance (object glows/sways; soft proximity tick).
- Interact input: Enter/E on desktop; tap the object or an appear-button on mobile.

### FR-3 Modals
- Open on interact; world remains visible, slightly dimmed, beneath.
- Layered content: intro line (in-world voice) → professional detail.
- Close: X button, Esc, or tap-outside. Smooth open/close transitions.
- Focus-trapped, Esc-closes, focus returns to the trigger.
- Links out (Notion playbook, live projects) open in new tab.

### FR-4 Progress & bloom
- Visiting a zone (opening its modal) marks it visited; zone visuals change
  (flowers brighten/open; glow strengthens).
- On each visit, a burst of new flowers blooms elsewhere in the world.
- 5/5 visited → completion moment (e.g., the whole field glows; a final
  note/card appears — see design.md).
- Persist to localStorage; returning visitors see their bloomed world.

### FR-5 Onboarding
- Minimal hint near the bee on first load, device-aware:
  desktop: "arrow keys to move" / mobile: "swipe the joystick to move".
- Fades on first movement. Nothing else.

### FR-6 Audio
- Foley only, per docs/audio.md. Unlocks on first user input (autoplay policy).
- Persistent mute toggle, visible but unobtrusive.

### FR-7 Contact & bypass
- Contact details (email, phone, Instagram) available from a small signpost
  at the spawn hive AND in the footer of every modal.
- A plain-text "skip the garden" link in the page footer jumps to a
  static, print-friendly content view (all zones as simple sections).
  This doubles as the SEO/ATS-readable version of the site.

### FR-8 Performance & a11y
- 60fps target on mid-range mobile; degrade particle counts automatically.
- prefers-reduced-motion: disable camera shake and jitter; keep functionality.
- All content reachable without the canvas (FR-7 static view).

## Acceptance summary
Each gate in docs/review.md has its own testable criteria. The site is done
when all gates pass AND David passes the final feel check.
