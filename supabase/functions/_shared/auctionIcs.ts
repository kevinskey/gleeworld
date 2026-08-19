// RFC 5545 calendar building for the Auctions module.
//
// Pure string work, no Deno APIs and no Supabase client, so the auctions-ics
// edge function and the vitest suite both import this same file — the folding
// and escaping rules are fiddly enough to be worth having exactly one copy.
// Modelled on the ical-feed function's helpers.

// Wrap long property lines per RFC 5545 §3.1 (folding at 75 octets).
export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const take = i === 0 ? 75 : 74;
    out.push((i === 0 ? '' : ' ') + line.slice(i, i + take));
    i += take;
  }
  return out.join('\r\n');
}

// iCal text escaping — backslash, semicolon, comma, newline.
export function escapeIcsText(s: string | null | undefined): string {
  if (!s) return '';
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

const pad = (n: number) => String(n).padStart(2, '0');

// ISO → iCal UTC datetime (20260914T183000Z).
export function toIcsUtc(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

// ISO → iCal DATE value (20260911), for all-day entries.
function toIcsDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.getUTCFullYear().toString() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
}

export interface IcsAuction {
  id: string;
  title: string;
  location_city: string | null;
  location_state: string | null;
  opens_at: string | null;
  closes_at: string | null;
  catalog_url: string | null;
  catalog_released_at: string | null;
  status: string;
  updated_at: string | null;
  source_name: string | null;
}

export interface IcsOptions {
  name: string;
  now: string;
}

const HOUR_MS = 60 * 60 * 1000;

function locationOf(a: IcsAuction): string | null {
  const parts = [a.location_city, a.location_state].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

// The sale itself. Undated auctions are skipped: a calendar entry with no
// date is not something a calendar client can show.
function saleEvent(a: IcsAuction, stamp: string): string[] {
  const start = a.opens_at ?? a.closes_at;
  if (!start) return [];

  // A sale with only one known date still needs an end; an hour reads as a
  // marker rather than implying a duration we do not know.
  const end = a.opens_at && a.closes_at
    ? a.closes_at
    : new Date(new Date(start).getTime() + HOUR_MS).toISOString();

  const summary = a.source_name ? `${a.title} (${a.source_name})` : a.title;
  const location = locationOf(a);

  const lines = [
    'BEGIN:VEVENT',
    `UID:auction-${a.id}@gleeworld.org`,
    `DTSTAMP:${toIcsUtc(stamp)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
  ];
  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`);
  if (a.catalog_url) lines.push(`URL:${a.catalog_url}`);
  if (a.status === 'cancelled') lines.push('STATUS:CANCELLED');
  if (a.updated_at) lines.push(`LAST-MODIFIED:${toIcsUtc(a.updated_at)}`);
  lines.push('END:VEVENT');
  return lines;
}

// The catalog drop gets its own all-day entry, because for several houses
// that date — not the close date — is the one worth acting on.
function catalogEvent(a: IcsAuction, nowMs: number, stamp: string): string[] {
  if (!a.catalog_released_at) return [];
  const date = toIcsDate(a.catalog_released_at);
  if (!date) return [];

  const posted = new Date(a.catalog_released_at).getTime() <= nowMs;
  const summary = `${posted ? 'Catalog posted' : 'Catalog expected'}: ${a.title}`;

  const lines = [
    'BEGIN:VEVENT',
    `UID:auction-catalog-${a.id}@gleeworld.org`,
    `DTSTAMP:${toIcsUtc(stamp)}`,
    `DTSTART;VALUE=DATE:${date}`,
    `SUMMARY:${escapeIcsText(summary)}`,
  ];
  if (a.catalog_url) lines.push(`URL:${a.catalog_url}`);
  if (a.status === 'cancelled') lines.push('STATUS:CANCELLED');
  lines.push('END:VEVENT');
  return lines;
}

export function buildAuctionCalendar(auctions: IcsAuction[], opts: IcsOptions): string {
  const nowMs = new Date(opts.now).getTime();

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GleeWorld//Auctions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(opts.name)}`,
  ];

  for (const a of auctions) {
    lines.push(...saleEvent(a, opts.now));
    lines.push(...catalogEvent(a, nowMs, opts.now));
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}
