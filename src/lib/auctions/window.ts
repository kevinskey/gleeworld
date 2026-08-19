// How an auction's open/close window reads on a card.
//
// The subtlety worth the separate module: some sources publish a clock time
// and some publish only a date. Date-only rows are stored at 12:00Z so the
// calendar day survives every US timezone, and rendering that placeholder
// back as a time invents information the house never gave. So the flag
// decides the format, and a date-only sale simply shows dates.

export interface AuctionWindow {
  opens_at: string | null;
  closes_at: string | null;
  times_are_estimated?: boolean;
}

const DATE_ONLY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
const WITH_TIME: Intl.DateTimeFormatOptions = {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
};

function fmt(iso: string, estimated: boolean): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, estimated ? DATE_ONLY : WITH_TIME);
}

export function formatAuctionWindow(a: AuctionWindow): string {
  const estimated = a.times_are_estimated === true;
  const opens = a.opens_at ? fmt(a.opens_at, estimated) : null;
  const closes = a.closes_at ? fmt(a.closes_at, estimated) : null;

  if (opens && closes) return `Opens ${opens} · closes ${closes}`;
  if (opens) return `Opens ${opens}`;
  if (closes) return `Closes ${closes}`;
  return 'Dates not announced yet';
}
