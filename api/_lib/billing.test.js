import { beforeEach, describe, expect, it, vi } from 'vitest';

let membershipRow = null;
const upsert = vi.fn();

function fakeClient() {
  return {
    from() {
      return {
        select() {
          return { eq: () => ({ maybeSingle: async () => ({ data: membershipRow, error: null }) }) };
        },
        upsert(row) {
          upsert(row);
          return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
        },
      };
    },
  };
}

vi.mock('./supabase.js', () => ({
  getSupabaseServiceClient: () => fakeClient(),
}));

const { syncMembershipFromSubscription } = await import('./billing.js');

function subscription(overrides = {}) {
  return {
    id: 'sub_new',
    status: 'active',
    customer: { id: 'cus_1', email: 'member@example.com', metadata: { user_id: 'user_1' } },
    metadata: { user_id: 'user_1' },
    items: { data: [{ current_period_end: 1767225600, price: { id: 'price_m', recurring: { interval: 'month' } } }] },
    cancel_at_period_end: false,
    ...overrides,
  };
}

describe('syncMembershipFromSubscription', () => {
  beforeEach(() => {
    membershipRow = null;
    upsert.mockReset();
  });

  it('grants access for an active subscription and reads period end from the item', async () => {
    await syncMembershipFromSubscription(subscription());

    expect(upsert).toHaveBeenCalledTimes(1);
    const row = upsert.mock.calls[0][0];
    expect(row).toMatchObject({
      user_id: 'user_1',
      stripe_subscription_id: 'sub_new',
      terminal_access: true,
      plan_interval: 'month',
      current_period_end: new Date(1767225600 * 1000).toISOString(),
    });
  });

  it('revokes access when the current subscription is cancelled', async () => {
    membershipRow = { user_id: 'user_1', terminal_access: true, stripe_subscription_id: 'sub_new' };

    await syncMembershipFromSubscription(subscription({ status: 'canceled' }));

    expect(upsert.mock.calls[0][0]).toMatchObject({ terminal_access: false, subscription_status: 'canceled' });
  });

  it('ignores cancellation of a superseded subscription', async () => {
    membershipRow = { user_id: 'user_1', terminal_access: true, stripe_subscription_id: 'sub_new' };

    const result = await syncMembershipFromSubscription(subscription({ id: 'sub_old', status: 'canceled' }));

    expect(upsert).not.toHaveBeenCalled();
    expect(result).toBe(membershipRow);
  });
});
