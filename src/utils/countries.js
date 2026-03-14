import { COUNTRY_PROFILES } from "../data/countryProfiles.js";
import { NUCLEAR_PLANTS } from "../data/plants.js";
import { NUCLEAR_SHARE } from "../data/constants.js";

const COUNTRY_ALIASES = {
  "s. korea": "South Korea",
  "south korea": "South Korea",
  "republic of korea": "South Korea",
  uk: "UK",
  "united kingdom": "UK",
  "u.k.": "UK",
  usa: "USA",
  "u.s.a.": "USA",
  "united states": "USA",
  "united states of america": "USA",
  "czech republic": "Czech Rep.",
  "czech rep.": "Czech Rep.",
};

export function normalizeCountryName(value = "") {
  const trimmed = value.trim();
  if (!trimmed) return "";

  return COUNTRY_ALIASES[trimmed.toLowerCase()] || trimmed;
}

export function isSameCountry(left, right) {
  return normalizeCountryName(left) === normalizeCountryName(right);
}

export function getCountryShare(country) {
  return NUCLEAR_SHARE.find((entry) => isSameCountry(entry.country, country)) || null;
}

export function getCountryProfile(country) {
  const normalized = normalizeCountryName(country);
  if (COUNTRY_PROFILES[normalized]) return COUNTRY_PROFILES[normalized];

  return (
    Object.entries(COUNTRY_PROFILES).find(([key]) => isSameCountry(key, normalized))?.[1] || null
  );
}

export function getPlantsForCountry(country, plants = NUCLEAR_PLANTS) {
  return plants.filter((plant) => isSameCountry(plant.country, country));
}

export function groupPlantsByCountry(plants = NUCLEAR_PLANTS) {
  return plants.reduce((acc, plant) => {
    const key = normalizeCountryName(plant.country);
    if (!acc[key]) acc[key] = [];
    acc[key].push(plant);
    return acc;
  }, {});
}
