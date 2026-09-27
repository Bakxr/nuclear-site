// ─── PLANT STATUS COLORS ─────────────────────────────────────────────────────
// Single source of truth — used by Globe, PlantModal, CountryModal, SearchOverlay, App
export const STATUS_COLORS = {
  Operating:    "#4ade80",
  Construction: "#fbbf24",
  Idle:         "#94a3b8",
  Shutdown:     "#ef4444",
};

// Three.js marker colors (numeric 0xRRGGBB format)
export const STATUS_COLORS_HEX = {
  Operating:    0x4ade80,
  Construction: 0xfbbf24,
  Idle:         0x94a3b8,
  Shutdown:     0xef4444,
};

// Tracked equities. Prices are fetched live (Finnhub); daily history via the
// server. `featured` names appear on the editorial homepage; the terminal
// tracks the full list. `group` drives the terminal board filter. `sec: false`
// marks ETFs and foreign OTC lines that don't file 10-Q/8-K/Form 4 with the SEC.
export const STOCK_GROUPS = ["Uranium", "Fuel cycle", "Reactors & SMR", "Utilities", "Services", "Funds"];

export const STOCKS_BASE = [
  // ── Featured (homepage) ──
  { ticker: "CCJ", name: "Cameco Corporation", sector: "Uranium Mining", group: "Uranium", featured: true, desc: "World's largest publicly traded uranium company. Operates mines in Canada and Kazakhstan." },
  { ticker: "UEC", name: "Uranium Energy Corp", sector: "Uranium Mining", group: "Uranium", featured: true, desc: "US-based uranium mining and exploration company with ISR operations in Texas and Wyoming." },
  { ticker: "NXE", name: "NexGen Energy Ltd", sector: "Uranium Mining", group: "Uranium", featured: true, desc: "Developing the Rook I project in Saskatchewan's Athabasca Basin — one of the world's richest uranium deposits." },
  { ticker: "LEU", name: "Centrus Energy Corp", sector: "Fuel Services", group: "Fuel cycle", featured: true, desc: "Supplies enriched uranium fuel and enrichment services. Only US-owned HALEU production facility." },
  { ticker: "DNN", name: "Denison Mines Corp", sector: "Uranium Mining", group: "Uranium", featured: true, desc: "Canadian uranium exploration and development company focused on the Athabasca Basin." },
  { ticker: "SMR", name: "NuScale Power Corp", sector: "SMR Technology", group: "Reactors & SMR", featured: true, desc: "First and only SMR design to receive NRC approval. Developing 77MW VOYGR modules." },
  { ticker: "OKLO", name: "Oklo Inc", sector: "Advanced Reactors", group: "Reactors & SMR", featured: true, desc: "Developing compact fast reactors that run on used nuclear fuel. Backed by Sam Altman." },
  { ticker: "CEG", name: "Constellation Energy", sector: "Nuclear Utility", group: "Utilities", featured: true, desc: "Largest US nuclear fleet operator with 21 reactors. Major clean energy supplier to tech companies." },
  { ticker: "VST", name: "Vistra Corp", sector: "Nuclear Utility", group: "Utilities", featured: true, desc: "Operates Comanche Peak nuclear plant in Texas. Growing nuclear portfolio for data center demand." },
  { ticker: "UUUU", name: "Energy Fuels Inc", sector: "Uranium/REE", group: "Uranium", featured: true, desc: "Leading US producer of uranium and vanadium. Expanding into rare earth elements processing." },
  { ticker: "NNE", name: "Nano Nuclear Energy", sector: "Micro Reactors", group: "Reactors & SMR", featured: true, desc: "Developing portable micro nuclear reactors (ZEUS & ODIN) for remote and defense applications." },
  { ticker: "GEV", name: "GE Vernova", sector: "Nuclear Services", group: "Reactors & SMR", featured: true, desc: "Spun out of GE. Building BWRX-300 SMRs. Major nuclear turbine and services provider globally." },

  // ── Uranium ──
  { ticker: "NATKY", name: "Kazatomprom", sector: "Uranium Mining", group: "Uranium", sec: false, countries: ["Kazakhstan"], desc: "World's largest uranium producer, majority-owned by the Kazakh state. OTC ADR; primary listings in London and Astana." },
  { ticker: "PALAF", name: "Paladin Energy", sector: "Uranium Mining", group: "Uranium", sec: false, countries: ["Namibia", "Canada"], desc: "Australian miner operating the Langer Heinrich mine in Namibia, with the Patterson Lake South project in Canada. OTC; primary listing ASX." },
  { ticker: "URG", name: "Ur-Energy Inc", sector: "Uranium Mining", group: "Uranium", countries: ["USA"], desc: "US in-situ recovery uranium producer operating Lost Creek in Wyoming." },
  { ticker: "EU", name: "enCore Energy Corp", sector: "Uranium Mining", group: "Uranium", countries: ["USA"], desc: "US in-situ recovery uranium producer with operations in South Texas and development projects in the western US." },
  { ticker: "ISOU", name: "IsoEnergy Ltd", sector: "Uranium Mining", group: "Uranium", countries: ["Canada", "USA"], desc: "Uranium developer with high-grade Athabasca Basin assets in Canada and past-producing mines in the US." },
  { ticker: "UROY", name: "Uranium Royalty Corp", sector: "Uranium Royalties", group: "Uranium", countries: ["Canada", "USA"], desc: "Holds royalty interests in uranium projects alongside a physical uranium inventory." },

  // ── Fuel cycle ──
  { ticker: "ASPI", name: "ASP Isotopes", sector: "Enrichment", group: "Fuel cycle", countries: ["USA", "South Africa"], desc: "Developing isotope enrichment technology, including HALEU for advanced reactors." },
  { ticker: "LTBR", name: "Lightbridge Corp", sector: "Nuclear Fuel", group: "Fuel cycle", countries: ["USA"], desc: "Developing metallic nuclear fuel designed for existing and advanced reactors." },

  // ── Reactors & SMR ──
  { ticker: "RYCEY", name: "Rolls-Royce Holdings", sector: "SMR Technology", group: "Reactors & SMR", sec: false, countries: ["UK"], desc: "Aerospace and defense group whose Rolls-Royce SMR business is developing a 470 MW small modular reactor. OTC ADR; primary listing London." },
  { ticker: "FRMI", name: "Fermi Inc", sector: "Power Development", group: "Reactors & SMR", countries: ["USA"], desc: "Developing a large Texas power campus for data centers with plans to include nuclear generation." },

  // ── Utilities ──
  { ticker: "TLN", name: "Talen Energy", sector: "Nuclear Utility", group: "Utilities", countries: ["USA"], desc: "Independent power producer that owns the Susquehanna nuclear plant in Pennsylvania, which supplies an adjacent data-center campus." },
  { ticker: "PCG", name: "PG&E Corp", sector: "Nuclear Utility", group: "Utilities", countries: ["USA"], desc: "California utility operating Diablo Canyon, the state's last operating nuclear plant." },
  { ticker: "SO", name: "Southern Company", sector: "Nuclear Utility", group: "Utilities", countries: ["USA"], desc: "Utility holding company whose Georgia Power unit operates Plant Vogtle, including the new Units 3 and 4." },
  { ticker: "DUK", name: "Duke Energy", sector: "Nuclear Utility", group: "Utilities", countries: ["USA"], desc: "Operates one of the largest regulated nuclear fleets in the US, concentrated in the Carolinas." },
  { ticker: "ETR", name: "Entergy Corp", sector: "Nuclear Utility", group: "Utilities", countries: ["USA"], desc: "Gulf South utility operating nuclear plants including Grand Gulf, River Bend, Waterford 3 and Arkansas Nuclear One." },
  { ticker: "D", name: "Dominion Energy", sector: "Nuclear Utility", group: "Utilities", countries: ["USA"], desc: "Virginia-based utility operating the North Anna and Surry nuclear stations." },
  { ticker: "PEG", name: "PSEG", sector: "Nuclear Utility", group: "Utilities", countries: ["USA"], desc: "New Jersey utility holding company whose nuclear fleet includes the Salem and Hope Creek stations." },

  // ── Services & supply chain ──
  { ticker: "BWXT", name: "BWX Technologies", sector: "Nuclear Components", group: "Services", countries: ["USA", "Canada"], desc: "Supplies naval nuclear reactors, nuclear components and fuel, and is developing microreactors." },
  { ticker: "CW", name: "Curtiss-Wright", sector: "Nuclear Components", group: "Services", countries: ["USA"], desc: "Supplies reactor coolant pumps, valves and components for commercial and naval nuclear programs." },
  { ticker: "MIR", name: "Mirion Technologies", sector: "Radiation Detection", group: "Services", countries: ["USA"], desc: "Radiation detection and measurement products for nuclear power, defense and medicine." },
  { ticker: "FLR", name: "Fluor Corp", sector: "Engineering", group: "Services", countries: ["USA"], desc: "Global engineering and construction firm and a major shareholder in NuScale Power." },

  // ── Physical uranium & ETFs ──
  { ticker: "SRUUF", name: "Sprott Physical Uranium Trust", sector: "Physical Uranium", group: "Funds", sec: false, countries: ["Canada"], desc: "Closed-end trust holding physical U3O8 and a major source of spot-market demand. OTC; primary listing TSX (U.U)." },
  { ticker: "YLLXF", name: "Yellow Cake plc", sector: "Physical Uranium", group: "Funds", sec: false, countries: ["UK", "Kazakhstan"], desc: "Holds physical U3O8, with a purchase agreement with Kazatomprom. OTC; primary listing London (YCA)." },
  { ticker: "URA", name: "Global X Uranium ETF", sector: "ETF", group: "Funds", sec: false, desc: "Largest uranium ETF, holding uranium miners and nuclear component companies." },
  { ticker: "URNM", name: "Sprott Uranium Miners ETF", sector: "ETF", group: "Funds", sec: false, desc: "Tracks uranium miners and physical uranium holders." },
  { ticker: "NLR", name: "VanEck Uranium & Nuclear ETF", sector: "ETF", group: "Funds", sec: false, desc: "Tracks uranium miners, nuclear utilities and nuclear component suppliers." },
  { ticker: "NUKZ", name: "Range Nuclear Renaissance ETF", sector: "ETF", group: "Funds", sec: false, desc: "Tracks the nuclear fuel cycle, reactor builders and nuclear utilities." },
];

