// Email template builders for the terminal dispatch system.
//
// Each builder is a pure function returning `{ subject, html, text }` so the
// dispatch handler can pass them straight to Resend. They share the
// editorial design system (cream + dark brown + gold) but stay simple:
// single column, max ~600px, system fonts, all critical info above the
// fold, plus an unsubscribe link.

import { createUnsubscribeToken } from "./unsubscribe.js";

const SITE_URL = process.env.SITE_URL?.trim() || "https://atomic-energy.vercel.app";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}%`;
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "—";
  return `$${Number(value).toFixed(2)}`;
}

function buildUnsubLink(email) {
  if (!email) return `${SITE_URL}`;
  const token = createUnsubscribeToken(email);
  return `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

function shell({ title, dateLine, greetingName, bodyHtml, unsubEmail, footerNote }) {
  const date = dateLine || formatDate(new Date());
  const unsubUrl = buildUnsubLink(unsubEmail);
  const greeting = greetingName
    ? `<div style="font-size:14px;color:rgba(245,240,232,0.62);margin:0 0 16px;">Good morning, ${escapeHtml(greetingName)}.</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#0f0e0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0e0b;padding:28px 14px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="padding:0 0 20px;text-align:center;border-bottom:1px solid rgba(212,165,74,0.18);">
    <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#d4a54a;font-weight:700;margin-bottom:8px;">Nuclear Pulse</div>
    <div style="font-size:13px;color:rgba(245,240,232,0.38);">${escapeHtml(date)}</div>
  </td></tr>
  <tr><td style="padding:22px 0 0;color:#f5f0e8;">
    ${greeting}
    ${bodyHtml}
  </td></tr>
  <tr><td style="padding:24px 0 0;border-top:1px solid rgba(245,240,232,0.06);text-align:center;">
    <a href="${SITE_URL}/terminal" style="display:inline-block;padding:11px 20px;border-radius:4px;background:#d4a54a;color:#111;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">From the terminal</a>
    <div style="font-size:11px;color:rgba(245,240,232,0.32);margin-top:18px;">${escapeHtml(footerNote || "You're receiving this because you subscribed at Nuclear Pulse.")}</div>
    <div style="margin-top:8px;"><a href="${unsubUrl}" style="font-size:11px;color:rgba(245,240,232,0.32);text-decoration:underline;">Unsubscribe</a></div>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function moduleBlock(label, innerHtml) {
  return `<div style="margin:0 0 18px;">
    <div style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(212,165,74,0.85);font-weight:700;margin-bottom:10px;">${escapeHtml(label)}</div>
    <div style="background:#1a1611;border:1px solid rgba(245,240,232,0.08);border-radius:6px;padding:14px 16px;">${innerHtml}</div>
  </div>`;
}

function moverRow(m) {
  const up = (m.pct ?? 0) >= 0;
  const color = up ? "#4ade80" : "#f87171";
  return `<tr>
    <td style="padding:6px 0;font-family:'Courier New',monospace;font-size:13px;color:#d4a54a;font-weight:700;">${escapeHtml(m.ticker)}</td>
    <td style="padding:6px 0;font-size:13px;color:rgba(245,240,232,0.78);">${escapeHtml(m.name || "")}</td>
    <td style="padding:6px 0;text-align:right;font-family:'Courier New',monospace;font-size:13px;color:#f5f0e8;">${formatPrice(m.price)}</td>
    <td style="padding:6px 0;text-align:right;font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:${color};">${formatPercent(m.pct)}</td>
  </tr>`;
}

function moversTable(movers) {
  if (!movers || movers.length === 0) {
    return `<div style="font-size:13px;color:rgba(245,240,232,0.55);">No movers data available.</div>`;
  }
  return `<table width="100%" cellpadding="0" cellspacing="0">${movers.map(moverRow).join("")}</table>`;
}

function bulletList(items) {
  if (!items?.length) return `<div style="font-size:13px;color:rgba(245,240,232,0.55);">Nothing new in this slice today.</div>`;
  return items
    .map((it) => {
      const href = it.url ? ` href="${escapeHtml(it.url)}"` : "";
      const tag = href ? "a" : "div";
      const style = href
        ? "display:block;text-decoration:none;color:inherit;padding:8px 0;border-top:1px solid rgba(245,240,232,0.06);"
        : "display:block;padding:8px 0;border-top:1px solid rgba(245,240,232,0.06);";
      return `<${tag}${href} style="${style}">
        <div style="font-size:13px;line-height:1.45;color:#f5f0e8;margin-bottom:3px;">${escapeHtml(it.title)}</div>
        ${it.meta ? `<div style="font-size:11px;color:rgba(245,240,232,0.45);">${escapeHtml(it.meta)}</div>` : ""}
      </${tag}>`;
    })
    .join("");
}

function uraniumBlock(uranium) {
  if (!uranium) return null;
  const price = uranium.price ?? uranium.value ?? uranium.spotPrice ?? null;
  const pct = uranium.pct ?? uranium.changePct ?? null;
  const up = (pct ?? 0) >= 0;
  return `<div style="display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#d4a54a;font-weight:700;margin-bottom:4px;">Uranium spot</div>
      <div style="font-size:12px;color:rgba(245,240,232,0.55);">${escapeHtml(uranium.source || "Spot proxy")}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-family:'Courier New',monospace;font-size:18px;color:#f5f0e8;font-weight:700;">${formatPrice(price)}</div>
      ${Number.isFinite(pct) ? `<div style="font-family:'Courier New',monospace;font-size:12px;font-weight:700;color:${up ? "#4ade80" : "#f87171"};">${formatPercent(pct)}</div>` : ""}
    </div>
  </div>`;
}

function plainTextFromSections(sections) {
  return sections
    .filter(Boolean)
    .map((sec) => {
      const lines = [`== ${sec.label.toUpperCase()} ==`];
      if (sec.items) {
        sec.items.forEach((it) => lines.push(`- ${it.title}${it.meta ? ` (${it.meta})` : ""}${it.url ? ` ${it.url}` : ""}`));
      }
      if (sec.text) lines.push(sec.text);
      return lines.join("\n");
    })
    .join("\n\n");
}

// ---------------- DAILY ----------------

export function buildDailyEmail({ user, email, movers = [], filings = [], operations = [], headlines = [], uranium = null, watchlistLabels = [] }) {
  const greetingName = user?.user_metadata?.first_name || user?.user_metadata?.name?.split(" ")?.[0] || null;
  const topSignal = (() => {
    if (uranium && Number.isFinite(uranium.pct ?? uranium.changePct)) {
      const pct = uranium.pct ?? uranium.changePct;
      return `Uranium ${formatPercent(pct)} overnight`;
    }
    const big = movers.find((m) => Math.abs(m.pct ?? 0) >= 2);
    if (big) return `${big.ticker} ${formatPercent(big.pct)}`;
    if (filings[0]) return `${filings[0].ticker || filings[0].company || "New"} filing`;
    return "Today's briefing";
  })();
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const subject = `Nuclear Pulse · ${dateStr} · ${topSignal}`;

  const watchlistLine = watchlistLabels.length
    ? `<div style="font-size:12px;color:rgba(245,240,232,0.5);margin-bottom:18px;">Tracking ${escapeHtml(watchlistLabels.slice(0, 6).join(", "))}${watchlistLabels.length > 6 ? ` and ${watchlistLabels.length - 6} more` : ""}.</div>`
    : "";

  const bodyHtml = [
    watchlistLine,
    uranium ? moduleBlock("Fuel proxy", uraniumBlock(uranium)) : "",
    moduleBlock("Top market movers", moversTable(movers.slice(0, 5))),
    moduleBlock("Watched company filings", bulletList(filings.slice(0, 4).map((f) => ({
      title: `${f.company || f.ticker || "Filing"} · ${f.form || f.type || "filing"}`,
      meta: f.filedAt ? new Date(f.filedAt).toLocaleDateString() : (f.title || ""),
      url: f.url || f.link || null,
    })))),
    operations.length ? moduleBlock("NRC / operations", bulletList(operations.slice(0, 4).map((o) => ({
      title: o.headline || o.title || `${o.plantName || "Plant"} signal`,
      meta: [o.plantName, o.status].filter(Boolean).join(" · "),
      url: o.url || null,
    })))) : "",
    moduleBlock("Headlines", bulletList(headlines.slice(0, 5).map((h) => ({
      title: h.title,
      meta: [h.source, h.tag].filter(Boolean).join(" · "),
      url: h.url,
    })))),
  ].join("");

  const html = shell({
    title: subject,
    greetingName,
    bodyHtml,
    unsubEmail: email,
    footerNote: "Daily briefing for Nuclear Pulse Terminal subscribers.",
  });

  const text = plainTextFromSections([
    { label: "Top movers", items: movers.slice(0, 5).map((m) => ({ title: `${m.ticker} ${formatPrice(m.price)} ${formatPercent(m.pct)}` })) },
    filings.length ? { label: "Watched filings", items: filings.slice(0, 4).map((f) => ({ title: `${f.company || f.ticker}: ${f.form || "filing"}`, url: f.url })) } : null,
    operations.length ? { label: "NRC / operations", items: operations.slice(0, 4).map((o) => ({ title: o.headline || o.title })) } : null,
    { label: "Headlines", items: headlines.slice(0, 5).map((h) => ({ title: h.title, url: h.url })) },
    uranium ? { label: "Uranium", text: `Spot ${formatPrice(uranium.price ?? uranium.value)} ${formatPercent(uranium.pct ?? uranium.changePct ?? 0)}` } : null,
  ]);

  return { subject, html, text };
}

// ---------------- WEEKLY ----------------

export function buildWeeklyEmail({ email, headlines = [], movers = [], uranium = null }) {
  const summaryParts = [];
  if (uranium) summaryParts.push(`Uranium ${formatPercent(uranium.pct ?? uranium.changePct ?? 0)}`);
  if (movers[0]) summaryParts.push(`${movers[0].ticker} leads`);
  const weekSummary = summaryParts.join(" · ") || "Weekly recap";
  const subject = `Weekly atomic briefing — ${weekSummary}`;

  const bodyHtml = [
    moduleBlock("This week's signals", bulletList(headlines.slice(0, 5).map((h) => ({
      title: h.title,
      meta: [h.source, h.tag].filter(Boolean).join(" · "),
      url: h.url,
    })))),
    uranium ? moduleBlock("Uranium spot", uraniumBlock(uranium)) : "",
    moduleBlock("Top movers this week", moversTable(movers.slice(0, 3))),
  ].join("");

  const html = shell({
    title: subject,
    bodyHtml,
    unsubEmail: email,
    footerNote: "Sunday recap — Nuclear Pulse newsletter.",
  });

  const text = plainTextFromSections([
    { label: "Headlines", items: headlines.slice(0, 5).map((h) => ({ title: h.title, url: h.url })) },
    { label: "Movers", items: movers.slice(0, 3).map((m) => ({ title: `${m.ticker} ${formatPrice(m.price)} ${formatPercent(m.pct)}` })) },
    uranium ? { label: "Uranium", text: `Spot ${formatPrice(uranium.price ?? uranium.value)}` } : null,
  ]);

  return { subject, html, text };
}

// ---------------- ALERT ----------------

export function buildAlertEmail({ alert, observed, email, user }) {
  const direction = (() => {
    if (alert.alert_type === "price_drop" || alert.alert_type === "percent_drop") return "fell below";
    if (alert.alert_type === "price_rise" || alert.alert_type === "percent_rise") return "rose above";
    return "triggered";
  })();
  const unitSuffix = alert.alert_type?.startsWith("percent_") ? "%" : "";
  const thresholdStr = alert.threshold != null ? `${alert.threshold}${unitSuffix}` : "event";
  const subject = `Alert: ${alert.target_label} ${direction} ${thresholdStr}`;

  const observedStr = observed?.formatted
    || (observed?.price != null ? formatPrice(observed.price) : "")
    || (observed?.pct != null ? formatPercent(observed.pct) : "")
    || "";

  const greetingName = user?.user_metadata?.first_name || null;

  const bodyHtml = [
    moduleBlock("Alert fired", `
      <div style="font-family:Georgia,serif;font-size:22px;line-height:1.3;color:#f5f0e8;margin-bottom:10px;">${escapeHtml(alert.target_label)}</div>
      <div style="font-size:14px;color:rgba(245,240,232,0.72);line-height:1.6;">
        Your <strong style="color:#d4a54a;">${escapeHtml(alert.alert_type.replace("_", " "))}</strong> trigger ${escapeHtml(direction)} <strong>${escapeHtml(thresholdStr)}</strong>.
        ${observedStr ? `Currently at <strong>${escapeHtml(observedStr)}</strong>.` : ""}
      </div>
    `),
    `<div style="text-align:center;margin:8px 0 0;">
      <a href="${SITE_URL}/terminal" style="font-size:12px;color:#d4a54a;text-decoration:underline;">Open the terminal →</a>
    </div>`,
  ].join("");

  const html = shell({
    title: subject,
    greetingName,
    bodyHtml,
    unsubEmail: email,
    footerNote: "You're receiving this because you set an alert in Nuclear Pulse Terminal.",
  });

  const text = `${alert.target_label}\n${alert.alert_type} ${direction} ${thresholdStr}${observedStr ? `\nObserved: ${observedStr}` : ""}\n\nOpen ${SITE_URL}/terminal`;

  return { subject, html, text };
}
