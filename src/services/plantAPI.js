// Plant API utilities: Wikipedia image fetching, OSM tile computation, reactor type normalization

import { PLANT_WIKI_TITLES } from "../data/plantWikiMappings.js";

// In-memory cache: Map<plantName, { url: string|null, timestamp: number }>
const imageCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch plant photo URL from Wikipedia pageimages API.
 * Tries mapped title first, then auto-generated title.
 * Returns image URL string or null.
 */
export async function fetchPlantImage(plantName) {
  const cached = imageCache.get(plantName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.url;
  }

  const title = PLANT_WIKI_TITLES[plantName] || autoTitle(plantName);
  if (!title) {
    imageCache.set(plantName, { url: null, timestamp: Date.now() });
    return null;
  }

  const url = await fetchWikiImage(title);

  // If auto-generated title failed, don't try alternate — just cache null
  imageCache.set(plantName, { url, timestamp: Date.now() });
  return url;
}

function autoTitle(name) {
  // Try generic patterns
  return name.replace(/\s+/g, "_") + "_Nuclear_Power_Plant";
}

async function fetchWikiImage(title) {
  const endpoint =
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
    `&prop=pageimages&format=json&pithumbsize=800&origin=*`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0];
    if (!page || page.missing !== undefined) return null;

    return page.thumbnail?.source || null;
  } catch {
    return null;
  }
}

/**
 * Compute OSM slippy-map tile x/y from lat/lng.
 * Returns the center tile plus offsets for a 3x3 grid.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} zoom
 * @returns {{ tiles: Array<{url:string, row:number, col:number}>, pinX: number, pinY: number }}
 */
export function getOSMTiles(lat, lng, zoom = 12) {
  const n = Math.pow(2, zoom);
  const cx = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const cy = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);

  const tiles = [];
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      const tx = ((cx + col) % n + n) % n;
      const ty = cy + row;
      tiles.push({
        url: `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`,
        row: row + 1,
        col: col + 1,
      });
    }
  }

  // Pin position as fraction within 3x3 grid (0–3 range)
  const fracX = (lng + 180) / 360 * n - cx + 1; // 0–3
  const sinLat = Math.sin(latRad);
  const fracY = (1 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * n - cy + 1;

  return { tiles, pinX: fracX, pinY: fracY };
}

/**
 * Normalize plant reactor type string to one of:
 * PWR | BWR | PHWR | VVER | SMR | Other
 */
export function normalizeReactorType(typeString) {
  const t = (typeString || "").toUpperCase();
  if (t.includes("VVER")) return "VVER";
  if (t.includes("SMR") || t.includes("BWRX")) return "SMR";
  if (t.includes("PHWR") || t.includes("CANDU")) return "PHWR";
  if (t.includes("BWR") || t.includes("ABWR")) return "BWR";
  if (
    t.includes("PWR") || t.includes("EPR") || t.includes("AP1000") ||
    t.includes("APR") || t.includes("HPR") || t.includes("KLT")
  ) return "PWR";
  // RBMK, EGP, HTGR, CFR, AGR, FBR, MSR → Other
  return "Other";
}
