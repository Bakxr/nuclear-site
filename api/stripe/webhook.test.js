import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockRes } from '../../tests/serverTestUtils.js';

const getStripe = vi.fn();
const hasRecordedWebhookEvent = vi.fn();
const recordWebhookEvent = vi.fn();
const syncMembershipFromSubscription = vi.fn();
const syncMembershipFromSubscriptionId = vi.fn();
const readRawBody = vi.fn();
const setNoStore = vi.fn();

vi.mock('../_lib/billing.js', () => ({
  getStripe,
  hasRecordedWebhookEvent,
  recordWebhookEvent,
  syncMembershipFromSubscription,
  syncMembershipFromSubscriptionId,
}));

vi.mock('../_lib/http.js', () => ({
  readRawBody,
  setNoStore,
}));

const { default: handler } = await import('./webhook.js');

describe('/api/stripe/webhook', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    getStripe.mockReset();
    hasRecordedWebhookEvent.mockReset();
    recordWebhookEvent.mockReset();
    syncMembershipFromSubscription.mockReset();
    syncMembershipFromSubscriptionId.mockReset();
    readRawBody.mockReset();
    setNoStore.mockReset();
  });

  it('returns early for duplicate webhook events', async () => {
    const event = {
      id: 'evt_duplicate',
      type: 'checkout.session.completed',
      data: { object: { mode: 'subscription', subscription: 'sub_123' } },
    };

    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => event),
      },
    });
    readRawBody.mockResolvedValue(Buffer.from('payload'));
    hasRecordedWebhookEvent.mockResolvedValue(true);

    const req = {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(syncMembershipFromSubscriptionId).not.toHaveBeenCalled();
    expect(recordWebhookEvent).not.toHaveBeenCalled();
    expect(res.body).toEqual({ received: true, duplicate: true });
  });

  it('syncs and records a new checkout completion event', async () => {
    const event = {
      id: 'evt_new',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test',
          mode: 'subscription',
          subscription: 'sub_123',
          client_reference_id: 'user_123',
          metadata: { email: 'person@example.com' },
          customer_details: { email: 'person@example.com' },
        },
      },
    };

    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => event),
      },
    });
    readRawBody.mockResolvedValue(Buffer.from('payload'));
    hasRecordedWebhookEvent.mockResolvedValue(false);
    recordWebhookEvent.mockResolvedValue(true);

    const req = {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(syncMembershipFromSubscriptionId).toHaveBeenCalledWith('sub_123', {
      userId: 'user_123',
      email: 'person@example.com',
      checkoutSessionId: 'cs_test',
    });
    expect(recordWebhookEvent).toHaveBeenCalledWith(event);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});
