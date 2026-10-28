import { describe, expect, it } from "vitest";
import { joinSources, pickFront } from "./pickFront.js";

const now = Date.parse("2026-10-28T00:00:00Z");
const article = (over) => ({
  title: "t",
  url: `https://x/${Math.random()}`,
  tag: "Policy",
  engagementScore: 50,
  pubDate: new Date(now - 3 * 3600_000),
  ...over,
});

describe("pickFront", () => {
  it("leads with the story the most outlets carried", () => {
    const big = article({ title: "Loan", related: [{ source: "B" }], engagementScore: 40 });
    const hot = article({ title: "Hot", engagementScore: 70 });
    expect(pickFront([hot, big], { now }).lead).toBe(big);
  });

  it("only leads with recent stories when there are any", () => {
    const old = article({ title: "Old", related: [{}, {}], pubDate: new Date(now - 72 * 3600_000) });
    const fresh = article({ title: "Fresh" });
    expect(pickFront([old, fresh], { now }).lead).toBe(fresh);
  });

  it("spreads secondary stories across tags first", () => {
    const lead = article({ tag: "Markets", related: [{}] });
    const p1 = article({ tag: "Policy", engagementScore: 90 });
    const p2 = article({ tag: "Policy", engagementScore: 80 });
    const e1 = article({ tag: "Expansion", engagementScore: 10 });
    const { secondary } = pickFront([lead, p1, p2, e1], { now, secondaryCount: 2 });
    expect(secondary).toEqual([p1, e1]);
  });

  it("ignores the curated fallback", () => {
    expect(pickFront([article({ _isFallback: true })], { now }).lead).toBeNull();
  });
});

describe("joinSources", () => {
  it("reads naturally", () => {
    expect(joinSources(["A"])).toBe("A");
    expect(joinSources(["A", "B"])).toBe("A and B");
    expect(joinSources(["A", "B", "C", "B"])).toBe("A, B and C");
  });
});

describe("tidyExcerpt", async () => {
  const { tidyExcerpt } = await import("./pickFront.js");
  it("ends at a whole word, never mid-word", () => {
    expect(tidyExcerpt("Constellation Energy's nuclear fleet across three states and nuclear fl")).toBe("Constellation Energy's nuclear fleet across three states and nuclear…");
  });
  it("prefers the last full sentence", () => {
    const text = "The DOE offered a conditional loan of up to $5 billion for uprates at eight plants in three states. It would fin";
    expect(tidyExcerpt(text)).toBe("The DOE offered a conditional loan of up to $5 billion for uprates at eight plants in three states.");
  });
  it("leaves complete text alone", () => {
    expect(tidyExcerpt("Done.")).toBe("Done.");
  });
});
