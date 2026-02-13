# Nuclear Pulse ⚛️

A real-time nuclear energy information hub featuring live stock data, industry news, interactive 3D globe visualization, and comprehensive reactor database.

## Features

- 📊 **Live Stock Data** — Finnhub API integration for 12 nuclear industry stocks
- 📰 **Industry News** — Curated articles from IAEA, World Nuclear Association
- 🌍 **Interactive Globe** — Three.js 3D visualization of 223+ nuclear reactors worldwide
- 📈 **Data Visualizations** — Recharts & D3.js for nuclear share, reactor types
- ⚡ **Real-time Updates** — 5-minute stock refresh, 15-minute news cache

## Tech Stack

- **React 19** + **Vite 7** — Fast dev server with HMR
- **Three.js** — 3D globe rendering
- **D3.js** — Geographic projections
- **Recharts** — Stock charts and data viz
- **Finnhub API** — Live stock quotes

## Setup

```bash
# Install dependencies
npm install

# Add your Finnhub API key
cp .env.example .env.local
# Edit .env.local with your key

# Start dev server
npm run dev

# Build for production
npm run build
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_FINNHUB_API_KEY` | Finnhub API key for stock data | Yes |

Get your free key at [finnhub.io](https://finnhub.io/)

## Data Sources

- **Nuclear Plants** — IAEA PRIS, World Nuclear Association
- **Stock Prices** — Finnhub API (live)
- **News** — Curated from IAEA, World Nuclear News
- **Nuclear Share** — IAEA 2024 data

## Project Structure

```
src/
├── App.jsx          # Main application (all-in-one for rapid iteration)
├── data/            # Static data (constants, shares, reactor types)
├── services/        # API integrations (stocks, news)
├── index.css        # Global styles
└── main.jsx         # React entry point
```

## Architecture Notes

- **Monolithic App.jsx** — All components inline for rapid iteration
- **Inline styles** — No CSS modules (intentional for speed)
- **No backend** — Pure client-side React app
- **Future migration** — Can migrate to Next.js/componentized structure later

## Development

```bash
# Run dev server (with HMR)
npm run dev

# Lint code
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## License

For informational purposes only. Data sourced from IAEA, World Nuclear Association.

---

**© 2026 Nuclear Pulse** — Not financial advice.
