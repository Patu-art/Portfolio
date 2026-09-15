function makeSiteproSection() {
  const anchor = document.querySelector('.projects-featured');
  if (!anchor || document.querySelector('.sitepro-showcase')) return;

  const section = document.createElement('section');
  section.className = 'section sitepro-showcase';
  section.innerHTML = `
    <div class="shell sitepro-showcase__grid">
      <div class="sitepro-showcase__copy" data-reveal="left">
        <p class="eyebrow">BUILDING IN PUBLIC / SITEPRO</p>
        <h2>One standard.<br><em>Better websites.</em></h2>
        <p>SITEPRO is the system I am developing to make website work more disciplined: research the real business first, define a visual direction, build useful interactions, verify facts, test mobile behavior and ship only what can survive the browser.</p>
        <div class="sitepro-showcase__status"><i></i> Product concept / actively evolving</div>
        <div class="sitepro-showcase__actions">
          <a class="button button--paper magnetic" href="sitepro.html">Explore SITEPRO ↗</a>
          <a class="button button--ghost magnetic" href="process.html">See my workflow ↗</a>
        </div>
      </div>
      <div class="sitepro-showcase__diagram" data-reveal="right" aria-label="SITEPRO workflow diagram">
        <div class="sitepro-flow">
          <div class="sitepro-flow__step"><b>01</b><strong>Research the business</strong><span>BRAND / AUDIENCE / REGION</span></div>
          <div class="sitepro-flow__step"><b>02</b><strong>Define the visual system</strong><span>TYPE / COLOR / HIERARCHY</span></div>
          <div class="sitepro-flow__step"><b>03</b><strong>Design for usefulness</strong><span>UX / CONTENT / MOBILE</span></div>
          <div class="sitepro-flow__step"><b>04</b><strong>Build the real browser version</strong><span>HTML / CSS / JS</span></div>
          <div class="sitepro-flow__step"><b>05</b><strong>QA before calling it done</strong><span>ACCESSIBILITY / PERFORMANCE / FACTS</span></div>
          <div class="sitepro-flow__step"><b>06</b><strong>Deploy and learn</strong><span>GITHUB / OUTREACH / ITERATION</span></div>
        </div>
        <div class="sitepro-tools" aria-label="Tools used in the wider workflow">
          <span>GitHub</span><span>Figma</span><span>Canva</span><span>Vercel</span><span>Supabase</span><span>Higgsfield</span><span>Research</span><span>+ more</span>
        </div>
      </div>
    </div>`;
  anchor.insertAdjacentElement('afterend', section);
}

function refreshTruthCopy() {
  document.querySelectorAll('.project-truth-strip').forEach((strip) => {
    const spans = [...strip.querySelectorAll('span')];
    if (!spans.length) return;
    if (document.body.dataset.page === 'projects') {
      strip.querySelector('strong').textContent = 'HONEST STATUS';
      const copy = [
        'DAY 01–03 = shipped challenge builds',
        'DAY 04 = in progress',
        'PERSONAL LAB = experiment',
        'No future day is labelled complete before it is actually built.'
      ];
      spans.forEach((span, i) => span.textContent = copy[i] || '');
    } else {
      strip.querySelector('strong').textContent = 'PROJECT STATUS';
      const copy = [
        'SHIPPED = live/public build',
        'IN PROGRESS = actively being finished',
        'EXPERIMENT = personal learning build',
        'Future challenge days appear only after real work exists.'
      ];
      spans.forEach((span, i) => span.textContent = copy[i] || '');
    }
  });
}

function refreshHomepageProof() {
  if (document.body.dataset.page !== 'prathamesh-dhumal') return;
  const count = document.querySelector('.hero-home__proof [data-count]');
  if (count) count.dataset.count = '3';
}

function addSiteproNav() {
  document.querySelectorAll('.desktop-nav').forEach((nav) => {
    if (nav.querySelector('a[href="sitepro.html"]')) return;
    const link = document.createElement('a');
    link.href = 'sitepro.html';
    link.textContent = 'SITEPRO';
    const process = nav.querySelector('a[href="process.html"]');
    nav.insertBefore(link, process || null);
  });
  document.querySelectorAll('.mobile-menu nav').forEach((nav) => {
    if (nav.querySelector('a[href="sitepro.html"]')) return;
    const link = document.createElement('a');
    link.href = 'sitepro.html';
    link.textContent = 'SITEPRO';
    const process = nav.querySelector('a[href="process.html"]');
    nav.insertBefore(link, process || null);
  });
}

function init() {
  makeSiteproSection();
  refreshTruthCopy();
  refreshHomepageProof();
  addSiteproNav();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
window.addEventListener('app:ready', init);
