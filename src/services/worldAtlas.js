// World outlines for the maps. A tiny TopoJSON decoder keeps us off the
// topojson-client dependency.

// Simple topojson decoder (no library needed) — lifted to module level so fetchLand can use it
export function decodeTopojson(topology, object) {
  const arcs = topology.arcs;
  const transform = topology.transform;
  function decodeArc(arcIdx) {
    // TopoJSON marks a reversed arc i as ~i (-i - 1), not -i.
    const arc = arcs[arcIdx < 0 ? ~arcIdx : arcIdx];
    const coords = [];
    let x = 0, y = 0;
    for (let i = 0; i < arc.length; i++) {
      x += arc[i][0];
      y += arc[i][1];
      const lon = transform ? x * transform.scale[0] + transform.translate[0] : arc[i][0];
      const lat = transform ? y * transform.scale[1] + transform.translate[1] : arc[i][1];
      coords.push([lon, lat]);
    }
    if (arcIdx < 0) coords.reverse();
    return coords;
  }
  function decodeRing(ring) {
    let coords = [];
    // Consecutive arcs share an end point; drop the duplicate.
    ring.forEach((idx, i) => { coords = coords.concat(i ? decodeArc(idx).slice(1) : decodeArc(idx)); });
    return coords;
  }
  if (object.type === "GeometryCollection") {
    const features = object.geometries.map(geom => {
      if (geom.type === "Polygon") {
        return { type: "Feature", geometry: { type: "Polygon", coordinates: geom.arcs.map(decodeRing) } };
      } else if (geom.type === "MultiPolygon") {
        return { type: "Feature", geometry: { type: "MultiPolygon", coordinates: geom.arcs.map(poly => poly.map(decodeRing)) } };
      }
      return null;
    }).filter(Boolean);
    return { type: "FeatureCollection", features };
  }
  if (object.type === "Polygon") {
    return { type: "Feature", geometry: { type: "Polygon", coordinates: object.arcs.map(decodeRing) } };
  }
  if (object.type === "MultiPolygon") {
    return { type: "Feature", geometry: { type: "MultiPolygon", coordinates: object.arcs.map(p => p.map(decodeRing)) } };
  }
  return { type: "FeatureCollection", features: [] };
}

// Natural Earth outlines from world-atlas (110m), fetched once per page load
// and shared by the 3D globe (land) and the editorial map (countries).
const ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2";
const cache = new Map();

function fetchAtlas(file, objectName) {
  if (!cache.has(file)) {
    const request = fetch(`${ATLAS_URL}/${file}`)
      .then((r) => r.json())
      .then((world) => (world.type === "Topology" ? decodeTopojson(world, world.objects[objectName]) : world))
      .catch(() => {
        cache.delete(file);
        return null;
      });
    cache.set(file, request);
  }
  return cache.get(file);
}

export function fetchLand() {
  return fetchAtlas("land-110m.json", "land");
}

// detail: "110m" (light, the default) or "50m" (~200 KB, for zoomed-in views).
export function fetchCountries(detail = "110m") {
  return fetchAtlas(`countries-${detail}.json`, "countries");
}
