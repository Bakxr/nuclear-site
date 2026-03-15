export const SMR_PROJECTS = [
  { name: "BWRX-300", company: "GE Hitachi", country: "Canada", capacity: 300, type: "BWR", status: "Licensing", year: 2029, desc: "First commercial BWRX-300 at Ontario Power Generation's Darlington site." },
  { name: "Xe-100", company: "X-energy", country: "USA", capacity: 80, type: "HTGR", status: "Design", year: 2030, desc: "Pebble-bed high-temperature gas-cooled reactor backed by U.S. DOE support and Dow deployment plans." },
  { name: "Natrium", company: "TerraPower", country: "USA", capacity: 345, type: "SFR", status: "Construction", year: 2030, desc: "Sodium-cooled fast reactor with thermal storage under development in Wyoming." },
  { name: "Kairos KP-FHR", company: "Kairos Power", country: "USA", capacity: 140, type: "FHR", status: "Licensing", year: 2031, desc: "Fluoride salt-cooled high-temperature reactor with phased demonstration and commercial path." },
  { name: "SMR-160", company: "Holtec", country: "USA", capacity: 160, type: "PWR", status: "Design", year: 2032, desc: "Passively safe light-water SMR positioned for industrial and grid applications." },
  { name: "Rolls-Royce SMR", company: "Rolls-Royce", country: "UK", capacity: 470, type: "PWR", status: "Licensing", year: 2033, desc: "Factory-built U.K. SMR program oriented around serial deployment." },
  { name: "NuScale VOYGR", company: "NuScale", country: "USA", capacity: 77, type: "PWR", status: "Licensed", year: 2029, desc: "First SMR design to receive NRC design approval for the VOYGR platform." },
  { name: "ARC-100", company: "ARC Clean Energy", country: "Canada", capacity: 100, type: "SFR", status: "Design", year: 2034, desc: "Sodium fast reactor program focused on modular industrial power." },
  { name: "HTR-PM", company: "CNNC / Huaneng", country: "China", capacity: 200, type: "HTGR", status: "Operational", year: 2023, desc: "Commercial pebble-bed reactor pair at Shidaowan providing proof of advanced reactor deployment." },
  { name: "RITM-200", company: "Rosatom", country: "Russia", capacity: 50, type: "PWR", status: "Operational", year: 2020, desc: "Compact reactor family used for icebreakers and remote land-based applications." },
  { name: "ACPR50S", company: "CGN", country: "China", capacity: 60, type: "PWR", status: "Design", year: 2030, desc: "Floating small reactor concept targeted at remote coastal and island demand." },
  { name: "ThorCon MSR", company: "ThorCon", country: "Indonesia", capacity: 500, type: "MSR", status: "Design", year: 2033, desc: "Molten salt reactor concept using modular shipyard-style construction." },
];

export const SMR_STATUS_ORDER = ["Operational", "Construction", "Licensed", "Licensing", "Design"];

export const SMR_STATUS_COLORS = {
  Operational: "#4ade80",
  Construction: "#fbbf24",
  Licensed: "#60a5fa",
  Licensing: "#a78bfa",
  Design: "#94a3b8",
};
