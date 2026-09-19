import fs from 'node:fs/promises';
import path from 'node:path';

const OWNER = 'Patu-art';
const API = 'https://api.github.com';
const DATA_FILE = 'data/repos.json';
const CONFIG_FILE = 'data/repo-preview-config.json';
const PREVIEW_DIR = 'assets/images/repo-previews';
const SITE = 'https://patu-art.github.io/Portfolio/';
const token = process.env.GITHUB_TOKEN || '';

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

async function listRepositories() {
  const result = [];
  for (let page = 1; page <= 20; page++) {
    const response = await fetch(API + '/users/' + OWNER + '/repos?type=all&per_page=100&page=' + page, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'portfolio-repository-sync',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      }
    });
    if (!response.ok) throw new Error('GitHub repository list failed: HTTP ' + response.status);
    const items = await response.json();
    if (!Array.isArray(items)) throw new Error('GitHub returned an unexpected repository list');
    result.push(...items.filter(repo => !repo.private && repo.owner?.login?.toLowerCase() === OWNER.toLowerCase()));
    if (items.length < 100) break;
  }
  if (!result.length) throw new Error('No public repositories found. Preserving existing data.');
  return result;
}

function html(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function siteUrl(repo, override) {
  const raw = override?.url || repo.homepage ||
    (repo.has_pages ? 'https://patu-art.github.io/' + encodeURIComponent(repo.name) + '/' : '');
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return '';
    if (url.hostname !== 'patu-art.github.io' &&
        !url.hostname.endsWith('.vercel.app')) return '';
    return url.href;
  } catch { return ''; }
}

function safeName(value) { return String(value).replace(/[^a-z0-9_.-]/gi, '-'); }
function titleFor(repo) {
  return String(repo.name).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

async function captureSite(browser, repo, config, previous) {
  const output = { image: previous?.image || '', preview_revision: previous?.preview_revision || '',
    preview_source: previous?.preview_source || '', site_description: previous?.site_description || '' };
  const url = siteUrl(repo, config);
  if (!url) return output;
  const filename = path.join(PREVIEW_DIR, safeName(repo.name) + '.png');
  const alreadyCaptured = await fs.access(filename).then(() => true).catch(() => false);
  const previousImageExists = previous?.image ? await fs.access(previous.image).then(() => true).catch(() => false) : false;
  if (!previousImageExists) output.image = '';
  const temporary = filename.replace(/\.png$/i, '.pending.png');
  if (alreadyCaptured && previous?.preview_revision === repo.pushed_at &&
      previous?.preview_source === 'automatic') return output;

  const page = await browser.newPage({ viewport: { width: 1365, height: 900 }, deviceScaleFactor: 1 });
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    if (!response || response.status() !== 200) throw new Error('Website not published: HTTP ' + (response?.status() ?? 'no response'));
    const title = (await page.title()).toLowerCase();
    const bodyText = await page.locator('body').innerText({ timeout: 7000 }).catch(() => '');
    if (bodyText.trim().length < 80 || title.includes('404') || title.includes('not found'))
      throw new Error('Website not ready for a screenshot');
    if (config?.readySelector) {
      await page.locator(config.readySelector).first().waitFor({ state: 'visible', timeout: 7000 });
    }
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    const loader = page.locator('.site-loader').first();
    if (await loader.isVisible().catch(() => false)) {
      await loader.waitFor({ state: 'hidden', timeout: 7000 });
    }

    const siteDescription = await page.locator('meta[name="description"]').first()
      .getAttribute('content').catch(() => null);
    if (siteDescription?.trim()) output.site_description = siteDescription.trim().slice(0, 300);

    const selectors = [config?.selector, '[data-portfolio-preview]', '.hero', '.hero-section',
      'main > section:first-of-type', 'main section:first-of-type', 'main'].filter(Boolean);
    let target = null;
    for (const selector of selectors) {
      try {
        const candidate = page.locator(selector).first();
        const bounds = await candidate.boundingBox({ timeout: 2000 });
        if (bounds && bounds.width >= 250 && bounds.height >= 160) { target = candidate; break; }
      } catch { /* try the next meaningful website area */ }
    }
    if (!target) throw new Error('No ready website section large enough to capture');
    await target.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    await target.locator('img').evaluateAll(images => Promise.all(images.map(image =>
      image.complete ? Promise.resolve() : new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 3500);
      })
    ))).catch(() => {});
    await fs.mkdir(PREVIEW_DIR, { recursive: true });
    const bounds = await target.boundingBox();
    if (bounds?.height > 1700) {
      await page.screenshot({ path: temporary, fullPage: false, animations: 'disabled', timeout: 16000 });
    } else {
      await target.screenshot({ path: temporary, animations: 'disabled', timeout: 16000 });
    }
    // Publish only a complete, successful capture. Interrupted work never
    // replaces the previous good image or commits a partial screenshot.
    await fs.rename(temporary, filename);
    output.image = filename.split(path.sep).join('/');
    output.preview_revision = repo.pushed_at || '';
    output.preview_source = 'automatic';
    console.log('Captured ' + repo.name + ' area: ' + selectors.find(Boolean));
  } catch (error) {
    console.warn('Screenshot pending for ' + repo.name + ': ' + error.message);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
    await page.close();
  }
  return output;
}

