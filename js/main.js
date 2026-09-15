window.App = window.App || {};
document.documentElement.classList.add('js-ready');

function ensureStylesheet(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.append(link);
}

ensureStylesheet('css/upgrade.css');
ensureStylesheet('css/portfolio-v2.css');
ensureStylesheet('css/sitepro-theme.css');

function setupCustomCursor() {
  const finePointer = matchMedia('(pointer: fine)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || reduceMotion) return;

  document.querySelector('.cursor')?.remove();

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');

  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');

  document.body.append(dot, ring);
  document.documentElement.classList.add('has-custom-cursor');

  let mouseX = innerWidth / 2;
  let mouseY = innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let raf = 0;

  const animate = () => {
    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;

    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;

    raf = requestAnimationFrame(animate);
  };

  addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    document.documentElement.classList.add('cursor-visible');
  }, { passive: true });

  addEventListener('mouseleave', () => {
    document.documentElement.classList.remove('cursor-visible');
  });

  addEventListener('mouseenter', () => {
    document.documentElement.classList.add('cursor-visible');
  });

  const interactiveSelector = 'a, button, input, textarea, select, label, [role="button"], .project-card, .challenge-card, .magnetic';

  document.addEventListener('mouseover', (event) => {
    if (event.target.closest?.(interactiveSelector)) ring.classList.add('is-active');
  });

  document.addEventListener('mouseout', (event) => {
    const fromInteractive = event.target.closest?.(interactiveSelector);
    const toInteractive = event.relatedTarget?.closest?.(interactiveSelector);
    if (fromInteractive && !toInteractive) ring.classList.remove('is-active');
  });

  raf = requestAnimationFrame(animate);
  addEventListener('pagehide', () => cancelAnimationFrame(raf), { once: true });
}

(async () => {
  const load = async (name) => {
    const host = document.querySelector(`[data-component="${name}"]`);
    if (!host) return;

    const response = await fetch(`components/${name}.html`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${name} component failed: ${response.status}`);
    host.innerHTML = await response.text();
  };

  try {
    await Promise.all([load('header'), load('footer')]);

    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });

    setupCustomCursor();

    const modules = [
      './navbar.js',
      './smooth-scroll.js',
      './animations.js',
      './comparison.js',
      './counters.js',
      './projects.js',
      './project-carousel.js',
      './validation.js',
      './contact.js',
      './portfolio-upgrade.js'
    ];

    const results = await Promise.allSettled(modules.map((src) => import(src)));
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Optional module failed: ${modules[index]}`, result.reason);
      }
    });

    const path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.desktop-nav a,.mobile-menu nav a').forEach((link) => {
      if (link.getAttribute('href') === path) link.setAttribute('aria-current', 'page');
    });

    window.dispatchEvent(new Event('app:ready'));
  } catch (error) {
    console.error('Portfolio startup failed.', error);
  } finally {
    document.querySelector('.site-loader')?.remove();
    document.documentElement.classList.add('app-loaded');
  }
})();