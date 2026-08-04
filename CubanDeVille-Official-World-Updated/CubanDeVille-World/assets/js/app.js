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

  /* World directory modals --------------------------------------------- */
  const modalConfigs = [
    {
      modal: qs('#listenModal'),
      openSelector: '[data-open-listen]',
      closeSelector: '[data-close-listen]'
    },
    {
      modal: qs('#socialModal'),
      openSelector: '[data-open-social]',
      closeSelector: '[data-close-social]'
    }
  ].filter((config) => config.modal);

  let activeModal = null;
  let previousFocus = null;

  const modalFocusable = (modal = activeModal) => modal
    ? qsa('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])', modal)
    : [];

  const closeModal = (restoreFocus = true) => {
    if (!activeModal) return;
    const closingModal = activeModal;
    activeModal = null;
    closingModal.classList.remove('is-open');
    closingModal.setAttribute('aria-hidden', 'true');
    body.classList.remove('modal-open');
    if (restoreFocus && previousFocus instanceof HTMLElement) {
      previousFocus.focus({ preventScroll: true });
    }
  };

  const openModal = (modal) => {
    if (!modal || activeModal === modal) return;
    const originFocus = activeModal ? previousFocus : doc.activeElement;
    if (activeModal) closeModal(false);
    previousFocus = originFocus;
    activeModal = modal;
    setMenu(false);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    body.classList.add('modal-open');
    header?.classList.remove('is-hidden');
    window.setTimeout(() => modalFocusable(modal)[0]?.focus({ preventScroll: true }), 80);
  };

  modalConfigs.forEach(({ modal, openSelector, closeSelector }) => {
    qsa(openSelector).forEach((trigger) => trigger.addEventListener('click', () => openModal(modal)));
    qsa(closeSelector, modal).forEach((trigger) => trigger.addEventListener('click', () => closeModal()));
  });

  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (activeModal) closeModal();
      else if (mobileMenu?.classList.contains('is-open')) setMenu(false);
      return;
    }

    if (event.key !== 'Tab' || !activeModal) return;
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
  });

  /* Live Spotify catalogue --------------------------------------------- */
  const formatReleaseDate = (dateValue, precision = 'day') => {
    if (!dateValue) return '';
    const parts = dateValue.split('-').map((part) => Number.parseInt(part, 10));
    const yearValue = parts[0];
    const monthValue = Math.max(1, parts[1] || 1);
    const dayValue = Math.max(1, parts[2] || 1);
    const date = new Date(Date.UTC(yearValue, monthValue - 1, dayValue));
    if (Number.isNaN(date.getTime())) return dateValue;

    if (precision === 'year') return String(yearValue);
    if (precision === 'month') {
      return new Intl.DateTimeFormat('en-ZA', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(date);
    }

    return new Intl.DateTimeFormat('en-ZA', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date);
  };

  const formatShortReleaseDate = (dateValue, precision = 'day') => {
    if (!dateValue) return '';
    const [yearValue = '', monthValue = '', dayValue = ''] = dateValue.split('-');
    const shortYear = yearValue.slice(-2);
    if (precision === 'year') return yearValue;
    if (precision === 'month') return [monthValue, shortYear].filter(Boolean).join('.');
    return [dayValue, monthValue, shortYear].filter(Boolean).join('.');
  };

  const applyTitleSizing = (element, title) => {
    if (!element) return;
    element.classList.remove('is-long', 'is-very-long');
    if (title.length > 23) element.classList.add('is-very-long');
    else if (title.length > 13) element.classList.add('is-long');
  };

  const setText = (selector, value) => {
    if (!value) return;
    qsa(selector).forEach((element) => { element.textContent = value; });
  };

  const renderReleaseTicker = (releases) => {
    const ticker = qs('#releaseTicker');
    const names = releases.map((release) => release?.name).filter(Boolean).slice(0, 6);
    if (!ticker || !names.length) return;

    const fragment = doc.createDocumentFragment();
    for (let loop = 0; loop < 3; loop += 1) {
      names.forEach((name) => {
        const label = doc.createElement('span');
        label.textContent = name;
        const star = doc.createElement('i');
        star.textContent = '✦';
        fragment.append(label, star);
      });
    }
    ticker.replaceChildren(fragment);
  };

  const renderRecentReleases = (releases) => {
    const list = qs('[data-recent-releases]');
    if (!list || !Array.isArray(releases) || !releases.length) return;

    const fragment = doc.createDocumentFragment();
    releases.slice(0, 5).forEach((release) => {
      if (!release?.name || !release?.url) return;
      const link = doc.createElement('a');
      link.href = release.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = release.name;
      const dateLabel = formatReleaseDate(release.date, release.precision);
      link.title = [release.type, dateLabel].filter(Boolean).join(' · ');
      fragment.append(link);
    });

    if (fragment.childNodes.length) list.replaceChildren(fragment);
  };

  const applyLiveRelease = (release, recentReleases = []) => {
    if (!release?.name || !release?.url) return;

    qsa('[data-latest-link]').forEach((link) => {
      link.href = release.url;
      link.title = `Open ${release.name} on Spotify`;
    });

    setText('[data-latest-name]', release.name);
    setText('[data-latest-modal]', release.name);
    setText('[data-latest-short-date]', formatShortReleaseDate(release.date, release.precision));
    setText('[data-latest-type]', release.type || 'Release');
    setText('[data-latest-date]', formatReleaseDate(release.date, release.precision));
    setText('[data-latest-cta]', 'Play on Spotify');
    setText('[data-latest-description]', 'The newest official release in the Cuban DeVille catalogue. Stream it now, then move through the latest transmissions.');

    const title = qs('[data-latest-title]');
    const artTitle = qs('[data-latest-art-title]');
    if (title) title.textContent = release.name;
    if (artTitle) artTitle.textContent = release.name;
    applyTitleSizing(title, release.name);
    applyTitleSizing(artTitle, release.name);

    const releaseArt = qs('#releaseArt');
    if (releaseArt) releaseArt.setAttribute('aria-label', `Open ${release.name} by Cuban DeVille on Spotify`);

    const cover = qs('[data-release-cover]');
    const attribution = qs('.spotify-attribution');
    if (cover && release.image) {
      releaseArt?.classList.remove('has-live-cover');
      cover.hidden = false;
      cover.alt = `${release.name} cover artwork`;
      cover.onload = () => {
        releaseArt?.classList.add('has-live-cover');
        if (attribution) attribution.hidden = false;
      };
      cover.onerror = () => {
        releaseArt?.classList.remove('has-live-cover');
        cover.hidden = true;
        if (attribution) attribution.hidden = true;
      };
      cover.src = release.image;
      if (cover.complete && cover.naturalWidth > 0) cover.onload();
    }

    renderRecentReleases(recentReleases);
    renderReleaseTicker([release, ...recentReleases]);

    const syncBadge = qs('#spotifySync');
    if (syncBadge) syncBadge.hidden = false;
  };

  const loadLiveReleases = async () => {
    const controller = 'AbortController' in window ? new AbortController() : null;
    const timeout = window.setTimeout(() => controller?.abort(), 8000);

    try {
      const response = await fetch('/api/releases', {
        headers: { Accept: 'application/json' },
        signal: controller?.signal
      });
      if (!response.ok) throw new Error(`Spotify catalogue returned ${response.status}`);
      const data = await response.json();
      if (!data?.ok || !data.latest) throw new Error('Spotify catalogue response was incomplete');
      applyLiveRelease(data.latest, Array.isArray(data.recent) ? data.recent : []);
    } catch (error) {
      if (error?.name !== 'AbortError') console.info('Using the curated release fallback:', error.message);
    } finally {
      window.clearTimeout(timeout);
    }
  };

  loadLiveReleases();

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
