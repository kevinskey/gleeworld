// Polling policy for the buyer's ticket page. Its own module so the page
// file stays component-only (react-refresh) and this stays unit-testable.

export interface PollableOrder {
  order?: { status?: string } | null;
}

/**
 * How long to wait before asking again, or false to stop.
 *
 * Poll ONLY while the order is pending. A missing order means the link is
 * wrong or expired, and that never resolves by asking again — this used to
 * return 2000 for that case, so a bad link hammered the (unauthenticated)
 * edge function every 2 seconds for as long as the tab stayed open.
 */
export function ticketPollInterval(data: PollableOrder | null | undefined): number | false {
  return data?.order?.status === 'pending' ? 2000 : false;
}
