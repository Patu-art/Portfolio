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
  const previewDialog = document.querySelector('[data-preview-dialog]');
  const previewImage = previewDialog?.querySelector('[data-preview-image]');
  const previewTitle = previewDialog?.querySelector('[data-preview-title]');
  const previewLive = previewDialog?.querySelector('[data-preview-live]');
  const previewFailure = previewDialog?.querySelector('[data-preview-failure]');
  let previewTrigger = null;
  let previewSource = null;
  let previewMotion = null;
  let previewClosing = false;
  let railButtons = [];
  let slides = [];
  let currentItems = [];
  let activeIndex = 0;
  let activeName = '';
  let lastSignature = '';
  let ticking = false;
  let scrollLockUntil = 0;
  let jumpTimer = null;
  let swipeStart = null;
  let ignoreClickUntil = 0;
  root.classList.add('orbit-carousel');
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
  // Notes describe visible design decisions, not unverified client outcomes.
  const designFocus = {
    'day-4': 'Photography-led café storytelling and a playful cat motif.',
    'day-9': 'A venue story moving from pop-up to a permanent space.',
    'day-10': 'Coffee by day and a listening-bar identity after dark.',
    'day-11': 'Real food photography, smoker story and a clear route to visit.'
  };
  const previewSrc = (repo, full = false) => {
    const path = full ? repo.image : (repo.thumbnail || repo.image);
    const version = repo.preview_recipe + '-' + repo.preview_revision;
    return path + (repo.preview_recipe ? '?v=' + encodeURIComponent(version) : '');
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
      preview_revision: String(raw.preview_revision || '').slice(0, 45),
      preview_recipe: String(raw.preview_recipe || '').replace(/[^a-z0-9-]/gi, '').slice(0, 45),
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
      image.dataset.src = previewSrc(repo);
      image.alt = repo.title + ' website screenshot';
      image.width = 1365;
      image.height = 850;
      image.loading = index === 0 ? 'eager' : 'lazy';
      image.decoding = 'async';
      image.fetchPriority = index === 0 ? 'high' : 'low';
      image.addEventListener('error', () => {
        picture.querySelector('.repo-slide__media-label').textContent = 'WEBSITE PREVIEW PENDING';
        picture.querySelector('.repo-slide__inspect')?.remove();
        image.replaceWith(fallback(repo));
      }, { once: true });
      picture.append(image);
      if (previewDialog) {
        const inspect = make('button', 'repo-slide__inspect', 'Inspect screenshot ↗');
        inspect.type = 'button';
        inspect.setAttribute('aria-label', 'Enlarge screenshot of ' + repo.title);
        inspect.addEventListener('click', () => openPreview(repo, inspect));
        picture.append(inspect);
      }
    } else picture.append(fallback(repo));

    const body = make('div', 'repo-slide__body repo-book__page repo-book__page--text');
    body.append(make('p', 'repo-slide__eyebrow',
      (Number.isFinite(dayNumber(repo)) ? 'CHAPTER ' + String(dayNumber(repo)).padStart(2, '0') : 'PROJECT ' + String(index + 1).padStart(2, '0')) + ' / ' +
      String(total).padStart(2, '0') + ' · ' + repo.language.toUpperCase()));
    body.append(make('h3', '', repo.title));
    body.append(make('p', 'repo-slide__description', repo.description));
    const focus = designFocus[repo.name.toLowerCase()];
    if (focus) {
      const note = make('p', 'repo-slide__focus');
      note.append(make('span', '', 'DESIGN FOCUS'), document.createTextNode(focus));
      body.append(note);
    }
    const links = make('div', 'repo-slide__links');
    if (repo.live) links.append(action('Explore live site ↗', repo.live, true));
    links.append(action('View GitHub ↗', repo.url, !repo.live));
    body.append(links);
    book.append(spine, picture, body);
    slide.append(book);
    return slide;
  }

  // The reference uses a shared-element zoom: the selected poster advances
  // straight toward the viewer, then returns to exactly the same card on close.
  // No sideways sliding or generic scale-from-the-middle modal.
  const motionDuration = () => prefersReducedMotion() ? 0 : 470;
  const previewGeometry = (source) => {
    const start = source?.getBoundingClientRect();
    const finish = previewDialog?.getBoundingClientRect();
    if (!start?.width || !finish?.width) return null;
    return {
      x: (start.left + start.width / 2) - (finish.left + finish.width / 2),
      y: (start.top + start.height / 2) - (finish.top + finish.height / 2),
      sx: Math.min(1, Math.max(.15, start.width / finish.width)),
      sy: Math.min(1, Math.max(.15, start.height / finish.height))
    };
  };
  const fromCard = (g) =>
    'translate3d(' + g.x + 'px,' + g.y + 'px,0) scale(' + g.sx + ',' + g.sy + ')';
  const animatePreview = (opening) => {
    const g = previewGeometry(previewSource);
    if (!g || !motionDuration() || typeof previewDialog.animate !== 'function')
      return Promise.resolve();
    previewMotion?.cancel();
    const start = fromCard(g);
    const frames = opening
      ? [{ transform:start, opacity:.66, borderRadius:'24px' },
         { transform:'translate3d(0,0,0) scale(1)', opacity:1, borderRadius:'18px' }]
      : [{ transform:'translate3d(0,0,0) scale(1)', opacity:1, borderRadius:'18px' },
         { transform:start, opacity:.66, borderRadius:'24px' }];
    const animation = previewDialog.animate(frames, {
      duration:motionDuration(), easing:'cubic-bezier(.22,.78,.20,1)', fill:'both'
    });
    previewMotion = animation;
    return animation.finished.catch(() => {}).then(() => {
      if (previewMotion === animation) {
        animation.cancel();
        previewMotion = null;
      }
    });
  };
  async function closePreview() {
    if (!previewDialog?.open || previewClosing) return;
    previewClosing = true;
    previewDialog.classList.add('is-returning');
    previewDialog.dataset.previewMotion = 'return';
    await animatePreview(false);
    previewDialog.close();
    previewDialog.classList.remove('is-returning');
    root.classList.remove('is-preview-open');
    previewClosing = false;
  }
  function openPreview(repo, trigger) {
    if (!previewDialog || previewDialog.open || !previewImage || !repo.image ||
        !previewDialog.showModal) return;
    const card = trigger.closest('.repo-book');
    if (!card) return;
    previewSource = card;
    previewTrigger = trigger.matches('button, a') ? trigger :
      card.querySelector('.repo-slide__inspect') || viewport;
    previewTitle.textContent = repo.title + ' / full screenshot';
    previewImage.alt = repo.title + ' full website screenshot';
    previewImage.hidden = false;
    previewFailure.hidden = true;
    previewImage.src = previewSrc(repo, true);
    if (repo.live) {
      previewLive.href = repo.live;
      previewLive.hidden = false;
    } else {
      previewLive.removeAttribute('href');
      previewLive.hidden = true;
    }
    previewDialog.showModal();
    previewDialog.dataset.previewMotion = 'front';
    root.classList.add('is-preview-open');
    previewDialog.classList.remove('is-returning');
    void animatePreview(true);
  }
  if (previewDialog) {
    previewDialog.querySelector('[data-preview-close]')?.addEventListener('click', () => { void closePreview(); });
    previewDialog.addEventListener('click', (event) => {
      if (event.target === previewDialog) void closePreview();
    });
    previewDialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      void closePreview();
    });
    previewDialog.addEventListener('close', () => {
      previewMotion?.cancel();
      previewMotion = null;
      previewImage?.removeAttribute('src');
      previewDialog.classList.remove('is-returning');
      delete previewDialog.dataset.previewMotion;
      root.classList.remove('is-preview-open');
      if (previewTrigger?.isConnected) previewTrigger.focus({ preventScroll: true });
      previewSource = null;
      previewTrigger = null;
      previewClosing = false;
    });
    previewImage?.addEventListener('error', () => {
      previewImage.hidden = true;
      if (previewFailure) previewFailure.hidden = false;
    });
  }

  function hydrateNearby(index) {
    // Only the current and adjacent chapters request screenshots.
    // Other cards carry data-src but do not download or decode offscreen PNGs.
    for (let i = Math.max(0, index - 1); i <= Math.min(slides.length - 1, index + 1); i++) {
      const img = slides[i].querySelector('img[data-src]');
      if (img && !img.getAttribute('src')) img.src = img.dataset.src;
    }
  }
  const wrapIndex = index => (index + slides.length) % slides.length;
  const signedDistance = (index, center) => {
    const forward = (index - center + slides.length) % slides.length;
    return forward > slides.length / 2 ? forward - slides.length : forward;
  };
  function updateActive(index, direction = 0) {
    if (!slides.length) return;
    const next = wrapIndex(index);
    const old = activeIndex;
    activeIndex = next;
    activeName = slides[next].dataset.repo;
    hydrateNearby(next);
    // Render exactly three floating positions. +2 is staged just beyond the
    // right, -2 beyond the left. When one card moves from center to a side,
    // the next card emerges from the OPPOSITE side into the vacant position.
    slides.forEach((slide,i) => {
      const distance = signedDistance(i,next);
      slide.classList.remove('is-current','is-prev','is-next','is-before','is-after','is-far',
        'is-past','turn-forward','turn-backward');
      const role = distance === 0 ? 'is-current' :
        distance === -1 ? 'is-prev' : distance === 1 ? 'is-next' :
        distance < -1 ? 'is-before' : 'is-after';
      slide.classList.add(role);
      if (Math.abs(distance)>1) slide.classList.add('is-far');
      slide.setAttribute('aria-current',String(distance===0));
      slide.setAttribute('aria-hidden',String(distance!==0));
      // Side cards can be selected with a mouse, but only the center has
      // keyboard-operable actions; the rail/buttons retain full keyboard access.
      slide.querySelectorAll('a[href],button').forEach(control => {
        control.tabIndex = distance === 0 ? 0 : -1;
      });
    });
    if (direction && next !== old && !prefersReducedMotion()) {
      const moving = [old,next,wrapIndex(old+direction),wrapIndex(next+direction)];
      for (const index of new Set(moving)) {
        slides[index].classList.remove('is-jumping');
        void slides[index].offsetWidth;
        slides[index].classList.add('is-jumping');
      }
      clearTimeout(jumpTimer);
      jumpTimer = setTimeout(()=>slides.forEach(slide=>slide.classList.remove('is-jumping')),670);
    }
    progress.textContent=String(next+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
    if(progressBar) progressBar.style.width=(100*(next+1)/slides.length)+'%';
    previousButton.disabled=slides.length<2;
    nextButton.disabled=slides.length<2;
    railButtons.forEach((button,i)=>{
      button.setAttribute('aria-current',String(i===next));
      button.setAttribute('aria-label',(i===next?'Current chapter: ':'Go to chapter: ')+slides[i].dataset.repo);
    });
    if(chapterRail&&railButtons[next]){
      const selected=railButtons[next];
      const left=selected.offsetLeft-chapterRail.offsetLeft;
      if(left<chapterRail.scrollLeft||left+selected.offsetWidth>chapterRail.scrollLeft+chapterRail.clientWidth)
        chapterRail.scrollTo({left:Math.max(0,left-chapterRail.clientWidth/3),behavior:'instant'});
    }
  }
  function goTo(index, animate=true) {
    if(!slides.length||previewDialog?.open) return;
    const next=wrapIndex(index);
    if(next===activeIndex) return;
    const delta=signedDistance(next,activeIndex);
    updateActive(next,animate?Math.sign(delta):0);
  }

  viewport.addEventListener('click', event => {
    const slide = event.target.closest('.repo-slide');
    if (performance.now()<ignoreClickUntil || !slide || event.target.closest('a,button')) return;
    const index = slides.indexOf(slide);
    if (index < 0) return;
    if (slide.classList.contains('is-current') && root.classList.contains('reel-carousel')) {
      const repo = normalize(currentItems[index]);
      if (repo?.image) openPreview(repo, slide.querySelector('.repo-book'));
    } else if (!slide.classList.contains('is-current')) goTo(index);
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
  // Fixed three-card stage: wheel moves the cards between 3D positions, never a scrolling strip.
  let wheelBlockedUntil = 0;
  viewport.addEventListener('wheel', (event) => {
    // Wheel should still turn the carousel when the pointer rests on the central
    // screenshot's Inspect button. Its old button guard trapped desktop scrolling.
    if (!slides.length || previewDialog?.open || event.ctrlKey || event.shiftKey || event.deltaX !== 0 ||
        Math.abs(event.deltaY) < 2 || !window.matchMedia('(pointer:fine)').matches) return;
    const direction = Math.sign(event.deltaY);
    if (slides.length<2) return;
    if (event.cancelable) event.preventDefault();
    if (performance.now() < wheelBlockedUntil) return;
    wheelBlockedUntil = performance.now() + 480;
    goTo(activeIndex + direction);
  }, { passive:false });
  // Pointer/touch swipes rotate the same three floating slots on mobile.
  // Vertical gestures continue scrolling the document.
  viewport.addEventListener('touchstart',event=>{
    if(event.touches.length===1) swipeStart={x:event.touches[0].clientX,y:event.touches[0].clientY};
  },{passive:true});
  viewport.addEventListener('touchend',event=>{
    if(!swipeStart||!event.changedTouches.length) return;
    const dx=event.changedTouches[0].clientX-swipeStart.x;
    const dy=event.changedTouches[0].clientY-swipeStart.y;
    swipeStart=null;
    if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.25){
      ignoreClickUntil=performance.now()+500;
      goTo(activeIndex+(dx<0?1:-1));
    }
  },{passive:true});

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
    currentItems = clean;
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
    root.classList.remove('orbit-ready');
    if (count) count.textContent = clean.length + ' PUBLIC REPOSITORIES';
    const keep = Math.max(0, clean.findIndex(repo => repo.name === retainName));
    activeIndex = keep;
    updateActive(keep);
    requestAnimationFrame(() => root.classList.add('orbit-ready'));
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
          preview_revision: old?.preview_revision || '',
          preview_recipe: old?.preview_recipe || '',
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
