window.App = window.App || {};
document.documentElement.classList.add('js-ready');

if (!document.querySelector('link[href="css/upgrade.css"]')) {
  const upgradeStyles = document.createElement('link');
  upgradeStyles.rel = 'stylesheet';
  upgradeStyles.href = 'css/upgrade.css';
  document.head.append(upgradeStyles);
}

if (!document.querySelector('link[href="css/portfolio-v2.css"]')) {
  const portfolioV2 = document.createElement('link');
  portfolioV2.rel = 'stylesheet';
  portfolioV2.href = 'css/portfolio-v2.css';
  document.head.append(portfolioV2);
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
    document.querySelector('.cursor')?.remove();
    await Promise.all([load('header'), load('footer')]);

    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });

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
