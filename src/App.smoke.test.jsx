import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockToggleDarkMode = vi.fn();

vi.mock('framer-motion', () => {
  const MotionTag = ({ children, ...props }) => <div {...props}>{children}</div>;
  const motion = new Proxy({}, { get: () => MotionTag });

  return {
    motion,
    AnimatePresence: ({ children }) => <>{children}</>,
    MotionConfig: ({ children }) => <>{children}</>,
    useInView: () => true,
    useScroll: () => ({ scrollY: 0 }),
    useTransform: () => 0,
  };
});

vi.mock('recharts', () => ({
  LineChart: ({ children }) => <div>{children}</div>,
  Line: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

vi.mock('./hooks/useDarkMode.js', () => ({
  default: () => ({ isDark: false, toggle: mockToggleDarkMode }),
}));

vi.mock('./services/stocksAPI.js', () => ({
  fetchMultipleQuotes: vi.fn(async (tickers) => Object.fromEntries(
    tickers.map((ticker) => [ticker, { price: 10, change: 0, pct: 0, history: [] }]),
  )),
  fetchStockHistory: vi.fn(async () => []),
}));

vi.mock('./services/newsAPI.js', () => {
  const article = {
    id: 'story-1',
    title: 'Nuclear news',
    source: 'IAEA',
    tag: 'Policy',
    pubDate: new Date('2026-03-18T12:00:00Z'),
    engagementScore: 1,
    curiosityHook: 'Hook',
    whyItMatters: 'Matters',
    url: 'https://example.com/story-1',
  };

  return {
    clearNewsCache: vi.fn(),
    fetchNuclearNews: vi.fn(async () => [article]),
    getInstantNews: vi.fn(() => [article]),
  };
});

vi.mock('./features/access/context.jsx', () => ({
  useTerminalAccess: () => ({
    accessState: 'logged_out',
    getAccessToken: vi.fn(async () => ''),
    isConfigured: true,
    membership: null,
    membershipLoading: false,
    user: null,
  }),
}));

vi.mock('./components/Timeline.jsx', () => ({
  default: () => <div>Timeline</div>,
}));

vi.mock('./components/Globe.jsx', () => ({
  default: () => <div>Globe</div>,
}));

vi.mock('./components/reactorDiagrams/Reactor3D.jsx', () => ({
  default: () => <div>Reactor 3D</div>,
}));

const { default: App } = await import('./App.jsx');

describe('App smoke', () => {
  beforeEach(() => {
    mockToggleDarkMode.mockReset();
  });

  it('renders the public app shell', async () => {
    render(<App />);

    expect(await screen.findByText(/Strategic Energy Briefing/i)).toBeInTheDocument();
    expect(screen.getByText(/^Terminal$/)).toBeInTheDocument();
  });
});
