import { describe, expect, it } from "vitest";
import { buildEntriesFromSubmissions } from "./earnings.js";

describe("buildEntriesFromSubmissions", () => {
  it("extracts 10-Q dates and tracked 8-K items", () => {
    const submissions = {
      cik: "0000123456",
      filings: {
        recent: {
          form: ["10-Q", "8-K", "8-K", "10-Q", "S-1"],
          filingDate: ["2026-05-01", "2026-04-15", "2026-03-20", "2026-02-01", "2026-01-10"],
          accessionNumber: ["a-1", "a-2", "a-3", "a-4", "a-5"],
          primaryDocument: ["d1.htm", "d2.htm", "d3.htm", "d4.htm", "d5.htm"],
          items: ["", "2.02,7.01", "9.01", "", ""],
        },
      },
    };
    const { tenQDates, events } = buildEntriesFromSubmissions(submissions, "CCJ", "Cameco");
    expect(tenQDates.map((t) => t.date)).toEqual(["2026-05-01", "2026-02-01"]);
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.item)).toEqual(["2.02", "7.01"]);
    expect(events[0].ticker).toBe("CCJ");
    expect(events[0].url).toContain("/Archives/edgar/data/");
  });
});