// Homepage (editorial) set — the public quote endpoint caps batch size.
export const FEATURED_STOCKS = STOCKS_BASE.filter((stock) => stock.featured);

// Nuclear share by country
export const NUCLEAR_SHARE = [
  { country: "France", nuclear: 67.3, flag: "🇫🇷", reactors: 57, capacity: "63.0 GW" },
  { country: "Slovakia", nuclear: 60.6, flag: "🇸🇰", reactors: 5, capacity: "2.9 GW" },
  { country: "Ukraine", nuclear: 55.0, flag: "🇺🇦", reactors: 15, capacity: "13.1 GW" },
  { country: "Hungary", nuclear: 47.1, flag: "🇭🇺", reactors: 4, capacity: "2.0 GW" },
  { country: "Belgium", nuclear: 41.1, flag: "🇧🇪", reactors: 5, capacity: "3.9 GW" },
  { country: "Finland", nuclear: 39.1, flag: "🇫🇮", reactors: 5, capacity: "4.6 GW" },
  { country: "Czech Rep.", nuclear: 36.7, flag: "🇨🇿", reactors: 6, capacity: "4.2 GW" },
  { country: "Sweden", nuclear: 29.5, flag: "🇸🇪", reactors: 6, capacity: "6.9 GW" },
  { country: "S. Korea", nuclear: 29.0, flag: "🇰🇷", reactors: 26, capacity: "26.0 GW" },
  { country: "Spain", nuclear: 20.3, flag: "🇪🇸", reactors: 7, capacity: "7.1 GW" },
  { country: "USA", nuclear: 18.9, flag: "🇺🇸", reactors: 94, capacity: "97.0 GW" },
  { country: "Canada", nuclear: 14.6, flag: "🇨🇦", reactors: 19, capacity: "13.6 GW" },
  { country: "UK", nuclear: 13.0, flag: "🇬🇧", reactors: 9, capacity: "5.9 GW" },
  { country: "Russia", nuclear: 11.8, flag: "🇷🇺", reactors: 36, capacity: "27.7 GW" },
  { country: "Japan", nuclear: 8.5, flag: "🇯🇵", reactors: 12, capacity: "10.0 GW" },
  { country: "China", nuclear: 4.9, flag: "🇨🇳", reactors: 57, capacity: "55.8 GW" },
  { country: "India", nuclear: 3.1, flag: "🇮🇳", reactors: 23, capacity: "7.5 GW" },
  { country: "Brazil", nuclear: 2.3, flag: "🇧🇷", reactors: 2, capacity: "1.9 GW" },
];

