import { getProjects, safeExternalUrl } from './project-data.js?v=20260919a';

const mount = document.querySelector('[data-work-gallery]');
if (mount) {
  const filterBar = document.querySelector('[data-work-filters]');
  const counter = document.querySelector('[data-work-count]');

  const el = (tag, cls = '', value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  };

  function makeCard(project, index) {
    const card = el('article', 'work-card');
    card.style.setProperty('--work-index', String(index % 8));
    card.dataset.group = project.day && project.day.startsWith('DAY ') ? 'challenge' : 'personal';

    const detail = 'project-details.html?project=' + encodeURIComponent(project.slug);
    const media = el('a', 'work-card__media');
    media.href = detail;
    media.setAttribute('aria-label', 'Read ' + project.title + ' case study');
    media.append(el('span', 'work-card__stamp', project.day || 'PROJECT'));

    const placeholder = () => {
      const frame = el('div', 'work-card__placeholder');
      frame.append(el('small', '', 'PROJECT SNAPSHOT'), el('strong', '', project.title), el('small', '', 'SCREENSHOT TO BE ADDED'));
      return frame;
    };

    if (project.image) {
      const image = el('img');
      image.src = project.image;
      image.alt = project.title + ' website screenshot';
      image.loading = index < 2 ? 'eager' : 'lazy';
      image.decoding = 'async';
      image.width = 1200;
      image.height = 750;
      image.addEventListener('error', () => image.replaceWith(placeholder()), { once: true });
      media.append(image);
    } else {
      media.append(placeholder());
    }

    const body = el('div', 'work-card__body');
    const meta = el('div', 'work-card__meta');
    meta.append(el('span', '', project.category || 'PROJECT'), el('span', 'work-card__status', project.status || 'IN PROGRESS'));
    const title = el('h3', '', project.title);
    const description = el('p', '', project.summary || 'Project details coming soon.');
    const links = el('div', 'work-card__links');

    const makeLink = (label, href, external = false) => {
      const a = el('a', '', label);
      a.href = href;
      if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      links.append(a);
    };
    makeLink('Explore case study ↗', detail);
    const live = safeExternalUrl(project.live);
    const source = safeExternalUrl(project.source);
    if (live) makeLink('Live website ↗', live, true);
    if (source) makeLink('GitHub ↗', source, true);
    body.append(meta, title, description, links);
    card.append(media, body);
    return card;
  }

  getProjects().then((projects) => {
    if (!projects.length) {
      mount.replaceChildren(el('p', 'work-empty', 'Project details are temporarily unavailable. Please try refreshing the page.'));
      return;
    }

    const cards = projects.map(makeCard);
    mount.replaceChildren(...cards);
    const filters = [...(filterBar?.querySelectorAll('button[data-filter]') || [])];

    const applyFilter = (name) => {
      let visible = 0;
      cards.forEach((card) => {
        const match = name === 'all' || card.dataset.group === name;
        card.hidden = !match;
        if (match) visible++;
      });
      filters.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === name)));
      if (counter) counter.textContent = visible + (visible === 1 ? ' project shown' : ' projects shown');
    };

    filters.forEach((button) => button.addEventListener('click', () => applyFilter(button.dataset.filter)));
    applyFilter('all');
  }).catch((error) => {
    console.error('Project gallery could not initialize.', error);
    mount.replaceChildren(el('p', 'work-empty', 'Could not load the project gallery. Please refresh the page.'));
  });
}
