import { describe, expect, it } from 'vitest';
import { collapseMarketSeries, formatProbability, isExpiredMarket, marketTopicKey } from './marketTopic.js';

const NOW = Date.parse('2026-09-26T12:00:00Z');

describe('marketTopicKey', () => {
  it('treats deadline variants of the same question as one topic', () => {
    const a = marketTopicKey('Iran agrees to surrender enriched uranium stockpile by May 31, 2026?');
    const b = marketTopicKey('Iran agrees to surrender enriched uranium stockpile by December 31, 2026?');
    const c = marketTopicKey('Iran agrees to surrender enriched uranium stockpile by April?');
    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(marketTopicKey('Iran nuclear test before 2027?')).not.toBe(a);
  });
});

describe('isExpiredMarket', () => {
  it('flags markets whose end date has passed', () => {
    expect(isExpiredMarket({ endDate: '2026-06-01T03:59:00Z' }, NOW)).toBe(true);
    expect(isExpiredMarket({ endDate: '2027-01-01T04:59:00Z' }, NOW)).toBe(false);
    expect(isExpiredMarket({ endDate: null }, NOW)).toBe(false);
  });
});

describe('collapseMarketSeries', () => {
  it('keeps the first (highest-volume) variant and records the series', () => {
    const rows = collapseMarketSeries([
      { id: 'a', question: 'Deal signed by June 30, 2026?', endDate: '2026-06-30', volume: 500, yesPrice: 0.1 },
      { id: 'b', question: 'Reactor restart in 2026?', volume: 300, yesPrice: 0.4 },
      { id: 'c', question: 'Deal signed by December 31, 2026?', endDate: '2026-12-31', volume: 200, yesPrice: 0.3 },
    ]);
    expect(rows.map((row) => row.id)).toEqual(['a', 'b']);
    expect(rows[0].seriesCount).toBe(2);
    expect(rows[0].volume).toBe(700);
    expect(rows[0].series.map((m) => m.id)).toEqual(['a', 'c']);
    expect(rows[1].seriesCount).toBeUndefined();
  });
});

describe('formatProbability', () => {
  it('never rounds a live low-probability market down to 0%', () => {
    expect(formatProbability(0.001)).toBe('<1%');
    expect(formatProbability(0.07)).toBe('7%');
    expect(formatProbability(0.999)).toBe('>99%');
    expect(formatProbability(0)).toBe('0%');
    expect(formatProbability(undefined)).toBe('—');
  });
});
