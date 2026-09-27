import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const accessContext = {
  accessState: 'logged_out',
  getAccessToken: vi.fn(),
  isConfigured: true,
  membership: null,
  membershipError: '',
  refreshMembership: vi.fn(),
  sendOtp: vi.fn(),
  signOut: vi.fn(),
  user: null,
  verifyOtp: vi.fn(),
};

const createCheckoutSession = vi.fn();
const createPortalSession = vi.fn();

vi.mock('./context.jsx', () => ({
  useTerminalAccess: () => accessContext,
}));

vi.mock('../../services/billingAPI.js', () => ({
  createCheckoutSession,
  createPortalSession,
}));

const { default: TerminalAccessPage } = await import('./TerminalAccessPage.jsx');

describe('TerminalAccessPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    accessContext.accessState = 'logged_out';
    accessContext.getAccessToken.mockReset();
    accessContext.isConfigured = true;
    accessContext.membership = null;
    accessContext.membershipError = '';
    accessContext.refreshMembership.mockReset();
    accessContext.sendOtp.mockReset();
    accessContext.signOut.mockReset();
    accessContext.user = null;
    accessContext.verifyOtp.mockReset();
    createCheckoutSession.mockReset();
    createPortalSession.mockReset();
  });

  it('starts the email OTP flow', async () => {
    const user = userEvent.setup();
    accessContext.sendOtp.mockResolvedValue('person@example.com');

    render(<TerminalAccessPage onExitTerminal={vi.fn()} />);

    await user.type(screen.getByLabelText(/Work email/i), 'Person@Example.com');
    await user.click(screen.getByRole('button', { name: /Continue with email/i }));

    expect(accessContext.sendOtp).toHaveBeenCalledWith('Person@Example.com');
    expect(await screen.findByText(/A login code was sent to person@example.com\./i)).toBeInTheDocument();
  });

  it('requests checkout for a signed-in user', async () => {
    const user = userEvent.setup();

    accessContext.accessState = 'inactive';
    accessContext.user = { email: 'person@example.com' };
    accessContext.getAccessToken.mockResolvedValue('jwt-token');
    createCheckoutSession.mockImplementation(() => new Promise(() => {}));

    render(<TerminalAccessPage onExitTerminal={vi.fn()} />);

    // First-time subscriber: offered the free trial.
    await user.click(screen.getByRole('button', { name: /Start 7-day free trial/i }));

    await waitFor(() => {
      expect(createCheckoutSession).toHaveBeenCalledWith('year', 'jwt-token');
    });
    expect(screen.getByRole('button', { name: /Opening secure checkout/i })).toBeInTheDocument();
  });

  it('offers reactivation (no trial) to a returning subscriber on the monthly plan', async () => {
    const user = userEvent.setup();

    accessContext.accessState = 'inactive';
    accessContext.membership = { stripe_subscription_id: 'sub_old', subscription_status: 'canceled', terminal_access: false };
    accessContext.user = { email: 'person@example.com' };
    accessContext.getAccessToken.mockResolvedValue('jwt-token');
    createCheckoutSession.mockImplementation(() => new Promise(() => {}));

    render(<TerminalAccessPage onExitTerminal={vi.fn()} />);

    await user.click(screen.getByRole('radio', { name: /Monthly/i }));
    expect(screen.queryByRole('button', { name: /free trial/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Reactivate — \$19\/mo/i }));

    await waitFor(() => {
      expect(createCheckoutSession).toHaveBeenCalledWith('month', 'jwt-token');
    });
  });
});
