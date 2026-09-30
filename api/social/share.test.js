import { beforeEach, describe, expect, it } from 'vitest';
import { createMockReq, createMockRes } from '../../tests/serverTestUtils.js';
import { shareUrl } from '../_lib/cardLinks.js';
import handler, { renderSharePage } from './share.js';

const draft = {
  kind: 'Market odds',
  text: 'Polymarket says 6%: "Iran </script><b>deal</b>?"',
  reply: 'Tracked daily:\n\nhttps://thenuclearpulse.com/terminal?utm_source=x',
  card: { type: 'odds', source: 'Polymarket', question: 'Iran deal?', pct: 6 },
};

describe('/api/social/share', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
  });

  it('serves the posting page for a signed link', async () => {
    const url = new URL(shareUrl('https://thenuclearpulse.com', draft));
    const res = createMockRes();
    await handler(createMockReq({ method: 'GET', query: { d: url.searchParams.get('d'), s: url.searchParams.get('s') } }), res);
    expect(res.statusCode).toBe(200);
  });

  it('refuses unsigned or tampered links', async () => {
    const res = createMockRes();
    await handler(createMockReq({ method: 'GET', query: { d: 'abc', s: 'nope' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('keeps post text from breaking out of the page script', () => {
    const html = renderSharePage(draft);
    expect(html).not.toContain('</script><b>');
    expect(html).toContain('\\u003c/script>');
    expect(html).toContain('/api/social/card?d=');
    expect(html).toContain('https://x.com/intent/post?text=');
    expect(html).toContain('noindex');
  });
});
