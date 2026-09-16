const reduceMotionV3 = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointerV3 = matchMedia('(pointer: fine)').matches;

function animateV3Hero() {
  const hero = document.querySelector('.v2-hero');
  if (!hero || reduceMotionV3 || !Element.prototype.animate) return;

  const sequence = [
    ['.v2-kicker', [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'none' }], 40, 520],
    ['.v2-hero h1', [{ opacity: 0, transform: 'translateY(34px)', clipPath: 'inset(0 0 30% 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0)' }], 110, 760],
    ['.v2-hero__lead', [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }], 270, 600],
    ['.v2-hero__actions', [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], 360, 560],
    ['.v2-proof > div', [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], 430, 520],
    ['.v2-hero__visual-stack', [{ opacity: 0, transform: 'translateX(34px) rotate(.5deg)' }, { opacity: 1, transform: 'none' }], 180, 760],
    ['.v3-hero-note', [{ opacity: 0, transform: 'translateY(8px) rotate(-5deg)' }, { opacity: 1, transform: 'rotate(-2deg)' }], 620, 500]
  ];

  sequence.forEach(([selector, frames, baseDelay, duration]) => {
    [...hero.querySelectorAll(selector)].forEach((node, index) => {
      node.animate(frames, {
        duration,
        delay: baseDelay + index * 80,
        easing: 'cubic-bezier(.22,1,.36,1)',
        fill: 'both'
      });
    });
  });
}

function setupJourneyEntries() {
  const entries = [...document.querySelectorAll('.journey-entry')];
  if (!entries.length) return;

  if (reduceMotionV3 || !('IntersectionObserver' in window)) {
    entries.forEach((entry) => entry.classList.add('is-active'));
    return;
  }

  const observer = new IntersectionObserver((items) => {
    items.forEach((item) => {
      if (!item.isIntersecting) return;
      item.target.classList.add('is-active');
      observer.unobserve(item.target);
    });
  }, { threshold: 0.28, rootMargin: '0px 0px -10% 0px' });

  entries.forEach((entry) => observer.observe(entry));
}

function setupDoodleDraw() {
  const shapes = [...document.querySelectorAll('.v3-hero-doodle path,.journey-doodle path,.journey-doodle circle')];
  if (!shapes.length || reduceMotionV3 || !Element.prototype.animate) return;

  shapes.forEach((shape, index) => {
    let length = 160;
    try {
      if (typeof shape.getTotalLength === 'function') length = Math.max(1, shape.getTotalLength());
    } catch {}

    shape.style.strokeDasharray = `${length}`;
    shape.style.strokeDashoffset = `${length}`;
    shape.animate(
      [{ strokeDashoffset: length, opacity: .15 }, { strokeDashoffset: 0, opacity: 1 }],
      {
        duration: 900 + index * 90,
        delay: 520 + index * 70,
        easing: 'cubic-bezier(.22,1,.36,1)',
        fill: 'forwards'
      }
    );
  });
}

function setupMemoryParallax() {
  if (reduceMotionV3 || !finePointerV3 || innerWidth < 981) return;

  const heroPortrait = document.querySelector('.v2-portrait img');
  const memoryImages = [...document.querySelectorAll('.journey-photo img')];
  if (!heroPortrait && !memoryImages.length) return;

  let ticking = false;
  const update = () => {
    ticking = false;

    if (heroPortrait) {
      const hero = document.querySelector('.v2-hero');
      const rect = hero?.getBoundingClientRect();
      if (rect) {
        const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - (rect.top + rect.height / 2)) / Math.max(innerHeight, 1)));
        heroPortrait.style.transform = `translateY(${progress * 7}px) scale(1.015)`;
      }
    }

    memoryImages.forEach((image) => {
      const frame = image.closest('.journey-photo');
      const rect = frame?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > innerHeight) return;
      const offset = (rect.top + rect.height / 2 - innerHeight / 2) / Math.max(innerHeight, 1);
      image.style.transform = `translateY(${Math.max(-8, Math.min(8, offset * -12))}px) scale(1.025)`;
    });
  };

  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });

  update();
}

function initJourneyV3() {
  animateV3Hero();
  setupJourneyEntries();
  setupDoodleDraw();
  setupMemoryParallax();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initJourneyV3, { once: true });
} else {
  initJourneyV3();
}
