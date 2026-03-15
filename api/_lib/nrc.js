const NRC_PLANT_STATUS_URL = "https://www.nrc.gov/public-involve/rss?feed=plant-status";
const NRC_CACHE_MS = 10 * 60 * 1000;

const nrcCache = globalThis.__npNrcOpsCache ?? new Map();
globalThis.__npNrcOpsCache = nrcCache;

function decodeEntities(text = "") {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function matchTag(block, pattern) {
  const tags = pattern.split("|");
  for (const tag of tags) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = block.match(regex);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return "";
}

function normalizePlantLabel(value = "") {
  return value
    .toLowerCase()
    .replace(/\b(unit|reactor)\b/g, " ")
    .replace(/\b(one|two|three|four|five|1|2|3|4|5)\b/g, " ")
    .replace(/nuclear/g, "nuclear")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function inferStatus(powerPct) {
  if (powerPct >= 95) return "Base load";
  if (powerPct >= 60) return "Reduced power";
  if (powerPct > 0) return "Low power";
  return "Offline";
}

export async function fetchNrcPlantStatus() {
  const cached = nrcCache.get("plant-status");
  if (cached && Date.now() - cached.at < NRC_CACHE_MS) {
    return cached.payload;
  }

  const response = await fetch(NRC_PLANT_STATUS_URL, {
    headers: {
      accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      "user-agent": "NuclearPulseBot/1.0 (+https://atomic-energy.vercel.app)",
    },
  });

  if (!response.ok) {
    throw new Error(`NRC plant status feed failed with ${response.status}`);
  }

  const xml = await response.text();
  const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((match) => match[0]);

  const payload = items
    .map((item) => {
      const title = matchTag(item, "title");
      const url = matchTag(item, "link");
      const powerMatch = title.match(/(\d+)%\s+power/i);
      if (!title || !powerMatch) return null;

      const plantLabel = title.replace(/\s*-\s*\d+%\s+power/i, "").trim();
      const unitMatch = plantLabel.match(/\b(\d+|one|two|three|four|five)\b$/i);
      const powerPct = Number(powerMatch[1]);

      return {
        title,
        plantLabel,
        plantAlias: normalizePlantLabel(plantLabel),
        unitLabel: unitMatch ? unitMatch[1] : null,
        powerPct,
        status: inferStatus(powerPct),
        url,
      };
    })
    .filter(Boolean)
    .slice(0, 24);

  nrcCache.set("plant-status", { payload, at: Date.now() });
  return payload;
}
