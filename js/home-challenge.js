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
        return { day, title: String(repo.title || repo.name).slice(0, 90) };
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
    }
  } catch (error) {
    // A network failure must never erase the visible, checked-in build log.
    console.warn('Using the static challenge summary.', error);
  }
}
