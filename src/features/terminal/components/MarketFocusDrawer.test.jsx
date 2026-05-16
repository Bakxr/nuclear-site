import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MarketFocusDrawer from "./MarketFocusDrawer.jsx";

// Stub ResizeObserver — recharts ResponsiveContainer uses it.
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const baseSnapshot = {
  entities: {
    newsArticles: [],
    companyFilings: [],
    lobbying: [],
    govContracts: [],
    insiderTrades: [],
    predictionMarkets: [],
  },
};

function withContext(value) {
  return vi.doMock("../context.jsx", () => ({
    useTerminal: () => value,
  }));
}

describe("MarketFocusDrawer", () => {
  it("renders nothing when no market is selected", async () => {
    vi.resetModules();
    withContext({
      selectedMarket: null,
      closeMarket: vi.fn(),
      snapshot: baseSnapshot,
      watchedSet: new Set(),
      toggleWatch: vi.fn(),
      createAlert: vi.fn(),
    });
    const { default: Drawer } = await import("./MarketFocusDrawer.jsx");
    const { container } = render(<Drawer />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the question and anchor label when a market is selected", async () => {
    vi.resetModules();
    const market = {
      id: "pm:poly:test",
      source: "polymarket",
      question: "Will OKLO ship its first reactor in 2026?",
      yesPrice: 0.42,
      noPrice: 0.58,
      volume: 250000,
      endDate: "2026-12-31",
      url: "https://polymarket.com/event/test",
      anchor: { anchorLabel: "Oklo (INL) • USA", anchorType: "plant", anchorEntity: { name: "OKLO", country: "USA" } },
      history: [
        { t: 1700000000, p: 0.4 },
        { t: 1700086400, p: 0.42 },
      ],
    };
    withContext({
      selectedMarket: market,
      closeMarket: vi.fn(),
      snapshot: baseSnapshot,
      watchedSet: new Set(),
      toggleWatch: vi.fn(),
      createAlert: vi.fn(),
    });
    const { default: Drawer } = await import("./MarketFocusDrawer.jsx");
    render(<Drawer />);
    expect(screen.getByText(/Will OKLO ship its first reactor/i)).toBeInTheDocument();
    expect(screen.getByText(/Oklo \(INL\) • USA/)).toBeInTheDocument();
    expect(screen.getByText("Trade →")).toBeInTheDocument();
  });

  it("shows fallback when no history", async () => {
    vi.resetModules();
    const market = {
      id: "pm:poly:nohist",
      source: "kalshi",
      question: "Iran enrichment over 90% by year end?",
      yesPrice: 0.2,
      noPrice: 0.8,
      volume: 1000,
      endDate: null,
      url: "",
      anchor: null,
      history: [],
    };
    withContext({
      selectedMarket: market,
      closeMarket: vi.fn(),
      snapshot: baseSnapshot,
      watchedSet: new Set(),
      toggleWatch: vi.fn(),
      createAlert: vi.fn(),
    });
    const { default: Drawer } = await import("./MarketFocusDrawer.jsx");
    render(<Drawer />);
    expect(screen.getByText(/Chart unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Global signal/i)).toBeInTheDocument();
  });
});
