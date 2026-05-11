import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

    render(<TerminalAccessPage isMobileViewport={false} onExitTerminal={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/Email address/i), 'Person@Example.com');
    await user.click(screen.getByRole('button', { name: /Send login code/i }));

    expect(accessContext.sendOtp).toHaveBeenCalledWith('Person@Example.com');
    expect(await screen.findByText(/A login code was sent to person@example.com\./i)).toBeInTheDocument();
  });

  it('requests checkout for a signed-in user', async () => {
    const user = userEvent.setup();

    accessContext.accessState = 'inactive';
    accessContext.user = { email: 'person@example.com' };
    accessContext.getAccessToken.mockResolvedValue('jwt-token');
    createCheckoutSession.mockImplementation(() => new Promise(() => {}));

    render(<TerminalAccessPage isMobileViewport={false} onExitTerminal={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Continue to Stripe Checkout/i }));

    await waitFor(() => {
      expect(createCheckoutSession).toHaveBeenCalledWith('year', 'jwt-token');
    });
    expect(screen.getByRole('button', { name: /Opening checkout/i })).toBeInTheDocument();
  });
});