// Reactor types
export const REACTOR_TYPES = [
  { type: "PWR", full: "Pressurized Water Reactor", share: 67, desc: "Most common globally. Uses pressurized water as coolant and moderator in a two-loop system.", color: "#d4a54a", reactorCount: 302, advantages: ["Proven 60+ year track record", "High thermal efficiency (~33%)", "Extensive global operational experience"], countries: ["USA", "France", "China", "S. Korea", "Japan"], examples: ["Vogtle (USA)", "Gravelines (France)", "Shin-Kori (S. Korea)"] },
  { type: "BWR", full: "Boiling Water Reactor", share: 14, desc: "Water boils directly in the reactor core, producing steam that drives the turbine.", color: "#c4935a", reactorCount: 63, advantages: ["Simpler single-loop design", "Lower operating pressure than PWR", "No steam generators needed"], countries: ["USA", "Japan", "Sweden", "Finland", "Germany"], examples: ["Browns Ferry (USA)", "Fukushima Daini (Japan)", "Forsmark (Sweden)"] },
  { type: "PHWR", full: "Pressurized Heavy Water", share: 11, desc: "Uses heavy water as moderator. Includes CANDU reactors. Can run on natural uranium.", color: "#8b7355", reactorCount: 49, advantages: ["Runs on natural uranium — no enrichment needed", "Online refueling capability", "Flexible fuel cycle (can use thorium)"], countries: ["Canada", "India", "Romania", "S. Korea", "Argentina"], examples: ["Bruce A & B (Canada)", "Rajasthan (India)", "Cernavoda (Romania)"] },
  { type: "VVER", full: "Russian Water-Water Reactor", share: 5, desc: "Soviet-designed PWR variant. Widely exported to Eastern Europe, Asia, and Middle East.", color: "#6b8e5a", reactorCount: 22, advantages: ["Robust containment design", "Proven export model", "Enhanced passive safety (VVER-1200)"], countries: ["Russia", "Ukraine", "Czech Rep.", "Hungary", "India"], examples: ["Novovoronezh (Russia)", "Paks (Hungary)", "Kudankulam (India)"] },
  { type: "SMR", full: "Small Modular Reactor", share: 1, desc: "Factory-built, under 300 MW. NuScale VOYGR, GE BWRX-300, and many more in development.", color: "#5a7d8b", reactorCount: 3, advantages: ["Factory-built and transportable", "Scalable — add modules as needed", "Passive safety systems (no operator action required)"], countries: ["Canada", "USA", "UK", "Poland", "Estonia"], examples: ["Darlington SMR (Canada)", "VOYGR (NuScale, USA)", "Rolls-Royce SMR (UK)"] },
  { type: "Other", full: "AGR, FBR, HTGR, MSR", share: 2, desc: "Gas-cooled (UK), fast breeders, high-temp gas, molten salt — advanced and legacy designs.", color: "#7a6b8b", reactorCount: 15, advantages: ["Higher outlet temperatures for industrial heat", "Breed more fuel than they consume (FBR)", "Inherent safety properties (MSR, HTGR)"], countries: ["UK", "Russia", "China", "Japan", "France"], examples: ["Hinkley Point B (UK, AGR)", "BN-800 (Russia, FBR)", "HTR-PM (China, HTGR)"] },
];

