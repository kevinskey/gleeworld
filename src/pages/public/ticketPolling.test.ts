// The buyer's ticket page polls while Stripe confirms the card. Getting the
// stop condition wrong is invisible in the UI — the page looks fine either
// way — so it is pinned here.
import { describe, it, expect } from 'vitest';
import { ticketPollInterval } from './ticketPolling';

const withStatus = (status: string) =>
  ({ order: { status }, tickets: [], event: null }) as never;

describe('ticketPollInterval', () => {
  it('polls every 2s while the payment is still pending', () => {
    expect(ticketPollInterval(withStatus('pending'))).toBe(2000);
  });

  it.each(['paid', 'comp', 'refunded', 'failed'])('stops once the order is %s', (status) => {
    expect(ticketPollInterval(withStatus(status))).toBe(false);
  });

  it('stops on a bad or expired link instead of polling forever', () => {
    // The regression: queryFn returns null when the edge function errors or
    // reports not_found, and the old predicate read `if (!data?.order) return
    // 2000`. A wrong link therefore hit the function every 2 seconds for as
    // long as the tab stayed open — an unauthenticated endpoint being called
    // 30 times a minute by anyone who mistypes a URL.
    expect(ticketPollInterval(null)).toBe(false);
    expect(ticketPollInterval(undefined)).toBe(false);
    expect(ticketPollInterval({ order: undefined } as never)).toBe(false);
  });
});
