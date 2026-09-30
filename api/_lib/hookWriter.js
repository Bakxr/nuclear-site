// Has Claude rewrite the daily X drafts' main posts (the "hooks") from the
// day's data and headlines, so they read like a person reacting to the news
// rather than a template.
//
// Safety net: a rewrite is only used if every number and $TICKER in it
// appears in the facts Claude was given, it has no links or hashtags, and it
// fits in a post. Anything else falls back to the template text, as does a
// missing ANTHROPIC_API_KEY or any API error. The reply (link) and chart card
// are never touched.

import Anthropic from "@anthropic-ai/sdk";
import { xLength } from "./socialDrafts.js";

const MODEL = "claude-opus-5-5";
// The daily cron has a 60s ceiling and runs other jobs first.
const TIMEOUT_MS = 30 * 1000;

const SYSTEM = `You write X (Twitter) posts for Nuclear Pulse, a site that tracks nuclear energy: reactors, uranium, and nuclear stocks.

For each draft you get the facts (a template post and the data behind it) plus today's nuclear headlines. Rewrite the post so a sharp, well-informed person would want to reply to it.

Rules:
- Use only facts given to you. Every number and $TICKER you write must appear in that draft's facts. Never invent a cause for a move; name a reason only if one of the supplied headlines states it plainly, and then attribute it ("per Reuters", "after reports that ...").
- Lead with the most interesting fact, not a label. Plain, confident, specific. No hype words (massive, huge, insane, skyrocket), no emojis, no hashtags, no links, no financial advice.
- End with one short question or a clear take that invites replies. Vary the phrasing day to day.
- 280 characters maximum, counting everything. Short lines and line breaks are fine.
- If you can't improve a draft within these rules, return its template text unchanged.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    posts: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "integer" }, text: { type: "string" } },
        required: ["id", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["posts"],
  additionalProperties: false,
};

// "13", "89.58", "96,030" → "13", "89.58", "96030"; "6.1" and "6.10" match.
function numbersIn(text) {
  return (String(text).match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => String(Number(n.replace(/,/g, ""))));
}

function tickersIn(text) {
  return String(text).match(/\$[A-Z][A-Z.]{0,6}\b/g) || [];
}

// Why a rewrite can't be used, or null if it's fine.
export function rejectReason(text, facts) {
  if (typeof text !== "string" || !text.trim()) return "empty";
  if (xLength(text) > 280) return "too long";
  if (/https?:\/\/|www\.|\.com\b/i.test(text)) return "has a link";
  if (/(^|\s)#\w/.test(text)) return "has a hashtag";
  const knownNumbers = new Set(numbersIn(facts));
  const strayNumber = numbersIn(text).find((n) => !knownNumbers.has(n));
  if (strayNumber) return `number not in facts: ${strayNumber}`;
  const knownTickers = new Set(tickersIn(facts));
  const strayTicker = tickersIn(text).find((t) => !knownTickers.has(t));
  if (strayTicker) return `ticker not in facts: ${strayTicker}`;
  return null;
}

function draftFacts(draft) {
  return `Template post:\n${draft.text}\n\nData:\n${JSON.stringify(draft.card ?? {})}`;
}

export function buildPrompt(drafts, headlines = []) {
  const news = headlines.length
    ? headlines.map((h) => `- ${h.title}${h.source ? ` (${h.source})` : ""}`).join("\n")
    : "(none today)";
  const items = drafts.map((d, id) => `<draft id="${id}" kind="${d.kind}">\n${draftFacts(d)}\n</draft>`).join("\n\n");
  return `Today's nuclear headlines:\n${news}\n\n${items}\n\nReturn one post per draft id.`;
}

// Returns the drafts with `text` replaced where Claude's rewrite passed the
// checks. Never throws.
export async function writeHooks(drafts, { headlines = [], client = null } = {}) {
  const eligible = drafts.map((d, i) => ({ d, i })).filter(({ d }) => d.card);
  if (!eligible.length) return { drafts, rewritten: 0, skipped: "no drafts to rewrite" };
  if (!client && !process.env.ANTHROPIC_API_KEY?.trim()) return { drafts, rewritten: 0, skipped: "ANTHROPIC_API_KEY not set" };

  let response;
  try {
    const anthropic = client || new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 });
    response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: buildPrompt(eligible.map(({ d }) => d), headlines) }],
    });
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? ` (${err.status})` : "";
    console.error(`[hooks] Claude request failed${status}:`, err?.message || err);
    return { drafts, rewritten: 0, error: err?.message || String(err) };
  }

  if (response.stop_reason === "refusal") return { drafts, rewritten: 0, error: "refused" };
  const textBlock = response.content.find((b) => b.type === "text");
  let posts;
  try {
    posts = JSON.parse(textBlock?.text || "").posts;
  } catch {
    return { drafts, rewritten: 0, error: `unparseable output (stop: ${response.stop_reason})` };
  }

  const out = [...drafts];
  const rejected = [];
  let rewritten = 0;
  for (const { id, text } of Array.isArray(posts) ? posts : []) {
    const target = eligible[id];
    if (!target) continue;
    const reason = rejectReason(text, draftFacts(target.d));
    if (reason) {
      rejected.push({ kind: target.d.kind, reason });
      continue;
    }
    if (text.trim() !== target.d.text.trim()) {
      out[target.i] = { ...target.d, text: text.trim(), template: target.d.text };
      rewritten += 1;
    }
  }
  if (rejected.length) console.warn("[hooks] kept template for:", rejected);
  return { drafts: out, rewritten, rejected };
}
