const root = document.querySelector('[data-repo-carousel]');
if (root) {
  const OWNER = 'Patu-art';
  const viewport = root.querySelector('[data-repo-viewport]');
  const track = root.querySelector('[data-repo-track]');
  const previousButton = root.querySelector('[data-repo-prev]');
  const nextButton = root.querySelector('[data-repo-next]');
  const progress = root.querySelector('[data-repo-progress]');
  const progressBar = root.querySelector('[data-repo-progress-bar]');
  const count = document.querySelector('[data-repository-count]');
  let slides = [];
  let current = 0;
  let frame = 0;

  const create = (tag, className = '', text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const titleCase = (name) => name.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

  const screenshotFallback = (repo) => {
    const box = create('div', 'repo-slide__missing');
    box.append(create('span', '', 'FIELD NOTES / PREVIEW PENDING'),
      create('strong', '', repo.title || titleCase(repo.name)),
      create('span', '', repo.live ? 'Live build available ↗' : 'View repository ↗'));
    return box;
  };

  function sourceLink(text, url) {
    const link = create('a', 'repo-slide__link', text);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function makeSlide(repo, index, total) {
    const slide = create('section', 'repo-slide');
    slide.id = 'repo-' + repo.name.replace(/[^a-z0-9-]/gi, '-');
    slide.dataset.repo = repo.name;
    slide.setAttribute('aria-label', (index + 1) + ' of ' + total + ': ' + (repo.title || repo.name));

    const card = create('article', 'repo-slide__card');
    const picture = create('div', 'repo-slide__media');
    const mediaLabel = create('div', 'repo-slide__media-label', repo.image ? 'WEBSITE CAPTURE' : 'WEBSITE CAPTURE PENDING');
    picture.append(mediaLabel);
    if (repo.image) {
      const image = create('img');
      image.src = repo.image;
      image.alt = (repo.title || repo.name) + ' published website preview';
      image.loading = index < 2 ? 'eager' : 'lazy';
      image.decoding = 'async';
      image.width = 1365;
      image.height = 850;
      image.addEventListener('error', () => image.replaceWith(screenshotFallback(repo)), { once: true });
      picture.append(image);
    } else picture.append(screenshotFallback(repo));

    const body = create('div', 'repo-slide__body');
    const label = create('p', 'repo-slide__eyebrow',
      String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0') +
      '  ·  ' + (repo.language || 'PROJECT').toUpperCase());
    const title = create('h3', '', repo.title || titleCase(repo.name));
    const description = create('p', 'repo-slide__description',
      repo.description || 'Project details are available in the GitHub repository.');
    const details = create('div', 'repo-slide__facts');
    details.append(create('span', '', 'GITHUB / ' + repo.name),
      create('span', '', repo.live ? 'PUBLISHED WEBSITE' : 'SOURCE CODE'));
    const links = create('div', 'repo-slide__links');
    if (repo.live) links.append(sourceLink('Open website ↗', repo.live));
    links.append(sourceLink('GitHub repository ↗', repo.url));
    body.append(label, title, description, details, links);
    card.append(picture, body);
    slide.append(card);
    return slide;
  }

  function orderRepos(items) {
    return [...items].sort((a, b) => {
      const day = (repo) => {
        const match = repo.name.match(/^day-?0*(\d+)$/i);
        return match ? Number(match[1]) : Infinity;
      };
      return day(a) - day(b) || (b.created_at || '').localeCompare(a.created_at || '');
    });
  }

  function updateActive(index) {
    if (!slides.length) return;
    current = Math.max(0, Math.min(index, slides.length - 1));
    slides.forEach((slide, position) => {
      const active = position === current;
      slide.classList.toggle('is-current', active);
      slide.setAttribute('aria-current', String(active));
    });
    progress.textContent = String(current + 1).padStart(2, '0') + ' / ' +
      String(slides.length).padStart(2, '0');
    progressBar.style.width = ((current + 1) / slides.length * 100) + '%';
    previousButton.disabled = current === 0;
    nextButton.disabled = current === slides.length - 1;
  }

  function navigate(index) {
    const target = slides[Math.max(0, Math.min(index, slides.length - 1))];
    if (!target) return;
    const top = target.offsetTop - slides[0].offsetTop;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    viewport.scrollTo({ top, behavior: reduced ? 'instant' : 'smooth' });
    updateActive(slides.indexOf(target));
  }

  previousButton.addEventListener('click', () => navigate(current - 1));
  nextButton.addEventListener('click', () => navigate(current + 1));
  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      event.preventDefault(); navigate(current + 1);
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault(); navigate(current - 1);
    } else if (event.key === 'Home') {
      event.preventDefault(); navigate(0);
    } else if (event.key === 'End') {
      event.preventDefault(); navigate(slides.length - 1);
    }
  });
  viewport.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!slides.length) return;
      const start = slides[0].offsetTop;
      const closest = slides.reduce((best, slide, index) => {
        const distance = Math.abs((slide.offsetTop - start) - viewport.scrollTop);
        return distance < best.distance ? { index, distance } : best;
      }, { index: 0, distance: Infinity });
      updateActive(closest.index);
    });
  }, { passive: true });

  function show(items) {
    if (!items.length) {
      track.replaceChildren(create('p', 'repo-empty', 'Repositories are temporarily unavailable.'));
      return;
    }
    const ordered = orderRepos(items);
    slides = ordered.map((repo, index) => makeSlide(repo, index, ordered.length));
    track.replaceChildren(...slides);
    if (count) count.textContent = ordered.length + ' PUBLIC REPOSITORIES';
    viewport.scrollTop = 0;
    updateActive(0);
  }

  async function loadStored() {
    const response = await fetch('data/repos.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Repository index unavailable: ' + response.status);
    const data = await response.json();
    return Array.isArray(data.repositories) ? data.repositories : [];
  }

  async function loadPublicLive(existing) {
    // Immediate discovery of newly created public repositories; scheduled Actions
    // creates their permanent HTML metadata and screenshot later.
    const response = await fetch('https://api.github.com/users/' + OWNER +
      '/repos?per_page=100&type=owner&sort=created', { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error('Public GitHub API rate limit / network error: ' + response.status);
    const apiRepos = await response.json();
    if (!Array.isArray(apiRepos)) throw new Error('Unexpected GitHub API response');
    const known = new Map(existing.map((repo) => [repo.name.toLowerCase(), repo]));
    const list = [];
    for (const repo of apiRepos) {
      if (repo.private || repo.fork || repo.archived) continue;
      const old = known.get(repo.name.toLowerCase());
      const live = repo.homepage && /^https:\/\//i.test(repo.homepage) ? repo.homepage :
        (repo.has_pages ? 'https://patu-art.github.io/' + encodeURIComponent(repo.name) + '/' : '');
      list.push({
        ...old,
        name: repo.name,
        title: old?.title || titleCase(repo.name),
        description: repo.description?.trim() || old?.description ||
          'Project information will appear after its website or GitHub description is published.',
        language: repo.language || old?.language || '',
        url: repo.html_url,
        live: live || old?.live || '',
        image: old?.image || '',
        created_at: repo.created_at || old?.created_at || ''
      });
    }
    // Retain indexed repos if GitHub's public user listing has not indexed them yet.
    // The scheduled sync removes deleted repos from the saved index on a later run.
    const seen = new Set(list.map((repo) => repo.name.toLowerCase()));
    for (const cached of existing) {
      if (!seen.has(cached.name.toLowerCase())) list.push(cached);
    }
    return list;
  }

  loadStored().catch((error) => {
    console.warn('Using live repository discovery because the saved list failed.', error);
    return [];
  }).then(async (stored) => {
    if (stored.length) show(stored);
    try {
      const latest = await loadPublicLive(stored);
      if (latest.length) show(latest);
    } catch (error) {
      console.warn('Live GitHub discovery unavailable; saved list remains visible.', error);
      if (!stored.length) show([]);
    }
  });
}
