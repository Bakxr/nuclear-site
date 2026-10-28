import { describe, expect, it } from "vitest";
import { angularDistance, focusOn, formatCoords, shortestTurn } from "./globeMath.js";

describe("shortestTurn", () => {
  it("turns the short way across the date line", () => {
    expect(shortestTurn(170, -170)).toBe(20);
    expect(shortestTurn(-170, 170)).toBe(-20);
    expect(shortestTurn(10, 30)).toBe(20);
    expect(shortestTurn(0, 180)).toBe(180);
  });
});

describe("angularDistance", () => {
  it("is a quarter turn from the equator to the pole", () => {
    expect(angularDistance([0, 0], [0, 90])).toBeCloseTo(Math.PI / 2);
  });
});

describe("focusOn", () => {
  it("returns null without places", () => {
    expect(focusOn([])).toBeNull();
    expect(focusOn([{ lat: NaN, lng: 1 }])).toBeNull();
  });

  it("centres on a single place at the zoom cap", () => {
    const f = focusOn([{ lat: 51.2, lng: -3.1 }], 6);
    expect(f.lat).toBeCloseTo(51.2);
    expect(f.lng).toBeCloseTo(-3.1);
    expect(f.zoom).toBe(6);
  });

  it("centres a cluster between its places and zooms to fit", () => {
    const f = focusOn([{ lat: 40, lng: -70 }, { lat: 40, lng: -110 }]);
    expect(f.lng).toBeCloseTo(-90, 0);
    expect(f.zoom).toBeGreaterThan(1);
    expect(f.zoom).toBeLessThan(6);
  });

  it("stays at world zoom for places on opposite sides", () => {
    expect(focusOn([{ lat: 0, lng: 0 }, { lat: 0, lng: 180 }]).zoom).toBe(1);
  });
});

describe("formatCoords", () => {
  it("prints hemispheres and wraps longitude", () => {
    expect(formatCoords(-97.14, 38.21)).toBe("38.2°N 97.1°W");
    expect(formatCoords(370, -10)).toBe("10.0°S 10.0°E");
  });
});
