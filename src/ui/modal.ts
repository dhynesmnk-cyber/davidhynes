import { zones, ZoneContent, contactInfo } from '../content/zones';
import { audio } from '../systems/audio';

/**
 * DOM modal layered above the canvas (FR-3).
 *  - Paper card, torn edge, glow-violet header accent (styles in index.html).
 *  - Layered copy: handwritten intro line → professional detail.
 *  - Focus trapped, Esc closes, focus returns to the trigger.
 *  - Contact block in every footer (FR-7) + "skip the garden" link.
 *  - Also renders the hive signpost contact card and the 5/5 completion card.
 */

type ModalKind = 'zone' | 'contact' | 'completion';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Minimal markdown: **bold** and [label](url). Content is authored, not user input. */
function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

export function contactHtml(): string {
  return `
    <address class="contact-block">
      <strong>David Hynes</strong> — Melbourne, VIC<br>
      <a href="tel:+61411039718">0411 039 718</a> ·
      <a href="mailto:d.hynes.mnk@gmail.com">d.hynes.mnk@gmail.com</a> ·
      <a href="https://instagram.com/dave.likeswine" target="_blank" rel="noopener noreferrer">@dave.likeswine</a>
    </address>`;
}

export class ModalManager {
  private overlay: HTMLElement;
  private modal: HTMLElement;
  private content: HTMLElement;
  private previousFocus: HTMLElement | null = null;
  private open_ = false;
  private onOpenCallback: ((zoneId: string) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private onStateChange: ((open: boolean) => void) | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'modal-overlay';
    this.overlay.hidden = true;

    this.modal = document.createElement('div');
    this.modal.id = 'zone-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'modal-title');
    this.modal.hidden = true;

    this.content = document.createElement('div');
    this.content.className = 'modal-content';
    this.modal.appendChild(this.content);

    document.body.append(this.overlay, this.modal);

    this.overlay.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => {
      if (!this.open_) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'Tab') {
        this.cycleFocus(e);
      }
    });
    // Any close button rendered inside the card
    this.modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-close]')) this.close();
    });
  }

  isOpen(): boolean {
    return this.open_;
  }

  open(zoneId: string): void {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;
    this.show('zone', zone.title, this.renderZone(zone));
    this.onOpenCallback?.(zoneId);
  }

  openContact(): void {
    this.show('contact', 'Say hello', `
      <p class="modal-intro">If you want something like this growing in your organisation — say hello.</p>
      ${contactHtml()}
      <p class="modal-links">
        <a href="/static.html">Read the plain-text version →</a>
      </p>`);
  }

  openCompletion(): void {
    this.show('completion', "You've seen the whole garden.", `
      <p class="modal-intro">If you want something like it growing in your organisation — say hello.</p>
      <p class="modal-sign">— David</p>
      ${contactHtml()}`);
  }

  close(): void {
    if (!this.open_) return;
    this.open_ = false;
    this.modal.classList.remove('is-open');
    this.overlay.classList.remove('is-open');
    audio.play('modal_close');
    window.setTimeout(() => {
      if (this.open_) return;
      this.modal.hidden = true;
      this.overlay.hidden = true;
    }, 320);
    const prev = this.previousFocus;
    this.previousFocus = null;
    if (prev && typeof prev.focus === 'function' && prev !== document.body) prev.focus();
    else (document.activeElement as HTMLElement | null)?.blur?.();
    this.onCloseCallback?.();
    this.onStateChange?.(false);
  }

  private show(kind: ModalKind, title: string, bodyHtml: string): void {
    this.previousFocus = document.activeElement as HTMLElement;
    this.modal.dataset.kind = kind;
    this.content.innerHTML = `
      <div class="modal-header">
        <h2 id="modal-title">${escapeHtml(title)}</h2>
        <button type="button" class="modal-x" data-close aria-label="Close">×</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-footer">
        ${kind === 'zone' ? contactHtml() : ''}
        <div class="modal-actions">
          <button type="button" class="modal-close" data-close>Close</button>
          <a class="modal-skip" href="/static.html">skip the garden →</a>
        </div>
      </div>`;
    this.overlay.hidden = false;
    this.modal.hidden = false;
    // Force a layout so the transition runs from the hidden state.
    void this.modal.offsetWidth;
    this.overlay.classList.add('is-open');
    this.modal.classList.add('is-open');
    this.modal.scrollTop = 0;
    this.open_ = true;
    audio.play('modal_open');
    this.onStateChange?.(true);
    // Focus the heading region first so screen readers announce the title,
    // then Tab moves to the close button.
    const first = this.modal.querySelector<HTMLElement>('.modal-x');
    first?.focus();
  }

  private renderZone(zone: ZoneContent): string {
    let html = `<p class="modal-intro">${escapeHtml(zone.intro)}</p><div class="modal-pro">`;
    zone.professional.forEach((section) => {
      if (section.heading) html += `<h3>${inline(section.heading)}</h3>`;
      if (section.text) html += `<p>${inline(section.text)}</p>`;
      if (section.items) {
        html += '<ul>';
        section.items.forEach((item) => {
          if (typeof item === 'string') {
            html += `<li>${inline(item)}</li>`;
          } else {
            const label = item.text.replace(/^\[|\]$/g, '');
            const external = /^https?:/.test(item.link);
            html += `<li><a href="${escapeHtml(item.link)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(label)}</a></li>`;
          }
        });
        html += '</ul>';
      }
      if (section.link) {
        html += `<p class="modal-links"><a href="${escapeHtml(section.link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(section.link.label)}</a></p>`;
      }
    });
    html += '</div>';
    return html;
  }

  private cycleFocus(e: KeyboardEvent): void {
    const focusable = Array.from(this.modal.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((el) => !el.hasAttribute('disabled'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const inside = active ? this.modal.contains(active) : false;
    if (e.shiftKey) {
      if (!inside || active === first) { e.preventDefault(); last.focus(); }
    } else if (!inside || active === last) { e.preventDefault(); first.focus(); }
  }

  setOnOpen(cb: (zoneId: string) => void): void { this.onOpenCallback = cb; }
  setOnClose(cb: () => void): void { this.onCloseCallback = cb; }
  setOnStateChange(cb: (open: boolean) => void): void { this.onStateChange = cb; }
}

export { contactInfo };
