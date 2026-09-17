const header = document.querySelector('[data-header]');
const toggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('.mobile-menu');

const setScrolled = () => header?.classList.toggle('is-scrolled', scrollY > 24);
setScrolled();
addEventListener('scroll', setScrolled, { passive: true });

if (toggle && menu) {
  let lastFocused = null;

  const close = (restoreFocus = false) => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');

    if (restoreFocus && lastFocused instanceof HTMLElement) {
      lastFocused.focus();
    }
  };

  const open = () => {
    lastFocused = document.activeElement;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    document.body.classList.add('menu-open');

    requestAnimationFrame(() => {
      menu.querySelector('a')?.focus({ preventScroll: true });
    });
  };

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    isOpen ? close(true) : open();
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => close(false));
  });

  addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      close(true);
    }
  });

  addEventListener('resize', () => {
    if (innerWidth > 1100 && toggle.getAttribute('aria-expanded') === 'true') {
      close(false);
    }
  }, { passive: true });
}
