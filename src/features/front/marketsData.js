export const SESSIONS = 22;

// Closes for the last month plus today's price when the quote is newer than
// the last close. Never synthesised: no history means no chart.
export function recentCloses(stock) {
  const closes = (stock.history || []).map((point) => point.price).filter(Number.isFinite);
  if (stock.price > 0 && closes.length && closes.at(-1) !== stock.price) closes.push(stock.price);
  return closes.slice(-SESSIONS);
}

// SVG polyline points scaled to the series' own range, so moves are visible.
export function sparkPoints(values, width = 100, height = 28, pad = 2) {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((value, i) => `${((i / (values.length - 1)) * width).toFixed(1)},${(height - pad - ((value - min) / span) * (height - pad * 2)).toFixed(1)}`)
    .join(" ");
}
