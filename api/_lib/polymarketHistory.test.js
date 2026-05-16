import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./terminalStore.js", () => ({
  readTerminalCache: vi.fn(async () => null),
  writeTerminalCache: vi.fn(async () => {}),
}));

const { fetchMarketHistory } = await import("./polymarketHistory.js");
const { readTerminalCache } = await import("./terminalStore.js");

describe("fetchMarketHistory", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    readTerminalCache.mockReset().mockResolvedValue(null);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("normalizes prices-history payload", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ history: [
        { t: 1700000000, p: 0.42 },
        { t: 1700086400, p: 0.45 },
      ] }),
    }));
    const result = await fetchMarketHistory("token-1", { force: true });
    expect(result).not.toBeNull();
    expect(result.history).toHaveLength(2);
    expect(result.history[0]).toEqual({ t: 1700000000, p: 0.42 });
    expect(result.stale).toBe(false);
  });

  it("returns null when fetch fails and no cache", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    const result = await fetchMarketHistory("token-2", { force: true });
    expect(result).toBeNull();
  });

  it("returns null for missing token id", async () => {
    const result = await fetchMarketHistory(null);
    expect(result).toBeNull();
  });
});
