import { describe, expect, it } from "vitest";
import { dotRadius, fitTransform } from "./mapMath.js";

describe("dotRadius", () => {
  it("grows with capacity but stays readable", () => {
    expect(dotRadius({ capacity: 300 })).toBeLessThan(dotRadius({ capacity: 6000 }));
    expect(dotRadius({ capacity: 6478 })).toBeLessThan(6);
    expect(dotRadius({})).toBe(2.4);
    expect(dotRadius({}, "uranium")).toBe(3.6);
  });
});

describe("fitTransform", () => {
  it("centers and zooms on the given dots", () => {
    const t = fitTransform([{ x: 100, y: 100 }, { x: 140, y: 120 }], 960, 500, 8, 48);
    expect(t.k).toBe(8);
    expect(t.x + 120 * t.k).toBeCloseTo(480);
    expect(t.y + 110 * t.k).toBeCloseTo(250);
  });

  it("never zooms out past the whole world", () => {
    expect(fitTransform([{ x: 0, y: 0 }, { x: 960, y: 500 }], 960, 500).k).toBe(1);
  });
});
