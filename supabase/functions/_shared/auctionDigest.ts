// Digest scheduling and formatting for saved-search alerts. Pure logic, so
// the cadence rules and the email body are both under test.

// A fixed-time daily cron drifts by a few seconds each run. Requiring a full
// 24 hours would make one day's digest land a moment "too early" and get
// skipped entirely, so the window opens a little short. Same reasoning as the
// fee-reminder job's 20-hour dedupe.
const WINDOW_HOURS: Record<string, number> = {
  instant: 0,
  daily: 20,
  weekly: 24 * 6.5,
};

export function isSearchDue(
  frequency: string,
  lastNotifiedAt: string | null | undefined,
  now: Date,
): boolean {
  // An unknown frequency falls back to daily rather than silently never
  // sending — a saved search that goes quiet forever is the worse failure.
  const windowHours = WINDOW_HOURS[frequency] ?? WINDOW_HOURS.daily;
  if (windowHours === 0) return true;
  if (!lastNotifiedAt) return true;

  const last = new Date(lastNotifiedAt).getTime();
  if (Number.isNaN(last)) return true;

  return now.getTime() - last >= windowHours * 3600_000;
}

export interface DigestMatch {
  lot_id: string;
  title: string;
  auction_title: string | null;
  source_name: string | null;
  closes_at: string | null;
  current_bid_cents: number | null;
  score: number;
  url: string | null;
}

// Listing text comes from third-party auction catalogs and lands in an email
// body — it is escaped, always.
function esc(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(cents: number | null): string {
  if (cents === null || cents === undefined) return 'No bids yet';
  return '$' + Math.round(cents / 100).toLocaleString('en-US');
}

function closing(iso: string | null): string {
  if (!iso) return 'Closing date not stated';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Closing date not stated';
  return 'Closes ' + d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

export function buildDigestHtml(searchName: string, matches: DigestMatch[]): string {
  const rows = matches.map((m) => {
    const heading = m.url
      ? `<a href="${esc(m.url)}" style="color:#1a4fa0;text-decoration:none;">${esc(m.title)}</a>`
      : esc(m.title);

    const provenance = [m.source_name, m.auction_title].filter(Boolean).map(esc).join(' — ');

    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e5e5;">
          <div style="font-size:15px;font-weight:600;">${heading}</div>
          ${provenance ? `<div style="font-size:13px;color:#666;">${provenance}</div>` : ''}
          <div style="font-size:13px;color:#666;">
            ${esc(money(m.current_bid_cents))} · ${esc(closing(m.closes_at))}
          </div>
        </td>
      </tr>`;
  }).join('');

  const count = matches.length;
  const plural = count === 1 ? 'lot' : 'lots';

  return `<!doctype html>
<html><body style="margin:0;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;">
  <h1 style="font-size:18px;margin:0 0 4px;">${count} new ${plural} matched your saved search</h1>
  <p style="font-size:14px;color:#555;margin:0 0 16px;">${esc(searchName)}</p>
  <table style="width:100%;border-collapse:collapse;">${rows}</table>
  <p style="font-size:12px;color:#777;margin-top:24px;line-height:1.5;">
    Bids and closing times are captured from each auction house and change constantly.
    Everything here is an estimate for planning only — it is not a quote, and it says
    nothing about the condition of any machine. Confirm every detail with the auction
    house before you bid.
  </p>
</body></html>`;
}
