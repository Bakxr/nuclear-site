import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockRes } from '../../tests/serverTestUtils.js';

const getStripe = vi.fn();
const hasRecordedWebhookEvent = vi.fn();
const recordWebhookEvent = vi.fn();
const syncMembershipFromSubscription = vi.fn();
const syncMembershipFromSubscriptionId = vi.fn();
const readRawBody = vi.fn();
const setNoStore = vi.fn();
const sendEmail = vi.fn();

vi.mock('../_lib/billing.js', () => ({
  getStripe,
  hasRecordedWebhookEvent,
  recordWebhookEvent,
  syncMembershipFromSubscription,
  syncMembershipFromSubscriptionId,
}));

vi.mock('../_lib/dispatch.js', () => ({
  sendEmail,
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
    sendEmail.mockReset();
    delete process.env.OWNER_EMAIL;
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

  it('emails the owner when a new subscription is created', async () => {
    process.env.OWNER_EMAIL = 'owner@example.com';
    const event = {
      id: 'evt_sub_created',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_123',
          status: 'active',
          customer: { id: 'cus_123', email: 'buyer@example.com' },
          metadata: {},
          items: {
            data: [
              { price: { id: 'price_123', unit_amount: 1900, currency: 'usd', recurring: { interval: 'month' } } },
            ],
          },
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
    sendEmail.mockResolvedValue({ ok: true, id: 'msg_1' });

    const req = {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const payload = sendEmail.mock.calls[0][0];
    expect(payload.to).toBe('owner@example.com');
    expect(payload.subject).toContain('buyer@example.com');
    expect(payload.text).toContain('19.00 USD');
    expect(payload.text).toContain('month');
    expect(syncMembershipFromSubscription).toHaveBeenCalledWith(event.data.object);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  it('skips the owner email silently when OWNER_EMAIL is not set', async () => {
    const event = {
      id: 'evt_sub_created_noconfig',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_123',
          status: 'active',
          customer: 'cus_123',
          metadata: {},
          items: { data: [] },
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

    expect(sendEmail).not.toHaveBeenCalled();
    expect(syncMembershipFromSubscription).toHaveBeenCalledWith(event.data.object);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  it('still returns 200 when the owner email send fails', async () => {
    process.env.OWNER_EMAIL = 'owner@example.com';
    const event = {
      id: 'evt_sub_created_fail',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_123',
          status: 'active',
          customer: { id: 'cus_123', email: 'buyer@example.com' },
          metadata: {},
          items: { data: [] },
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
    sendEmail.mockRejectedValue(new Error('Resend down'));

    const req = {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});
