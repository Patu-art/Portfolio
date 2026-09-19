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
  for (const {width,height} of [{width:320,height:568},{width:360,height:640},{width:390,height:800},{width:768,height:800},{width:1280,height:800}]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://api.github.com/**', route => route.abort());
    await page.goto('http://127.0.0.1:' + port + '/projects.html', { waitUntil: 'domcontentloaded' });
    await page.locator('.repo-slide.is-current').waitFor({ timeout: 16000 });
    await page.locator('[data-header] .desktop-nav').waitFor({ timeout: 9000, state:'attached' });
    const hero = await page.locator('#projects-heading').evaluate(node => {
      const r = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {title:node.innerText,opacity:Number(style.opacity),visibility:style.visibility,
        display:style.display,clip:style.clipPath,width:r.width,height:r.height,
        left:r.left,right:r.right,top:r.top};
    });
    assert(hero.title.includes('Built to be') && hero.title.includes('explored'),
      width + 'px: Projects hero title is missing');
    assert(hero.opacity === 1 && hero.visibility === 'visible' && hero.display !== 'none' &&
      hero.clip === 'none' && hero.width > 150 && hero.height > 75,
      width + 'px: hero title is still invisible or fully clipped: ' + JSON.stringify(hero));
    assert(hero.left >= -3 && hero.right <= width+3,
      width + 'px: hero title overflows the screen: ' + JSON.stringify(hero));
    const visual = page.locator('.projects-hero__visual img');
    await visual.waitFor({state:'visible',timeout:7000});
    await visual.evaluate(image => image.decode());
    const visualLoaded = await visual.evaluate(image => image.naturalWidth > 100);
    assert(visualLoaded,width + 'px: hero website screenshot failed to load');
    const nav = await page.locator('[data-header]').evaluate(el => {
      const rect=el.getBoundingClientRect();
      return {height:rect.height,top:rect.top,visible:getComputedStyle(el).visibility};
    });
    assert(nav.height >= 50 && nav.top >= -2 && nav.visible === 'visible',
      width + 'px: primary navigation is not visible');

    const slides = page.locator('.repo-slide');
    const rail = page.locator('[data-repo-rail] button');
    assert.equal(await page.locator('.repo-carousel__progress').count(),0,'Duplicate progress bar was not removed');
    assert.equal(await page.locator('.repo-intro, .v2-cta').count(),0,'Redundant intro or oversized CTA is still present');
    assert.equal(await page.locator('.repo-slide__facts').count(),0,'Repeated repository metadata must be removed');
    assert.equal(await rail.count(), data.repository_count, width + 'px: chapter index is incomplete');
    assert.equal(await page.locator('.repo-slide.is-current').count(), 1,
      width + 'px: exactly one chapter must be selected');
    assert.equal(await page.locator('.repo-slide.is-next').count(), 1,
      width + 'px: next project should visibly peek from the side');
    const horizontal = await page.locator('[data-repo-viewport]').evaluate(element => ({
      scrollWidth:element.scrollWidth,clientWidth:element.clientWidth,
      scrollHeight:element.scrollHeight,clientHeight:element.clientHeight,
      snap:getComputedStyle(element).scrollSnapType,
      overflowX:getComputedStyle(element).overflowX,
      overflowY:getComputedStyle(element).overflowY
    }));
    assert(horizontal.scrollWidth > horizontal.clientWidth * (data.repository_count - 1) * .73,
      width + 'px: coverflow chapters are not laid out horizontally');
    assert(horizontal.snap.includes('x') && horizontal.overflowX === 'auto' &&
      horizontal.overflowY === 'hidden', width + 'px: wrong horizontal scrolling mode');
    assert(horizontal.scrollHeight <= horizontal.clientHeight + 3,
      width + 'px: nested vertical overflow is not allowed');

    assert.equal(await slides.count(), data.repository_count, width + 'px: missing repository slides');
    const chapterLabels = await page.locator('.repo-slide__eyebrow').allTextContents();
    assert.equal(chapterLabels.length, data.repository_count, width + 'px: missing chapter labels');
    chapterLabels.forEach((label, index) => {
      const expected = 'PROJECT ' + String(index + 1).padStart(2, '0') +
        ' / ' + String(data.repository_count).padStart(2, '0');
      assert(label.startsWith(expected), width + 'px: incorrect chapter counter: ' + label);
      assert(!label.includes('[object Object]'), 'Array or object was rendered in chapter typography');
    });
    for (const [repoName, brand] of Object.entries({
      'Day-7': "Hetherington's", 'Day-8':'Lane & Brew', 'Day-9':'Açaí Social Club'
    })) {
      const actual = await page.locator('.repo-slide[data-repo="' + repoName + '"] h3').textContent();
      assert.equal(actual, brand, 'Brand name incorrect for ' + repoName);
    }

    assert.equal(await page.locator('[data-repo-progress]').innerText(),
      '01 / ' + String(data.repository_count).padStart(2, '0'), 'Initial slide indicator incorrect');
    const book = page.locator('.repo-slide.is-current .repo-book');
    const bookStyle = await book.evaluate(element => ({
      perspective: getComputedStyle(element.closest('.repo-slide')).perspective,
      backdrop: getComputedStyle(element).backdropFilter,
      rect: element.getBoundingClientRect().toJSON()
    }));
    assert.notEqual(bookStyle.perspective, 'none', '3D perspective missing');
    assert.equal(bookStyle.backdrop, 'none', 'Full-card blur must remain disabled on slower devices');
    assert(bookStyle.rect.width > 220, 'Book became too small');
    assert(bookStyle.rect.left >= -3 && bookStyle.rect.right <= width + 3,
      width + 'px: book overflows viewport');
    assert(bookStyle.rect.width < width * .98,
      width + 'px: active book fills all available space; adjacent previews cannot peek');
    await page.locator('[data-repo-next]').click();
    await page.waitForTimeout(500);
    const horizontalPosition = await page.locator('[data-repo-viewport]').evaluate(el => el.scrollLeft);
    assert(horizontalPosition > 20, width + 'px: next must move horizontally');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('[data-repo-progress]').innerText(),
      '02 / ' + String(data.repository_count).padStart(2, '0'),
      width + 'px: next page did not advance by one');
    await page.locator('[data-repo-prev]').click();
    await page.waitForTimeout(500);
    assert((await page.locator('[data-repo-viewport]').evaluate(el => el.scrollLeft)) < 20,
      width + 'px: previous must scroll back left');
    assert.equal(await page.locator('[data-repo-progress]').innerText(),
      '01 / ' + String(data.repository_count).padStart(2, '0'),
      width + 'px: previous page did not return');
    assert.equal(errors.length, 0, width + 'px: browser exception(s): ' + errors.join(', '));
    const active = page.locator('.repo-slide.is-current');
    const activeCheck = await active.evaluate(slide => {
      const links = [...slide.querySelectorAll('a[href]')];
      const viewport = slide.closest('.repo-carousel__viewport').getBoundingClientRect();
      return {links:links.map(a=>({text:a.innerText,rect:a.getBoundingClientRect().toJSON()})),view:viewport.toJSON()};
    });
    assert(activeCheck.links.length > 0,'Project links missing');
    assert(activeCheck.links.every(link=>link.rect.width>10 && link.rect.top>=activeCheck.view.top-3 && link.rect.bottom<=activeCheck.view.bottom+3),
      width + 'px: active project action links are clipped by carousel viewport');
    if (width === 1280) {
      await rail.nth(6).click();
      await page.waitForTimeout(450);
      assert.equal(await page.locator('.repo-slide.is-current').getAttribute('data-repo'), 'Day-7',
        'Chapter navigation must jump to requested business without losing its brand title');
      await rail.first().click();
      await page.waitForTimeout(550);
      assert.equal(await page.locator('[data-repo-progress]').innerText(),
        '01 / ' + String(data.repository_count).padStart(2, '0'),
        'Chapter picker must return to first before mousewheel navigation');
    }
    if (width === 1280 && data.repository_count > 2) {
      await page.waitForTimeout(750);
      await page.locator('[data-repo-viewport]').hover();
      await page.mouse.wheel(0, 425);
      await page.waitForTimeout(950);
      assert.equal(await page.locator('[data-repo-progress]').innerText(),
        '02 / ' + String(data.repository_count).padStart(2, '0'),
        'Wheel input should advance one horizontal book page');
    }
    console.log(width + 'px: horizontal snap, 3D perspective, left/right controls, image fallbacks: PASS');
    await page.close();
  }
  // Saved GitHub data is sufficient for a no-API, low-bandwidth first paint.
  // A new repository in the next saved index must appear without client-side polling.
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  let apiCalls = 0;
  await page.route('https://api.github.com/**', route => {
    apiCalls++;
    return route.abort();
  });
  const added = { name:'Day-10-test-only',
    title:'Day 10 Test Only', description:'Synthetic future public repository.',
    language:'HTML', url:'https://github.com/Patu-art/Day-10-test-only',
    live:'', image:'', created_at:'2026-09-19T11:30:00Z' };
  await page.route('**/data/repos.json', route => route.fulfill({
    status:200, contentType:'application/json',
    body:JSON.stringify({ repository_count:data.repository_count + 1,
      repositories:[...data.repositories,added] })
  }));
  await page.goto('http://127.0.0.1:' + port + '/projects.html', { waitUntil:'domcontentloaded' });
  await page.locator('.repo-slide.is-current').waitFor({ timeout:16000 });
  assert.equal(await page.locator('.repo-slide').count(), data.repository_count + 1,
    'New repo absent from latest saved index');
  assert((await page.locator('.repo-slide img[src]').count()) <= 3,
    'Too many screenshots downloaded before navigation');
  await page.locator('[data-repo-next]').click();
  const before = await page.locator('.repo-slide.is-current').getAttribute('data-repo');
  await page.waitForTimeout(1000);
  const after = await page.locator('.repo-slide.is-current').getAttribute('data-repo');
  assert.equal(after, before, 'Current chapter reset while the user was reading');
  assert.equal(apiCalls, 0, 'Page must not poll GitHub in the background');
  console.log('Saved index refresh, no live API polling, ≤3 hydrated images and stable chapter: PASS');
  await page.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
