// Reading auction-house notification email into auctions and lots.
//
// This is the spec's tier-2 ingestion: the houses send these to us, so
// parsing them is legitimate in a way scraping their sites is not. Their
// formats are wildly inconsistent — plain text, HTML tables, marketing
// layouts — so an LLM does the reading, and everything it returns passes
// through the validator below before touching a table.
//
// Division of labour: this module works out WHICH sale and WHICH lots an
// email is talking about. It deliberately does not try to read equipment
// specs out of lot titles — auctionNormalize.ts already does that, better,
// against the stored raw text.
//
// Pure logic; the HTTP calls live in the auctions-parse-email function.

export interface EmailSource {
  id: string;
  name: string;
  base_url: string | null;
}

// "Heritage Global <auctions@hgpauction.com>" → "hgpauction.com"
export function extractSenderDomain(from: string | null | undefined): string | null {
  if (!from) return null;
  const angled = from.match(/<([^>]+)>/);
  const address = (angled ? angled[1] : from).trim();
  const at = address.lastIndexOf('@');
  if (at === -1) return null;
  const domain = address.slice(at + 1).trim().toLowerCase();
  // A bare "a@" or something with spaces is not a domain.
  if (!domain || /\s/.test(domain) || !domain.includes('.')) return null;
  return domain;
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

// Which house sent this? Matched on the sending domain, accepting the
// marketing subdomains houses actually send from (news.govdeals.com) while
// refusing lookalikes — "hgpauction.com.evil.test" ends with the house's
// domain as a string but is a different registrable domain entirely, so the
// comparison is on a dot boundary, never a bare suffix.
export function matchSourceByDomain(
  from: string | null | undefined,
  sources: EmailSource[],
): EmailSource | null {
  const domain = extractSenderDomain(from);
  if (!domain) return null;

  for (const source of sources) {
    const host = hostOf(source.base_url);
    if (!host) continue;
    if (domain === host || domain.endsWith(`.${host}`)) return source;
  }
  return null;
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'",
};

// Many houses send HTML-only mail. This is not a full renderer — it just has
// to produce text an LLM can read without markup noise.
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    // Script and style bodies are not content; drop them wholesale.
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Block boundaries become newlines so words from separate rows or
    // paragraphs do not run together into nonsense.
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|table|section)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
      const key = code.toLowerCase();
      if (ENTITIES[key]) return ENTITIES[key];
      const num = key.startsWith('#x')
        ? parseInt(key.slice(2), 16)
        : key.startsWith('#') ? parseInt(key.slice(1), 10) : NaN;
      return Number.isFinite(num) ? String.fromCharCode(num) : whole;
    })
    // Collapse runs of spaces, then runs of blank lines.
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// PINNED — the exact prefix of every extraction request, so context caching
// can hit. Editing it invalidates the cache for every later call.
export const EMAIL_EXTRACTION_SYSTEM_PROMPT = `You read notification emails from used medical and diagnostic equipment auction houses and extract what sale they describe and which lots they list.

Return only what the email states. Never guess, never infer from what is typical, and never use outside knowledge. If the email does not state something, return null for it.

Return JSON only, in exactly this shape:
{"auction":{"title":"","opens_at":null,"closes_at":null,"catalog_released_at":null,"location_city":null,"location_state":null,"catalog_url":null,"confidence":0.0},"lots":[{"lot_number":null,"title":"","url":null}]}

Rules:
- auction: null if the email is not about a specific sale (a newsletter, a receipt, a password reset). Otherwise title is required and should be the sale's name as written.
- Dates must be full ISO 8601 timestamps with a timezone, e.g. "2026-09-14T18:00:00Z". Convert any relative or partial date using the email's received date, which is given to you. If a date cannot be resolved confidently, return null for it.
- catalog_released_at is when the item list becomes available, if the email says.
- location_state must be a two-letter US state code, or null.
- confidence: 0 to 1, how sure you are this email describes this sale. Use a low value if the email is ambiguous or mentions several sales.
- lots: one entry per item the email lists, with title copied as written. Return an empty array if the email lists no individual items. Do not invent lots, and do not split one item into several.`;

