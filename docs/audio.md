# Audio Spec — Foley only, ASMR texture

## Philosophy
No music. The world sounds like something you could touch: fabric, paper, wood, tiny wings. All sounds are soft-transient, close-mic'd in character, mixed quiet — present, never demanding.

## Sound list
| ID | Trigger | Character |
|---|---|---|
| step_walk | walk cycle (per step, alternating) | soft felt scritch on grass/floor, 2 variants |
| wing_loop | flying (loop) | papery flutter, gentle, slightly uneven |
| takeoff | walk→fly toggle | small paper snap + flutter-in |
| land | fly→walk toggle | soft thump + settle rustle |
| zone_tick | entering interact range | one warm wooden tick, quiet |
| interact | pressing interact | wooden click, like a small latch |
| modal_open | modal opens | paper unfolding, slow |
| modal_close | modal closes | paper fold, quicker |
| bloom | each flower blooming | tiny soft pop, pitch-randomised ± |
| completion | 5/5 moment | layered bloom pops + one low warm chime |
| hint_fade | hint disappearing | barely-there paper whisper |

## Rules
- Unlock audio on first user input (browser autoplay policy).
- Persistent mute toggle (small speaker sign near the hive or UI corner).
- Bloom pops throttle: max ~4 overlapping, oldest wins.
- Master volume ≈ −18dB LUFS feel; foley should sit under conversation level.
- Formats: compressed .ogg + .mp3 fallback; total audio budget < 500KB.
- Source guidance: record/fabricate real tactile foley (fabric rubs, paper, wooden clicks) then process — gentle low-pass (~6kHz) for warmth, no reverb longer than a small-room tail.
