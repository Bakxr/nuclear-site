import { beforeEach, describe, expect, it } from 'vitest';
import { cardUrl, readSignedParams } from './cardLinks.js';
import { renderCardPng } from './socialCards.js';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

describe('chart card links', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
  });

  it('round-trips card data through a signed URL', () => {
    const card = { type: 'odds', source: 'Polymarket', question: 'Will it happen?', pct: 12 };
    const url = new URL(cardUrl('https://thenuclearpulse.com/', card));
    expect(url.pathname).toBe('/api/social/card');
    expect(readSignedParams(url.searchParams.get('d'), url.searchParams.get('s'))).toEqual(card);
  });

  it('rejects tampered data', () => {
    const url = new URL(cardUrl('https://thenuclearpulse.com', { type: 'odds', question: 'a', pct: 1, source: 'x' }));
    const forged = Buffer.from(JSON.stringify({ type: 'odds', question: 'fake', pct: 99, source: 'x' })).toString('base64url');
    expect(readSignedParams(forged, url.searchParams.get('s'))).toBeNull();
    expect(readSignedParams(url.searchParams.get('d'), undefined)).toBeNull();
  });
});

describe('chart card rendering', () => {
  const cards = {
    movers: { type: 'movers', date: 'Sep 30', uranium: 89.58, up: 1, total: 2, rows: [{ ticker: 'EU', pct: -6.1 }, { ticker: 'OKLO', pct: 3.2 }] },
    fleet: { type: 'fleet', date: 'Sep 30', full: 79, total: 95, offline: ['Byron 2'], offlineCount: 11, reducedCount: 5 },
    insider: { type: 'insider', date: 'Sep 24', ticker: 'URG', filer: 'A Person', title: 'CFO', shares: 1000, price: 1.14, value: '$1K' },
    odds: { type: 'odds', source: 'Kalshi', question: 'Will it happen?', pct: 40 },
    milestone: { type: 'milestone', date: 'Sep 30', label: 'now operating', unit: 'Unit 1', station: 'Somewhere, China' },
  };

  for (const [type, card] of Object.entries(cards)) {
    it(`renders a ${type} card as a PNG`, async () => {
      const png = await renderCardPng(card);
      expect([...png.subarray(0, 4)]).toEqual(PNG_MAGIC);
    }, 20000);
  }

  it('refuses unknown card types', async () => {
    await expect(renderCardPng({ type: 'nope' })).rejects.toThrow('Unknown card type');
  });
});
