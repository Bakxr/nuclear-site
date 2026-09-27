import { describe, expect, it } from 'vitest';
import { parseChartPayload, toChartHistory } from './priceHistory.js';

const payload = {
  chart: {
    result: [{
      meta: { fiftyTwoWeekHigh: 135.24, fiftyTwoWeekLow: 77.7, regularMarketVolume: 1938592, currency: 'USD' },
      timestamp: [1790000000, 1790086400, 1790172800],
      indicators: { quote: [{ close: [88.1, null, 88.07] }] },
    }],
  },
};

describe('parseChartPayload', () => {
  it('parses closes, skips null bars and keeps range metadata', () => {
    const parsed = parseChartPayload(payload);
    expect(parsed.points).toHaveLength(2);
    expect(parsed.points[1].close).toBe(88.07);
    expect(parsed).toMatchObject({ high52: 135.24, low52: 77.7, volume: 1938592 });
  });

  it('returns null for empty or malformed payloads', () => {
    expect(parseChartPayload(null)).toBeNull();
    expect(parseChartPayload({ chart: { result: [] } })).toBeNull();
    expect(parseChartPayload({ chart: { result: [{ timestamp: [1], indicators: { quote: [{ close: [null] }] } }] } })).toBeNull();
  });
});

describe('toChartHistory', () => {
  it('maps to the {day, date, price} shape the charts consume', () => {
    const history = toChartHistory(parseChartPayload(payload));
    expect(history[0]).toMatchObject({ day: 0, price: 88.1 });
    expect(typeof history[0].date).toBe('string');
    expect(toChartHistory(null)).toEqual([]);
  });
});
