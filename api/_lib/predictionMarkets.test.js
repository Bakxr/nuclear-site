import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./terminalStore.js", () => ({
  readTerminalCache: vi.fn(async () => null),
  writeTerminalCache: vi.fn(async () => {}),
}));

const { fetchPredictionMarkets } = await import("./predictionMarkets.js");
const { readTerminalCache } = await import("./terminalStore.js");

describe("fetchPredictionMarkets", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    readTerminalCache.mockReset().mockResolvedValue(null);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("filters by nuclear keywords and combines sources", async () => {
    const poly = [
      { id: "p1", question: "Will a new nuclear reactor open in 2026?", slug: "nuclear-2026", lastTradePrice: 0.42, volume: 50000, endDate: "2026-12-31" },
      { id: "p2", question: "Will the Lakers win the title?", slug: "nba", lastTradePrice: 0.3, volume: 90000 },
    ];
    const kalshi = { markets: [
      { ticker: "URAN-26", title: "Uranium spot above $90 in 2026", yes_bid: 35, no_bid: 65, volume: 10000, close_time: "2026-12-31" },
      { ticker: "WX-RAIN", title: "Will it rain Tuesday", yes_bid: 50, no_bid: 50 },
    ]};
    globalThis.fetch = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () => (String(url).includes("polymarket") ? poly : kalshi),
    }));

    const result = await fetchPredictionMarkets({ force: true });
    expect(result.length).toBe(2);
    const sources = result.map((r) => r.source).sort();
    expect(sources).toEqual(["kalshi", "polymarket"]);
    const polyRow = result.find((r) => r.source === "polymarket");
    expect(polyRow.yesPrice).toBeCloseTo(0.42, 2);
    const kalshiRow = result.find((r) => r.source === "kalshi");
    expect(kalshiRow.yesPrice).toBeCloseTo(0.35, 2);
  });
});
