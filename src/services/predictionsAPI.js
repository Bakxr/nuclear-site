// Public prediction-market teaser for the editorial page.
// Server caches Polymarket + Kalshi for 30 minutes; we additionally
// memoize per page load so remounts don't refetch.

let inFlight = null;
let cached = null;

export async function fetchPredictionTeaser() {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch("/api/market/quotes?type=predictions");
      if (!res.ok) return [];
      const payload = await res.json();
      const markets = Array.isArray(payload?.markets) ? payload.markets : [];
      cached = markets;
      return markets;
    } catch {
      return [];
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
