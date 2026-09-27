import { describe, expect, it } from 'vitest';
import { getSourceStatus } from './sourceStatus.js';

const NOW = Date.parse('2026-09-26T12:00:00Z');
const fresh = '2026-09-26T11:50:00Z';

function snapshot(entities, freshness) {
  return { generatedAt: fresh, entities, freshness };
}

describe('getSourceStatus', () => {
  it('reports a feed that delivered nothing as empty, not live', () => {
    const rows = getSourceStatus(snapshot(
      { govContracts: [], insiderTrades: [{ id: 1 }], marketInstruments: [] },
      {
        govContracts: { label: 'Gov Contracts', updatedAt: fresh, stale: false },
        insider: { label: 'Insider', updatedAt: fresh, stale: false },
      },
    ), NOW);
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
    expect(byKey.govContracts.state).toBe('empty');
    expect(byKey.insider.state).toBe('live');
  });

  it('marks old or flagged feeds as stale', () => {
    const rows = getSourceStatus(snapshot(
      { newsArticles: [{ id: 1 }], companyFilings: [{ id: 1 }] },
      {
        news: { label: 'Catalysts', updatedAt: '2026-09-25T00:00:00Z', stale: false },
        filings: { label: 'Filings', updatedAt: fresh, stale: true },
      },
    ), NOW);
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
    expect(byKey.news.state).toBe('stale');
    expect(byKey.filings.state).toBe('stale');
  });

  it('includes price history based on instruments that actually have bars', () => {
    const rows = getSourceStatus(snapshot(
      { marketInstruments: [{ price: 1, history: [{ price: 1 }, { price: 2 }] }, { price: 1, history: [] }] },
      {},
    ), NOW);
    const history = rows.find((row) => row.key === 'priceHistory');
    expect(history).toMatchObject({ count: 1, state: 'live' });
  });
});
