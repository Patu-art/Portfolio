/* Names displayed in project cards come from published website <title> metadata.
   Keep extraction independent of the screenshot cache, so a fresh name does not
   require an expensive full-page recapture. */
const EMPTY_TITLES = /^(?:home(?:page)?|welcome|index|untitled(?: document)?|new tab|404|not found|page\s*\d+|day[\s_-]*\d+)$/i;

export function brandFromTitle(raw) {
  const text = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!text || /404|not found/i.test(text)) return '';
  // Page titles usually start with the brand followed by a location or
  // description, e.g. "99 Reasons — Your place, all day long."
  const parts = text.split(/\s+(?:—|–|·|\||-)\s+/).map(part => part.trim()).filter(Boolean);
  const first = parts.find(part => !EMPTY_TITLES.test(part)) || '';
  if (!first || EMPTY_TITLES.test(first) || first.length > 90) return '';
  return first;
}

function decodeTitleEntities(text) {
  const names = { amp:'&', quot:'"', apos:"'", nbsp:' ', mdash:'—',
    ndash:'–', middot:'·', lt:'<', gt:'>', rsquo:'’', lsquo:'‘' };
  return text.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (original, value) => {
    if (value[0] !== '#') return names[value.toLowerCase()] ?? original;
    const hex = /^#x/i.test(value);
    const point = Number.parseInt(value.slice(hex ? 2 : 1), hex ? 16 : 10);
    return Number.isInteger(point) && point > 0 && point <= 0x10ffff &&
      !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : original;
  });
}

export function titleFromHtml(html) {
  // Only <title> in <head> is accepted. Avoid headings/descriptions as guessed names.
  const head = String(html ?? '').match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1] || '';
  const raw = head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] || '';
  return brandFromTitle(decodeTitleEntities(raw.replace(/<[^>]*>/g, '').trim()));
}

export async function fetchPublishedBrand(url, fetcher = fetch) {
  if (!url) return '';
  // Caller provides the URL already restricted to the owner's published hosts.
  try {
    const response = await fetcher(url, {
      method:'GET', redirect:'error',
      headers:{ Accept:'text/html' }, signal:AbortSignal.timeout(10000)
    });
    if (!response.ok || !/text\/html/i.test(response.headers.get('content-type') || '')) return '';
    const length = Number(response.headers.get('content-length') || 0);
    if (length > 2_000_000) return '';
    return titleFromHtml((await response.text()).slice(0,200000));
  } catch (error) {
    console.warn('Published title could not be read:', url, error.message);
    return '';
  }
}

export function cardTitle({ override, published, previous, repository }) {
  const manual = String(override ?? '').trim();
  const site = String(published ?? '').trim();
  const cached = String(previous ?? '').trim();
  return (manual || site || cached || String(repository ?? '').trim()).slice(0,100);
}
