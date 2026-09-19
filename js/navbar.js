const header = document.querySelector('[data-header]');
const toggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('.mobile-menu');

const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 24);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

if (header && toggle && menu) {
  // A fixed overlay nested inside a backdrop-filtered header is positioned
  // relative to that header in browsers. Put it beside the header instead.
  if (header.contains(menu)) header.after(menu);

  let restoreTarget = toggle;
  menu.inert = true;
  menu.setAttribute('aria-hidden', 'true');

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  function close(restoreFocus = true) {
    if (!isOpen()) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    menu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    if (restoreFocus) (restoreTarget?.isConnected ? restoreTarget : toggle).focus({ preventScroll: true });
    menu.inert = true;
    menu.setAttribute('aria-hidden', 'true');
  }

  function open() {
    restoreTarget = document.activeElement instanceof HTMLElement ? document.activeElement : toggle;
    menu.inert = false;
    menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    menu.classList.add('is-open');
    document.body.classList.add('menu-open');
    window.requestAnimationFrame(() => {
      if (isOpen()) menu.querySelector('nav a[href]')?.focus({ preventScroll: true });
    });
  }

  toggle.addEventListener('click', () => isOpen() ? close() : open());

  menu.addEventListener('click', (event) => {
    if (event.target === menu) close();
  });
  menu.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', () => close(false));
  });

  document.addEventListener('keydown', (event) => {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const links = [...menu.querySelectorAll('a[href]')];
    const focusables = [toggle, ...links];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!focusables.includes(document.activeElement)) {
      event.preventDefault();
      (links[0] || toggle).focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1100) close(false);
  }, { passive: true });
}
