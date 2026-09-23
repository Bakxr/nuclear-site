import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockReq, createMockRes } from '../tests/serverTestUtils.js';

const mockCreateClient = vi.fn();
const ensureAllowedOrigin = vi.fn(() => true);
const getClientAddress = vi.fn(() => '127.0.0.1');
const checkRateLimit = vi.fn(async () => true);

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

vi.mock('./_lib/http.js', () => ({
  ensureAllowedOrigin,
  getClientAddress,
}));

vi.mock('./_lib/rateLimit.js', () => ({
  checkRateLimit,
}));

const upsert = vi.fn();

function mockSupabaseClient() {
  upsert.mockReset();
  upsert.mockResolvedValue({ error: null });
  mockCreateClient.mockReset();
  mockCreateClient.mockReturnValue({ from: () => ({ upsert }) });
}

const { default: handler } = await import('./subscribe.js');

describe('/api/subscribe', () => {
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'service-key';
    delete process.env.SUPABASE_ANON_KEY;
    ensureAllowedOrigin.mockReturnValue(true);
    checkRateLimit.mockResolvedValue(true);
    mockSupabaseClient();
  });

  it('writes with the service key, never the anon key', async () => {
    const req = createMockReq({ method: 'POST', body: { email: 'Person@Example.com' } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-key',
    );
    expect(upsert).toHaveBeenCalledWith(
      { email: 'person@example.com', active: true },
      { onConflict: 'email' },
    );
  });

  it('returns 500 when the service key is not configured', async () => {
    delete process.env.SUPABASE_SERVICE_KEY;
    const req = createMockReq({ method: 'POST', body: { email: 'a@b.co' } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('rejects invalid emails and honeypot submissions', async () => {
    const bad = createMockReq({ method: 'POST', body: { email: 'not-an-email' } });
    const badRes = createMockRes();
    await handler(bad, badRes);
    expect(badRes.statusCode).toBe(400);

    const bot = createMockReq({ method: 'POST', body: { email: 'a@b.co', website: 'x' } });
    const botRes = createMockRes();
    await handler(bot, botRes);
    expect(botRes.statusCode).toBe(400);

    expect(upsert).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    checkRateLimit.mockResolvedValue(false);
    const req = createMockReq({ method: 'POST', body: { email: 'a@b.co' } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(429);
    expect(upsert).not.toHaveBeenCalled();
  });
});
