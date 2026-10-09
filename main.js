/* WF Odontologia — interações e movimento */
(() => {
  window.__wf = true;

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.matchMedia('(min-width: 901px) and (pointer: fine)');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Scroll suave ----------
     lerp em vez de duration: responde na hora ao gesto e só suaviza a chegada,
     então não "arrasta" a página. Só no desktop; no toque fica o scroll nativo. */
  let lenis = null;
  if (!reduceMotion && window.Lenis && isDesktop.matches) {
    lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true });
  }
  const lockScroll = (lock) => {
    if (lenis) lock ? lenis.stop() : lenis.start();
  };

  /* ---------- Quebra de texto em palavras ---------- */
  const splitInto = (el, wrap) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let i = 0;
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(' '); return; }
        frag.append(wrap(part, i++));
      });
      node.replaceWith(frag);
    });
    return i;
  };

  if (!reduceMotion) {
    $$('[data-split]').forEach((el) => {
      splitInto(el, (word, i) => {
        const w = document.createElement('span');
        const wi = document.createElement('span');
        w.className = 'w';
        wi.className = 'wi';
        wi.style.setProperty('--i', i);
        wi.textContent = word;
        w.append(wi);
        return w;
      });
    });
  }

  const scrubbers = $$('[data-scrub]').map((el) => {
    if (reduceMotion) return null;
    splitInto(el, (word) => {
      const s = document.createElement('span');
      s.className = 'sw';
      s.textContent = word;
      return s;
    });
    return { el, words: $$('.sw', el), lit: -1 };
  }).filter(Boolean);

  /* ---------- Contadores ---------- */
  const counters = $$('[data-count]');
  const formatCount = (el, value) => {
    const decimals = Number(el.dataset.decimals || 0);
    const fmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return fmt.format(value) + (el.dataset.suffix || '');
  };
  if (!reduceMotion) counters.forEach((el) => { el.textContent = formatCount(el, 0); });

  const countUp = (el) => {
    const target = Number(el.dataset.count);
    const duration = 2000;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = formatCount(el, target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---------- Entrada dos elementos ---------- */
  const startReveals = () => {
    root.classList.add('is-ready');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('is-in');
        if (el.hasAttribute('data-count') && !reduceMotion) {
          setTimeout(() => countUp(el), parseInt(getComputedStyle(el.closest('.stat') || el).getPropertyValue('--d'), 10) || 0);
        }
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });

    $$('.reveal, [data-split], [data-unveil], [data-line], [data-steps], [data-count]').forEach((el) => io.observe(el));
  };

  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(startReveals);

  /* ---------- Relógio (horário de SC) ---------- */
  const clocks = $$('[data-clock]');
  if (clocks.length) {
    const fmtTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    const tickClock = () => { const s = fmtTime.format(new Date()); clocks.forEach((c) => { c.textContent = s; }); };
    tickClock();
    setInterval(tickClock, 30000);
  }
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Scroll: nav, parallax, scrub ----------
     Só calcula quando a rolagem muda; parallax só no desktop. */
  const nav = $('[data-nav]');
  const parallaxEls = (reduceMotion || !isDesktop.matches) ? [] : $$('[data-parallax]').map((el) => ({
    el, frame: el.parentElement, speed: parseFloat(el.dataset.parallax) || 0.08,
  }));
  let lastY = window.scrollY;
  let vh = window.innerHeight;
  let menuOpen = false;
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = window.scrollY;

    if (nav) {
      nav.classList.toggle('is-scrolled', y > 24);
      if (!menuOpen) {
        if (y > 240 && y > lastY + 6) nav.classList.add('is-hidden');
        else if (y < lastY - 6 || y < 240) nav.classList.remove('is-hidden');
      }
    }
    lastY = y;

    parallaxEls.forEach((p) => {
      const r = p.frame.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const offset = (r.top + r.height / 2 - vh / 2) * -p.speed;
      p.el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });

    scrubbers.forEach((s) => {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const start = vh * 0.82;
      const end = vh * 0.38;
      const p = Math.min(1, Math.max(0, (start - r.top) / (r.height + start - end)));
      const lit = Math.round(p * s.words.length);
      if (lit === s.lit) return;
      s.words.forEach((w, i) => w.classList.toggle('on', i < lit));
      s.lit = lit;
    });
  };

  const requestUpdate = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };

  if (lenis) {
    lenis.on('scroll', requestUpdate);
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  } else {
    window.addEventListener('scroll', requestUpdate, { passive: true });
  }
  window.addEventListener('resize', () => { vh = window.innerHeight; requestUpdate(); }, { passive: true });
  update();

  /* ---------- Link ativo na navegação ---------- */
  const navLinks = $$('.nav__links a');
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((a) => { const s = $(a.getAttribute('href')); if (s) sectionIO.observe(s); });

  /* ---------- Âncoras ---------- */
  const scrollToTarget = (target) => {
    // Mira no rótulo da seção (não no padding), com respiro abaixo da nav
    const anchor = target.id === 'top' ? target : ($('.label', target) || target);
    const offset = target.id === 'top' ? 0 : -(parseInt(getComputedStyle(root).getPropertyValue('--nav-h'), 10) || 72) - 40;
    if (lenis) lenis.scrollTo(anchor, { offset, duration: 1.4 });
    else window.scrollTo({ top: anchor.getBoundingClientRect().top + window.scrollY + offset, behavior: reduceMotion ? 'auto' : 'smooth' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id === '#main' || id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      if (menuOpen) setMenu(false);
      scrollToTarget(target);
    });
  });

  /* ---------- Accordion ---------- */
  $$('[data-accordion]').forEach((group) => {
    const items = $$('.acc__item', group);
    items.forEach((item) => {
      const btn = $('.acc__btn', item);
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        items.forEach((other) => {
          if (other !== item && other.classList.contains('is-open')) {
            other.classList.remove('is-open');
            $('.acc__btn', other).setAttribute('aria-expanded', 'false');
          }
        });
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  });

  /* ---------- Menu mobile ---------- */
  const menu = $('#menu');
  const menuBtn = $('[data-menu]');
  const menuLabel = $('.nav__menu-label');

  function setMenu(open) {
    menuOpen = open;
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuLabel.textContent = open ? 'Fechar' : 'Menu';
    nav.classList.remove('is-hidden');
    lockScroll(open);
  }
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { setMenu(false); menuBtn.focus(); } });
  window.matchMedia('(min-width: 1101px)').addEventListener('change', (e) => { if (e.matches && menuOpen) setMenu(false); });

  /* ---------- Seletor de unidade (dialog) ---------- */
  const dialog = $('#book');
  const closeDialog = () => {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    if (reduceMotion) { dialog.close(); return; }
    dialog.classList.add('is-closing');
    dialog.addEventListener('animationend', () => {
      dialog.classList.remove('is-closing');
      dialog.close();
    }, { once: true });
  };

  $$('[data-book]').forEach((btn) => btn.addEventListener('click', () => {
    if (menuOpen) setMenu(false);
    dialog.showModal();
    lockScroll(true);
  }));
  dialog.addEventListener('close', () => lockScroll(false));
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeDialog(); });
  $$('[data-close]', dialog).forEach((b) => b.addEventListener('click', closeDialog));
  $$('[data-close-after]', dialog).forEach((a) => a.addEventListener('click', () => setTimeout(closeDialog, 150)));

  /* ---------- Barra de agendamento (mobile) ---------- */
  const dock = $('[data-dock]');
  if (dock) {
    const dockBtn = $('button', dock);
    const state = { pastHero: false, nearEnd: false };
    const sync = () => {
      const visible = state.pastHero && !state.nearEnd;
      dock.classList.toggle('is-visible', visible);
      dockBtn.tabIndex = visible ? 0 : -1;
    };
    new IntersectionObserver(([e]) => { state.pastHero = !e.isIntersecting; sync(); })
      .observe($('.hero__ctas'));
    const endIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { e.target.dataset.vis = e.isIntersecting ? '1' : ''; });
      state.nearEnd = $$('.cta, .footer').some((el) => el.dataset.vis === '1');
      sync();
    });
    $$('.cta, .footer').forEach((el) => endIO.observe(el));
  }
})();
