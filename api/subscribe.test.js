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

vi.mock('./_lib/dispatch.js', () => ({
  sendEmail,
}));

const upsert = vi.fn();
const sendEmail = vi.fn(async () => ({ ok: true }));
let existingRow = null;

function mockSupabaseClient() {
  upsert.mockReset();
  upsert.mockResolvedValue({ error: null });
  existingRow = null;
  mockCreateClient.mockReset();
  mockCreateClient.mockReturnValue({
    from: () => ({
      upsert,
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existingRow, error: null }) }) }),
    }),
  });
}

const { default: handler } = await import('./subscribe.js');

describe('/api/subscribe', () => {
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'service-key';
    process.env.RESEND_API_KEY = 're_test';
    process.env.UNSUBSCRIBE_SECRET = 'test-secret';
    delete process.env.SUPABASE_ANON_KEY;
    sendEmail.mockClear();
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
      expect.objectContaining({ email: 'person@example.com', active: true }),
      { onConflict: 'email' },
    );
  });

  it('stores cleaned first-touch attribution for a new subscriber', async () => {
    const attribution = { source: 'X', campaign: 'market-movers', referrer: 't.co', landing: '/uranium-stocks', surface: 'seo-uranium-stocks<script>', extra: 'ignored' };
    await handler(createMockReq({ method: 'POST', body: { email: 'a@b.co', attribution } }), createMockRes());

    expect(upsert.mock.calls[0][0]).toEqual({
      email: 'a@b.co', active: true,
      source: 'x', campaign: 'market-movers', referrer: 't.co', landing: '/uranium-stocks', surface: 'seo-uranium-stocksscript',
    });
  });

  it('keeps the original attribution when someone re-subscribes', async () => {
    existingRow = { active: false };
    await handler(createMockReq({ method: 'POST', body: { email: 'a@b.co', attribution: { source: 'reddit' } } }), createMockRes());

    expect(upsert.mock.calls[0][0]).toEqual({ email: 'a@b.co', active: true });
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

  it('sends a welcome email to a new subscriber', async () => {
    const res = createMockRes();
    await handler(createMockReq({ method: 'POST', body: { email: 'new@example.com' } }), res);

    expect(res.statusCode).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0]).toMatchObject({
      to: 'new@example.com',
      subject: 'Welcome to Nuclear Pulse',
      text: expect.stringContaining('Hit reply'),
      headers: expect.objectContaining({ 'List-Unsubscribe': expect.any(String) }),
    });
  });

  it('does not re-send the welcome email to someone already subscribed', async () => {
    existingRow = { active: true };
    const res = createMockRes();
    await handler(createMockReq({ method: 'POST', body: { email: 'old@example.com' } }), res);

    expect(res.statusCode).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('still subscribes when the welcome email fails', async () => {
    sendEmail.mockResolvedValueOnce({ ok: false, error: 'resend down' });
    const res = createMockRes();
    await handler(createMockReq({ method: 'POST', body: { email: 'new2@example.com' } }), res);

    expect(res.statusCode).toBe(200);
    expect(upsert).toHaveBeenCalled();
  });
});
