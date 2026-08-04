(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const body = doc.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const qs = (selector, scope = doc) => scope.querySelector(selector);
  const qsa = (selector, scope = doc) => [...scope.querySelectorAll(selector)];

  /* Boot sequence ------------------------------------------------------- */
  const boot = qs('#boot');
  let bootDone = false;
  const finishBoot = () => {
    if (bootDone || !boot) return;
    bootDone = true;
    boot.classList.add('is-done');
    window.setTimeout(() => boot.remove(), 900);
  };

  window.addEventListener('load', () => window.setTimeout(finishBoot, reducedMotion ? 0 : 520), { once: true });
  window.setTimeout(finishBoot, 2400);
  boot?.addEventListener('click', finishBoot, { once: true });

  /* Copyright year ----------------------------------------------------- */
  const year = qs('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* Scroll state, progress and header --------------------------------- */
  const header = qs('#siteHeader');
  const progress = qs('#scrollProgress');
  let lastScrollY = Math.max(window.scrollY, 0);
  let scrollTicking = false;

  const updateScrollUI = () => {
    const y = Math.max(window.scrollY, 0);
    const max = Math.max(doc.documentElement.scrollHeight - window.innerHeight, 1);
    const ratio = Math.min(1, y / max);

    if (progress) progress.style.width = `${ratio * 100}%`;
    if (header) {
      header.classList.toggle('is-scrolled', y > 18);
      const shouldHide = y > lastScrollY && y > 150 && !body.classList.contains('menu-open') && !body.classList.contains('modal-open');
      header.classList.toggle('is-hidden', shouldHide);
    }

    const stage = qs('#worldStage');
    if (stage && !reducedMotion) {
      const hero = qs('#world');
      const heroHeight = hero?.offsetHeight || window.innerHeight;
      const stageShift = Math.max(-18, Math.min(0, -(y / heroHeight) * 18));
      stage.style.setProperty('--stage-y', `${stageShift}px`);
    }

    lastScrollY = y;
    scrollTicking = false;
  };

  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(updateScrollUI);
    }
  }, { passive: true });
  updateScrollUI();

  /* Smooth anchors ----------------------------------------------------- */
  const scrollToTarget = (hash) => {
    if (!hash || hash === '#') return;
    const target = qs(hash);
    if (!target) return;
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  qsa('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if (!hash || !qs(hash)) return;
      event.preventDefault();
      scrollToTarget(hash);
      history.replaceState(null, '', hash);
    });
  });

  /* Mobile menu -------------------------------------------------------- */
  const menuToggle = qs('#menuToggle');
  const mobileMenu = qs('#mobileMenu');

  const setMenu = (open) => {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    body.classList.toggle('menu-open', open);
    header?.classList.remove('is-hidden');
    if (open) qsa('a', mobileMenu)[0]?.focus({ preventScroll: true });
  };

  menuToggle?.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  qsa('[data-mobile-nav]').forEach((link) => link.addEventListener('click', () => setMenu(false)));

  /* Listen modal ------------------------------------------------------- */
  const listenModal = qs('#listenModal');
  let previousFocus = null;

  const modalFocusable = () => listenModal
    ? qsa('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])', listenModal)
    : [];

  const setListenModal = (open) => {
    if (!listenModal) return;
    if (open) {
      previousFocus = doc.activeElement;
      listenModal.classList.add('is-open');
      listenModal.setAttribute('aria-hidden', 'false');
      body.classList.add('modal-open');
      header?.classList.remove('is-hidden');
      window.setTimeout(() => modalFocusable()[0]?.focus({ preventScroll: true }), 80);
    } else {
      listenModal.classList.remove('is-open');
      listenModal.setAttribute('aria-hidden', 'true');
      body.classList.remove('modal-open');
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    }
  };

  qsa('[data-open-listen]').forEach((trigger) => trigger.addEventListener('click', () => {
    setMenu(false);
    setListenModal(true);
  }));
  qsa('[data-close-listen]').forEach((trigger) => trigger.addEventListener('click', () => setListenModal(false)));

  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (listenModal?.classList.contains('is-open')) setListenModal(false);
      else if (mobileMenu?.classList.contains('is-open')) setMenu(false);
    }

    if (event.key === 'Tab' && listenModal?.classList.contains('is-open')) {
      const items = modalFocusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  /* Scroll reveal ------------------------------------------------------ */
  const revealItems = qsa('.reveal');
  if (!('IntersectionObserver' in window) || reducedMotion) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
      revealObserver.observe(item);
    });
  }

  /* Active section ----------------------------------------------------- */
  const sections = qsa('[data-section]');
  const navLinks = qsa('[data-nav]');
  const railLinks = qsa('.world-rail a');
  const lightIds = new Set(['music', 'story']);

  const updateActiveLink = (link, id) => {
    const active = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  };

  const setActiveSection = (id) => {
    navLinks.forEach((link) => updateActiveLink(link, id));
    railLinks.forEach((link) => updateActiveLink(link, id));
    body.classList.toggle('on-light-section', lightIds.has(id));
  };

  if ('IntersectionObserver' in window && sections.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: '-34% 0px -54% 0px', threshold: [0, .1, .25, .5] });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  /* Interactive world parallax ---------------------------------------- */
  const stage = qs('#worldStage');
  const heroVisual = qs('.hero__visual');
  if (stage && heroVisual && finePointer && !reducedMotion) {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;

    const animateStage = () => {
      currentX += (targetX - currentX) * 0.085;
      currentY += (targetY - currentY) * 0.085;
      stage.style.setProperty('--stage-rx', `${currentY.toFixed(2)}deg`);
      stage.style.setProperty('--stage-ry', `${currentX.toFixed(2)}deg`);
      frame = requestAnimationFrame(animateStage);
    };

    heroVisual.addEventListener('pointermove', (event) => {
      const rect = heroVisual.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - .5) * 10;
      targetY = -((event.clientY - rect.top) / rect.height - .5) * 8;
    });
    heroVisual.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; });
    frame = requestAnimationFrame(animateStage);
    window.addEventListener('pagehide', () => cancelAnimationFrame(frame), { once: true });
  }

  /* Card tilt ---------------------------------------------------------- */
  if (finePointer && !reducedMotion) {
    qsa('.tilt-card').forEach((card) => {
      let frame = 0;
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const rotateY = (px - .5) * 5.5;
          const rotateX = (.5 - py) * 5.5;
          card.style.transform = `perspective(1100px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
        });
      });
      card.addEventListener('pointerleave', () => {
        cancelAnimationFrame(frame);
        card.style.transform = '';
      });
    });
  }

  /* Magnetic controls -------------------------------------------------- */
  if (finePointer && !reducedMotion) {
    qsa('.magnetic').forEach((element) => {
      element.addEventListener('pointermove', (event) => {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        element.style.transform = `translate3d(${(x * .08).toFixed(1)}px, ${(y * .08).toFixed(1)}px, 0)`;
      });
      element.addEventListener('pointerleave', () => { element.style.transform = ''; });
    });
  }

  /* Cursor aura -------------------------------------------------------- */
  const aura = qs('#cursorAura');
  if (aura && finePointer && !reducedMotion) {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let auraFrame = 0;

    window.addEventListener('pointermove', (event) => { tx = event.clientX; ty = event.clientY; }, { passive: true });
    const moveAura = () => {
      x += (tx - x) * .12;
      y += (ty - y) * .12;
      aura.style.left = `${x}px`;
      aura.style.top = `${y}px`;
      auraFrame = requestAnimationFrame(moveAura);
    };
    auraFrame = requestAnimationFrame(moveAura);
    window.addEventListener('pagehide', () => cancelAnimationFrame(auraFrame), { once: true });
  }

  /* Vault / newsletter ------------------------------------------------- */
  const vaultForm = qs('#vaultForm');
  const vaultEmail = qs('#vaultEmail');
  const vaultMessage = qs('#vaultMessage');

  const setFormMessage = (text, type = '') => {
    if (!vaultMessage) return;
    vaultMessage.textContent = text;
    vaultMessage.classList.toggle('is-error', type === 'error');
    vaultMessage.classList.toggle('is-success', type === 'success');
  };

  try {
    if (localStorage.getItem('cdv-world-key') === 'requested') {
      setFormMessage('World key requested. You are inside the signal.', 'success');
    }
  } catch (_) { /* Storage can be unavailable in private browsing. */ }

  vaultForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(vaultForm);
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const honeypot = String(formData.get('company') || '').trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (honeypot) return;
    if (!emailPattern.test(email)) {
      setFormMessage('Enter a valid email address to request access.', 'error');
      vaultEmail?.focus();
      return;
    }

    const submit = qs('button[type="submit"]', vaultForm);
    const original = submit?.innerHTML || '';
    if (submit) {
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = 'Transmitting…';
    }
    setFormMessage('Connecting to the private channel…');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'Cuban DeVille World — Vault',
          consent: true,
          company: honeypot
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || 'Request failed');

      setFormMessage('World key requested. Watch your inbox for the next transmission.', 'success');
      vaultForm.reset();
      try { localStorage.setItem('cdv-world-key', 'requested'); } catch (_) { /* no-op */ }
    } catch (error) {
      console.error('Vault signup failed:', error);
      setFormMessage('The signal dropped. Please try again, or email bookings@cubandeville.com.', 'error');
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.innerHTML = original;
      }
    }
  });

  /* Close menu when viewport returns to desktop ----------------------- */
  const desktopQuery = window.matchMedia('(min-width: 1021px)');
  const handleDesktop = (event) => { if (event.matches) setMenu(false); };
  if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', handleDesktop);
  else desktopQuery.addListener(handleDesktop);
})();
