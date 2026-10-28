// Pure helpers for the print globe (PrintGlobe): where to point it and how
// far to zoom so a set of places fills the visible hemisphere.

const RAD = Math.PI / 180;

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Signed shortest turn from one longitude to another, in degrees (-180..180].
export function shortestTurn(from, to) {
  const delta = (((to - from) % 360) + 540) % 360 - 180;
  return delta === -180 ? 180 : delta;
}

// Great-circle distance between two [lng, lat] points, in radians.
export function angularDistance([lng1, lat1], [lng2, lat2]) {
  const a = Math.sin(((lat2 - lat1) * RAD) / 2) ** 2
    + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(((lng2 - lng1) * RAD) / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Centre (mean of unit vectors) and zoom for a set of places. The zoom puts
// the farthest place at ~80% of the globe's radius, capped at maxZoom.
export function focusOn(places, maxZoom = 6) {
  const points = places.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!points.length) return null;
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of points) {
    const lat = p.lat * RAD;
    const lng = p.lng * RAD;
    x += Math.cos(lat) * Math.cos(lng);
    y += Math.cos(lat) * Math.sin(lng);
    z += Math.sin(lat);
  }
  const len = Math.hypot(x, y, z);
  // Places spread evenly round the world: no meaningful centre.
  if (len < 1e-6) return { lng: 0, lat: 20, zoom: 1 };
  const lng = Math.atan2(y, x) / RAD;
  const lat = Math.asin(z / len) / RAD;
  const spread = Math.max(...points.map((p) => angularDistance([lng, lat], [p.lng, p.lat])));
  const zoom = spread >= Math.PI / 2 ? 1 : clamp(0.8 / Math.sin(Math.max(spread, 0.02)), 1, maxZoom);
  return { lng, lat, zoom };
}

// "38.2°N 97.1°W" for the globe's readout.
export function formatCoords(lng, lat) {
  const wrapped = shortestTurn(0, lng);
  return `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"} ${Math.abs(wrapped).toFixed(1)}°${wrapped >= 0 ? "E" : "W"}`;
}
