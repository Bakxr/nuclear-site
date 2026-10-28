// Dot size by capacity (area grows with MW, so a 6 GW site doesn't swamp
// the map); mines and missing capacities get a fixed size.
export function dotRadius(item, mode = "reactors") {
  if (mode !== "reactors") return 3.6;
  const mw = Number(item.capacity);
  if (!Number.isFinite(mw) || mw <= 0) return 2.4;
  return 1.8 + Math.sqrt(mw) / 22;
}

// Zoom transform that fits a set of projected dots into the frame, with
// padding; capped so a single plant doesn't zoom to street level.
export function fitTransform(dots, width, height, maxZoom = 8, pad = 48) {
  if (!dots.length) return { k: 1, x: 0, y: 0 };
  const xs = dots.map((d) => d.x);
  const ys = dots.map((d) => d.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const k = Math.min(maxZoom, Math.max(1, Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY)));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return { k, x: width / 2 - cx * k, y: height / 2 - cy * k };
}
