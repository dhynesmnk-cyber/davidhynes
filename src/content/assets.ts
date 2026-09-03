/**
 * Optional custom art.
 *
 * Drop David's stop-motion assets into public/assets/sprites/ using these
 * exact file names, add the file name to public/assets/sprites/manifest.json,
 * and they replace the procedural placeholders on the next build — no code
 * changes needed. Anything not in the manifest keeps its placeholder.
 *
 * Sizing guide (world units = CSS px at zoom 1):
 *  - bee-body.png    ~64×48, facing RIGHT, transparent background.
 *                    Whole body incl. legs/antennae; wings are separate.
 *  - bee-wing.png    ~30×16, ONE wing, root at the LEFT edge, pointing right.
 *  - set-*.png       ~200×180, the full set piece, ground line ~75% down.
 *  - hive.png        ~120×100, the skep with the signpost to its right.
 *  - flower-*.png    ~20×20, an open bloom, used for the bloom bursts.
 *  - grain.png       256×256 tileable felt/paper grain, used as an overlay.
 */
export interface OptionalAsset {
  key: string;
  file: string;
}

export const optionalAssets: OptionalAsset[] = [
  { key: 'bee-body', file: 'bee-body.png' },
  { key: 'bee-wing', file: 'bee-wing.png' },
  { key: 'set-experience', file: 'set-experience.png' },
  { key: 'set-skills', file: 'set-skills.png' },
  { key: 'set-projects', file: 'set-projects.png' },
  { key: 'set-blogs', file: 'set-blogs.png' },
  { key: 'set-tools', file: 'set-tools.png' },
  { key: 'hive', file: 'hive.png' },
  { key: 'flower-pink', file: 'flower-pink.png' },
  { key: 'flower-cyan', file: 'flower-cyan.png' },
  { key: 'flower-violet', file: 'flower-violet.png' },
  { key: 'flower-orange', file: 'flower-orange.png' },
  { key: 'grain', file: 'grain.png' },
];

export const SPRITE_DIR = '/assets/sprites/';
export const SPRITE_MANIFEST = `${SPRITE_DIR}manifest.json`;
