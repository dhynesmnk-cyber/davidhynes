/**
 * Persistent DOM controls layered above the canvas:
 *  - mute toggle (small speaker sign, top-right)
 *  - "skip the garden" link (bottom, plain text) → static view
 * Plain DOM so they are keyboard reachable and screen-reader labelled.
 */
import { audio } from '../systems/audio';

export function mountControls(): void {
  const bar = document.createElement('div');
  bar.id = 'garden-controls';

  const mute = document.createElement('button');
  mute.id = 'mute-toggle';
  mute.type = 'button';
  mute.setAttribute('aria-pressed', audio.isMuted ? 'true' : 'false');
  const render = (muted: boolean) => {
    mute.setAttribute('aria-pressed', muted ? 'true' : 'false');
    mute.setAttribute('aria-label', muted ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off');
    mute.title = muted ? 'Sound off' : 'Sound on';
    mute.innerHTML = muted
      ? '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4zm12.5 3 2.5-2.5-1.4-1.4L15 10.6l-2.5-2.5-1.4 1.4 2.5 2.5-2.5 2.5 1.4 1.4 2.5-2.5 2.5 2.5 1.4-1.4-2.4-2.5z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4zm11.5 3a3.5 3.5 0 0 0-2-3.2v6.4a3.5 3.5 0 0 0 2-3.2zm-2-7v2.1a5 5 0 0 1 0 9.8V19a7 7 0 0 0 0-14z"/></svg>';
  };
  render(audio.isMuted);
  mute.addEventListener('click', () => {
    audio.unlock();
    const muted = audio.toggleMute();
    render(muted);
    // Keep keyboard focus from lingering on the button so arrow keys go to the bee.
    mute.blur();
  });
  audio.onMuteChange(render);

  const skip = document.createElement('a');
  skip.id = 'skip-garden';
  skip.href = '/static.html';
  skip.textContent = 'skip the garden →';
  skip.setAttribute('aria-label', 'Skip the garden and read the plain-text version');

  bar.appendChild(mute);
  (document.getElementById('garden-header') ?? document.body).appendChild(bar);
  (document.getElementById('garden-footer') ?? document.body).appendChild(skip);
}
