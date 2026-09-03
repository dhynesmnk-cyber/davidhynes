/**
 * FR-5 Onboarding hint — a small paper scrap with hand-lettered text,
 * device-aware, fades on first movement. Nothing else.
 */
import { audio } from '../systems/audio';

export class Hint {
  private el: HTMLElement;
  private dismissed = false;

  constructor(isTouch: boolean) {
    const el = document.createElement('div');
    el.id = 'onboarding-hint';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = isTouch
      ? 'swipe the joystick to move<br><small>tap ✋ near a set piece to look closer</small>'
      : 'arrow keys to move<br><small>Space to fly · E to look closer</small>';
    document.body.appendChild(el);
    this.el = el;
    // Slight delay so it rises in after the world settles.
    requestAnimationFrame(() => el.classList.add('is-visible'));
  }

  dismiss(): void {
    if (this.dismissed) return;
    this.dismissed = true;
    this.el.classList.remove('is-visible');
    this.el.classList.add('is-fading');
    audio.play('hint_fade');
    setTimeout(() => this.el.remove(), 900);
  }
}
