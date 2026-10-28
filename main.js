/* WF Odontologia: interações */
(() => {
  window.__wf = true;

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Entrada dos elementos ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
  $$('.reveal, [data-unveil], [data-line], [data-steps]').forEach((el) => io.observe(el));

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Nav: some ao descer, volta ao subir ---------- */
  const nav = $('[data-nav]');
  let lastY = window.scrollY;
  let ticking = false;
  let menuOpen = false;

  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 24);
    if (!menuOpen) {
      if (y > 240 && y > lastY + 6) nav.classList.add('is-hidden');
      else if (y < lastY - 6 || y < 240) nav.classList.remove('is-hidden');
    }
    lastY = y;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Link ativo na navegação ---------- */
  const navLinks = $$('.nav__links a');
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((a) => { const s = $(a.getAttribute('href')); if (s) sectionIO.observe(s); });

  /* ---------- Âncoras: rolagem suave nativa ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id === '#main' || id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      if (menuOpen) setMenu(false);
      const top = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - nav.offsetHeight - 16;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  /* ---------- Perguntas frequentes ---------- */
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
  }
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { setMenu(false); menuBtn.focus(); } });
  window.matchMedia('(min-width: 1101px)').addEventListener('change', (e) => { if (e.matches && menuOpen) setMenu(false); });

  /* ---------- Seletor de unidade ---------- */
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
  }));
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
    const endEls = $$('.cta, .footer, .clinics');
    const endIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { e.target.dataset.vis = e.isIntersecting ? '1' : ''; });
      state.nearEnd = endEls.some((el) => el.dataset.vis === '1');
      sync();
    });
    endEls.forEach((el) => endIO.observe(el));
  }
})();
