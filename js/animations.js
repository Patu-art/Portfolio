const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;

function nativeReveal(root = document) {
  const revealItems = [...root.querySelectorAll('[data-reveal]:not(.is-visible)')];
  const staggerGroups = [...root.querySelectorAll('[data-stagger]:not([data-stagger-ready])')];

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    staggerGroups.forEach((group) => [...group.children].forEach((child) => child.classList.add('is-visible')));
    return;
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

  revealItems.forEach((item) => revealObserver.observe(item));

  const staggerObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      [...entry.target.children].forEach((child, index) => {
        child.style.transitionDelay = `${index * 85}ms`;
        child.classList.add('is-visible');
      });
      staggerObserver.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });

  staggerGroups.forEach((group) => {
    group.dataset.staggerReady = 'true';
    staggerObserver.observe(group);
  });
}

function setupHeroMotion() {
  const hero = document.querySelector('.hero-home');
  if (!hero || reduceMotion || !Element.prototype.animate) return;

  const queue = [
    ['.hero-home__stamp', [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'none' }], 0],
    ['.hero-home h1 .word', [{ transform: 'translateY(118%)' }, { transform: 'none' }], 90],
    ['.hero-home__lead', [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }], 300],
    ['.hero-home__actions', [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], 390],
    ['.hero-home__proof > div', [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], 450],
    ['.hero-home__visual', [{ opacity: 0, transform: 'translateX(42px)' }, { opacity: 1, transform: 'none' }], 180]
  ];

  queue.forEach(([selector, frames, baseDelay]) => {
    [...document.querySelectorAll(selector)].forEach((node, index) => {
      node.animate(frames, {
        duration: selector.includes('.word') ? 780 : 560,
        delay: baseDelay + index * (selector.includes('.word') ? 90 : 70),
        easing: 'cubic-bezier(.22,1,.36,1)',
        fill: 'both'
      });
    });
  });

  const image = hero.querySelector('.portrait-board__image');
  const overlay = hero.querySelector('.portrait-board__overlay');
  if (!image) return;

  let ticking = false;
  const update = () => {
    ticking = false;
    const rect = hero.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
    image.style.transform = `translateY(${progress * 7}%) scale(1.02)`;
    if (overlay) overlay.style.opacity = String(1 - progress * 0.2);
  };
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}

function setupBlueprintDraws() {
  const lines = [...document.querySelectorAll('.blueprint-draw')];
  if (!lines.length) return;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    lines.forEach((line) => line.classList.add('is-drawn'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-drawn');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2 });
  lines.forEach((line) => observer.observe(line));
}

function setupProcessState() {
  const steps = [...document.querySelectorAll('.process-step')];
  if (!steps.length) return;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    steps.forEach((step) => step.classList.add('is-active'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-active', entry.isIntersecting));
  }, { threshold: 0, rootMargin: '-42% 0px -42% 0px' });
  steps.forEach((step) => observer.observe(step));
}

function setupScrollProgress() {
  const bar = document.querySelector('.scroll-progress span');
  if (!bar) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    bar.style.transform = `scaleX(${Math.min(1, scrollY / max)})`;
  };
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}

function setupMagneticButtons(root = document) {
  if (reduceMotion || !finePointer) return;
  root.querySelectorAll('.magnetic:not([data-magnetic-ready])').forEach((element) => {
    element.dataset.magneticReady = 'true';
    element.addEventListener('mousemove', (event) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * 0.12;
      const y = (event.clientY - rect.top - rect.height / 2) * 0.15;
      element.style.transform = `translate(${x}px, ${y}px)`;
    });
    element.addEventListener('mouseleave', () => { element.style.transform = ''; });
  });
}

function animateProjectMedia(root = document) {
  if (reduceMotion) return;
  const cards = [...root.querySelectorAll('.project-card:not([data-parallax-ready])')];
  cards.forEach((card) => { card.dataset.parallaxReady = 'true'; });
  if (!cards.length) return;

  let ticking = false;
  const update = () => {
    ticking = false;
    cards.forEach((card) => {
      const image = card.querySelector('.project-card__media img');
      if (!image) return;
      const rect = card.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      const center = rect.top + rect.height / 2;
      const offset = (center - innerHeight / 2) / Math.max(innerHeight, 1);
      image.style.setProperty('--project-parallax', `${Math.max(-10, Math.min(10, offset * -14))}px`);
    });
  };
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}

function animateReveal(root = document) {
  nativeReveal(root);
  setupMagneticButtons(root);
}

window.App = window.App || {};
window.App.animateReveal = animateReveal;
window.App.animateProjectMedia = animateProjectMedia;

animateReveal(document);
setupHeroMotion();
setupBlueprintDraws();
setupProcessState();
setupScrollProgress();
animateProjectMedia(document);

function dismissSiteLoader() {
  const loader = document.querySelector('.site-loader');

  if (!loader || loader.dataset.dismissing === 'true') return;

  loader.dataset.dismissing = 'true';

  const removeLoader = () => loader.remove();

  if (reduceMotion || !Element.prototype.animate) {
    removeLoader();
    return;
  }

  const animation = loader.animate(
    [
      { opacity: 1 },
      { opacity: 0 }
    ],
    {
      duration: 380,
      delay: 120,
      easing: 'ease-out',
      fill: 'forwards'
    }
  );

  animation.addEventListener('finish', removeLoader, {
    once: true
  });

  // Backup in case the animation finish event fails
  setTimeout(removeLoader, 900);
}

if (document.readyState === 'complete') {
  dismissSiteLoader();
} else {
  addEventListener('load', dismissSiteLoader, {
    once: true
  });
}

// Final emergency backup
setTimeout(dismissSiteLoader, 1800);
