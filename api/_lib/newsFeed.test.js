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

describe("clusterArticles", () => {
  const at = (h) => new Date(Date.UTC(2026, 9, 27, h));
  const article = (over) => ({ title: "", curiosityHook: "", url: Math.random().toString(), source: "X", isOfficial: false, pubDate: at(12), ...over });

  it("merges the same story from two outlets and credits both", async () => {
    const { clusterArticles } = await import("./newsFeed.js");
    const trade = article({ source: "Power Magazine", pubDate: at(23), title: "DOE Offers Constellation Up to $5B Loan for 1.1 GW of Nuclear Uprates at Eight Plants", curiosityHook: "The Department of Energy (DOE) has offered Constellation Energy a conditional loan commitment of up to $5 billion to finance nuclear power uprates and modernization" });
    const doe = article({ source: "US Department of Energy", isOfficial: true, pubDate: at(16), title: "Energy Department Announces $5 Billion Loan to Boost Nuclear Power and Help Lower Costs in Illinois, Maryland, and Pennsylvania", curiosityHook: "The U.S. Department of Energy's Office of Energy Dominance Financing today announced a conditional loan commitment of up to $5 billion to finance nuclear uprate" });
    const other = article({ source: "World Nuclear News", pubDate: at(14), title: "Korea's Kori 3 and 4 set for restarts in 2027", curiosityHook: "Korea Hydro & Nuclear Power has been given approval to continue operating Kori units" });

    const out = clusterArticles([trade, other, doe].sort((a, b) => b.pubDate - a.pubDate));
    expect(out).toHaveLength(2);
    const merged = out.find((a) => a.related);
    expect(merged.source).toBe("US Department of Energy");
    expect(merged.related.map((r) => r.source)).toEqual(["Power Magazine"]);
    expect(merged.pubDate).toEqual(at(23));
  });

  it("leaves unrelated stories alone", async () => {
    const { clusterArticles } = await import("./newsFeed.js");
    const a = article({ title: "NRC approves uprate at Vogtle", curiosityHook: "The commission approved a power uprate" });
    const b = article({ title: "Cameco reports quarterly results", curiosityHook: "Uranium producer revenue rose" });
    expect(clusterArticles([a, b])).toHaveLength(2);
  });
});
