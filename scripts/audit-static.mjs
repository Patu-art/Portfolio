import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const items = await fs.readdir(root, { withFileTypes: true });
const pages = items.filter(item => item.isFile() && item.name.endsWith('.html')).map(item => item.name);
const failures = [];
const count = { pages: 0, localReferences: 0 };

for (const filename of pages) {
  const source = await fs.readFile(filename, 'utf8');
  count.pages++;
  if (!/<html\b/i.test(source) || !/<title\b/i.test(source) || !/<main\b/i.test(source)) {
    failures.push(filename + ': missing html/title/main landmark');
  }
  const refs = source.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi);
  for (const [, , raw] of refs) {
    if (/^javascript:/i.test(raw)) failures.push(filename + ': unsafe javascript: URL');
    if (/^(?:https?:|mailto:|tel:|data:|#|\/\/)/i.test(raw)) continue;
    const local = raw.split(/[?#]/, 1)[0];
    if (!local || local.startsWith('/')) continue;
    count.localReferences++;
    const target = path.resolve(root, path.dirname(filename), local.endsWith('/') ? local + 'index.html' : local);
    if (!target.startsWith(root + path.sep)) {
      failures.push(filename + ': reference escapes repository root: ' + raw);
      continue;
    }
    try {
      const stat = await fs.stat(target);
      if (!stat.isFile()) failures.push(filename + ': reference is not a file: ' + raw);
    } catch {
      failures.push(filename + ': missing asset/page: ' + raw);
    }
  }
}
for (const page of ['index.html', 'projects.html', 'contact.html', 'about.html']) {
  const html = await fs.readFile(page, 'utf8');
  if (!/Content-Security-Policy/i.test(html)) failures.push(page + ': missing CSP');
}
const sitemap = await fs.readFile('sitemap.xml', 'utf8');
const robots = await fs.readFile('robots.txt', 'utf8');
if (/patu-art\.github\.io\/portfolio\//.test(sitemap + robots)) {
  failures.push('sitemap/robots: lowercase /portfolio/ breaks case-sensitive GitHub Pages links');
}
assert.equal(failures.length, 0, failures.join('\n'));
console.log('Static SITEPRO audit PASS: ' + count.pages + ' pages; ' +
  count.localReferences + ' local asset/page references; CSP and sitemap checked.');
