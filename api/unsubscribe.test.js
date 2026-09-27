import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockReq, createMockRes } from '../tests/serverTestUtils.js';

const upsert = vi.fn(async () => ({ error: null }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => ({ upsert }) }),
}));

process.env.UNSUBSCRIBE_SECRET = 'test-secret';
const { createUnsubscribeToken } = await import('./_lib/unsubscribe.js');
const { default: handler } = await import('./unsubscribe.js');

describe('/api/unsubscribe', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'service';
    upsert.mockClear();
  });

  it('GET only renders a confirmation form (safe against link prefetchers)', async () => {
    const token = createUnsubscribeToken('Reader@Example.com');
    const res = createMockRes();

    await handler(createMockReq({ method: 'GET', query: { token } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<form method="POST"');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('POST records the opt-out, creating the row if needed', async () => {
    const token = createUnsubscribeToken('Reader@Example.com');
    const res = createMockRes();

    await handler(createMockReq({ method: 'POST', query: { token }, body: { 'List-Unsubscribe': 'One-Click' } }), res);

    expect(res.statusCode).toBe(200);
    expect(upsert).toHaveBeenCalledWith({ email: 'reader@example.com', active: false }, { onConflict: 'email' });
  });

  it('rejects a tampered token', async () => {
    const token = createUnsubscribeToken('reader@example.com').replace(/.$/, (c) => (c === '0' ? '1' : '0'));
    const res = createMockRes();

    await handler(createMockReq({ method: 'POST', query: { token } }), res);

    expect(res.statusCode).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });
});
