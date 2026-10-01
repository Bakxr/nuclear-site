import { describe, expect, it } from 'vitest';
import { parseFeed, parseFeedDate } from './newsFeed.js';

const feed = { id: 'wnn', name: 'World Nuclear News', reputation: 10, topicFiltered: true };

function rss(dates) {
  const items = dates.map((d, i) => `<item><title>Reactor story ${i}</title><link>https://example.org/news/story-${i}</link><description>nuclear reactor news</description><pubDate>${d}</pubDate></item>`);
  return `<?xml version="1.0"?><rss><channel>${items.join('')}</channel></rss>`;
}

describe('news feed parsing', () => {
  it('reads two-digit years as this century (IAEA feed)', () => {
    expect(parseFeedDate('Wed, 30 Sep 26 06:00:00 +0200').toISOString()).toBe('2026-09-30T04:00:00.000Z');
    expect(parseFeedDate('Wed, 30 Sep 2026  09:00:00 EST').getUTCFullYear()).toBe(2026);
    expect(parseFeedDate('\n26-09-30  06:00\n').toISOString()).toBe('2026-09-30T06:00:00.000Z');
  });

  it('keeps the newest items even when a feed lists oldest first', () => {
    const now = Date.now();
    const day = 86400000;
    // 15 items, oldest first: 14 days ago … today.
    const dates = Array.from({ length: 15 }, (_, i) => new Date(now - (14 - i) * day).toUTCString());
    const items = parseFeed(rss(dates), feed);
    expect(items).toHaveLength(12);
    expect(items[0].title).toBe('Reactor story 14');
    expect(items.map((a) => a.title)).not.toContain('Reactor story 0');
  });

  it('drops items older than 30 days', () => {
    const old = new Date(Date.now() - 40 * 86400000).toUTCString();
    expect(parseFeed(rss([old]), feed)).toEqual([]);
  });
});