function staticPage(repo) {
  const title = repo.title + ' — Prathamesh Dhumal';
  const description = repo.description.slice(0, 300);
  const image = repo.image ? '<meta property="og:image" content="' +
    html(new URL(repo.image, SITE).href) + '">' : '';
  const live = repo.live ? '<a href="' + html(repo.live) +
    '" target="_blank" rel="noopener noreferrer">Visit published website ↗</a>' : '';
  const preview = repo.image ? '<img src="../../' + html(repo.image) +
    '" width="1365" height="850" loading="lazy" alt="' + html(repo.title) +
    ' website screenshot">' : '<div class="pending">Website screenshot pending publication</div>';
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + html(title) + '</title>' +
    '<meta name="description" content="' + html(description) + '">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:title" content="' + html(title) + '">' +
    '<meta property="og:description" content="' + html(description) + '">' + image +
    '<link rel="canonical" href="' + html(new URL('work/' + encodeURIComponent(repo.name) + '/', SITE).href) + '">' +
    '<style>body{margin:0;background:#f3f5f9;color:#0d0d0d;font:16px/1.6 system-ui,sans-serif}main{width:min(960px,calc(100% - 36px));margin:70px auto}' +
    'h1{font:600 clamp(42px,7vw,82px)/1.05 Georgia,serif;letter-spacing:-.04em}p{max-width:65ch;color:#5b6e74}' +
    'nav,a{color:#0d0d0d}nav{margin-bottom:45px}img{display:block;width:100%;height:auto;border-radius:16px;border:1px solid #becdd2}' +
    '.pending{display:grid;place-items:center;min-height:300px;background:#e9eef2;border-radius:16px;color:#5b6e74}' +
    '.actions{display:flex;gap:22px;flex-wrap:wrap;margin-top:22px}a:focus-visible{outline:3px solid #819fa7;outline-offset:4px}</style></head>' +
    '<body><main><nav><a href="../../projects.html">← All repositories</a></nav>' +
    '<small>REPOSITORY / ' + html(repo.language || 'PROJECT') + '</small><h1>' + html(repo.title) + '</h1>' +
    '<p>' + html(description) + '</p>' + preview +
    '<div class="actions"><a href="' + html(repo.url) + '" target="_blank" rel="noopener noreferrer">Source code ↗</a>' +
    live + '</div></main></body></html>\n';
}

