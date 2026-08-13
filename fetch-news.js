import fs from 'node:fs/promises';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname, '..');
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'config.json'), 'utf8'));
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function arr(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') return value['#text'] ? String(value['#text']) : '';
  return '';
}

function normalizeItem(raw, feedName) {
  const link = typeof raw.link === 'object'
    ? (raw.link['@_href'] || raw.link['#text'] || '')
    : (raw.link || raw.guid || '');
  const published = raw.pubDate || raw.published || raw.updated || raw.date || '';
  const description = raw.description || raw.summary || raw.content || '';
  return {
    title: text(raw.title).trim(),
    url: text(link).trim(),
    source: feedName,
    publishedAt: published ? new Date(published).toISOString() : null,
    description: text(description).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  };
}

function extractItems(xml, feedName) {
  const parsed = parser.parse(xml);
  const rssItems = arr(parsed?.rss?.channel?.item);
  const atomItems = arr(parsed?.feed?.entry);
  return [...rssItems, ...atomItems].map((item) => normalizeItem(item, feedName));
}

function containsAny(haystack, keywords) {
  return keywords.some((k) => haystack.includes(k.toLowerCase()));
}

function matches(item, rule) {
  const haystack = `${item.title} ${item.description}`.toLowerCase();

  // Backward-compatible: an array means match ANY keyword.
  if (Array.isArray(rule)) return containsAny(haystack, rule);

  // Object rules can require one match from EVERY keyword group.
  // Example: { all: [[tax terms...], [election terms...]] }
  if (rule?.all) {
    return rule.all.every((group) => containsAny(haystack, group));
  }

  return false;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = (item.url || item.title).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const all = [];
for (const feed of config.feeds) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'user-agent': 'keyword-news-widget/1.0 (+GitHub Actions)' }
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const xml = await res.text();
    all.push(...extractItems(xml, feed.name));
  } catch (err) {
    console.error(`Feed failed: ${feed.name}: ${err.message}`);
  }
}

const cutoff = Date.now() - (config.maxAgeHours || 168) * 3600_000;
const recent = dedupe(all)
  .filter((x) => x.title && x.url)
  .filter((x) => !x.publishedAt || new Date(x.publishedAt).getTime() >= cutoff)
  .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

const topics = {};
for (const [topic, rule] of Object.entries(config.topics)) {
  topics[topic] = recent
    .filter((item) => matches(item, rule))
    .slice(0, config.maxItemsPerTopic || 12);
}

const output = {
  generatedAt: new Date().toISOString(),
  topics
};

await fs.mkdir(path.join(ROOT, 'src', 'data'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'src', 'data', 'headlines.json'), JSON.stringify(output, null, 2) + '\n');
console.log(`Wrote ${Object.values(topics).reduce((n, items) => n + items.length, 0)} topic matches.`);
