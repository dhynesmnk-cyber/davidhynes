import { PERSON } from './content.js';

const $ = s => document.querySelector(s);

export class UI {
  constructor(opts) {
    this.panel = $('#panel');
    this.hintEl = $('#hint');
    this.pollenEl = $('#pollen');
    this.pollenN = $('#pollen-n');
    this.opts = opts;
    this.current = null;
    this.hintTimer = 0;
    this.anchor2D = { x: 0, y: 0, visible: false };
    this.isTouch = document.body.classList.contains('touch');
  }

  /* ------------------------------------------------------------- panel */
  show(section, extra) {
    this.current = section;
    const p = this.panel;
    p.style.setProperty('--accent', section.accent);
    p.style.setProperty('--accent2', section.accent2 || section.accent);
    p.innerHTML = this.render(section, extra);
    p.classList.add('show');
    p.setAttribute('aria-hidden', 'false');
    p.querySelector('.p-close')?.addEventListener('click', () => this.opts.onClose());
    p.scrollTop = 0;
  }

  hide() {
    this.current = null;
    this.panel.classList.remove('show');
    this.panel.setAttribute('aria-hidden', 'true');
  }

  render(s, extra) {
    let h = `<button class="p-close" type="button" aria-label="Close">✕</button>`;
    h += `<p class="p-kicker">${s.kicker || s.label}</p>`;
    h += `<h2 id="panel-title">${s.title}</h2>`;
    if (s.lead) h += `<p class="p-lead">${s.lead}</p>`;
    for (const b of (s.body || [])) h += `<p>${b}</p>`;
    const L = s.list;
    if (L) {
      if (L.style === 'bullets') {
        h += '<ul>' + L.items.map(i => `<li>${i}</li>`).join('') + '</ul>';
      } else if (L.style === 'facts') {
        h += '<dl class="p-facts">' + L.items.map(([k, v]) => `<div><dt>${k}</dt><span>${v}</span></div>`).join('') + '</dl>';
      } else if (L.style === 'groups') {
        h += '<ul class="p-groups">' + L.items.map(([k, v]) => `<li><b>${k}</b><span>${v}</span></li>`).join('') + '</ul>';
      } else if (L.style === 'timeline') {
        h += '<ul class="p-time">' + L.items.map(([t, r, o]) => `<li><b>${t}</b><strong>${r}</strong><i>${o}</i></li>`).join('') + '</ul>';
      } else if (L.style === 'links') {
        h += '<ul class="p-links">' + L.items.map(i => {
          const head = i.h ? `<a href="${i.h}" target="_blank" rel="noopener">${i.t}</a>` : `<strong>${i.t}</strong>`;
          return `<li>${head}<em>${i.d}</em></li>`;
        }).join('') + '</ul>';
      }
    }
    if (s.id === 'hive' || s.id === 'hire') {
      h += `<div class="p-cta">
        <a href="mailto:${PERSON.email}">Email me</a>
        <a href="tel:+61411039718">${PERSON.phone}</a>`;
      if (s.id === 'hire') h += `<a href="${PERSON.cv}" download>Download my CV</a>`;
      h += `</div>`;
    }
    if (extra) h += `<p class="p-hint">${extra}</p>`;
    else if (s.hint) h += `<p class="p-hint">${s.hint}</p>`;
    return h;
  }

  /* Anchor the card near its flower on desktop; CSS docks it on phones. */
  place(x, y, w, hgt) {
    if (this.isTouch || window.innerWidth <= 720) return;
    const p = this.panel;
    const pw = p.offsetWidth, ph = p.offsetHeight;
    let left = x + 46;
    if (left + pw > w - 16) left = x - pw - 46;
    left = Math.max(16, Math.min(left, w - pw - 16));
    let top = y - ph * 0.55;
    top = Math.max(70, Math.min(top, hgt - ph - 78));
    p.style.left = left + 'px';
    p.style.top = top + 'px';
    p.style.right = 'auto';
    p.style.bottom = 'auto';
    const sx = Math.max(10, Math.min(pw - 10, x - left));
    p.style.setProperty('--stem-x', sx + 'px');
    p.style.setProperty('--stem-h', Math.max(0, Math.min(220, y - (top + ph))) + 'px');
  }

  /* ------------------------------------------------------------- hints */
  hint(text, ms = 4200) {
    if (!text) { this.hintEl.classList.remove('show'); return; }
    this.hintEl.textContent = text;
    this.hintEl.classList.add('show');
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.hintEl.classList.remove('show'), ms);
  }

  setPollen(n, total) {
    this.pollenN.textContent = n;
    this.pollenEl.classList.toggle('full', n >= total);
  }
}
