import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockReq, createMockRes } from '../../tests/serverTestUtils.js';

const ensureAllowedOrigin = vi.fn(() => true);
const setNoStore = vi.fn();
const requireTerminalAccess = vi.fn();
const getTerminalSnapshot = vi.fn();

vi.mock('../_lib/http.js', () => ({
  ensureAllowedOrigin,
  setNoStore,
}));

vi.mock('../_lib/auth.js', () => ({
  requireTerminalAccess,
}));

vi.mock('../_lib/terminalSnapshot.js', () => ({
  getTerminalSnapshot,
}));

const { default: handler } = await import('./snapshot.js');

describe('/api/terminal/snapshot', () => {
  beforeEach(() => {
    ensureAllowedOrigin.mockReturnValue(true);
    setNoStore.mockReset();
    requireTerminalAccess.mockReset();
    getTerminalSnapshot.mockReset();
  });

  it('blocks users without terminal access', async () => {
    requireTerminalAccess.mockImplementation(async (_req, res) => {
      res.status(403).json({ error: 'Terminal access required.' });
      return null;
    });

    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Terminal access required.' });
  });

  it('returns the secure terminal snapshot for allowed users', async () => {
    requireTerminalAccess.mockResolvedValue({
      user: { id: 'user_123' },
      membership: { terminal_access: true },
    });
    getTerminalSnapshot.mockResolvedValue({ generatedAt: '2026-03-18T12:00:00.000Z' });

    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(getTerminalSnapshot).toHaveBeenCalled();
    expect(res.body).toEqual({ generatedAt: '2026-03-18T12:00:00.000Z' });
  });
});
