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

    if (document.querySelector('[data-repo-carousel]')) ensureStylesheet('css/repo-carousel.css?v=20260919-book-v1');

    const modules = [
      './navbar.js?v=20260919a', './smooth-scroll.js', './animations.js', './comparison.js',
      './counters.js', './projects.js?v=20260919a', './project-carousel.js?v=20260919a', './project-gallery.js?v=20260919a', './validation.js',
      './contact.js', './portfolio-upgrade.js'
    ];

    if (document.querySelector('[data-repo-carousel]')) modules.push('./repo-carousel.js?v=20260919-book-v1');

    const results = await Promise.allSettled(modules.map((src) => import(src)));
    results.forEach((result, index) => {
      if (result.status === 'rejected') console.error(`Optional module failed: ${modules[index]}`, result.reason);
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