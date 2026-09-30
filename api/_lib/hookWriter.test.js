import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPrompt, rejectReason, writeHooks } from './hookWriter.js';

const movers = {
  kind: 'Market movers',
  text: 'Rough day for nuclear. 13 of 39 names closed higher.\n\n$EU −6.1%\n$CEG −4.0%\nUranium spot: $89.58/lb\n\nBuying the dip, or staying out?',
  reply: 'Live prices:\n\nhttps://thenuclearpulse.com/uranium-stocks?utm_source=x',
  card: { type: 'movers', rows: [{ ticker: 'EU', pct: -6.1 }, { ticker: 'CEG', pct: -4 }], uranium: 89.58, up: 13, total: 39 },
};
const plug = { kind: 'Newsletter plug', text: 'Sign up https://thenuclearpulse.com', reply: null, card: null };

function fakeClient(posts, extra = {}) {
  const create = vi.fn(async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ posts }) }], ...extra }));
  return { client: { beta: { messages: { create } } }, create };
}

describe('hook safety checks', () => {
  const facts = `${movers.text}\n${JSON.stringify(movers.card)}`;

  it('accepts a rewrite that only uses supplied numbers and tickers', () => {
    expect(rejectReason('$EU fell 6.1% and $CEG 4.0%. Only 13 of 39 names closed green. Dip or trap?', facts)).toBeNull();
  });

  it('rejects invented numbers, tickers, links, hashtags and overlong posts', () => {
    expect(rejectReason('$EU fell 7.2% today.', facts)).toMatch(/number not in facts: 7.2/);
    expect(rejectReason('$CCJ held up while $EU fell.', facts)).toMatch(/ticker not in facts: \$CCJ/);
    expect(rejectReason('See thenuclearpulse.com', facts)).toBe('has a link');
    expect(rejectReason('Rough day #uranium', facts)).toBe('has a hashtag');
    expect(rejectReason('x'.repeat(281), facts)).toBe('too long');
  });
});

describe('writeHooks', () => {
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('keeps the templates when no API key is set', async () => {
    const result = await writeHooks([movers]);
    expect(result).toMatchObject({ rewritten: 0, skipped: 'ANTHROPIC_API_KEY not set' });
    expect(result.drafts[0]).toBe(movers);
  });

  it('swaps in a checked rewrite and keeps the reply, card and template', async () => {
    const text = 'Only 13 of 39 nuclear names closed higher.\n\n$EU −6.1%\n$CEG −4.0%\n\nDip, or the start of something?';
    const { client, create } = fakeClient([{ id: 0, text }]);
    const result = await writeHooks([plug, movers], { client, headlines: [{ title: 'Uranium slips', source: 'Reuters' }] });

    expect(result.rewritten).toBe(1);
    expect(result.drafts[0]).toBe(plug); // no card: never sent to Claude
    expect(result.drafts[1]).toMatchObject({ text, template: movers.text, reply: movers.reply, card: movers.card });
    const request = create.mock.calls[0][0];
    expect(request).toMatchObject({ model: 'claude-opus-5-5', fallbacks: 'default', betas: ['server-side-fallback-2026-07-01'] });
    expect(request.messages[0].content).toContain('Uranium slips (Reuters)');
  });

  it('falls back to the template when a rewrite invents a number', async () => {
    const { client } = fakeClient([{ id: 0, text: '$EU down 9.9%. Brutal.' }]);
    const result = await writeHooks([movers], { client });
    expect(result.rewritten).toBe(0);
    expect(result.rejected[0]).toMatchObject({ kind: 'Market movers' });
    expect(result.drafts[0].text).toBe(movers.text);
  });

  it('never throws on API errors or refusals', async () => {
    const failing = { beta: { messages: { create: vi.fn(async () => { throw new Error('boom'); }) } } };
    expect((await writeHooks([movers], { client: failing })).drafts[0].text).toBe(movers.text);
    const { client } = fakeClient([], { stop_reason: 'refusal', content: [] });
    expect(await writeHooks([movers], { client })).toMatchObject({ rewritten: 0, error: 'refused' });
  });

  it('lists every draft and headline in the prompt', () => {
    const prompt = buildPrompt([movers], []);
    expect(prompt).toContain('<draft id="0" kind="Market movers">');
    expect(prompt).toContain('(none today)');
  });
});
