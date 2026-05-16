import { describe, expect, it } from "vitest";
import { inferMarketAnchor } from "./marketAnchor.js";

const FIXTURES = {
  plants: [
    { name: "Vogtle", country: "USA", lat: 33.14, lng: -81.76 },
    { name: "Diablo Canyon", country: "USA", lat: 35.21, lng: -120.85 },
  ],
  countries: [
    { country: "USA" },
    { country: "Iran" },
    { country: "France" },
    { country: "Japan" },
  ],
  companies: [
    { id: "co:CCJ", name: "Cameco Corporation", ticker: "CCJ", countries: ["Canada"] },
    { id: "co:OKLO", name: "Oklo Inc", ticker: "OKLO", countries: ["USA"] },
  ],
};

describe("inferMarketAnchor", () => {
  it("anchors a plant by name", () => {
    const anchor = inferMarketAnchor({ question: "Will Vogtle Unit 4 reach full power in 2026?" }, FIXTURES);
    expect(anchor).not.toBeNull();
    expect(anchor.anchorType).toBe("plant");
    expect(anchor.lat).toBeCloseTo(33.14, 2);
  });

  it("resolves Iran via alias", () => {
    const anchor = inferMarketAnchor({ question: "Will Iran enrich uranium above 90% by year end?" }, FIXTURES);
    expect(anchor).not.toBeNull();
    expect(anchor.anchorType).toBe("country");
    expect(anchor.anchorLabel).toBe("Iran");
  });

  it("anchors via ticker with plant override (OKLO → Idaho)", () => {
    const anchor = inferMarketAnchor({ question: "Will OKLO ship its first commercial reactor?" }, FIXTURES);
    expect(anchor).not.toBeNull();
    expect(anchor.anchorType).toBe("plant");
    expect(anchor.lat).toBeCloseTo(43.52, 2);
  });

  it("anchors CCJ to Canada", () => {
    const anchor = inferMarketAnchor({ question: "Will CCJ close above $80 in Q4?" }, FIXTURES);
    expect(anchor).not.toBeNull();
    expect(anchor.anchorType).toBe("company");
    expect(anchor.anchorLabel).toContain("Canada");
  });

  it("returns null for non-anchorable questions", () => {
    const anchor = inferMarketAnchor({ question: "Will the price of bananas rise next week?" }, FIXTURES);
    expect(anchor).toBeNull();
  });
});
