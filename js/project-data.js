let cache = null;

export async function getProjects() {
  if (cache) return cache;

  try {
    const response = await fetch('data/projects.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Project data request failed: ${response.status}`);
    const data = await response.json();
    cache = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Could not load project data.', error);
    cache = [];
  }

  return cache;
}

export function safeExternalUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, location.href);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function makeLink(label, href, external = false) {
  const link = document.createElement('a');
  link.textContent = label;
  link.href = href;
  if (external) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  return link;
}

function makeStatus(project) {
  const status = document.createElement('span');
  status.className = `project-status project-status--${project.status_key || 'pending'}`;
  status.textContent = project.status || 'STATUS PENDING';
  return status;
}

function makeTags(items = []) {
  const list = document.createElement('div');
  list.className = 'tag-list';
  items.forEach((item) => {
    const tag = document.createElement('span');
    tag.textContent = item;
    list.append(tag);
  });
  return list;
}

export function createProjectCard(project, index = 0, options = {}) {
  const article = document.createElement('article');
  article.className = `project-card${options.carousel ? ' project-card--carousel' : ''}`;
  article.dataset.reveal = 'scale';

  const media = document.createElement('div');
  media.className = 'project-card__media';

  const indexLabel = document.createElement('span');
  indexLabel.className = 'project-card__index';
  const lead = project.day || String(index + 1).padStart(2, '0');
  indexLabel.textContent = `${lead} / ${String(project.category || 'Project').toUpperCase()}`;

  const image = document.createElement('img');
  image.src = project.image;
  image.alt = `${project.title} project preview`;
  image.width = 1200;
  image.height = 760;
  image.loading = index === 0 && options.carousel ? 'eager' : 'lazy';

  media.append(indexLabel, image);

  const body = document.createElement('div');
  body.className = 'project-card__body';

  const top = document.createElement('div');
  top.className = 'project-card__topline';
  const meta = document.createElement('div');
  meta.className = 'project-card__meta';
  const locationText = document.createElement('span');
  locationText.textContent = project.location || 'Location not set';
  const year = document.createElement('span');
  year.textContent = project.year || 'Year not set';
  meta.append(locationText, year);
  top.append(meta, makeStatus(project));

  const title = document.createElement('h3');
  title.textContent = project.title;
  const summary = document.createElement('p');
  summary.textContent = project.summary;

  const links = document.createElement('div');
  links.className = 'project-card__links';
  links.append(makeLink('Case study ↗', `project-details.html?project=${encodeURIComponent(project.slug)}`));

  const live = safeExternalUrl(project.live);
  if (live) links.append(makeLink('Live ↗', live, true));

  const source = safeExternalUrl(project.source);
  if (source) links.append(makeLink('Code ↗', source, true));

  body.append(top, title, summary, makeTags(project.stack), links);
  article.append(media, body);
  return article;
}

export function createProjectStatus(project) {
  return makeStatus(project);
}
