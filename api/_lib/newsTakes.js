// One-line "why it matters" takes for news articles, written by Claude from
// the article's own headline and excerpt. Replaces a pool of 21 canned lines
// that repeated across dozens of stories.
//
// Takes are cached in terminal_cache keyed by article URL, so each article is
// written once. A take is only used if every number in it appears in the
// headline or excerpt. With no ANTHROPIC_API_KEY, on any API error, or for a
// rejected take, the article simply has no take (the UI falls back to the
// excerpt) — never a canned sentence.

import Anthropic from "@anthropic-ai/sdk";
import { readTerminalCache, writeTerminalCache } from "./terminalStore.js";

const MODEL = "claude-opus-5-5";
const CACHE_KEY = "news_takes_v1";
const MAX_CACHED = 400;
const MAX_NEW_PER_CALL = 16;
const TIMEOUT_MS = 20 * 1000;

const SYSTEM = `You write the one-line "Why it matters" note under each headline on Nuclear Pulse, a site for people who follow nuclear energy, uranium and nuclear stocks closely.

For each article you get its source, headline and excerpt. Write one sentence (at most 28 words) saying what the development changes or signals for the nuclear buildout, the fuel market, regulators, or investors.

Rules:
- Ground it in this article. Use only facts from the headline and excerpt; never add numbers, dates, names or causes that aren't there.
- Be specific to the story. Never write a line that would fit any other article, and never restate the headline.
- Plain and confident. No hype words, no emojis, no hashtags, no financial advice, no questions.
- If the excerpt is too thin to say anything specific, return an empty string for that article.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    takes: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "integer" }, take: { type: "string" } },
        required: ["id", "take"],
        additionalProperties: false,
      },
    },
  },
  required: ["takes"],
  additionalProperties: false,
};

function numbersIn(text) {
  return (String(text).match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => String(Number(n.replace(/,/g, ""))));
}

// Why a take can't be used, or null if it's fine.
export function rejectTake(take, article) {
  if (typeof take !== "string" || !take.trim()) return "empty";
  if (take.split(/\s+/).length > 40) return "too long";
  if (/https?:\/\/|#\w/.test(take)) return "link or hashtag";
  const known = new Set(numbersIn(`${article.title} ${article.curiosityHook || ""}`));
  const stray = numbersIn(take).find((n) => !known.has(n));
  return stray ? `number not in article: ${stray}` : null;
}

export function buildTakesPrompt(articles) {
  return articles
    .map((a, id) => `<article id="${id}">\nSource: ${a.source}\nHeadline: ${a.title}\nExcerpt: ${a.curiosityHook || "(none)"}\n</article>`)
    .join("\n\n") + "\n\nReturn one take per article id.";
}

async function writeTakes(articles, client) {
  const anthropic = client || new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 });
  const response = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: buildTakesPrompt(articles) }],
  });
  if (response.stop_reason === "refusal") throw new Error("refused");
  const text = response.content.find((b) => b.type === "text")?.text || "";
  const out = new Map();
  for (const { id, take } of JSON.parse(text).takes || []) {
    const article = articles[id];
    if (!article) continue;
    const reason = rejectTake(take, article);
    // Store rejections as "" too, so a story isn't re-sent on every refresh.
    out.set(article.url, reason ? "" : take.trim());
    if (reason && take?.trim()) console.warn("[newsTakes] rejected:", reason, article.url);
  }
  return out;
}

// Returns the articles with `whyItMatters` set from cache or freshly written.
// Never throws.
export async function attachTakes(articles, { client = null } = {}) {
  let cached = {};
  try {
    cached = (await readTerminalCache(CACHE_KEY))?.payload || {};
  } catch {
    cached = {};
  }

  const missing = articles.filter((a) => !(a.url in cached)).slice(0, MAX_NEW_PER_CALL);
  if (missing.length && (client || process.env.ANTHROPIC_API_KEY?.trim())) {
    try {
      const fresh = await writeTakes(missing, client);
      if (fresh.size) {
        // Keep the newest entries only; insertion order is age order.
        const merged = Object.entries({ ...cached, ...Object.fromEntries(fresh) }).slice(-MAX_CACHED);
        cached = Object.fromEntries(merged);
        await writeTerminalCache(CACHE_KEY, cached);
      }
    } catch (err) {
      const status = err instanceof Anthropic.APIError ? ` (${err.status})` : "";
      console.error(`[newsTakes] Claude request failed${status}:`, err?.message || err);
    }
  }

  return articles.map((a) => ({ ...a, whyItMatters: cached[a.url] || "" }));
}