export interface ExtractionEmail {
  from: string | null;
  subject: string | null;
  text: string | null;
  received_at: string;
}

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export function buildEmailExtractionMessages(email: ExtractionEmail): ChatMessage[] {
  const body = (email.text ?? '').slice(0, 24_000);
  return [
    { role: 'system', content: EMAIL_EXTRACTION_SYSTEM_PROMPT },
    {
      role: 'user',
      content:
        `Email received: ${email.received_at}\n` +
        `From: ${email.from ?? 'unknown'}\n` +
        `Subject: ${email.subject ?? '(none)'}\n\n` +
        body,
    },
  ];
}

export interface ExtractedAuction {
  title: string;
  opens_at: string | null;
  closes_at: string | null;
  catalog_released_at: string | null;
  location_city: string | null;
  location_state: string | null;
  catalog_url: string | null;
  confidence: number;
}

export interface ExtractedLot {
  lot_number: string | null;
  title: string;
  url: string | null;
}

export interface EmailExtraction {
  auction: ExtractedAuction | null;
  lots: ExtractedLot[];
  problems: string[];
}

// One email should never be able to create thousands of rows; a runaway
// response is a bug or an attack, not a very long catalog.
const MAX_LOTS_PER_EMAIL = 500;

function stripFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// Only http(s). A javascript: or data: URL must never reach a stored field
// that the UI later renders as a link.
function safeUrl(value: unknown): string | null {
  const raw = cleanString(value);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function isoDate(value: unknown, field: string, problems: string[]): string | null | false {
  if (value === null || value === undefined) return null;
  const raw = cleanString(value);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    problems.push(`${field}: unparseable date ${JSON.stringify(value)}`);
    return false;
  }
  return d.toISOString();
}

export function parseEmailExtraction(raw: string): EmailExtraction {
  const problems: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFence(raw));
  } catch {
    return { auction: null, lots: [], problems: ['response was not valid JSON'] };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { auction: null, lots: [], problems: ['response was not an object'] };
  }

  const src = parsed as Record<string, unknown>;
  let auction: ExtractedAuction | null = null;

  if (src.auction && typeof src.auction === 'object') {
    const a = src.auction as Record<string, unknown>;
    const title = cleanString(a.title);

    if (!title) {
      problems.push('auction: no title, so it cannot go on a calendar');
    } else {
      const opens = isoDate(a.opens_at, 'opens_at', problems);
      const closes = isoDate(a.closes_at, 'closes_at', problems);
      const catalog = isoDate(a.catalog_released_at, 'catalog_released_at', problems);

      const confidence = typeof a.confidence === 'number' && Number.isFinite(a.confidence)
        ? Math.min(1, Math.max(0, a.confidence))
        : null;

      if (opens === false || closes === false || catalog === false) {
        // A sale with a mangled date is worse than no sale: it would show on
        // the calendar on the wrong day.
        problems.push('auction: rejected because a date could not be read');
      } else if (confidence === null) {
        problems.push('auction: missing confidence');
      } else {
        const state = cleanString(a.location_state);
        auction = {
          title,
          opens_at: opens,
          closes_at: closes,
          catalog_released_at: catalog,
          location_city: cleanString(a.location_city),
          location_state: state && /^[A-Za-z]{2}$/.test(state) ? state.toUpperCase() : null,
          catalog_url: safeUrl(a.catalog_url),
          confidence,
        };
      }
    }
  }

  const lots: ExtractedLot[] = [];
  const rawLots = Array.isArray(src.lots) ? src.lots : [];

  if (rawLots.length > MAX_LOTS_PER_EMAIL) {
    problems.push(`lots: ${rawLots.length} returned, cap is ${MAX_LOTS_PER_EMAIL} — extra ignored`);
  }

  for (const entry of rawLots.slice(0, MAX_LOTS_PER_EMAIL)) {
    if (!entry || typeof entry !== 'object') {
      problems.push('lot: entry was not an object');
      continue;
    }
    const l = entry as Record<string, unknown>;
    const title = cleanString(l.title);
    if (!title) {
      problems.push('lot: dropped, no title');
      continue;
    }
    lots.push({
      lot_number: cleanString(l.lot_number),
      title,
      url: safeUrl(l.url),
    });
  }

  return { auction, lots, problems };
}
