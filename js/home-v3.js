const stage = document.querySelector('[data-home-stage]');

if (stage && matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let raf = 0;

  stage.addEventListener('pointermove', (event) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const box = stage.getBoundingClientRect();
      const x = ((event.clientX - box.left) / box.width - .5) * 2;
      const y = ((event.clientY - box.top) / box.height - .5) * 2;
      stage.style.setProperty('--mx', x.toFixed(3));
      stage.style.setProperty('--my', y.toFixed(3));
    });
  });

  stage.addEventListener('pointerleave', () => {
    stage.style.setProperty('--mx', '0');
    stage.style.setProperty('--my', '0');
  });
}

const timeline = document.querySelector('[data-home-timeline]');
if (timeline) {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    timeline.classList.add('is-inview');
  } else {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      timeline.classList.add('is-inview');
      observer.disconnect();
    }, { threshold: .25 });
    observer.observe(timeline);
  }
}
