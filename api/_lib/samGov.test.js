import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./terminalStore.js", () => ({
  readTerminalCache: vi.fn(async () => null),
  writeTerminalCache: vi.fn(async () => {}),
}));

const { fetchGovContracts } = await import("./samGov.js");
const { readTerminalCache } = await import("./terminalStore.js");

describe("fetchGovContracts", () => {
  const realFetch = globalThis.fetch;
  const realKey = process.env.SAM_API_KEY;

  beforeEach(() => {
    readTerminalCache.mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    if (realKey) process.env.SAM_API_KEY = realKey;
    else delete process.env.SAM_API_KEY;
  });

  it("returns [] gracefully when SAM_API_KEY is unset", async () => {
    delete process.env.SAM_API_KEY;
    const result = await fetchGovContracts({ force: true });
    expect(result).toEqual([]);
  });

  it("normalizes opportunities when key + payload present", async () => {
    process.env.SAM_API_KEY = "test-key";
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        opportunitiesData: [
          {
            noticeId: "abc123",
            title: "HALEU enrichment services",
            fullParentPathName: "DOE/NNSA",
            postedDate: "2026-05-01",
            responseDeadLine: "2026-06-01",
            type: "Solicitation",
            naicsCode: "221113",
            uiLink: "https://sam.gov/opp/abc123/view",
          },
        ],
      }),
    }));

    const result = await fetchGovContracts({ force: true });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "gov:abc123",
      title: "HALEU enrichment services",
      agency: "DOE/NNSA",
      naics: "221113",
    });
  });
});
