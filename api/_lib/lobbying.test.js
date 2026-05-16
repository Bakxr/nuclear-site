import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./terminalStore.js", () => ({
  readTerminalCache: vi.fn(async () => null),
  writeTerminalCache: vi.fn(async () => {}),
}));

const { fetchLobbyingFilings } = await import("./lobbying.js");
const { readTerminalCache } = await import("./terminalStore.js");

describe("fetchLobbyingFilings", () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    readTerminalCache.mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("normalizes LDA filings", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          {
            filing_uuid: "u1",
            registrant: { name: "Lobby Co" },
            client: { name: "Cameco" },
            filing_year: 2026,
            filing_period_display: "Q1",
            income: "120000",
            lobbying_activities: [{ general_issue_code_display: "Energy/Nuclear" }],
            filing_type_display: "Quarterly",
            dt_posted: "2026-04-20T00:00:00Z",
            url: "https://lda.senate.gov/filings/u1",
          },
        ],
      }),
    }));

    const result = await fetchLobbyingFilings({ force: true });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      client: "Cameco",
      registrant: "Lobby Co",
      amount: 120000,
      issues: ["Energy/Nuclear"],
    });
  });

  it("returns cached/empty on fetch failure", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500 }));
    const result = await fetchLobbyingFilings({ force: true });
    expect(result).toEqual([]);
  });
});
