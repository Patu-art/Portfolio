import { createProjectCard, getProjects } from './project-data.js';

function buildCarousel(container, projects) {
  const requestedLimit = Number(container.dataset.limit || projects.length);
  const visibleProjects = projects.slice(0, Number.isFinite(requestedLimit) ? requestedLimit : projects.length);

  container.replaceChildren();
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Project carousel');

  if (!visibleProjects.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Project data could not be loaded.';
    container.append(empty);
    return;
  }

  const toolbar = document.createElement('div');
  toolbar.className = 'project-carousel__toolbar';

  const count = document.createElement('p');
  count.className = 'project-carousel__count mono-label';
  count.setAttribute('aria-live', 'polite');

  const controls = document.createElement('div');
  controls.className = 'project-carousel__controls';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'carousel-button';
  prev.setAttribute('aria-label', 'Previous project');
  prev.textContent = '←';

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'carousel-button';
  next.setAttribute('aria-label', 'Next project');
  next.textContent = '→';

  controls.append(prev, next);
  toolbar.append(count, controls);

  const viewport = document.createElement('div');
  viewport.className = 'project-carousel__viewport';
  viewport.tabIndex = 0;
  viewport.setAttribute('aria-label', 'Scrollable project cards');

  const track = document.createElement('div');
  track.className = 'project-carousel__track';

  visibleProjects.forEach((project, index) => {
    const slide = document.createElement('div');
    slide.className = 'project-carousel__slide';
    slide.dataset.slideIndex = String(index);
    slide.setAttribute('aria-label', `${project.day || `Project ${index + 1}`}: ${project.title}`);
    slide.append(createProjectCard(project, index, { carousel: true }));
    track.append(slide);
  });

  viewport.append(track);

  const dots = document.createElement('div');
  dots.className = 'project-carousel__dots';
  visibleProjects.forEach((project, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'project-carousel__dot';
    dot.setAttribute('aria-label', `Show ${project.day || `project ${index + 1}`}: ${project.title}`);
    dot.dataset.slideTarget = String(index);
    dots.append(dot);
  });

  container.append(toolbar, viewport, dots);

  const slides = [...track.children];
  const dotButtons = [...dots.children];
  let activeIndex = 0;

  const updateState = (index) => {
    activeIndex = Math.max(0, Math.min(index, slides.length - 1));
    count.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    prev.disabled = activeIndex === 0;
    next.disabled = activeIndex === slides.length - 1;
    dotButtons.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === activeIndex);
      dot.setAttribute('aria-current', dotIndex === activeIndex ? 'true' : 'false');
    });
  };

  const goTo = (index) => {
    const target = slides[Math.max(0, Math.min(index, slides.length - 1))];
    if (!target) return;
    viewport.scrollTo({ left: target.offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    updateState(Number(target.dataset.slideIndex));
  };

  prev.addEventListener('click', () => goTo(activeIndex - 1));
  next.addEventListener('click', () => goTo(activeIndex + 1));
  dotButtons.forEach((dot) => dot.addEventListener('click', () => goTo(Number(dot.dataset.slideTarget))));

  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(activeIndex + 1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(activeIndex - 1);
    }
  });

  let raf = 0;
  viewport.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const nearest = slides.reduce((best, slide, index) => {
        const distance = Math.abs(slide.offsetLeft - viewport.scrollLeft);
        return distance < best.distance ? { index, distance } : best;
      }, { index: 0, distance: Infinity });
      updateState(nearest.index);
    });
  }, { passive: true });

  updateState(0);
  window.App?.animateReveal?.(container);
  window.App?.animateProjectMedia?.(container);
}

const carousels = [...document.querySelectorAll('[data-project-carousel]')];
if (carousels.length) {
  getProjects().then((projects) => carousels.forEach((container) => buildCarousel(container, projects)));
}