const previous = await readJson(DATA_FILE, { repositories: [] });
const config = await readJson(CONFIG_FILE, { repositories: {} });
const previousByName = new Map((previous.repositories || []).map(item => [item.name.toLowerCase(), item]));
const liveRepos = await listRepositories();
// GitHub user listings can lag behind individual public repositories. Confirm
// any previously indexed but absent repository by its exact public API URL.
const present = new Set(liveRepos.map(item => item.name.toLowerCase()));
for (const old of previous.repositories || []) {
  if (present.has(old.name.toLowerCase())) continue;
  const response = await fetch(API + '/repos/' + OWNER + '/' + encodeURIComponent(old.name), {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'portfolio-repository-sync', ...(token ? { Authorization: 'Bearer ' + token } : {}) }
  });
  if (!response.ok) continue;
  const item = await response.json();
  if (!item.private && !item.fork && !item.archived && item.owner?.login?.toLowerCase() === OWNER.toLowerCase()) {
    liveRepos.push(item);
    present.add(item.name.toLowerCase());
  }
}
console.log('Public repositories verified: ' + liveRepos.map(item => item.name).join(', '));
// Use the latest non-bot Portfolio commit to avoid an endless screenshot
// refresh loop caused by this workflow committing its own previews.
let portfolioContentRevision = '';
try {
  const response = await fetch(API + '/repos/' + OWNER + '/Portfolio/commits?per_page=50', {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'portfolio-repository-sync', ...(token ? { Authorization: 'Bearer ' + token } : {}) }
  });
  if (response.ok) {
    const commits = await response.json();
    portfolioContentRevision = commits.find(item => item.author?.login !== 'github-actions[bot]' &&
      item.commit?.author?.name !== 'github-actions[bot]')?.sha || '';
  }
} catch (error) {
  console.warn('Could not determine Portfolio content revision:', error.message);
}
const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: true });
const collected = [];
try {
  for (const repo of liveRepos) {
    if (repo.fork || repo.archived) continue;
    const old = previousByName.get(repo.name.toLowerCase());
    const override = config.repositories?.[repo.name] || {};
    if (override.exclude === true) continue;
    const screenshotRepo = repo.name === 'Portfolio' && portfolioContentRevision ?
      { ...repo, pushed_at: portfolioContentRevision } : repo;
    const preview = await captureSite(browser, screenshotRepo, override, old);
    const description = (repo.description?.trim() || preview.site_description ||
      old?.site_description || 'Repository by Prathamesh Dhumal. Open GitHub for project details.').slice(0, 300);
    collected.push({
      name: repo.name,
      title: override.title || old?.title || titleFor(repo),
      description,
      description_source: repo.description?.trim() ? 'github' : (preview.site_description ? 'website' : 'fallback'),
      language: repo.language || '',
      url: repo.html_url,
      live: siteUrl(repo, override),
      image: preview.image,
      pushed_at: repo.name === 'Portfolio' ? (old?.pushed_at || repo.pushed_at) : repo.pushed_at,
      created_at: repo.created_at,
      is_fork: false,
      archived: false,
      preview_revision: preview.preview_revision,
      preview_source: preview.preview_source,
      site_description: preview.site_description
    });
  }
} finally {
  await browser.close();
}
collected.sort((a, b) => b.created_at.localeCompare(a.created_at));
const unchanged = JSON.stringify(previous.repositories) === JSON.stringify(collected);
const payload = {
  owner: OWNER,
  repository_count: collected.length,
  updated_at: unchanged ? (previous.updated_at || null) : new Date().toISOString(),
  repositories: collected
};
await fs.mkdir('data', { recursive: true });
await fs.mkdir(PREVIEW_DIR, { recursive: true });
await fs.mkdir('work', { recursive: true });
await fs.writeFile(DATA_FILE, JSON.stringify(payload, null, 2) + '\n');

for (const repo of collected) {
  const directory = path.join('work', safeName(repo.name));
  await fs.mkdir(directory, { recursive: true });
  const file = path.join(directory, 'index.html');
  const next = staticPage(repo);
  const old = await fs.readFile(file, 'utf8').catch(() => null);
  if (old !== next) await fs.writeFile(file, next);
}
console.log('Portfolio sync complete: ' + collected.length + ' repositories; changed=' + !unchanged);
