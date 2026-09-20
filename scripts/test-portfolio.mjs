import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

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
// The screenshot recipe is checked after the generator runs, not against a
// still-unrefreshed PR checkout. This is the quality gate for new Day 10/11 previews.
if (process.env.REQUIRE_REFRESHED_PREVIEWS === '1') {
  for (const name of ['Day-10', 'Day-11']) {
    const repo = data.repositories.find(item => item.name.toLowerCase() === name.toLowerCase());
    assert(repo, 'Published project missing: ' + name);
    assert.equal(repo.preview_recipe, 'viewport-1365x768-v2', name + ': screenshot refresh did not run');
    assert.equal(repo.preview_source, 'automatic', name + ': screenshot was not captured');
    const png = await sharp(repo.image).metadata();
    assert(png.width === 1365 && png.height === 768, name + ': incomplete first-fold screenshot');
    const thumb = await sharp(repo.thumbnail).metadata();
    assert(thumb.width >= 1100 && thumb.height >= 600, name + ': low-resolution preview thumbnail');
  }
  console.log('Day 10/11 fresh hero screenshots and high-quality thumbnails: PASS');
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
    const slideWidth = await slides.first().evaluate(el => el.getBoundingClientRect().width);
    assert(horizontal.scrollWidth > slideWidth * data.repository_count,
      width + 'px: centered glass cards are not arranged in a horizontal rail');
    assert(slideWidth <= width * .87 && slideWidth >= 220,
      width + 'px: cards are too small or adjacent chapters cannot peek');
    assert(horizontal.snap.includes('x') && horizontal.overflowX === 'auto' &&
      horizontal.overflowY === 'hidden', width + 'px: wrong horizontal scrolling mode');
    assert(horizontal.scrollHeight <= horizontal.clientHeight + 3,
      width + 'px: nested vertical overflow is not allowed');

    assert.equal(await slides.count(), data.repository_count, width + 'px: missing repository slides');
    const chapterNames = await page.locator('.repo-slide').evaluateAll(nodes => nodes.map(node => node.dataset.repo));
    const chapterLabels = await page.locator('.repo-slide__eyebrow').allTextContents();
    assert.equal(chapterLabels.length, data.repository_count, width + 'px: missing chapter labels');
    chapterLabels.forEach((label, index) => {
      const match = /^day-?0*(\d+)$/i.exec(chapterNames[index]);
      const prefix = match ? 'CHAPTER ' + String(Number(match[1])).padStart(2, '0') :
        'PROJECT ' + String(index + 1).padStart(2, '0');
      const expected = prefix + ' / ' + String(data.repository_count).padStart(2, '0');
      assert(label.startsWith(expected), width + 'px: incorrect chapter counter: ' + label);
      assert(!label.includes('[object Object]'), 'Array or object was rendered in chapter typography');
    });
    for (const [repoName, brand] of Object.entries({
      'Day-7': "Hetherington's", 'Day-8':'Lane & Brew', 'Day-9':'Açaí Social Club',
      'Day-10':'Kiku Hifi', 'Day-11':"Sandy's Smokeshed"
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
    assert.equal(await page.locator('.repo-slide.is-current').getAttribute('data-repo'), chapterNames[1],
      width + 'px: next selection must bring the new poster forward without sliding the overlay');
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
    const inspect = page.locator('.repo-slide.is-current .repo-slide__inspect');
    assert.equal(await inspect.count(), 1, width + 'px: current chapter has no screenshot inspection button');
    await inspect.click();
    const previewDialog = page.locator('[data-preview-dialog]');
    assert(await previewDialog.evaluate(dialog => dialog.open), width + 'px: screenshot dialog did not open');
    assert.equal(await previewDialog.getAttribute('data-preview-motion'), 'front',
      width + 'px: preview did not use the forward depth transition');
    if (width === 1280) {
      const actual = await previewDialog.evaluate(dialog => {
        const animations = dialog.getAnimations();
        return animations.some(animation => animation.effect?.getKeyframes().some(frame =>
          String(frame.transform || '').includes('translate3d(') &&
          String(frame.transform || '').includes('scale(')));
      });
      assert(actual, 'Preview must animate geometrically from the selected poster, not slide upward');
    }
    const fullImage = previewDialog.locator('[data-preview-image]');
    assert((await fullImage.getAttribute('src')).includes('.png'),
      width + 'px: screenshot dialog did not load the full captured PNG');
    await fullImage.evaluate(img => img.decode());
    assert(await fullImage.evaluate(img => img.naturalWidth >= 900),
      width + 'px: full preview screenshot is missing or too small');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-preview-dialog]')?.open,
      null, { timeout: 2000 });
    assert(!(await previewDialog.evaluate(dialog => dialog.open)),
      width + 'px: Escape did not return the preview to the card');
    assert(await inspect.evaluate(button => document.activeElement === button),
      width + 'px: screenshot dialog did not restore focus to its trigger');
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
      const dayTenIndex = chapterNames.findIndex(name => name.toLowerCase() === 'day-10');
      assert(dayTenIndex >= 0, 'Day 10 chapter missing');
      await rail.nth(dayTenIndex).click();
      await page.waitForTimeout(450);
      assert((await page.locator('.repo-slide.is-current .repo-slide__focus').textContent()).includes('Coffee by day'),
        'Day 10 design focus note is missing');
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
    console.log(width + 'px: book navigation, screenshot zoom, focus restoration and readable links: PASS');
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

  // Homepage regression: static/no-JavaScript fallback, real media, and visible stagger content.
  // Keep homepage assertions aligned with the index generated by this very sync run.
  // Hard-coded "Day 09" assertions previously blocked every newly published day.
  const challengeDays = data.repositories.map(repo => {
    const match = /^day-?0*(\d+)$/i.exec(String(repo.name || ''));
    if (!match || !repo.live || !repo.image) return null;
    const day = Number(match[1]);
    return Number.isSafeInteger(day) && day >= 1 && day <= 100 ? day : null;
  }).filter(Number.isInteger).sort((a, b) => a - b);
  assert(challengeDays.length > 0, 'Published challenge days are required');
  const buildDayLabels = challengeDays.slice(-6).map(day => 'DAY ' + String(day).padStart(2, '0'));
  const expectedChallengeCount = String(challengeDays.length).padStart(2, '0');
  const newest = data.repositories.filter(repo => /^day-?0*\d+$/i.test(repo.name) && repo.live && repo.image)
    .sort((a, b) => Number(/^day-?0*(\d+)$/i.exec(b.name)[1]) - Number(/^day-?0*(\d+)$/i.exec(a.name)[1]))[0];
  assert(newest, 'The latest published project must exist');
  for (const width of [320, 390, 1280]) {
    const home = await browser.newPage({ viewport: { width, height: 800 } });
    const errors = [];
    home.on('pageerror', error => errors.push(error.message));
    await home.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'domcontentloaded' });
    await home.locator('.v2-proof strong').first().waitFor({ state: 'attached', timeout: 10000 });
    await home.waitForFunction(({lastDay, count}) =>
      document.querySelector('.v2-day-list li:last-child .day')?.textContent === lastDay &&
      document.querySelector('.v2-proof strong')?.textContent?.trim() === count,
      { lastDay: buildDayLabels.at(-1), count: expectedChallengeCount }, { timeout: 12000 });
    assert.equal((await home.locator('.v2-proof strong').first().textContent()).trim(), expectedChallengeCount,
      width + 'px: shipped build counter did not match verified repository index');
    assert.deepEqual(await home.locator('.v2-day-list .day').allTextContents(), buildDayLabels,
      width + 'px: latest challenge days missing or out of order');

    const proof = home.locator('.v2-proof > div').first();
    await proof.scrollIntoViewIfNeeded();
    await home.waitForFunction(() => {
      const el = document.querySelector('.v2-proof > div');
      return el && Number(getComputedStyle(el).opacity) > .98;
    }, { timeout: 3500 });
    const portrait = home.locator('.v2-portrait img');
    await portrait.evaluate(img => img.decode());
    assert(await portrait.evaluate(img => img.naturalWidth > 100), width + 'px: real portrait not loaded');
    const visible = await proof.evaluate(el => {
      const r = el.getBoundingClientRect();
      return r.width > 50 && r.left >= -3 && r.right <= innerWidth + 3;
    });
    assert(visible, width + 'px: homepage proof counter overflows or collapses');
    // New homepage proof sections must show actual screenshots and usable links.
    const siteproVisual = home.locator('.v2-sitepro-proof');
    await siteproVisual.scrollIntoViewIfNeeded();
    assert.equal(await siteproVisual.locator('img').count(), 3,
      width + 'px: SITEPRO proof needs three real project previews');
    for (const img of await siteproVisual.locator('img').all()) {
      await img.evaluate(image => image.decode());
      assert(await img.evaluate(image => image.naturalWidth > 100),
        width + 'px: SITEPRO proof screenshot did not load');
    }
    const latest = home.locator('.v2-latest-build');
    assert.equal(await latest.count(), 1,
      width + 'px: live-build spotlight missing');
    await latest.scrollIntoViewIfNeeded();
    const latestImage = latest.locator('img');
    await latestImage.evaluate(image => image.decode());
    assert(await latestImage.evaluate(image => image.naturalWidth > 100),
      width + 'px: latest-build screenshot did not load');
    assert.equal(await latest.locator('a[data-latest-live]').count(), 2,
      width + 'px: published demo links missing');
    assert.equal(await latest.locator('a[data-latest-live]').first().getAttribute('href'), newest.live,
      width + 'px: latest feature points to a stale challenge day');
    assert.equal(await latest.locator('[data-latest-source]').getAttribute('href'), newest.url,
      width + 'px: latest feature has a stale source URL');
    assert.equal((await latest.locator('[data-latest-title]').textContent()).replace(/[.!]+$/, ''), newest.title,
      width + 'px: latest feature still uses an older project title');
    assert.equal(await home.locator('.sitepro-showcase').count(), 0,
      width + 'px: an obsolete injected SITEPRO section duplicated the homepage');
    assert.equal(await home.locator('.v2-truth').count(), 0,
      width + 'px: repeated generic status-card section still present');
    const latestRect = await latest.evaluate(el => {
      const box = el.getBoundingClientRect();
      return { width:box.width, left:box.left, right:box.right };
    });
    assert(latestRect.width > 250 && latestRect.left >= -3 && latestRect.right <= width + 3,
      width + 'px: latest-build card is clipped or overflows the viewport');
    assert.equal(errors.length, 0, width + 'px: homepage browser exception(s): ' + errors.join(', '));
    console.log(width + 'px: homepage, dynamic '+ expectedChallengeCount +' shipped days, stagger visibility and portrait: PASS');
    await home.close();
  }

  const withoutJS = await browser.newPage({ viewport: { width: 390, height: 800 }, javaScriptEnabled: false });
  await withoutJS.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'domcontentloaded' });
  const fallback = await withoutJS.locator('.v2-proof > div').first().evaluate(el => ({
    opacity: Number(getComputedStyle(el).opacity),
    label: el.innerText
  }));
  assert(fallback.opacity > .98 && /\d+/.test(fallback.label),
    'No-JavaScript homepage fallback is invisible or its shipped count is stale');
  await withoutJS.close();
  console.log('Homepage no-JavaScript content visibility: PASS');

} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
