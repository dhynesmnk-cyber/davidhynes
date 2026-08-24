import { zones, ZoneContent } from '../content/zones';

export class ModalManager {
  private modalElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private contentElement: HTMLElement | null = null;
  private previousFocus: HTMLElement | null = null;
  private onOpenCallback: ((zoneId: string) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;

  constructor() {
    this.createModalDOM();
  }

  private createModalDOM(): void {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(36, 26, 56, 0.7);
      backdrop-filter: blur(4px);
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    document.body.appendChild(overlay);
    this.overlayElement = overlay;

    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'zone-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-title');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      width: 90%;
      max-width: 680px;
      max-height: 85vh;
      overflow-y: auto;
      background: #F3E9D6;
      border-radius: 8px;
      box-shadow: 0 20px 60px rgba(36, 26, 56, 0.4);
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    // Torn paper edge effect using clip-path
    modal.style.clipPath = 'polygon(0% 0%, 100% 0%, 100% 98%, 98% 100%, 96% 98%, 94% 100%, 92% 98%, 90% 100%, 88% 98%, 86% 100%, 84% 98%, 82% 100%, 80% 98%, 78% 100%, 76% 98%, 74% 100%, 72% 98%, 70% 100%, 68% 98%, 66% 100%, 64% 98%, 62% 100%, 60% 98%, 58% 100%, 56% 98%, 54% 100%, 52% 98%, 50% 100%, 48% 98%, 46% 100%, 44% 98%, 42% 100%, 40% 98%, 38% 100%, 36% 98%, 34% 100%, 32% 98%, 30% 100%, 28% 98%, 26% 100%, 24% 98%, 22% 100%, 20% 98%, 18% 100%, 16% 98%, 14% 100%, 12% 98%, 10% 100%, 8% 98%, 6% 100%, 4% 98%, 2% 100%, 0% 98%)';
    
    document.body.appendChild(modal);
    this.modalElement = modal;

    // Create content container
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText = `
      padding: 0;
      color: #241A38;
      line-height: 1.6;
    `;
    modal.appendChild(content);
    this.contentElement = content;

    // Close on overlay click
    overlay.addEventListener('click', () => this.close());
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    console.log('📜 GATE 3 — Modal DOM created');
  }

  private isOpen(): boolean {
    return this.modalElement?.style.opacity === '1';
  }

  open(zoneId: string): void {
    const zoneContent = zones.find(z => z.id === zoneId);
    if (!zoneContent || !this.modalElement || !this.contentElement || !this.overlayElement) {
      console.error('Modal or content not found');
      return;
    }

    // Store previous focus for restoration
    this.previousFocus = document.activeElement as HTMLElement;

    // Render content
    this.contentElement.innerHTML = this.renderZoneContent(zoneContent);

    // Show modal
    this.overlayElement.style.pointerEvents = 'auto';
    this.overlayElement.style.opacity = '1';
    this.modalElement.style.pointerEvents = 'auto';
    this.modalElement.style.opacity = '1';
    this.modalElement.style.transform = 'translate(-50%, -50%) scale(1)';

    // Trap focus
    this.trapFocus();

    // Callback
    if (this.onOpenCallback) {
      this.onOpenCallback(zoneId);
    }

    console.log(`📖 Modal opened: ${zoneId}`);
  }

  close(): void {
    if (!this.modalElement || !this.overlayElement) return;

    // Hide modal
    this.overlayElement.style.opacity = '0';
    this.overlayElement.style.pointerEvents = 'none';
    this.modalElement.style.opacity = '0';
    this.modalElement.style.transform = 'translate(-50%, -50%) scale(0.95)';
    this.modalElement.style.pointerEvents = 'none';

    // Restore focus
    if (this.previousFocus) {
      this.previousFocus.focus();
      this.previousFocus = null;
    }

    // Callback
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }

