import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const data = JSON.parse(await fs.readFile('data/repos.json', 'utf8'));
assert(Array.isArray(data.repositories) && data.repositories.length > 0, 'Nonempty repository index required');
assert.equal(data.repository_count, data.repositories.length, 'Index count mismatch');

const names = new Set();
for (const repo of data.repositories) {
  assert(/^[a-z0-9_.-]+$/i.test(repo.name), 'Invalid repository name');
  assert(!names.has(repo.name.toLowerCase()), 'Duplicate repository: ' + repo.name);
  names.add(repo.name.toLowerCase());
  assert(!repo.private && !repo.is_fork && !repo.archived, 'Nonpublic/excluded repository indexed');
  assert(repo.url.startsWith('https://github.com/Patu-art/'), 'Unexpected repository source URL');
  assert(repo.description && repo.description.length <= 320, 'Missing/oversized description: ' + repo.name);
  if (repo.image) {
    assert(/^assets\/images\/repo-previews\/[a-z0-9_.-]+\.png$/i.test(repo.image), 'Unsafe image path');
    await fs.access(repo.image);
  }
  const htmlPath = path.join('work', repo.name, 'index.html');
  const html = await fs.readFile(htmlPath, 'utf8');
  assert(/<meta name="description" content="[^"]+"/.test(html), 'Missing HTML description: ' + repo.name);
}
console.log('Repository index: ' + data.repository_count + ' unique public repos, metadata and images verified.');

const mime = file => file.endsWith('.html') ? 'text/html; charset=utf-8' :
  file.endsWith('.css') ? 'text/css; charset=utf-8' :
  file.endsWith('.js') ? 'text/javascript; charset=utf-8' :
  file.endsWith('.json') ? 'application/json; charset=utf-8' :
  file.endsWith('.png') ? 'image/png' : 'application/octet-stream';

const server = http.createServer(async (request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); }
  catch { response.writeHead(400); response.end(); return; }
  const file = path.resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
  if (file !== root && !file.startsWith(root + path.sep)) {
    response.writeHead(403); response.end(); return;
  }
  try {
    const bytes = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': mime(file), 'Cache-Control': 'no-store' });
    response.end(bytes);
  } catch {
    response.writeHead(404); response.end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [360, 390, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://api.github.com/**', route => route.abort());
    await page.goto('http://127.0.0.1:' + port + '/projects.html', { waitUntil: 'domcontentloaded' });
    await page.locator('.repo-slide.is-current').waitFor({ timeout: 16000 });
    const slides = page.locator('.repo-slide');
    assert.equal(await slides.count(), data.repository_count, width + 'px: missing repository slides');
    assert.equal(await page.locator('[data-repo-progress]').innerText(),
      '01 / ' + String(data.repository_count).padStart(2, '0'), 'Initial slide indicator incorrect');
    const book = page.locator('.repo-slide.is-current .repo-book');
    const bookStyle = await book.evaluate(element => ({
      perspective: getComputedStyle(element.closest('.repo-slide')).perspective,
      backdrop: getComputedStyle(element).backdropFilter,
      rect: element.getBoundingClientRect().toJSON()
    }));
    assert.notEqual(bookStyle.perspective, 'none', '3D perspective missing');
    assert.notEqual(bookStyle.backdrop, 'none', 'Glass backdrop missing');
    assert(bookStyle.rect.width > 220, 'Book became too small');
    assert(bookStyle.rect.left >= -3 && bookStyle.rect.right <= width + 3,
      width + 'px: book overflows viewport');
    await page.locator('[data-repo-next]').click();
    await page.waitForTimeout(250);
    assert.equal(await page.locator('[data-repo-progress]').innerText(),
      '02 / ' + String(data.repository_count).padStart(2, '0'),
      width + 'px: next page did not advance by one');
    await page.locator('[data-repo-prev]').click();
    assert.equal(await page.locator('[data-repo-progress]').innerText(),
      '01 / ' + String(data.repository_count).padStart(2, '0'),
      width + 'px: previous page did not return');
    assert.equal(errors.length, 0, width + 'px: browser exception(s): ' + errors.join(', '));
    console.log(width + 'px: glass, perspective, slider controls, image fallbacks and API outage: PASS');
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
