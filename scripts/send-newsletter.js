/**
 * Nuclear Pulse - Weekly Editorial Newsletter Sender
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NUCLEAR_PLANTS } from '../src/data/plants.js';
import { URANIUM_SUPPLY_SITES } from '../src/data/supplySites.js';
import { COUNTRY_PROFILES } from '../src/data/countryProfiles.js';
import { ENERGY_COMPARISON, NUCLEAR_SHARE, STOCKS_BASE } from '../src/data/constants.js';
import { createUnsubscribeToken } from '../api/_lib/unsubscribe.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || process.env.VITE_FINNHUB_API_KEY;
const FROM = process.env.NEWSLETTER_FROM || 'Nuclear Pulse <onboarding@resend.dev>';
const SITE_URL = process.env.SITE_URL || 'https://atomic-energy.vercel.app';

const resend = new Resend(RESEND_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TICKERS = ['CCJ', 'UEC', 'NXE', 'LEU', 'DNN', 'SMR', 'OKLO', 'CEG', 'VST', 'UUUU', 'NNE', 'GEV'];

const FEEDS = [
  { name: 'World Nuclear News', url: 'https://www.world-nuclear-news.org/rss' },
  { name: 'NucNet', url: 'https://www.nucnet.org/feed' },
  { name: 'ANS Nuclear Newswire', url: 'https://www.ans.org/news/rss/' },
  { name: 'IAEA', url: 'https://www.iaea.org/feeds/topnews' },
  { name: 'US Dept of Energy', url: 'https://www.energy.gov/ne/rss.xml' },
];

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const TAG_RULES = [
  { tag: 'Policy', re: /policy|regulat|legislation|government|NRC|IAEA|permit|licens/i },
  { tag: 'Expansion', re: /construction|build|new reactor|SMR|modular|deploy|commission/i },
  { tag: 'Markets', re: /uranium.*price|price.*uranium|stock|market|invest|billion|deal/i },
  { tag: 'Research', re: /fusion|research|study|scientist|breakthrough|ITER|plasma/i },
  { tag: 'Safety', re: /safety|incident|shutdown|leak|radiation|emergency/i },
  { tag: 'Innovation', re: /advanced|microreactor|molten salt|thorium|fast reactor|gen[- ]?4/i },
];

const TAG_COLORS = {
  Policy: '#66c7db',
  Expansion: '#4ade80',
  Markets: '#fbbf24',
  Research: '#a78bfa',
  Safety: '#f87171',
  Innovation: '#fb923c',
  Industry: '#94a3b8',
};

const COUNTRY_PROFILE_KEY = {
  USA: 'USA',
  'S. Korea': 'S. Korea',
  UK: 'UK',
  'Czech Rep.': 'Czech Rep.',
};

function stripHtml(html = '') {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarise(text = '', maxChars = 180) {
  const clean = stripHtml(text);
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [];
  let result = '';
  for (const sentence of sentences) {
    if ((result + sentence).length > maxChars) break;
    result += `${sentence} `;
  }
  return result.trim() || clean.slice(0, maxChars).trim();
}

function inferTag(title = '') {
  for (const { tag, re } of TAG_RULES) {
    if (re.test(title)) return tag;
  }
  return 'Industry';
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCompactDate(date) {
  return date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
}

function formatPercent(value) {
  return `${value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(2)}%`;
}

function titleCase(text = '') {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getWeekIndex() {
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
}

function getCountryProfile(country) {
  return COUNTRY_PROFILES[COUNTRY_PROFILE_KEY[country] || country] || null;
}

function getTickerName(ticker) {
  return STOCKS_BASE.find((stock) => stock.ticker === ticker)?.name || ticker;
}

function findArticleByTags(articles, tags) {
  return (
    articles.find((article) => tags.includes(article.tag)) ||
    articles.find((article) => tags.some((tag) => article.title.toLowerCase().includes(tag.toLowerCase())))
  );
}

async function fetchFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(feed.url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    const isAtom = text.includes('<feed');
    const itemRe = isAtom ? /<entry>([\s\S]*?)<\/entry>/g : /<item>([\s\S]*?)<\/item>/g;
    const items = [];
    let match;
    while ((match = itemRe.exec(text)) !== null) {
      const block = match[1];
      const title = stripHtml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(block)?.[1] || '');
      const link = (
        isAtom
          ? /href="([^"]+)"/i.exec(/<link[^>]*>/i.exec(block)?.[0] || '')?.[1]
          : /<link>([\s\S]*?)<\/link>/i.exec(block)?.[1] ||
            /<guid[^>]*isPermaLink="true"[^>]*>([\s\S]*?)<\/guid>/i.exec(block)?.[1]
      ) || '';
      const descRaw =
        /<description>([\s\S]*?)<\/description>/i.exec(block)?.[1] ||
        /<summary[^>]*>([\s\S]*?)<\/summary>/i.exec(block)?.[1] ||
        /<content[^>]*>([\s\S]*?)<\/content>/i.exec(block)?.[1] ||
        '';
      const summary = summarise(descRaw);
      const pubDate =
        /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block)?.[1] ||
        /<published>([\s\S]*?)<\/published>/i.exec(block)?.[1] ||
        '';

      if (!title || !link.startsWith('http')) continue;
      const date = pubDate ? new Date(pubDate) : null;
      if (date && Date.now() - date.getTime() > MAX_AGE_MS) continue;

      items.push({ title, url: link, source: feed.name, date, tag: inferTag(title), summary });
    }
    return items.slice(0, 6);
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[news] Failed to fetch ${feed.name}:`, err.message);
    return [];
  }
}

async function fetchTopNews(limit = 6) {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const all = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  const seen = new Set();
  const unique = all.filter((article) => {
    if (seen.has(article.url)) return false;
    seen.add(article.url);
    return true;
  });
  unique.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  return unique.slice(0, limit);
}

async function fetchQuote(ticker) {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.c) return null;
    return { ticker, price: data.c, change: data.d || 0, pct: data.dp || 0 };
  } catch (err) {
    console.warn(`[stocks] Failed to fetch ${ticker}:`, err.message);
    return null;
  }
}

async function fetchMarketData() {
  const quotes = [];
  for (const ticker of TICKERS) {
    const quote = await fetchQuote(ticker);
    if (quote) quotes.push(quote);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const movers = [...quotes].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 3);
  const uranium = quotes.find((quote) => quote.ticker === 'CCJ') || null;
  return { movers, uranium, quotes };
}

async function getSubscribers() {
  const { data, error } = await supabase.from('subscribers').select('email').eq('active', true);
  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data.map((row) => row.email);
}

function getCountryRankingSnapshot() {
  const shareLeader = [...NUCLEAR_SHARE].sort((a, b) => b.nuclear - a.nuclear)[0];
  const reactorLeader = [...NUCLEAR_SHARE].sort((a, b) => b.reactors - a.reactors)[0];
  const week = getWeekIndex();
  const metricOrder = ['nuclear', 'reactors', 'capacity'];
  const activeMetric = metricOrder[week % metricOrder.length];

  if (activeMetric === 'reactors') {
    return {
      metric: 'reactors',
      country: reactorLeader.country,
      headline: `${reactorLeader.country} still sets the fleet-scale benchmark.`,
      stat: `${reactorLeader.reactors} reactors`,
      supporting: `${reactorLeader.capacity} installed capacity`,
      blurb: `${reactorLeader.country} remains the largest operating fleet in this dataset, which is why its policy and lifetime-extension choices still matter far beyond its borders.`,
    };
  }

  if (activeMetric === 'capacity') {
    const capacityLeader = [...NUCLEAR_SHARE].sort(
      (a, b) => parseFloat(b.capacity) - parseFloat(a.capacity)
    )[0];
    return {
      metric: 'capacity',
      country: capacityLeader.country,
      headline: `${capacityLeader.country} is still where nuclear scale looks most real.`,
      stat: capacityLeader.capacity,
      supporting: `${capacityLeader.reactors} reactors online`,
      blurb: `Installed gigawatts matter more than rhetoric. ${capacityLeader.country} remains the clearest example of nuclear as system-level infrastructure, not a pilot project.`,
    };
  }

  return {
    metric: 'share',
    country: shareLeader.country,
    headline: `${shareLeader.country} remains the clearest proof that nuclear can dominate a grid.`,
    stat: `${shareLeader.nuclear}% of electricity`,
    supporting: `${shareLeader.reactors} reactors | ${shareLeader.capacity}`,
    blurb: `${shareLeader.country} still shows what high nuclear penetration looks like in practice: durable fleet operations, political staying power, and a grid shaped around firm power.`,
  };
}

function getProjectHighlight(articles) {
  const week = getWeekIndex();
  const constructionPlants = NUCLEAR_PLANTS.filter((plant) => plant.status === 'Construction');
  const operatingMines = URANIUM_SUPPLY_SITES.filter((site) => site.status === 'Operating');
  const expansionArticle = findArticleByTags(articles, ['Expansion', 'Innovation']);

  if (expansionArticle) {
    return {
      label: 'Project highlight',
      headline: expansionArticle.title,
      summary: expansionArticle.summary || 'A buildout story worth tracking this week.',
      sourceLine: `${expansionArticle.source} | ${formatCompactDate(expansionArticle.date)}`,
      link: expansionArticle.url,
    };
  }

  if (week % 2 === 0 && constructionPlants.length > 0) {
    const plant = constructionPlants[week % constructionPlants.length];
    return {
      label: 'Reactor watch',
      headline: `${plant.name} keeps the new-build story tangible.`,
      summary: `${plant.country} has ${plant.reactors} reactor unit under construction here, representing ${plant.capacity.toLocaleString()} MW of new capacity in the queue.`,
      sourceLine: `${plant.country} | ${plant.type}`,
      link: `${SITE_URL}#map`,
    };
  }

  if (operatingMines.length > 0) {
    const mine = operatingMines[week % operatingMines.length];
    return {
      label: 'Fuel-chain watch',
      headline: `${mine.name} is the kind of upstream asset the market keeps circling back to.`,
      summary: `${mine.detail} Operator: ${mine.operator}. This is what the physical uranium story looks like beneath the ticker tape.`,
      sourceLine: `${mine.country} | ${mine.stage}`,
      link: `${SITE_URL}#map`,
    };
  }

  return null;
}

function getEnergyProofSignal() {
  const metrics = ['capacity', 'co2', 'land', 'deaths'];
  const metricKey = metrics[getWeekIndex() % metrics.length];
  const metric = ENERGY_COMPARISON.find((item) => item.key === metricKey) || ENERGY_COMPARISON[0];
  const nuclearValue = metric.data.find((item) => item.name === 'Nuclear')?.value;
  const runnerUp = [...metric.data]
    .filter((item) => item.name !== 'Nuclear')
    .sort((a, b) => (metric.lowerIsBetter ? a.value - b.value : b.value - a.value))[0];
  return { metric, nuclearValue, runnerUp };
}

function buildLead(articles, marketData, rankingSnapshot, energyProof) {
  const topStory = articles[0] || null;
  const expansionStory = findArticleByTags(articles, ['Expansion', 'Policy', 'Innovation']);
  const mover = marketData.movers[0] || null;
  const uranium = marketData.uranium;
  const energyMetric = energyProof.metric.label;

  let eyebrow = 'This week in nuclear';
  let title = 'The buildout story is still stronger than the noise around it.';
  let summary =
    'The strongest signal this week is not just that nuclear stayed in the headlines. It is that the same forces keep reinforcing one another: policy alignment, capital attention, and a grid case that still looks hard to replace.';

  if (expansionStory) {
    eyebrow = titleCase(expansionStory.tag);
    title = expansionStory.title;
    summary = `${expansionStory.summary} The deeper story is that buildout, licensing, and political commitment are still driving the agenda more than abstract climate branding.`;
  } else if (mover && Math.abs(mover.pct) >= 4) {
    eyebrow = 'Market pulse';
    title = `${mover.ticker} moved, but the bigger nuclear story is still physical buildout.`;
    summary = `${getTickerName(mover.ticker)} moved ${formatPercent(mover.pct)} this week, while ${rankingSnapshot.country} and the broader fleet data keep underscoring that nuclear remains an infrastructure story first and a trading story second.`;
  } else if (uranium) {
    eyebrow = 'Fuel and scale';
    title = 'Fuel markets and fleet-scale proof are still pointing in the same direction.';
    summary = `Cameco closed at $${uranium.price.toFixed(2)}, while ${rankingSnapshot.country} and this week’s ${energyMetric.toLowerCase()} snapshot keep reinforcing the same case: nuclear still wins when the question is scale, durability, and system reliability.`;
  }

  if (topStory && title === expansionStory?.title) {
    summary = `${topStory.summary || summary} The broader signal remains the same: policy, fuel, and infrastructure are lining up behind the existing nuclear buildout story.`;
  }

  return { eyebrow, title, summary };
}

function buildSignals(articles, marketData, rankingSnapshot, energyProof) {
  const policyArticle = findArticleByTags(articles, ['Policy', 'Expansion']) || articles[0] || null;
  const uranium = marketData.uranium;
  const mover = marketData.movers[0] || marketData.quotes[0] || null;
  const energyMetric = energyProof.metric;
  const signals = [];

  if (policyArticle) {
    signals.push({
      label: 'Policy / buildout',
      headline: policyArticle.title,
      body: policyArticle.summary || 'The policy signal this week still points toward buildout, not retrenchment.',
      meta: `${policyArticle.source} | ${formatCompactDate(policyArticle.date)}`,
      link: policyArticle.url,
    });
  } else {
    signals.push({
      label: 'Policy / buildout',
      headline: rankingSnapshot.headline,
      body: rankingSnapshot.blurb,
      meta: rankingSnapshot.supporting,
      link: `${SITE_URL}#data`,
    });
  }

  if (uranium || mover) {
    const anchor = mover || uranium;
    const anchorName = anchor?.ticker ? getTickerName(anchor.ticker) : 'nuclear equities';
    signals.push({
      label: 'Market signal',
      headline: anchor?.ticker
        ? `${anchor.ticker} is still a read-through on where nuclear capital is leaning.`
        : 'The market signal is still pointing at fuel and fleet leverage.',
      body: uranium
        ? `Cameco finished at $${uranium.price.toFixed(2)} (${formatPercent(uranium.pct)}), while ${anchorName} shows that investors are still trading the fuel chain, reactor pipeline, and grid-firming story together.`
        : 'Even when the weekly move is noisy, capital keeps clustering around uranium, services, and buildout-adjacent names.',
      meta: anchor?.ticker ? `${anchor.ticker} | ${formatPercent(anchor.pct || 0)}` : 'Market pulse',
      link: `${SITE_URL}#markets`,
    });
  }

  signals.push({
    label: 'Infrastructure / proof',
    headline: rankingSnapshot.headline,
    body: `${rankingSnapshot.blurb} This week’s proof metric is ${energyMetric.label.toLowerCase()}: ${energyProof.metric.insight}`,
    meta: `${rankingSnapshot.stat} | ${rankingSnapshot.supporting}`,
    link: `${SITE_URL}#data`,
  });

  return signals.slice(0, 3);
}

function buildMarketPulse(marketData) {
  const uranium = marketData.uranium;
  const movers = marketData.movers.slice(0, 3).map((mover) => ({
    ...mover,
    company: getTickerName(mover.ticker),
  }));

  return {
    headline: 'Capital is still watching fuel, utilities, and advanced-reactor leverage.',
    summary: uranium
      ? `Cameco remains the uranium proxy in the email because it keeps the fuel story legible at a glance. This week it closed at $${uranium.price.toFixed(2)} (${formatPercent(uranium.pct)}).`
      : 'Market data was partially thin this run, so the section falls back to the strongest available public-market movers.',
    uranium,
    movers,
  };
}

function buildBuildoutWatch(articles, rankingSnapshot) {
  const profile = getCountryProfile(rankingSnapshot.country);
  const project = getProjectHighlight(articles);

  return {
    country: {
      label: 'Country lens',
      headline: rankingSnapshot.country,
      stat: rankingSnapshot.stat,
      supporting: rankingSnapshot.supporting,
      summary: profile?.futurePlans || rankingSnapshot.blurb,
      link: `${SITE_URL}#data`,
    },
    project,
  };
}

function buildDispatch(articles, usedUrls) {
  const dispatch = [];
  const sources = new Set();

  for (const article of articles) {
    if (dispatch.length >= 4) break;
    if (usedUrls.has(article.url)) continue;
    if (sources.has(article.source) && dispatch.length < 3) continue;

    dispatch.push({
      title: article.title,
      summary: article.summary || 'A notable development worth tracking.',
      meta: `${article.source} | ${article.tag}${article.date ? ` | ${formatCompactDate(article.date)}` : ''}`,
      url: article.url,
      color: TAG_COLORS[article.tag] || TAG_COLORS.Industry,
    });
    sources.add(article.source);
  }

  if (dispatch.length < 4) {
    const fallbacks = [
      {
        title: 'Global nuclear proof',
        summary: 'Country rankings and energy-proof metrics make the grid case in one place.',
        meta: 'Nuclear Pulse | Data',
        url: `${SITE_URL}#data`,
        color: TAG_COLORS.Industry,
      },
      {
        title: 'Every reactor and major uranium site on one map',
        summary: 'The map stays useful even in a quieter news week because the physical network still matters.',
        meta: 'Nuclear Pulse | Map',
        url: `${SITE_URL}#map`,
        color: TAG_COLORS.Markets,
      },
      {
        title: 'Market overview',
        summary: 'Track uranium-sensitive equities, utilities, and advanced-reactor names in one panel.',
        meta: 'Nuclear Pulse | Markets',
        url: `${SITE_URL}#markets`,
        color: TAG_COLORS.Markets,
      },
    ];
    for (const item of fallbacks) {
      if (dispatch.length >= 4) break;
      if (usedUrls.has(item.url)) continue;
      if (dispatch.some((entry) => entry.url === item.url)) continue;
      dispatch.push(item);
    }
  }

  return dispatch;
}

function buildSubject(lead, signals, dispatch) {
  const primary = lead.title.replace(/[.]+$/, '');
  const secondary = signals[0]?.label || dispatch[0]?.meta?.split('|')[0]?.trim() || 'weekly briefing';
  const subject = `${primary} | ${secondary}`;
  return subject.length > 115 ? `${subject.slice(0, 112)}...` : subject;
}

function assembleIssue(articles, marketData) {
  const rankingSnapshot = getCountryRankingSnapshot();
  const energyProof = getEnergyProofSignal();
  const lead = buildLead(articles, marketData, rankingSnapshot, energyProof);
  const signals = buildSignals(articles, marketData, rankingSnapshot, energyProof);
  const marketPulse = buildMarketPulse(marketData);
  const buildoutWatch = buildBuildoutWatch(articles, rankingSnapshot);
  const usedUrls = new Set(
    [...signals, buildoutWatch.project]
      .map((item) => item?.link)
      .filter((value) => value && value.startsWith('http'))
  );
  const dispatch = buildDispatch(articles, usedUrls);
  const subject = buildSubject(lead, signals, dispatch);

  const issue = { subject, lead, signals, marketPulse, buildoutWatch, dispatch };

  const isCoherent =
    issue.lead?.title &&
    issue.signals.length >= 2 &&
    (issue.dispatch.length >= 2 || issue.marketPulse.movers.length >= 2);

  if (!isCoherent) {
    throw new Error('Issue assembly incomplete: not enough strong sections to send.');
  }

  return issue;
}

function buildSignalCards(signals) {
  return signals
    .map(
      (signal) => `
      <tr>
        <td style="padding:0 0 14px 0;">
          <div style="background:#1a1611;border:1px solid rgba(245,240,232,0.08);border-radius:12px;padding:18px 18px 16px;">
            <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#d4a54a;font-weight:700;margin-bottom:8px;">${signal.label}</div>
            <div style="font-family:Georgia,serif;font-size:20px;line-height:1.35;color:#f5f0e8;margin-bottom:8px;">${signal.headline}</div>
            <div style="font-size:14px;line-height:1.65;color:rgba(245,240,232,0.68);margin-bottom:10px;">${signal.body}</div>
            <div style="font-size:12px;color:rgba(245,240,232,0.35);">${signal.meta}</div>
          </div>
        </td>
      </tr>
    `
    )
    .join('');
}

function buildMoverCells(movers) {
  return movers
    .map((mover) => {
      const up = mover.pct >= 0;
      const color = up ? '#4ade80' : '#f87171';
      return `
        <td style="width:33.33%;padding:0 4px 8px;vertical-align:top;">
          <div style="background:#1a1611;border:1px solid rgba(245,240,232,0.08);border-radius:12px;padding:14px 12px;text-align:center;min-height:118px;">
            <div style="font-family:'Courier New',monospace;font-size:16px;font-weight:700;color:#d4a54a;margin-bottom:4px;">${mover.ticker}</div>
            <div style="font-size:11px;line-height:1.45;color:rgba(245,240,232,0.42);margin-bottom:8px;">${mover.company}</div>
            <div style="font-size:14px;color:#f5f0e8;margin-bottom:4px;">$${mover.price.toFixed(2)}</div>
            <div style="font-size:12px;font-weight:700;color:${color};">${formatPercent(mover.pct)}</div>
          </div>
        </td>
      `;
    })
    .join('');
}

function buildDispatchRows(dispatch) {
  return dispatch
    .map(
      (item) => `
      <tr>
        <td style="padding:0 0 14px 0;">
          <a href="${item.url}" style="display:block;text-decoration:none;color:inherit;background:#1a1611;border:1px solid rgba(245,240,232,0.08);border-radius:12px;padding:16px 18px;">
            <div style="font-family:Georgia,serif;font-size:18px;line-height:1.4;color:#f5f0e8;margin-bottom:7px;">${item.title}</div>
            <div style="font-size:14px;line-height:1.65;color:rgba(245,240,232,0.64);margin-bottom:8px;">${item.summary}</div>
            <div style="font-size:12px;color:${item.color};font-weight:700;">${item.meta}</div>
          </a>
        </td>
      </tr>
    `
    )
    .join('');
}

function buildEmail(issue, unsubEmail) {
  const unsubUrl = `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(createUnsubscribeToken(unsubEmail))}`;
  const date = formatDate(new Date());
  const uranium = issue.marketPulse.uranium;
  const project = issue.buildoutWatch.project;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nuclear Pulse - Weekly Briefing</title>
</head>
<body style="margin:0;padding:0;background:#0f0e0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0e0b;padding:28px 14px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">
          <tr>
            <td style="padding:0 0 28px;text-align:center;border-bottom:1px solid rgba(212,165,74,0.18);">
              <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#d4a54a;font-weight:700;margin-bottom:10px;">Weekly atomic briefing</div>
              <div style="font-family:Georgia,serif;font-size:34px;line-height:1.1;color:#f5f0e8;">Nuclear Pulse</div>
              <div style="font-size:13px;color:rgba(245,240,232,0.38);margin-top:8px;">${date}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 0 24px;">
              <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#d4a54a;font-weight:700;margin-bottom:10px;">${issue.lead.eyebrow}</div>
              <div style="font-family:Georgia,serif;font-size:34px;line-height:1.16;color:#f5f0e8;margin-bottom:14px;">${issue.lead.title}</div>
              <div style="font-size:16px;line-height:1.75;color:rgba(245,240,232,0.72);">${issue.lead.summary}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 18px;">
              <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(212,165,74,0.8);font-weight:700;margin-bottom:14px;">Three key signals</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${buildSignalCards(issue.signals)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 0 0;border-top:1px solid rgba(245,240,232,0.06);">
              <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(212,165,74,0.8);font-weight:700;margin-bottom:14px;">Market pulse</div>
              <div style="background:#1a1611;border:1px solid rgba(245,240,232,0.08);border-radius:12px;padding:18px 18px 16px;margin-bottom:14px;">
                <div style="font-family:Georgia,serif;font-size:22px;line-height:1.3;color:#f5f0e8;margin-bottom:10px;">${issue.marketPulse.headline}</div>
                <div style="font-size:14px;line-height:1.65;color:rgba(245,240,232,0.68);margin-bottom:${uranium ? '14px' : '0'};">${issue.marketPulse.summary}</div>
                ${
                  uranium
                    ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;background:rgba(212,165,74,0.06);border:1px solid rgba(212,165,74,0.12);border-radius:10px;padding:14px 16px;">
                        <div>
                          <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#d4a54a;font-weight:700;margin-bottom:4px;">Uranium proxy</div>
                          <div style="font-size:13px;color:rgba(245,240,232,0.5);">Cameco (CCJ)</div>
                        </div>
                        <div style="text-align:right;">
                          <div style="font-family:'Courier New',monospace;font-size:20px;color:#f5f0e8;font-weight:700;">$${uranium.price.toFixed(2)}</div>
                          <div style="font-size:13px;font-weight:700;color:${uranium.pct >= 0 ? '#4ade80' : '#f87171'};">${formatPercent(uranium.pct)}</div>
                        </div>
                      </div>`
                    : ''
                }
              </div>
              ${
                issue.marketPulse.movers.length
                  ? `<table width="100%" cellpadding="0" cellspacing="0"><tr>${buildMoverCells(issue.marketPulse.movers)}</tr></table>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding:26px 0 0;border-top:1px solid rgba(245,240,232,0.06);">
              <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(212,165,74,0.8);font-weight:700;margin-bottom:14px;">Buildout watch</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 0 14px;">
                    <div style="background:#1a1611;border:1px solid rgba(245,240,232,0.08);border-radius:12px;padding:18px;">
                      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#d4a54a;font-weight:700;margin-bottom:8px;">${issue.buildoutWatch.country.label}</div>
                      <div style="font-family:Georgia,serif;font-size:26px;line-height:1.2;color:#f5f0e8;margin-bottom:8px;">${issue.buildoutWatch.country.headline}</div>
                      <div style="font-size:14px;color:#d4a54a;font-weight:700;margin-bottom:8px;">${issue.buildoutWatch.country.stat} | ${issue.buildoutWatch.country.supporting}</div>
                      <div style="font-size:14px;line-height:1.65;color:rgba(245,240,232,0.68);">${issue.buildoutWatch.country.summary}</div>
                    </div>
                  </td>
                </tr>
                ${
                  project
                    ? `<tr>
                        <td>
                          <a href="${project.link}" style="display:block;text-decoration:none;color:inherit;background:#1a1611;border:1px solid rgba(245,240,232,0.08);border-radius:12px;padding:18px;">
                            <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#d4a54a;font-weight:700;margin-bottom:8px;">${project.label}</div>
                            <div style="font-family:Georgia,serif;font-size:22px;line-height:1.32;color:#f5f0e8;margin-bottom:8px;">${project.headline}</div>
                            <div style="font-size:14px;line-height:1.65;color:rgba(245,240,232,0.68);margin-bottom:8px;">${project.summary}</div>
                            <div style="font-size:12px;color:rgba(245,240,232,0.38);">${project.sourceLine}</div>
                          </a>
                        </td>
                      </tr>`
                    : ''
                }
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 0 0;border-top:1px solid rgba(245,240,232,0.06);">
              <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(212,165,74,0.8);font-weight:700;margin-bottom:14px;">Dispatch</div>
              <div style="font-size:14px;line-height:1.65;color:rgba(245,240,232,0.68);margin-bottom:16px;">A shorter watchlist of links that still matter after the headline cycle moves on.</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${buildDispatchRows(issue.dispatch)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 0 0;border-top:1px solid rgba(245,240,232,0.06);text-align:center;">
              <div style="font-family:Georgia,serif;font-size:24px;line-height:1.3;color:#f5f0e8;margin-bottom:10px;">The site tracks the full stack.</div>
              <div style="font-size:14px;line-height:1.65;color:rgba(245,240,232,0.58);margin-bottom:16px;">Reactors, mines, markets, buildout rankings, and the weekly policy fight over firm power - all in one place.</div>
              <a href="${SITE_URL}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#f1e8d8;color:#111;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Open Nuclear Pulse</a>
              <div style="font-size:12px;color:rgba(245,240,232,0.28);margin-top:18px;">You're receiving this because you subscribed at Nuclear Pulse.</div>
              <div style="margin-top:10px;"><a href="${unsubUrl}" style="font-size:12px;color:rgba(245,240,232,0.3);text-decoration:underline;">Unsubscribe</a></div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function main() {
  console.log('[newsletter] Starting...');

  for (const key of ['RESEND_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY']) {
    if (!process.env[key]) {
      console.error(`[newsletter] Missing env var: ${key}`);
      process.exit(1);
    }
  }

  console.log('[newsletter] Fetching news...');
  const articles = await fetchTopNews(6);
  console.log(`[newsletter] Got ${articles.length} articles`);

  console.log('[newsletter] Fetching market data...');
  const marketData = await fetchMarketData();
  console.log(
    `[newsletter] Got ${marketData.movers.length} movers, uranium proxy: ${
      marketData.uranium ? `$${marketData.uranium.price}` : 'unavailable'
    }`
  );

  console.log('[newsletter] Assembling issue...');
  const issue = assembleIssue(articles, marketData);
  console.log(`[newsletter] Subject: "${issue.subject}"`);

  console.log('[newsletter] Loading subscribers...');
  const subscribers = await getSubscribers();
  console.log(`[newsletter] ${subscribers.length} active subscribers`);

  if (subscribers.length === 0) {
    console.log('[newsletter] No subscribers - nothing to send.');
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const email of subscribers) {
    const html = buildEmail(issue, email);
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: issue.subject,
      html,
    });

    if (error) {
      console.error(`[newsletter] Failed to send to ${email}:`, error.message);
      failed += 1;
    } else {
      sent += 1;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`[newsletter] Done. Sent: ${sent}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error('[newsletter] Fatal error:', err);
  process.exit(1);
});
