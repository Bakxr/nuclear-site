import { NUCLEAR_PLANTS } from "../../data/plants.js";

function formatDateLabel(value) {
  if (!value) return "Watching now";
  if (typeof value === "string" && /[A-Za-z]{3,}/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Watching now";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getLeadingCountry() {
  const capacityByCountry = new Map();
  NUCLEAR_PLANTS.forEach((plant) => {
    const current = capacityByCountry.get(plant.country) || 0;
    capacityByCountry.set(plant.country, current + (plant.capacity || 0));
  });

  return [...capacityByCountry.entries()]
    .sort((left, right) => right[1] - left[1])[0] || null;
}

export function buildPublicTerminalSignals({ stocks = [], news = [] } = {}) {
  const topMover = [...stocks].sort((left, right) => Math.abs(right.pct || 0) - Math.abs(left.pct || 0))[0] || null;
  const leader = getLeadingCountry();
  const constructionProjects = NUCLEAR_PLANTS
    .filter((plant) => plant.status === "Construction")
    .slice(0, 6)
    .map((plant) => ({
      id: `public-project:${plant.name}`,
      name: plant.name,
      title: plant.name,
      country: plant.country,
      status: plant.status,
      targetYear: null,
      url: "#map",
    }));
  const catalysts = [...news]
    .sort((left, right) => (right.engagementScore || 0) - (left.engagementScore || 0))
    .slice(0, 3)
    .map((item, index) => ({
      id: `public-story:${index}:${item.url || item.title}`,
      title: item.title,
      url: item.url,
      tag: item.tag || "Industry",
      dateLabel: formatDateLabel(item.pubDate || item.date),
    }));
  const radar = [...news]
    .filter((item) => item.source || item.title)
    .sort((left, right) => {
      const leftTime = left.pubDate ? new Date(left.pubDate).getTime() : 0;
      const rightTime = right.pubDate ? new Date(right.pubDate).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 4)
    .map((item, index) => ({
      id: `public-radar:${index}:${item.url || item.title}`,
      title: item.title,
      url: item.url,
      metaLine: `${item.source || "Public source"} | ${formatDateLabel(item.pubDate || item.date)}`,
    }));

  return {
    radarTitle: "Signal radar",
    cards: [
      {
        id: "fleet",
        label: "Operating fleet",
        value: `${NUCLEAR_PLANTS.filter((plant) => plant.status === "Operating").length}`,
        detail: "Global operating reactor footprint on the public map",
      },
      {
        id: "pipeline",
        label: "Construction watch",
        value: `${constructionProjects.length}`,
        detail: "Publicly visible construction projects on the homepage",
      },
      {
        id: "markets",
        label: "Market pulse",
        value: topMover ? `${topMover.ticker} ${topMover.pct >= 0 ? "+" : ""}${(topMover.pct || 0).toFixed(2)}%` : "Watching quotes",
        detail: topMover ? topMover.name : "Waiting for a fresh market move",
      },
      {
        id: "leader",
        label: "Capacity leader",
        value: leader ? leader[0] : "Tracking",
        detail: leader ? `${(leader[1] / 1000).toFixed(1)} GW represented in the public model` : "Country ranking refresh pending",
      },
    ],
    topCatalysts: catalysts,
    buildoutLeaders: constructionProjects,
    filingRadar: radar,
  };
}
