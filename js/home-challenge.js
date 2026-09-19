/* Homepage build-log facts come from the same checked-in, scheduled GitHub
   repository index as the Projects book. Static HTML remains a usable fallback. */
const counter = document.querySelector('.v2-proof strong');
const list = document.querySelector('.v2-day-list');

if (counter && list) {
  try {
    const response = await fetch('data/repos.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Challenge index HTTP ' + response.status);
    const data = await response.json();
    if (!Array.isArray(data.repositories)) throw new Error('Invalid challenge index');

    const entries = data.repositories
      .map(repo => {
        const match = /^day-?0*(\d+)$/i.exec(String(repo?.name || ''));
        if (!match || !repo.live || !repo.image) return null;
        const day = Number(match[1]);
        if (!Number.isSafeInteger(day) || day < 1 || day > 100) return null;
        return { day, title: String(repo.title || repo.name).slice(0, 90), repo };
      })
      .filter(Boolean)
      .sort((a, b) => a.day - b.day);

    if (entries.length) {
      counter.textContent = String(entries.length).padStart(2, '0');
      const latest = entries.slice(-6);
      const fragment = document.createDocumentFragment();
      for (const entry of latest) {
        const item = document.createElement('li');
        const day = document.createElement('span');
        day.className = 'day';
        day.textContent = 'DAY ' + String(entry.day).padStart(2, '0');
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = entry.title;
        const state = document.createElement('span');
        state.className = 'state state--live';
        state.textContent = 'SHIPPED';
        item.append(day, name, state);
        fragment.append(item);
      }
      list.replaceChildren(fragment);

      // A curated older case study may be featured elsewhere, but "latest" must
      // track the most recently published challenge day rather than stay on Day 09.
      const newest = entries.at(-1);
      const repo = newest.repo;
      const live = String(repo.live || '');
      const source = String(repo.url || '');
      const image = String(repo.thumbnail || repo.image || '');
      const validLive = /^https:\/\/patu-art\.github\.io\/Day-?\d+\/$/i.test(live);
      const validSource = /^https:\/\/github\.com\/Patu-art\/Day-?\d+$/i.test(source);
      const validImage = /^assets\/images\/repo-previews\/[A-Za-z0-9_.-]+\.(?:png|webp)$/.test(image);
      if (validLive && validSource && validImage) {
        const dayLabel = 'DAY ' + String(newest.day).padStart(2, '0');
        const heading = document.querySelector('[data-latest-day]');
        const meta = document.querySelector('[data-latest-meta]');
        const title = document.querySelector('[data-latest-title]');
        const description = document.querySelector('[data-latest-description]');
        const visual = document.querySelector('[data-latest-image]');
        const liveLinks = document.querySelectorAll('[data-latest-live]');
        const sourceLink = document.querySelector('[data-latest-source]');
        if (heading && meta && title && description && visual && liveLinks.length && sourceLink) {
          heading.textContent = 'RECENTLY SHIPPED / ' + dayLabel;
          meta.textContent = dayLabel + ' / PUBLISHED FRONTEND CONCEPT';
          const words = newest.title.trim().split(/\s+/);
          const ending = document.createElement('em');
          ending.textContent = words.pop().replace(/[.!]+$/, '') + '.';
          title.replaceChildren(document.createTextNode(words.length ? words.join(' ') + ' ' : ''), ending);
          description.textContent = String(repo.site_description || repo.description ||
            'An independent, published frontend concept from my 100 Days Challenge.').slice(0, 240);
          const version = String(repo.preview_recipe || '') + '-' + String(repo.preview_revision || '');
          visual.src = image + (repo.preview_recipe ? '?v=' + encodeURIComponent(version) : '');
          visual.alt = newest.title + ' website screenshot';
          for (const link of liveLinks) link.href = live;
          sourceLink.href = source;
        }
      }
    }
  } catch (error) {
    // A network failure must never erase the visible, checked-in build log.
    console.warn('Using the static challenge summary.', error);
  }
}