// Learn section category colors
export const LEARN_COLORS = {
  Environment: "#6b9e7a",
  Technology: "#5a8596",
  History: "#d4a54a",
  Economics: "#c4714a",
};

// Educational facts for the Learn section
export const LEARN_FACTS = [
  {
    category: "Environment",
    headline: "Lowest Lifecycle Emissions",
    fact: "Nuclear has the lowest lifecycle carbon emissions of any energy source — lower than wind and solar when accounting for full manufacturing, construction, and decommissioning.",
    source: "IPCC AR6 Working Group III",
    sourceUrl: "https://www.ipcc.ch/report/ar6/wg3/",
    comparison: { label: "gCO\u2082/kWh lifecycle", items: [{ name: "Nuclear", value: 12 }, { name: "Wind", value: 11 }, { name: "Solar", value: 41 }, { name: "Gas", value: 490 }, { name: "Coal", value: 820 }] },
  },
  {
    category: "Environment",
    headline: "1.8 Million Lives Saved",
    fact: "Nuclear power has prevented approximately 1.8 million air pollution-related deaths and 64 gigatonnes of CO\u2082 emissions that would have resulted from burning fossil fuels instead.",
    source: "NASA — Kharecha & Hansen, 2013",
    sourceUrl: "https://pubs.acs.org/doi/10.1021/es3051197",
  },
  {
    category: "Environment",
    headline: "Remarkably Small Waste Footprint",
    fact: "All nuclear waste ever produced in the US across 60+ years of generation would fit on a single football field stacked less than 10 yards high. No other energy source contains its waste this completely.",
    source: "US Department of Energy",
    sourceUrl: "https://www.energy.gov/ne/articles/5-fast-facts-about-spent-nuclear-fuel",
  },
  {
    category: "Technology",
    headline: "One Pellet, Enormous Power",
    fact: "A single uranium fuel pellet the size of a fingertip contains as much energy as 17,000 cubic feet of natural gas, 1,780 lbs of coal, or 149 gallons of oil.",
    source: "US Nuclear Energy Institute",
    sourceUrl: "https://www.nei.org/fundamentals/nuclear-fuel",
    comparison: { label: "Energy equivalent of 1 uranium pellet", items: [{ name: "Uranium", value: 1 }, { name: "Oil (gal)", value: 149 }, { name: "Coal (lbs)", value: 1780 }] },
  },
  {
    category: "Technology",
    headline: "No Enrichment Required",
    fact: "Canada's CANDU reactor design is unique — it uses natural uranium fuel and heavy water as a moderator, and can be refueled while operating at full power without shutting down.",
    source: "Canadian Nuclear Association",
    sourceUrl: "https://www.cna.ca/technology/energy/candu-technology/",
  },
  {
    category: "Technology",
    headline: "Factory-Built Reactors",
    fact: "Small Modular Reactors (SMRs) like the BWRX-300 can be factory-built and transported to site by truck, enabling nuclear power in remote locations. Ontario is building Canada's first commercial SMR.",
    source: "World Nuclear Association",
    sourceUrl: "https://world-nuclear.org/information-library/nuclear-fuel-cycle/nuclear-power-reactors/small-nuclear-power-reactors",
  },
  {
    category: "History",
    headline: "France Decarbonized in 15 Years",
    fact: "France built most of its 56-reactor fleet in just 15 years (1975\u20131990), proving that rapid grid decarbonization through nuclear power is not only possible but has already been achieved.",
    source: "World Nuclear Association — France Profile",
    sourceUrl: "https://world-nuclear.org/information-library/country-profiles/countries-a-f/france",
  },
  {
    category: "History",
    headline: "The First Nuclear Power Plant",
    fact: "The world's first nuclear power plant to generate electricity for a grid was Obninsk in the Soviet Union, achieving criticality on June 27, 1954. It operated for 48 years before decommissioning in 2002.",
    source: "IAEA History",
    sourceUrl: "https://www.iaea.org/newscenter/news/on-this-day-in-1954-worlds-first-nuclear-power-plant-opens",
  },
  {
    category: "History",
    headline: "Zero Radiation Deaths at TMI",
    fact: "Despite being the most serious accident in US nuclear history, the Three Mile Island incident in 1979 resulted in zero deaths and negligible radiation exposure to the surrounding population — less than a chest X-ray.",
    source: "US NRC — TMI Fact Sheet",
    sourceUrl: "https://www.nrc.gov/reading-rm/doc-collections/fact-sheets/3mile-isle.html",
  },
  {
    category: "Economics",
    headline: "60–80 Year Lifespan",
    fact: "Nuclear plants are built to operate for 60\u201380 years, making them the longest-lasting energy generation assets. Many US reactors originally licensed for 40 years have been extended to 80.",
    source: "US NRC License Renewal",
    sourceUrl: "https://www.nrc.gov/reactors/operating/licensing/renewal.html",
  },
  {
    category: "Economics",
    headline: "Highest Capacity Factor",
    fact: "Nuclear power plants operate at a 92.5% capacity factor — the highest of any energy source. For comparison, wind averages ~35% and solar ~25%, meaning nuclear generates power almost continuously.",
    source: "US EIA Electric Power Monthly",
    sourceUrl: "https://www.eia.gov/electricity/monthly/",
    comparison: { label: "Capacity factor %", items: [{ name: "Nuclear", value: 92.5 }, { name: "Gas", value: 57 }, { name: "Wind", value: 35 }, { name: "Solar", value: 25 }] },
  },
  {
    category: "Economics",
    headline: "Health Cost Savings",
    fact: "By displacing coal and gas generation, nuclear power avoids an estimated $100+ billion per year in global health costs from air pollution, respiratory disease, and premature deaths.",
    source: "The Lancet — Energy & Health Commission",
    sourceUrl: "https://www.thelancet.com/commissions/pollution-and-health",
  },
];

