import { useCallback, useEffect, useState } from "react";
import { clearNewsCache, fetchNuclearNews, getInstantNews } from "../../services/newsAPI.js";

const REFRESH_MS = 15 * 60 * 1000;

// Live news for the editorial page. Starts with the curated set so the
// section is never empty, swaps in /api/news when it arrives, and refreshes
// every 15 minutes. `error` means the curated fallback is showing.
export function useNewsFeed() {
  const [news, setNews] = useState(() => getInstantNews());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async ({ force = false } = {}) => {
    setLoading(true);
    if (force) {
      setError(false);
      clearNewsCache();
    }
    try {
      const articles = await fetchNuclearNews();
      setNews(articles);
      // fetchNuclearNews resolves with the curated set when /api/news is down.
      setError(Boolean(articles[0]?._isFallback));
    } catch {
      setNews(getInstantNews());
      setError(true);
    } finally {
      setLastUpdated(new Date());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const refresh = useCallback(() => load({ force: true }), [load]);

  return { news, loading, error, lastUpdated, refresh };
}