    console.log('📕 Modal closed');
  }

  private renderZoneContent(zone: ZoneContent): string {
    let html = `
      <div style="padding: 32px 40px;">
        <!-- Header with close button -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #A78BFA; padding-bottom: 16px;">
          <h2 id="modal-title" style="margin: 0; font-size: 28px; font-weight: 700; color: #241A38; font-family: 'Comic Sans MS', 'Chalkboard SE', cursive;">
            ${zone.title}
          </h2>
          <button 
            onclick="document.getElementById('zone-modal')?.closest('[role=dialog]')?.dispatchEvent(new CustomEvent('close'))"
            aria-label="Close modal"
            style="background: none; border: none; font-size: 32px; color: #6E4A2E; cursor: pointer; padding: 0; line-height: 1; opacity: 0.7; transition: opacity 0.2s;"
            onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'"
          >×</button>
        </div>

        <!-- Intro line (handwritten voice) -->
        <p style="font-size: 18px; font-style: italic; color: #6E4A2E; margin-bottom: 28px; font-family: 'Comic Sans MS', 'Chalkboard SE', cursive; border-left: 4px solid #FF6FB0; padding-left: 16px;">
          ${zone.intro}
        </p>

        <!-- Professional content -->
        <div style="margin-bottom: 32px;">
    `;

    zone.professional.forEach((section) => {
      if (section.heading) {
        // Render heading with markdown-style bold
        const headingText = section.heading.replace(/\*\*/g, '');
        html += `<h3 style="font-size: 16px; font-weight: 700; color: #241A38; margin: 24px 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">${headingText}</h3>`;
      }

      if (section.text) {
        html += `<p style="margin: 0 0 16px 0; font-size: 15px;">${section.text}</p>`;
      }

      if (section.items) {
        html += `<ul style="margin: 0 0 16px 0; padding-left: 20px;">`;
        section.items.forEach((item) => {
          if (typeof item === 'string') {
            // Check if item contains a link
            const linkMatch = item.match(/\[(.*?)\]\((.*?)\)/);
            if (linkMatch) {
              const [_, linkText, linkUrl] = linkMatch;
              const itemText = item.replace(/\[.*?\]\(.*?\)/, '').trim();
              html += `<li style="margin: 8px 0; font-size: 15px;">${itemText} <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="color: #A78BFA; text-decoration: none; font-weight: 600;">${linkText}</a></li>`;
            } else {
              // Handle bold text
              const formattedItem = item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              html += `<li style="margin: 8px 0; font-size: 15px;">${formattedItem}</li>`;
            }
          } else if (typeof item === 'object' && item.link) {
            html += `<li style="margin: 8px 0; font-size: 15px;"><a href="${item.link}" target="_blank" rel="noopener noreferrer" style="color: #A78BFA; text-decoration: none; font-weight: 600;">${item.text}</a></li>`;
          }
        });
        html += `</ul>`;
      }

      if (section.link) {
        html += `<p style="margin: 12px 0;"><a href="${section.link.url}" target="_blank" rel="noopener noreferrer" style="color: #A78BFA; text-decoration: none; font-weight: 600; font-size: 15px;">${section.link.label}</a></p>`;
      }
    });

    html += `
        </div>

        <!-- Footer with contact -->
        <div style="border-top: 2px solid #A78BFA; padding-top: 20px; margin-top: 32px;">
          <p style="font-size: 13px; color: #6E4A2E; white-space: pre-line; margin: 0 0 16px 0;">${zone.contactFooter}</p>
          <button onclick="document.getElementById('zone-modal')?.dispatchEvent(new CustomEvent('close'))" style="background: #A78BFA; color: #F3E9D6; border: none; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#8B6FD9'" onmouseout="this.style.background='#A78BFA'">Close</button>
        </div>
      </div>
    `;

    return html;
  }

  private trapFocus(): void {
    if (!this.modalElement) return;

    const focusableElements = this.modalElement.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    this.modalElement.addEventListener('keydown', handleTabKey, { once: true });
    firstElement.focus();
  }

  setOnOpen(callback: (zoneId: string) => void): void {
    this.onOpenCallback = callback;
  }

  setOnClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }
}
