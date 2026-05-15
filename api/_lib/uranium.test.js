import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./terminalStore.js", () => ({
  readTerminalCache: vi.fn(async () => null),
  writeTerminalCache: vi.fn(async () => {}),
}));

const { fetchUraniumPrice } = await import("./uranium.js");
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
});
