/* Glass Book: an accessible, one-repository-per-page horizontal carousel.
   The checked-in index is the reliable first paint; live GitHub is progressive. */
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
  const status = root.querySelector('[data-repo-status]');
  const chapterRail = root.querySelector('[data-repo-rail]');
  let railButtons = [];
  let slides = [];
  let activeIndex = 0;
  let activeName = '';
  let lastSignature = '';
  let ticking = false;
  let scrollLockUntil = 0;
  let offsets = [];
  const lowPower = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 8) ||
    (navigator.deviceMemory && navigator.deviceMemory < 8) ||
    Boolean(navigator.connection?.saveData) ||
    !window.matchMedia('(pointer: fine)').matches;
  if (!lowPower) root.classList.add('repo-carousel--enhanced');
  else root.classList.add('repo-carousel--lite');
  previousButton.disabled = true;
  nextButton.disabled = true;

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const make = (tag, className = '', content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = String(content);
    return node;
  };
  const titleCase = (name) => String(name).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const safeDate = (value) => typeof value === 'string' ? value : '';
  const repoName = (value) => /^[a-z0-9_.-]{1,100}$/i.test(value || '') ? value : '';
  const safeURL = (value, type) => {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return '';
      if (type === 'source') return url.hostname === 'github.com' &&
        url.pathname.startsWith('/' + OWNER + '/') ? url.href : '';
      if (type === 'image') return '';
      return url.href;
    } catch { return ''; }
  };
  const safeImage = (value) => typeof value === 'string' &&
    /^assets\/images\/repo-previews\/[A-Za-z0-9_.-]+\.(?:png|webp)$/.test(value) ? value : '';
  const fallback = (repo) => {
    const box = make('div', 'repo-slide__missing');
    box.append(make('span', '', 'PROJECT / FIELD NOTES'),
      make('strong', '', repo.title || titleCase(repo.name)),
      make('span', '', repo.live ? 'WEBSITE LIVE · SCREENSHOT PENDING' : 'SOURCE AVAILABLE'));
    return box;
  };
  const action = (label, url, primary = false) => {
    const anchor = make('a', 'repo-slide__link' + (primary ? ' repo-slide__link--primary' : ''), label);
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    return anchor;
  };
  const dayNumber = (repo) => {
    const match = repo.name.match(/^day-?0*(\d+)$/i);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };
  const order = (items) => [...items].sort((a, b) =>
    dayNumber(a) - dayNumber(b) || safeDate(b.created_at).localeCompare(safeDate(a.created_at)));

  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = repoName(raw.name);
    const url = safeURL(raw.url, 'source');
    if (!name || !url || raw.is_fork || raw.fork || raw.archived || raw.private) return null;
    return {
      name,
      title: String(raw.title || titleCase(name)).slice(0, 100),
      description: String(raw.description || 'Open the repository for project details.').slice(0, 320),
      language: String(raw.language || 'PROJECT').slice(0, 35),
      url,
      live: safeURL(raw.live, 'live'),
      image: safeImage(raw.image),
      thumbnail: safeImage(raw.thumbnail),
      created_at: safeDate(raw.created_at),
      pushed_at: safeDate(raw.pushed_at)
    };
  }

  function makeSlide(repo, index, total) {
    const slide = make('section', 'repo-slide');
    slide.id = 'repo-' + repo.name.replace(/[^a-z0-9-]/gi, '-');
    slide.dataset.repo = repo.name;
    slide.setAttribute('aria-label', (index + 1) + ' of ' + total + ': ' + repo.title);
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'chapter');

    const book = make('article', 'repo-slide__card repo-book');
    const spine = make('div', 'repo-book__spine');
    spine.setAttribute('aria-hidden', 'true');
    const picture = make('div', 'repo-slide__media repo-book__page repo-book__page--image');
    picture.append(make('span', 'repo-slide__media-label', repo.image ? 'LIVE SITE PREVIEW' : 'PREVIEW PENDING'));
    if (repo.image) {
      const image = make('img');
      image.dataset.src = repo.thumbnail || repo.image;
      image.alt = repo.title + ' website screenshot';
      image.width = 1365;
      image.height = 850;
      image.loading = index === 0 ? 'eager' : 'lazy';
      image.decoding = 'async';
      image.fetchPriority = index === 0 ? 'high' : 'low';
      image.addEventListener('error', () => {
        picture.querySelector('.repo-slide__media-label').textContent = 'WEBSITE PREVIEW PENDING';
        image.replaceWith(fallback(repo));
      }, { once: true });
      picture.append(image);
    } else picture.append(fallback(repo));

    const body = make('div', 'repo-slide__body repo-book__page repo-book__page--text');
    body.append(make('p', 'repo-slide__eyebrow',
      'PROJECT ' + String(index + 1).padStart(2, '0') + ' / ' +
      String(total).padStart(2, '0') + ' · ' + repo.language.toUpperCase()));
    body.append(make('h3', '', repo.title));
    body.append(make('p', 'repo-slide__description', repo.description));
    const links = make('div', 'repo-slide__links');
    if (repo.live) links.append(action('Explore live site ↗', repo.live, true));
    links.append(action('View GitHub ↗', repo.url, !repo.live));
    body.append(links);
    book.append(spine, picture, body);
    slide.append(book);
    return slide;
  }

  function hydrateNearby(index) {
    // Only the current and adjacent chapters request screenshots.
    // Other cards carry data-src but do not download or decode offscreen PNGs.
    for (let i = Math.max(0, index - 1); i <= Math.min(slides.length - 1, index + 1); i++) {
      const img = slides[i].querySelector('img[data-src]');
      if (img && !img.getAttribute('src')) img.src = img.dataset.src;
    }
  }
  function refreshOffsets() {
    const first = slides[0]?.offsetLeft || 0;
    offsets = slides.map(slide => slide.offsetLeft - first);
  }
  window.addEventListener('resize', () => {
    if (slides.length) refreshOffsets();
  }, { passive: true });

  function updateActive(index, direction = 0) {
    if (!slides.length) return;
    const next = Math.max(0, Math.min(index, slides.length - 1));
    if (next !== activeIndex) {
      slides[activeIndex]?.classList.remove('is-current');
      slides[activeIndex]?.classList.add('is-past');
      activeIndex = next;
      if (direction) {
        slides[activeIndex].classList.remove('turn-forward', 'turn-backward');
        void slides[activeIndex].offsetWidth; // restart the new page-turn only on real changes
        slides[activeIndex].classList.add(direction > 0 ? 'turn-forward' : 'turn-backward');
      }
    }
    activeName = slides[activeIndex].dataset.repo;
    hydrateNearby(activeIndex);
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-current', i === activeIndex);
      slide.classList.toggle('is-past', i < activeIndex);
      slide.classList.toggle('is-prev', i === activeIndex - 1);
      slide.classList.toggle('is-next', i === activeIndex + 1);
      slide.classList.toggle('is-far', Math.abs(i - activeIndex) > 1);
      slide.setAttribute('aria-current', String(i === activeIndex));
      slide.setAttribute('aria-hidden', String(i !== activeIndex));
      slide.querySelectorAll('a[href]').forEach(link => {
        link.tabIndex = i === activeIndex ? 0 : -1;
      });
    });
    progress.textContent = String(activeIndex + 1).padStart(2, '0') + ' / ' +
      String(slides.length).padStart(2, '0');
    if (progressBar) progressBar.style.width = (100 * (activeIndex + 1) / slides.length) + '%';
    previousButton.disabled = activeIndex === 0;
    nextButton.disabled = activeIndex === slides.length - 1;
    railButtons.forEach((button, i) => {
      button.setAttribute('aria-current', String(i === activeIndex));
      button.setAttribute('aria-label', (i === activeIndex ? 'Current chapter: ' : 'Go to chapter: ') + slides[i].dataset.repo);
    });
    if (chapterRail && railButtons[activeIndex]) {
      const selected = railButtons[activeIndex];
      const leftEdge = selected.offsetLeft - chapterRail.offsetLeft;
      if (leftEdge < chapterRail.scrollLeft || leftEdge + selected.offsetWidth > chapterRail.scrollLeft + chapterRail.clientWidth) {
        chapterRail.scrollTo({ left:Math.max(0,leftEdge - chapterRail.clientWidth / 3), behavior:'instant' });
      }
    }
  }

  function slideLeft(index) {
    return offsets[index] ?? (slides[index].offsetLeft - slides[0].offsetLeft);
  }
  function goTo(index, animate = true) {
    if (!slides.length) return;
    const targetIndex = Math.max(0, Math.min(index, slides.length - 1));
    const direction = Math.sign(targetIndex - activeIndex);
    if (!direction && animate) return;
    const left = slideLeft(targetIndex);
    updateActive(targetIndex, animate ? direction : 0);
    scrollLockUntil = performance.now() + (prefersReducedMotion() || !animate ? 80 : 650);
    viewport.scrollTo({ left, behavior: !animate || prefersReducedMotion() ? 'instant' : 'smooth' });
  }

  viewport.addEventListener('click', event => {
    const slide = event.target.closest('.repo-slide');
    if (!slide || event.target.closest('a,button') || slide.classList.contains('is-current')) return;
    const index = slides.indexOf(slide);
    if (index >= 0) goTo(index);
  });

  previousButton.addEventListener('click', () => goTo(activeIndex - 1));
  nextButton.addEventListener('click', () => goTo(activeIndex + 1));
  viewport.addEventListener('keydown', (event) => {
    const key = event.key;
    if (['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', 'Home', 'End'].includes(key)) {
      if (event.target.closest('a, button')) return;
      event.preventDefault();
      const target = key === 'Home' ? 0 : key === 'End' ? slides.length - 1 :
        activeIndex + (key === 'ArrowRight' || key === 'PageDown' ? 1 : -1);
      goTo(target);
    }
  });
  // Native horizontal scroll-snap supports touch swipes, trackpads and Shift+wheel.
  // On mouse/PC, one vertical wheel gesture advances one book without costly
  // repeated smooth-scroll animations. At either edge, the page scrolls normally.
  let wheelBlockedUntil = 0;
  viewport.addEventListener('wheel', (event) => {
    if (!slides.length || event.ctrlKey || event.shiftKey || event.deltaX !== 0 ||
        Math.abs(event.deltaY) < 2 || event.target.closest('a,button') ||
        !window.matchMedia('(pointer:fine)').matches) return;
    const direction = Math.sign(event.deltaY);
    if ((direction < 0 && activeIndex === 0) ||
        (direction > 0 && activeIndex === slides.length - 1)) return;
    if (event.cancelable) event.preventDefault();
    if (performance.now() < wheelBlockedUntil) return;
    wheelBlockedUntil = performance.now() + 480;
    goTo(activeIndex + direction);
  }, { passive:false });
  viewport.addEventListener('scroll', () => {
    if (ticking || !slides.length) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (performance.now() < scrollLockUntil) return;
      const target = viewport.scrollLeft;
      const closest = offsets.reduce((best, top, index) => {
        const distance = Math.abs(top - target);
        return distance < best.distance ? { index, distance } : best;
      }, { index: 0, distance: Infinity });
      if (closest.index !== activeIndex)
        updateActive(closest.index, Math.sign(closest.index - activeIndex));
    });
  }, { passive: true });

  function show(items) {
    const seen = new Set();
    const clean = order(items.map(normalize).filter(repo => {
      if (!repo || seen.has(repo.name.toLowerCase())) return false;
      seen.add(repo.name.toLowerCase());
      return true;
    }));
    if (!clean.length) {
      if (!slides.length) {
        track.replaceChildren(make('p', 'repo-empty',
          'Repository information is temporarily unavailable. Open GitHub to browse the work.'));
        previousButton.disabled = true;
        nextButton.disabled = true;
        if (status) { status.hidden = false; status.textContent = 'Projects could not load. Open GitHub to browse the work.'; }
      }
      return;
    }
    const signature = JSON.stringify(clean);
    if (signature === lastSignature) return; // prevent jumping to the first slide during live refresh
    lastSignature = signature;
    const focused = track.contains(document.activeElement) ?
      { repo: document.activeElement.closest('[data-repo]')?.dataset.repo,
        href: document.activeElement.getAttribute('href') } : null;
    const retainName = activeName;
    slides = clean.map((repo, index) => makeSlide(repo, index, clean.length));
    track.replaceChildren(...slides);
    if (chapterRail) {
      railButtons = clean.map((repo, i) => {
        const button = make('button', 'repo-rail__item');
        button.type = 'button';
        const number = make('span', '', String(i + 1).padStart(2, '0'));
        const label = make('span', 'repo-rail__title', repo.title);
        button.append(number, label);
        button.title = repo.title;
        button.addEventListener('click', () => goTo(i));
        return button;
      });
      chapterRail.replaceChildren(...railButtons);
    }
    refreshOffsets();
    if (count) count.textContent = clean.length + ' PUBLIC REPOSITORIES';
    const keep = Math.max(0, clean.findIndex(repo => repo.name === retainName));
    activeIndex = keep;
    updateActive(keep);
    requestAnimationFrame(() => goTo(keep, false));
    if (focused?.repo) {
      const oldLink = [...track.querySelectorAll('a')].find(anchor =>
        anchor.closest('[data-repo]')?.dataset.repo === focused.repo &&
        anchor.getAttribute('href') === focused.href);
      oldLink?.focus({ preventScroll: true });
    }
    if (status) { status.textContent = ''; status.hidden = true; }
  }

  async function loadStored() {
    const response = await fetch('data/repos.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Saved repository index: HTTP ' + response.status);
    const data = await response.json();
    if (!Array.isArray(data.repositories)) throw new Error('Invalid saved repository index');
    return data.repositories;
  }
  async function loadLive(stored) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7500);
    let response;
    try {
      response = await fetch('https://api.github.com/users/' + OWNER +
        '/repos?type=owner&per_page=100&sort=created', {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error('GitHub API: HTTP ' + response.status);
    const result = await response.json();
    if (!Array.isArray(result)) throw new Error('Unexpected GitHub API response');
    const indexed = new Map(stored.map(repo => [String(repo.name).toLowerCase(), repo]));
    const live = result.filter(repo => repo && !repo.private && !repo.fork && !repo.archived)
      .map(repo => {
        const old = indexed.get(String(repo.name).toLowerCase());
        // Keep existing curated project title and image; use the latest GitHub description.
        return {
          ...old, name: repo.name,
          title: old?.title || titleCase(repo.name),
          description: repo.description?.trim() || old?.description || '',
          language: repo.language || old?.language || 'PROJECT',
          url: 'https://github.com/' + OWNER + '/' + encodeURIComponent(repo.name),
          live: repo.homepage?.startsWith('https://') ? repo.homepage :
            (repo.has_pages ? 'https://patu-art.github.io/' + encodeURIComponent(repo.name) + '/' : ''),
          image: old?.image || '',
          thumbnail: old?.thumbnail || '',
          created_at: repo.created_at || old?.created_at || ''
        };
      });
    // GitHub user listing may lag for new public repos. Retain *verified* cached
    // entries only. Do not leak a repo made private by blindly keeping old data.
    for (const old of stored) {
      if (live.some(repo => repo.name.toLowerCase() === String(old.name).toLowerCase())) continue;
      try {
        const response = await fetch('https://api.github.com/repos/' + OWNER + '/' +
          encodeURIComponent(old.name), { headers: { Accept: 'application/vnd.github+json' } });
        if (!response.ok) continue;
        const repo = await response.json();
        if (!repo.private && !repo.fork && !repo.archived && repo.owner?.login?.toLowerCase() === OWNER.toLowerCase())
          live.push({ ...old, url: repo.html_url });
      } catch { /* do not show an unverified missing repo */ }
    }
    return live;
  }

  loadStored().then(stored => {
    if (stored.length) {
      // The server-side GitHub Actions sync updates this index every six hours.
      // Avoid a second network request and complete DOM re-render on every visit.
      show(stored);
      if (status) { status.textContent = ''; status.hidden = true; }
      return;
    }
    return loadLive([]).then(show);
  }).catch(error => {
    console.warn('Repository index unavailable.', error);
    if (!slides.length) show([]);
  });
}
