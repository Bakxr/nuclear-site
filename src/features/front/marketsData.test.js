import { describe, expect, it } from "vitest";
import { recentCloses, sparkPoints } from "./marketsData.js";

describe("recentCloses", () => {
  it("appends today's price and keeps the last 22 sessions", () => {
    const history = Array.from({ length: 30 }, (_, i) => ({ price: 10 + i }));
    const closes = recentCloses({ history, price: 50 });
    expect(closes).toHaveLength(22);
    expect(closes.at(-1)).toBe(50);
  });

  it("never invents a series", () => {
    expect(recentCloses({ history: [], price: 12 })).toEqual([]);
  });
});

describe("sparkPoints", () => {
  it("scales to the series' own range", () => {
    expect(sparkPoints([1, 2, 3], 100, 28, 2)).toBe("0.0,26.0 50.0,14.0 100.0,2.0");
    expect(sparkPoints([5])).toBe("");
  });
});
