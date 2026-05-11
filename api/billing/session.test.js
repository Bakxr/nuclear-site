import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockReq, createMockRes } from '../../tests/serverTestUtils.js';

const createCheckoutSession = vi.fn();
const createBillingPortalSession = vi.fn();
const requireAuthenticatedUser = vi.fn();
const ensureAllowedOrigin = vi.fn(() => true);
const setNoStore = vi.fn();

vi.mock('../_lib/billing.js', () => ({
  createCheckoutSession,
  createBillingPortalSession,
}));

vi.mock('../_lib/auth.js', () => ({
  requireAuthenticatedUser,
}));

vi.mock('../_lib/http.js', () => ({
  ensureAllowedOrigin,
  setNoStore,
}));

const { default: handler } = await import('./session.js');

describe('/api/billing/session', () => {
  beforeEach(() => {
    createCheckoutSession.mockReset();
    createBillingPortalSession.mockReset();
    requireAuthenticatedUser.mockReset();
    ensureAllowedOrigin.mockReturnValue(true);
    setNoStore.mockReset();
  });

  it('creates a checkout session for an authenticated user', async () => {
    requireAuthenticatedUser.mockResolvedValue({
      user: { id: 'user_123', email: 'person@example.com' },
    });
    createCheckoutSession.mockResolvedValue({
      id: 'cs_123',
      url: 'https://checkout.example/session',
    });

    const req = createMockReq({
      method: 'POST',
      body: { action: 'checkout', interval: 'month' },
      headers: { host: 'example.com' },
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(createCheckoutSession).toHaveBeenCalledWith({
      interval: 'month',
      userId: 'user_123',
      email: 'person@example.com',
      siteUrl: 'https://example.com',
    });
    expect(res.body).toEqual({
      sessionId: 'cs_123',
      url: 'https://checkout.example/session',
    });
  });
});
