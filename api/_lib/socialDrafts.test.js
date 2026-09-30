import { describe, expect, it } from 'vitest';
import { buildXDrafts, fleetDraft, insiderDraft, milestoneDrafts, moversDraft, newsletterDraft, oddsDraft, trackedLink, xIntentUrl, xLength } from './socialDrafts.js';

const NOW = Date.parse('2026-09-28T10:30:00Z');

const snapshot = {
  entities: {
    // Shape of the real terminal snapshot; NOQUOTE mimics a missing quote.
    marketInstruments: [
      { ticker: 'OKLO', price: 38, pct: 6.24 },
      { ticker: 'SMR', price: 8.4, pct: -4.1 },
      { ticker: 'CCJ', price: 88, pct: -0.06 },
      { ticker: 'LEU', price: 147, pct: 2.5 },
      { ticker: 'NNE', price: 17, pct: 1.2 },
      { ticker: 'NOQUOTE', price: 0, pct: 0 },
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
  it('keeps every post and reply within 280 characters', () => {
    const drafts = buildXDrafts({ snapshot, fleet, now: NOW });
    expect(drafts.map((d) => d.kind)).toEqual(['Market movers', 'Reactor status', 'Insider buy', 'Market odds']);
    for (const d of drafts) {
      expect(xLength(d.text)).toBeLessThanOrEqual(280);
      expect(xLength(d.reply)).toBeLessThanOrEqual(280);
    }
  });

  it('keeps links out of the post and puts a tagged link in the reply', () => {
    const [movers, status] = buildXDrafts({ snapshot, fleet, now: NOW });
    for (const d of [movers, status]) expect(d.text).not.toMatch(/https?:\/\//);
    expect(movers.reply).toContain('https://thenuclearpulse.com/uranium-stocks?utm_source=x&utm_medium=social&utm_campaign=market-movers');
    expect(status.reply).toContain('/reactor-outages?utm_source=x');
  });

  it('ends each post with a question to draw replies', () => {
    for (const d of buildXDrafts({ snapshot, fleet, now: NOW })) expect(d.text.trim().endsWith('?')).toBe(true);
  });

  it('attaches chart data that matches the post', () => {
    const { card } = moversDraft(snapshot, { now: NOW });
    expect(card).toMatchObject({ type: 'movers', date: 'Sep 28', uranium: 82.5, up: 3, total: 5 });
    expect(card.rows[0]).toEqual({ ticker: 'OKLO', pct: 6.2 });
    expect(fleetDraft(fleet, { now: NOW }).card).toMatchObject({ type: 'fleet', full: 82, total: 84, offline: ['Browns Ferry 1'], offlineCount: 1, reducedCount: 1 });
  });

  it('counts links the way X does (23 characters each)', () => {
    expect(xLength(`hi ${trackedLink('/', 'a-very-long-campaign-name-indeed')}`)).toBe(26);
  });

  it('turns IAEA construction starts and grid entries into milestone posts, skipping removals', () => {
    const changes = [
      { kind: 'removed', station: 'Old (US)', name: 'Old', unit: 'Old 1' },
      { kind: 'construction-start', station: 'Bailong (China)', name: 'Bailong', unit: 'Bailong 1' },
      { kind: 'operating', station: 'Zhangzhou (China)', name: 'Zhangzhou', unit: 'Zhangzhou 2' },
    ];
    const drafts = milestoneDrafts(changes, { now: NOW });
    expect(drafts).toHaveLength(2);
    expect(drafts[0].text).toContain('Construction has started on Bailong 1, at Bailong (China).');
    expect(drafts[0].reply).toContain('/?plant=Bailong&utm_source=x');
    expect(drafts[0].card).toMatchObject({ type: 'milestone', unit: 'Bailong 1', station: 'Bailong, China', label: 'construction start' });
    expect(drafts[1].text).toContain('Zhangzhou 2 at Zhangzhou (China) is now in operation.');
    expect(buildXDrafts({ snapshot, fleet, plantChanges: changes, now: NOW })[0].kind).toBe('Reactor milestone');
  });

  it('plugs the newsletter on Thursdays only, link in the post itself', () => {
    expect(newsletterDraft({ now: NOW })).toBeNull();
    const thursday = Date.parse('2026-10-01T14:00:00Z');
    const plug = newsletterDraft({ now: thursday });
    expect(plug.text).toContain('utm_campaign=newsletter-plug');
    expect(plug.reply).toBeNull();
  });

  it('leads the movers post with the biggest absolute moves', () => {
    const { text } = moversDraft(snapshot);
    expect(text.indexOf('$OKLO +6.2%')).toBeLessThan(text.indexOf('$SMR −4.1%'));
    expect(text).toContain('Uranium spot: $82.50/lb');
    expect(text).toContain('3 of 5 names closed higher');
  });

  it('summarises the fleet with offline units first', () => {
    const { text } = fleetDraft(fleet);
    expect(text).toContain('82 of 84 US reactors are at full power');
    expect(text).toContain('1 offline, including Browns Ferry 1');
    expect(text).toContain('1 running at reduced power');
  });

  it('only posts recent open-market buys, never grants', () => {
    const { text, card } = insiderDraft(snapshot, { now: NOW });
    expect(text).toContain('John Roe, CEO bought 25,000 shares at $9.40');
    expect(text).not.toContain('Jane Doe');
    expect(text).not.toContain('Old Buyer');
    expect(card).toMatchObject({ ticker: 'UEC', date: 'Sep 25', value: '$235K' });
  });

  it('tones down all-caps SEC job titles', () => {
    const loud = { entities: { insiderTrades: [{ ticker: 'URG', filer: 'Walle Jade', title: 'VICE PRESIDENT FINANCE', transactionCode: 'P', shares: 1, date: '2026-09-27' }] } };
    expect(insiderDraft(loud, { now: NOW }).text).toContain('Walle Jade, Vice President Finance bought');
    const ceo = { entities: { insiderTrades: [{ ...loud.entities.insiderTrades[0], title: 'CEO AND DIRECTOR' }] } };
    expect(insiderDraft(ceo, { now: NOW }).card.title).toBe('CEO And Director');
  });

  it('skips settled prediction markets', () => {
    expect(oddsDraft(snapshot).text).toContain('Polymarket traders put this at 10%');
  });

  it('returns nothing rather than an empty post when data is missing', () => {
    expect(buildXDrafts({ snapshot: {}, fleet: null, now: NOW })).toEqual([]);
  });

  it('builds a prefilled X compose link', () => {
    expect(xIntentUrl('Hi & bye')).toBe('https://x.com/intent/post?text=Hi%20%26%20bye');
  });
});

describe('snapshot stock lookups used by emails and alerts', async () => {
  const { personalizeDaily, personalizeWeekly } = await import('./dispatch.js');
  const { buildSnapshotIndex, evaluateAlert } = await import('./alerts.js');

  it('weekly movers come from marketInstruments and skip missing quotes', () => {
    const { movers } = personalizeWeekly(snapshot);
    expect(movers.map((m) => m.ticker)).toEqual(['OKLO', 'SMR', 'LEU']);
  });

  it('daily brief matches watchlist entity ids like market:ccj', () => {
    const { movers } = personalizeDaily(snapshot, [{ entity_id: 'market:ccj', entity_label: 'Cameco' }]);
    expect(movers[0].ticker).toBe('CCJ');
  });

  it('price alerts fire for a ticker or a terminal entity id', () => {
    const index = buildSnapshotIndex(snapshot);
    expect(evaluateAlert({ alert_type: 'percent_rise', target_id: 'OKLO', threshold: 5 }, index)?.fired).toBe(true);
    expect(evaluateAlert({ alert_type: 'price_rise', target_id: 'market:leu', threshold: 140 }, index)?.fired).toBe(true);
  });
});
