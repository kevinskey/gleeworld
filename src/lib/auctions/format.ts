// Display formatting shared across the Auctions views.

// "No bids yet" is meaningfully different from "$0" — an opening lot with no
// bids is still a candidate, and showing $0 reads as a free machine.
export function formatBid(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return 'No bids yet';
  return '$' + Math.round(cents / 100).toLocaleString();
}

export function formatCloses(iso: string | null | undefined): string {
  if (!iso) return 'Closing date not stated';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Closing date not stated';
  return 'Closes ' + d.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
