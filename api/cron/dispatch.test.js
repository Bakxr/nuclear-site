import { beforeEach, describe, expect, it, vi } from 'vitest';

// Minimal Supabase fake: table rows in memory, with the query shapes the cron uses.
let tables;
const logInserts = [];

function query(table) {
  let rows = [...(tables[table] || [])];
  const q = {
    select: () => q,
    eq: (field, value) => { rows = rows.filter((r) => r[field] === value); return q; },
    in: (field, values) => { rows = rows.filter((r) => values.includes(r[field])); return q; },
    limit: () => q,
    insert: async (payload) => { logInserts.push(...[].concat(payload)); return { error: null }; },
    then: (resolve) => resolve({ data: rows, error: null }),
  };
  return q;
}

vi.mock('../_lib/supabase.js', () => ({ getSupabaseServiceClient: () => ({ from: query }) }));
vi.mock('../_lib/terminalSnapshot.js', () => ({ getTerminalSnapshot: async () => ({ entities: {} }) }));

const batchSend = vi.fn();
vi.mock('resend', () => ({
  Resend: vi.fn(function Resend() {
    return { batch: { send: batchSend }, emails: { send: vi.fn() } };
  }),
}));

process.env.RESEND_API_KEY = 're_test';
process.env.NEWSLETTER_FROM = 'Nuclear Pulse <hello@example.com>';
process.env.CRON_SECRET = 'secret';

const { default: handler } = await import('./dispatch.js');

function run(job) {
  const res = {
    statusCode: 0,
    body: null,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  return handler({ headers: { authorization: 'Bearer secret' }, query: { job } }, res).then(() => res);
}

function subscribers(n) {
  return Array.from({ length: n }, (_, i) => ({ email: `reader${i}@example.com`, active: true }));
}

describe('weekly newsletter batching', () => {
  beforeEach(() => {
    logInserts.length = 0;
    batchSend.mockReset().mockImplementation(async (payload) => ({ data: { data: payload.map((_, i) => ({ id: `e${i}` })) }, error: null }));
  });

  it('sends 250 subscribers in batches of 100', async () => {
    tables = { subscribers: subscribers(250), terminal_dispatch_log: [] };
    const res = await run('weekly');

    expect(batchSend).toHaveBeenCalledTimes(3);
    expect(batchSend.mock.calls.map(([payload]) => payload.length)).toEqual([100, 100, 50]);
    expect(batchSend.mock.calls[0][0][0]).toMatchObject({ from: 'Nuclear Pulse <hello@example.com>', to: 'reader0@example.com' });
    expect(batchSend.mock.calls[0][1]).toMatchObject({ idempotencyKey: expect.stringContaining('weekly-batch-0') });
    expect(res.body).toMatchObject({ sent: 250, failed: 0, skipped: 0 });
    expect(logInserts).toHaveLength(250);
  });

  it('skips subscribers already sent this week', async () => {
    const subs = subscribers(3);
    tables = { subscribers: subs, terminal_dispatch_log: [] };
    await run('weekly');
    const firstKey = logInserts[0].dispatch_key;

    logInserts.length = 0;
    batchSend.mockClear();
    tables = { subscribers: subs, terminal_dispatch_log: [{ dispatch_key: firstKey }] };
    const res = await run('weekly');

    expect(batchSend.mock.calls[0][0]).toHaveLength(2);
    expect(res.body).toMatchObject({ sent: 2, skipped: 1 });
  });

  it('does not log a failed batch as sent, so the next run retries it', async () => {
    tables = { subscribers: subscribers(150), terminal_dispatch_log: [] };
    batchSend
      .mockResolvedValueOnce({ data: null, error: { message: 'rate limited' } })
      .mockImplementationOnce(async (payload) => ({ data: { data: payload.map(() => ({ id: 'x' })) }, error: null }));

    const res = await run('weekly');

    expect(res.body).toMatchObject({ sent: 50, failed: 100 });
    expect(logInserts).toHaveLength(50);
  });
});
