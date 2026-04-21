// ============================================================
// Visual State Studio — shared site JS
// Runs on Home (/), Services (/services/), Studio (/studio/).
// Handles: client reel + lightbox (home only), nav-dots (per-page),
// reveal-on-scroll, topbar active-state, arrow-key nav.
// ============================================================

(() => {
  'use strict';

  // --------------------------------------------------------
  // 1. Top-bar active-state — mark the link matching current path
  // --------------------------------------------------------
  (function topbarActive() {
    const navLinks = document.querySelectorAll('.topbar-nav a[data-nav]');
    if (!navLinks.length) return;
    const path = window.location.pathname.replace(/\/index\.html$/, '/');
    navLinks.forEach(a => {
      const match = a.dataset.nav;
      let isActive = false;
      if (match === 'home') {
        isActive = path === '/' || path === '';
      } else if (match === 'services') {
        isActive = path.startsWith('/services');
      } else if (match === 'studio') {
        isActive = path.startsWith('/studio');
      }
      if (isActive) {
        a.setAttribute('aria-current', 'page');
      }
    });
  })();

  // --------------------------------------------------------
  // 2. Client tile grid + lightbox (home only — needs #work-grid)
  // --------------------------------------------------------
  (function clientsAndLightbox() {
    const grid = document.getElementById('work-grid');
    const dataNode = document.getElementById('clients-data');
    if (!grid || !dataNode) return;

    let data;
    try {
      data = JSON.parse(dataNode.textContent);
    } catch (err) {
      console.error('Clients JSON parse failed:', err);
      return;
    }

    data.forEach(c => {
      const tile = document.createElement('a');
      tile.className = 'work-tile';
      tile.href = '#';
      tile.dataset.id = c.id;
      tile.innerHTML = `
        <div class="wt-slate">
          <span>${c.slate}</span>
          <span class="wt-stamp-mini">Approved</span>
        </div>
        <div class="wt-ph">
          <img src="${c.hero}" alt="${c.name.replace(/<[^>]+>/g,'').replace(/\.$/, '')} — ${c.industry} — cover still shot by Visual State Studio" loading="lazy">
          <span class="wt-expand">See folio →</span>
        </div>
        <div class="wt-info">
          <span class="wt-name">${c.name}</span>
          <span class="wt-pg">${c.page}</span>
        </div>
        <div class="wt-row2">
          <span>${c.industry}</span>
          <span>${c.result}</span>
        </div>
      `;
      tile.addEventListener('click', (e) => {
        e.preventDefault();
        openLightbox(c, tile);
      });
      grid.appendChild(tile);
    });

    // Lightbox logic
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    const lbKicker = document.getElementById('lb-kicker');
    const lbTitle = document.getElementById('lb-title');
    const lbResult = document.getElementById('lb-result');
    const lbGallery = document.getElementById('lb-gallery');
    const lbClose = document.getElementById('lb-close');
    let lastLightboxTrigger = null;

    function openLightbox(c, trigger) {
      lastLightboxTrigger = trigger || null;
      lbKicker.textContent = `${c.slate} · ${c.page}`;
      lbTitle.innerHTML = c.name;
      lbResult.innerHTML = c.result;
      const cleanName = c.name.replace(/<[^>]+>/g,'').replace(/\.$/, '');
      lbGallery.innerHTML = c.shots.map((s, i) => `
        <figure class="lb-shot s-${s.size}">
          <img src="${s.src}" alt="${cleanName} — ${c.industry} — frame ${i + 1} of the shoot, shot &amp; graded by Visual State Studio" loading="lazy">
        </figure>
      `).join('');
      lb.classList.add('open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lb-open');
      lb.scrollTop = 0;
      lbClose.focus();
    }
    function closeLightbox() {
      lb.classList.remove('open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lb-open');
      if (lastLightboxTrigger) {
        lastLightboxTrigger.focus();
      }
    }
    lbClose.addEventListener('click', closeLightbox);
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lb.classList.contains('open')) closeLightbox(); });
  })();

  // --------------------------------------------------------
  // 3. Nav-dots — per-page section tracking (reads DOM)
  //    Each .page on a given page is a dot. Labels are read from the
  //    [data-screen-label] attribute on each .page, or from the element's id.
  // --------------------------------------------------------
  (function navDotsAndTopbar() {
    const pages = [...document.querySelectorAll('.page')];
    const dots  = [...document.querySelectorAll('.nav-dots a')];
    const tbLabel = document.getElementById('tb-label');

    if (!pages.length) return;

    // Click-to-jump
    dots.forEach(d => d.addEventListener('click', (e) => {
      e.preventDefault();
      const id = d.dataset.page;
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));

    // Intersection observer — active section + topbar label
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting && en.intersectionRatio > 0.3) {
          const id = en.target.id;
          dots.forEach(d => d.classList.toggle('active', d.dataset.page === id));
          if (tbLabel) {
            const label = en.target.dataset.screenLabel || id;
            tbLabel.textContent = label.toUpperCase();
          }
        }
      });
    }, { threshold: [0, 0.3, 0.6] });
    pages.forEach(p => io.observe(p));

    // Arrow-key page navigation within the current page
    document.addEventListener('keydown', e => {
      // ignore when the lightbox or any text input is focused
      if (document.body.classList.contains('lb-open')) return;
      const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const active = dots.find(d => d.classList.contains('active'));
      const idx = dots.indexOf(active);
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        const next = dots[Math.min(dots.length - 1, idx + 1)];
        if (next) next.click();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        const prev = dots[Math.max(0, idx - 1)];
        if (prev) prev.click();
      }
    });
  })();

  // --------------------------------------------------------
  // 4. Reveal-on-scroll
  // --------------------------------------------------------
  (function revealOnScroll() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;
    const revealIo = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('in'); });
    }, { threshold: 0.15 });
    revealEls.forEach(el => revealIo.observe(el));
  })();
})();
