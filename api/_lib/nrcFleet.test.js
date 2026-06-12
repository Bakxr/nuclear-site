import { describe, expect, it } from 'vitest';
import { parseFleetStatus } from './nrcFleet.js';

const SAMPLE = `ReportDt|Unit|Power
6/11/2026 12:00:00 AM|Arkansas Nuclear 1|100
6/11/2026 12:00:00 AM|Arkansas Nuclear 2|60
6/11/2026 12:00:00 AM|Beaver Valley 1|100
6/11/2026 12:00:00 AM|Browns Ferry 1|0
6/10/2026 12:00:00 AM|Arkansas Nuclear 1|100
6/10/2026 12:00:00 AM|Arkansas Nuclear 2|55`;

describe('parseFleetStatus', () => {
  it('aggregates only the most recent report day', () => {
    const result = parseFleetStatus(SAMPLE);

    expect(result.reportDate).toBe('6/11/2026');
    expect(result.total).toBe(4);
    expect(result.online).toBe(3);
    expect(result.atFullPower).toBe(2);
    expect(result.avgPower).toBe(65);
    expect(result.units).toEqual([
      { unit: 'Arkansas Nuclear 1', power: 100 },
      { unit: 'Arkansas Nuclear 2', power: 60 },
      { unit: 'Beaver Valley 1', power: 100 },
      { unit: 'Browns Ferry 1', power: 0 },
    ]);
  });

  it('returns null for empty or headers-only files', () => {
    expect(parseFleetStatus('')).toBeNull();
    expect(parseFleetStatus('ReportDt|Unit|Power\n')).toBeNull();
  });

  it('skips malformed rows without breaking the day boundary', () => {
    const text = `ReportDt|Unit|Power
6/11/2026 12:00:00 AM|Vogtle 4|100
garbage line
6/11/2026 12:00:00 AM|Watts Bar 1|not-a-number
6/11/2026 12:00:00 AM|Wolf Creek 1|98`;

    const result = parseFleetStatus(text);
    expect(result.total).toBe(2);
    expect(result.units.map((u) => u.unit)).toEqual(['Vogtle 4', 'Wolf Creek 1']);
  });
});