// Energy source colors for comparison charts
export const ENERGY_SOURCE_COLORS = {
  Nuclear: "#d4a54a",
  Wind:    "#7a9ea8",
  Solar:   "#c4935a",
  Hydro:   "#6b9e7a",
  Gas:     "#8b7355",
  Coal:    "#5c534a",
};

// Energy comparison data — 6 metrics, 6 sources each
export const ENERGY_COMPARISON = [
  {
    key: "co2",
    label: "CO\u2082 Emissions",
    unit: "gCO\u2082eq/kWh",
    description: "Full lifecycle greenhouse gas emissions including construction, fuel, and decommissioning.",
    source: "IPCC AR6 Working Group III",
    sourceUrl: "https://www.ipcc.ch/report/ar6/wg3/",
    lowerIsBetter: true,
    data: [
      { name: "Nuclear", value: 12 },
      { name: "Wind",    value: 11 },
      { name: "Solar",   value: 41 },
      { name: "Hydro",   value: 24 },
      { name: "Gas",     value: 490 },
      { name: "Coal",    value: 820 },
    ],
    insight: "Nuclear produces 68\u00d7 less CO\u2082 than coal per kWh of electricity generated.",
  },
  {
    key: "capacity",
    label: "Capacity Factor",
    unit: "%",
    description: "Percentage of time the plant generates at maximum rated output over a year.",
    source: "US EIA Electric Power Monthly, 2024",
    sourceUrl: "https://www.eia.gov/electricity/monthly/",
    lowerIsBetter: false,
    data: [
      { name: "Nuclear", value: 92.5 },
      { name: "Wind",    value: 35 },
      { name: "Solar",   value: 25 },
      { name: "Hydro",   value: 44 },
      { name: "Gas",     value: 57 },
      { name: "Coal",    value: 49 },
    ],
    insight: "Nuclear runs 92.5% of the time \u2014 nearly 3\u00d7 more reliably than wind or solar.",
  },
  {
    key: "land",
    label: "Land Use",
    unit: "km\u00b2/TWh/yr",
    description: "Total land area required to generate one terawatt-hour of electricity per year.",
    source: "Our World in Data / Stacey (2015)",
    sourceUrl: "https://ourworldindata.org/land-use-per-energy-source",
    lowerIsBetter: true,
    data: [
      { name: "Nuclear", value: 2.8 },
      { name: "Wind",    value: 72 },
      { name: "Solar",   value: 36 },
      { name: "Hydro",   value: 54 },
      { name: "Gas",     value: 2.4 },
      { name: "Coal",    value: 9.7 },
    ],
    insight: "Wind farms require 26\u00d7 more land than nuclear plants per unit of energy.",
  },
  {
    key: "deaths",
    label: "Deaths per TWh",
    unit: "deaths/TWh",
    description: "Historical average fatalities per terawatt-hour including accidents, pollution, and occupational hazards.",
    source: "Markandya & Wilkinson / Our World in Data",
    sourceUrl: "https://ourworldindata.org/safest-sources-of-energy",
    lowerIsBetter: true,
    data: [
      { name: "Nuclear", value: 0.03 },
      { name: "Wind",    value: 0.04 },
      { name: "Solar",   value: 0.05 },
      { name: "Hydro",   value: 1.3 },
      { name: "Gas",     value: 2.8 },
      { name: "Coal",    value: 24.6 },
    ],
    insight: "Nuclear is the safest energy source \u2014 coal kills 820\u00d7 more people per unit of energy.",
  },
  {
    key: "lcoe",
    label: "Levelized Cost",
    unit: "$/MWh",
    description: "Levelized cost of energy \u2014 total lifetime cost per megawatt-hour of electricity produced.",
    source: "Lazard LCOE Analysis v17, 2024",
    sourceUrl: "https://www.lazard.com/research-insights/levelized-cost-of-energyplus/",
    lowerIsBetter: true,
    data: [
      { name: "Nuclear", value: 69 },
      { name: "Wind",    value: 50 },
      { name: "Solar",   value: 49 },
      { name: "Hydro",   value: 64 },
      { name: "Gas",     value: 75 },
      { name: "Coal",    value: 112 },
    ],
    insight: "Nuclear\u2019s cost is competitive with renewables and 38% cheaper than coal.",
  },
  {
    key: "waste",
    label: "Waste per TWh",
    unit: "tonnes/TWh",
    description: "Total material waste including spent fuel, CO\u2082, ash, demolished materials, and end-of-life components.",
    source: "World Nuclear Association / IPCC",
    sourceUrl: "https://world-nuclear.org/information-library/nuclear-fuel-cycle/nuclear-waste/radioactive-waste-management",
    lowerIsBetter: true,
    data: [
      { name: "Nuclear", value: 3 },
      { name: "Wind",    value: 46000 },
      { name: "Solar",   value: 35000 },
      { name: "Hydro",   value: 0 },
      { name: "Gas",     value: 340000 },
      { name: "Coal",    value: 820000 },
    ],
    insight: "Nuclear produces just 3 tonnes of spent fuel per TWh \u2014 273,000\u00d7 less waste than coal.",
  },
];
