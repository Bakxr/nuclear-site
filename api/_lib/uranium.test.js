import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./terminalStore.js", () => ({
  readTerminalCache: vi.fn(async () => null),
  writeTerminalCache: vi.fn(async () => {}),
}));

const { fetchUraniumPrice, pickSputRow } = await import("./uranium.js");
const { readTerminalCache, writeTerminalCache } = await import("./terminalStore.js");

describe("fetchUraniumPrice", () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    readTerminalCache.mockReset().mockResolvedValue(null);
    writeTerminalCache.mockReset().mockResolvedValue();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("derives price per pound from SPUT totalMarketValue / totalOunces1", async () => {
    const payload = [
      {}, {}, {}, {},
      {
        totalMarketValue: 7_000_000_000,
        totalOunces1: 80_000_000,
        dateTimeStamp: "2026-05-14T00:00:00Z",
      },
    ];
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(payload),
    }));

    const result = await fetchUraniumPrice({ force: true });
    expect(result.pricePerLb).toBeCloseTo(87.5, 2);
    expect(result.source).toMatch(/Sprott/);
    expect(writeTerminalCache).toHaveBeenCalled();
  });

  it("returns stale cached payload when fetch fails", async () => {
    readTerminalCache.mockResolvedValue({
      payload: { pricePerLb: 80, source: "cache", sourceUrl: "x", asOf: "x", fetchedAt: "x" },
      updatedAt: new Date(0).toISOString(),
    });
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500, text: async () => "" }));

    const result = await fetchUraniumPrice({ force: true });
    expect(result).toMatchObject({ pricePerLb: 80, stale: true });
  });

  it("returns null when no provider and no cache", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500, text: async () => "" }));
    const result = await fetchUraniumPrice({ force: true });
    expect(result).toBeNull();
  });

  it("computes the change vs the previous trading day's close", async () => {
    readTerminalCache.mockImplementation(async (key) => (key === "uranium_spot_history_v1"
      ? { payload: { "2026-05-13": 80 }, updatedAt: new Date().toISOString() }
      : null));
    const payload = [{}, {}, {}, {}, { totalMarketValue: 8_400_000_000, totalOunces1: 100_000_000, dateTimeStamp: "2026-05-14T00:00:00Z" }];
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify(payload) }));

    const result = await fetchUraniumPrice({ force: true });
    expect(result.pricePerLb).toBe(84);
    expect(result.change).toBe(4);
    expect(result.changePct).toBe(5);
  });
});

describe("pickSputRow", () => {
  const row = (price) => ({ totalMarketValue: price * 1_000_000, totalOunces1: 1_000_000 });

  it("uses index 4 when its price is plausible", () => {
    const rows = [row(4000), row(54), row(30), row(40), row(90)];
    expect(pickSputRow(rows, 88)).toBe(rows[4]);
  });

  it("finds SPUT elsewhere if the array was reordered", () => {
    const rows = [row(4000), row(90.5), row(30), row(40), row(54)];
    expect(pickSputRow(rows, 90)).toBe(rows[1]);
  });

  it("refuses a row that jumped implausibly with no close match", () => {
    const rows = [row(4000), row(30), row(30), row(40), row(54)];
    expect(pickSputRow(rows, 90)).toBeNull();
  });
});
