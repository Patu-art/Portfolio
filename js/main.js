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
ensureStylesheet('css/soft-blue-theme.css');
ensureStylesheet('css/mobile-nav-v2.css');
ensureStylesheet('css/portfolio-refresh.css');

(async () => {
  const load = async (name) => {
    const host = document.querySelector(`[data-component="${name}"]`);
    if (!host) return true;

    try {
      const response = await fetch(`components/${name}.html`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${name} component failed: ${response.status}`);
      host.innerHTML = await response.text();
      return true;
    } catch (error) {
      console.error(`Could not load ${name}.`, error);
      host.dataset.componentFailed = 'true';
      return false;
    }
  };

  try {
    await Promise.allSettled([load('header'), load('footer')]);

    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });

    if (document.querySelector('[data-repo-carousel]')) {
      ensureStylesheet('css/repo-carousel.css?v=20260919-horizontal-book-v4');
      ensureStylesheet('css/coverflow-v5.css?v=20260919-editorial-v5');
    }

    // The repository archive needs only navigation, reveal effects and the
    // book. Do not download/execute contact, counters, gallery and unrelated
    // widgets on this performance-sensitive page.
    const hasRepositoryBook = Boolean(document.querySelector('[data-repo-carousel]'));
    const isHome = document.body.dataset.page === 'home';
    const modules = hasRepositoryBook
      ? [
        './navbar.js?v=20260919a',
        './smooth-scroll.js',
        './animations.js',
        './repo-carousel.js?v=20260919-project-book-v1'
      ]
      : isHome
        ? [
          './navbar.js?v=20260919a', './smooth-scroll.js', './animations.js',
          './project-carousel.js?v=20260919a', './home-challenge.js?v=20260919-latest'
        ]
        : [
          './navbar.js?v=20260919a', './smooth-scroll.js', './animations.js', './comparison.js',
          './counters.js', './projects.js?v=20260919a', './project-carousel.js?v=20260919a',
          './project-gallery.js?v=20260919a', './validation.js',
          './contact.js', './portfolio-upgrade.js'
        ];

    const results = await Promise.allSettled(modules.map((src) => import(src)));
    results.forEach((result, index) => {
      if (result.status === 'rejected') console.error(`Optional module failed: ${modules[index]}`, result.reason);
    });

    // An unavailable animation module must not leave visible content permanently hidden.
    const revealIndex = modules.findIndex((src) => src === './animations.js');
    if (revealIndex >= 0 && results[revealIndex]?.status === 'rejected') {
      document.querySelectorAll('[data-reveal], [data-stagger] > *').forEach((item) => {
        item.classList.add('is-visible');
      });
    }

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