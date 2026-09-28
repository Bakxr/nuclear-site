import { describe, expect, it } from 'vitest';
import { buildXDrafts, fleetDraft, insiderDraft, moversDraft, oddsDraft, xIntentUrl } from './socialDrafts.js';

const NOW = Date.parse('2026-09-28T10:30:00Z');

const snapshot = {
  entities: {
    stocks: [
      { ticker: 'OKLO', changePct: 6.24 },
      { ticker: 'SMR', changePct: -4.1 },
      { ticker: 'CCJ', changePct: -0.06 },
      { ticker: 'LEU', changePct: 2.5 },
      { ticker: 'NNE', changePct: 1.2 },
    ],
    uranium: { price: 82.5 },
    insiderTrades: [
      { ticker: 'CCJ', filer: 'Jane Doe', title: 'Director', transactionCode: 'A', shares: 90000, pricePerShare: 0, totalValue: null, date: '2026-09-26' },
      { ticker: 'UEC', filer: 'John Roe', title: 'CEO', transactionCode: 'P', shares: 25000, pricePerShare: 9.4, totalValue: 235000, date: '2026-09-25' },
      { ticker: 'DNN', filer: 'Old Buyer', title: 'CFO', transactionCode: 'P', shares: 900000, pricePerShare: 2.6, totalValue: 2340000, date: '2026-08-01' },
    ],
    predictionMarkets: [
      { question: 'Iran agrees to end enrichment by December 31?', source: 'polymarket', yesPrice: 0.1, volume: 1800000 },
      { question: 'Settled market', source: 'polymarket', yesPrice: 0.995, volume: 9e9 },
    ],
  },
};

const fleet = {
  units: [
    ...Array.from({ length: 82 }, (_, i) => ({ unit: `Unit ${i}`, power: 100 })),
    { unit: 'Browns Ferry 1', power: 0 },
    { unit: 'Vogtle 3', power: 60 },
  ],
};

describe('X drafts', () => {
  it('keeps every draft within 280 characters', () => {
    const drafts = buildXDrafts({ snapshot, fleet, now: NOW });
    expect(drafts.map((d) => d.kind)).toEqual(['Market movers', 'Reactor status', 'Insider buy', 'Market odds']);
    for (const d of drafts) expect(d.text.length).toBeLessThanOrEqual(280);
  });

  it('leads the movers post with the biggest absolute moves', () => {
    const { text } = moversDraft(snapshot);
    expect(text.indexOf('$OKLO +6.2%')).toBeLessThan(text.indexOf('$SMR −4.1%'));
    expect(text).toContain('Uranium spot: $82.50/lb');
    expect(text).toContain('3 of 5 names');
  });

  it('summarises the fleet with offline units first', () => {
    const { text } = fleetDraft(fleet);
    expect(text).toContain('82 of 84 reactors at full power');
    expect(text).toContain('Offline: Browns Ferry 1');
    expect(text).toContain('Vogtle 3 (60%)');
  });

  it('only posts recent open-market buys, never grants', () => {
    const { text } = insiderDraft(snapshot, { now: NOW });
    expect(text).toContain('John Roe, CEO bought 25,000 shares of $UEC');
    expect(text).not.toContain('Jane Doe');
    expect(text).not.toContain('Old Buyer');
  });

  it('skips settled prediction markets', () => {
    expect(oddsDraft(snapshot).text).toContain('put it at 10%');
  });

  it('returns nothing rather than an empty post when data is missing', () => {
    expect(buildXDrafts({ snapshot: {}, fleet: null, now: NOW })).toEqual([]);
  });

  it('builds a prefilled X compose link', () => {
    expect(xIntentUrl('Hi & bye')).toBe('https://x.com/intent/post?text=Hi%20%26%20bye');
  });
});
