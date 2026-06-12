import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockReq, createMockRes } from '../../tests/serverTestUtils.js';

vi.mock('../_lib/rateLimit.js', () => ({
  checkRateLimit: vi.fn(async () => true),
}));

vi.mock('../_lib/market.js', () => ({
  fetchBatchQuotes: vi.fn(async (symbols) => Object.fromEntries(
    symbols.map((symbol) => [symbol, { price: 10, change: 0, pct: 0 }]),
  )),
}));

const fetchPredictionMarkets = vi.fn();
vi.mock('../_lib/predictionMarkets.js', () => ({
  fetchPredictionMarkets: (...args) => fetchPredictionMarkets(...args),
}));

const { default: handler } = await import('./quotes.js');

describe('GET /api/market/quotes?type=predictions', () => {
  beforeEach(() => {
    fetchPredictionMarkets.mockReset();
  });

  it('returns a trimmed teaser of prediction markets', async () => {
    fetchPredictionMarkets.mockResolvedValue([
      {
        id: 'pm:poly:1',
        source: 'polymarket',
        question: 'New US reactor grid connection in 2026?',
        yesPrice: 0.62,
        noPrice: 0.38,
        volume: 120000,
        endDate: '2026-12-31',
        url: 'https://polymarket.com/event/x',
        marketTokenId: 'secret-token',
        description: 'long text',
      },
      // Markets without a usable price are filtered out of the teaser.
      { id: 'pm:poly:2', source: 'polymarket', question: 'No price', yesPrice: null },
    ]);

    const req = createMockReq({ query: { type: 'predictions' } });
    const res = createMockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.markets).toHaveLength(1);
    expect(res.body.markets[0]).toEqual({
      id: 'pm:poly:1',
      source: 'polymarket',
      question: 'New US reactor grid connection in 2026?',
      yesPrice: 0.62,
      volume: 120000,
      endDate: '2026-12-31',
    });
    // Internal fields must not leak into the public teaser.
    expect(res.body.markets[0].marketTokenId).toBeUndefined();
    expect(res.body.markets[0].url).toBeUndefined();
  });

  it('collapses same-topic markets that differ only by deadline', async () => {
    fetchPredictionMarkets.mockResolvedValue([
      { id: 'pm:poly:a', source: 'polymarket', question: 'Iran agrees to surrender enriched uranium stockpile by May 31, 2026?', yesPrice: 0.001, volume: 5_000_000 },
      { id: 'pm:poly:b', source: 'polymarket', question: 'Iran agrees to surrender enriched uranium stockpile by June 30, 2026?', yesPrice: 0.07, volume: 3_800_000 },
      { id: 'pm:poly:c', source: 'polymarket', question: 'US-Iran nuclear deal by June 30?', yesPrice: 0.43, volume: 7_400_000 },
      { id: 'pm:kalshi:d', source: 'kalshi', question: 'New US reactor grid connection in 2026?', yesPrice: 0.81, volume: 90_000 },
    ]);

    const req = createMockReq({ query: { type: 'predictions' } });
    const res = createMockRes();
    await handler(req, res);

    const ids = res.body.markets.map((market) => market.id);
    // The two Iran-stockpile variants collapse to the first (highest-volume) one.
    expect(ids).toEqual(['pm:poly:a', 'pm:poly:c', 'pm:kalshi:d']);
  });

  it('degrades to an empty list when upstream sources fail', async () => {
    fetchPredictionMarkets.mockRejectedValue(new Error('upstream down'));

    const req = createMockReq({ query: { type: 'predictions' } });
    const res = createMockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.markets).toEqual([]);
  });

  it('still serves stock quotes when type is absent', async () => {
    const req = createMockReq({ query: { symbols: 'CCJ' } });
    const res = createMockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.quotes.CCJ).toBeDefined();
  });
});
