import { createProjectStatus, getProjects, safeExternalUrl } from './project-data.js';

const detail = document.querySelector('[data-project-detail]');

function appendText(parent, tag, text, className = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  parent.append(node);
  return node;
}

function makeTags(items = []) {
  const list = document.createElement('div');
  list.className = 'tag-list';
  items.forEach((item) => appendText(list, 'span', item));
  return list;
}

async function renderProjectDetail() {
  if (!detail) return;
  const projects = await getProjects();
  if (!projects.length) {
    detail.textContent = 'Project data could not be loaded.';
    return;
  }

  const slug = new URLSearchParams(location.search).get('project') || projects[0].slug;
  const project = projects.find((item) => item.slug === slug) || projects[0];
  document.title = `${project.title} — Prathamesh Dhumal`;
  detail.replaceChildren();

  const hero = document.createElement('section');
  hero.className = 'case-hero';
  const shell = document.createElement('div');
  shell.className = 'shell';
  const rail = document.createElement('div');
  rail.className = 'case-hero__rail';
  appendText(rail, 'span', `CASE STUDY / ${project.category}`, 'mono-label');
  const back = document.createElement('a');
  back.className = 'mono-label';
  back.href = 'projects.html';
  back.textContent = '← ALL PROJECTS';
  rail.append(back);

  const title = appendText(shell, 'h1', project.title);
  title.dataset.reveal = 'clip';

  const statusRow = document.createElement('div');
  statusRow.className = 'case-hero__status';
  appendText(statusRow, 'span', project.day || 'PROJECT', 'mono-label');
  statusRow.append(createProjectStatus(project));

  const meta = document.createElement('div');
  meta.className = 'case-hero__meta';
  [['YEAR', project.year], ['LOCATION', project.location], ['TYPE', project.category], ['STATUS', project.status]].forEach(([label, value]) => {
    const item = document.createElement('div');
    appendText(item, 'span', label);
    appendText(item, 'strong', value);
    meta.append(item);
  });

  shell.prepend(rail);
  shell.append(statusRow, meta);
  hero.append(shell);

  const mediaSection = document.createElement('section');
  mediaSection.className = 'case-media shell';
  const image = document.createElement('img');
  image.src = project.image;
  image.alt = `${project.title} preview`;
  image.width = 1200;
  image.height = 760;
  mediaSection.append(image);

  const storySection = document.createElement('section');
  storySection.className = 'section';
  const storyShell = document.createElement('div');
  storyShell.className = 'shell case-story';
  const railCol = document.createElement('aside');
  railCol.className = 'case-story__rail';
  appendText(railCol, 'p', project.day || project.category, 'mono-label');
  railCol.append(makeTags(project.stack));

  const body = document.createElement('div');
  body.className = 'case-story__body';
  appendText(body, 'p', project.summary, 'case-story__lead');
  appendText(body, 'h2', 'Challenge');
  appendText(body, 'p', project.challenge);
  appendText(body, 'h2', 'Solution');
  appendText(body, 'p', project.solution);
  appendText(body, 'h2', 'Outcome');
  appendText(body, 'p', project.outcome);

  const actions = document.createElement('div');
  actions.className = 'case-story__actions';
  const live = safeExternalUrl(project.live);
  const source = safeExternalUrl(project.source);
  if (live) {
    const link = document.createElement('a');
    link.className = 'button button--paper magnetic';
    link.href = live;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open live build ↗';
    actions.append(link);
  }
  if (source) {
    const link = document.createElement('a');
    link.className = 'button button--paper magnetic';
    link.href = source;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'View source ↗';
    actions.append(link);
  }
  body.append(actions);
  storyShell.append(railCol, body);
  storySection.append(storyShell);

  detail.append(hero, mediaSection, storySection);
  window.App?.animateReveal?.(detail);
  window.App?.animateProjectMedia?.(detail);
}

renderProjectDetail();
