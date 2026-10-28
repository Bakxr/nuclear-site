import { describe, expect, it } from "vitest";
import { decodeTopojson } from "./worldAtlas.js";

describe("decodeTopojson", () => {
  it("reads ~i as arc i reversed", () => {
    const topology = {
      arcs: [
        [[0, 0], [1, 0], [1, 1]],
        [[1, 1], [0, 1], [0, 0]],
      ],
    };
    // Ring made of arc 0 then arc 1, and the same square traced backwards.
    const forward = decodeTopojson(topology, { type: "Polygon", arcs: [[0, 1]] });
    const backward = decodeTopojson(topology, { type: "Polygon", arcs: [[~1, ~0]] });
    expect(forward.geometry.coordinates[0]).toEqual([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]);
    expect(backward.geometry.coordinates[0]).toEqual([[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]);
  });
});
