// WhatsApp alerts for saved auction searches, over Twilio.
//
// Twilio is already the platform's SMS carrier — same account SID, same auth
// token, same REST shape — so WhatsApp is a `whatsapp:` prefix on the To and
// From rather than a new vendor.
//
// What is NOT the same as SMS: Meta only permits a business-initiated message
// outside a 24-hour window if it uses a template they approved in advance. So
// this module keeps the message SHORT and structured — a nudge that names the
// search and links back — and the sender prefers an approved template
// (TWILIO_WHATSAPP_TEMPLATE_SID) when one is configured, falling back to a
// plain body for the sandbox and for replies inside the 24-hour window.
//
// The pure parts live here so the phone handling and the wording are tested;
// the HTTP call is at the bottom and does no formatting of its own.

/** WhatsApp caps a message body well above this; we stay far shorter on purpose. */
export const WHATSAPP_BODY_LIMIT = 900;

const MAX_NAME = 60;

/**
 * Normalise a typed phone number to E.164, or null if it cannot be resolved.
 *
 * Deliberately conservative: a bare 9-digit string gets NO country code
 * guessed onto it. Prefixing +1 to something that is not a US number invents
 * a real phone belonging to a stranger, and the failure mode is messaging
 * them, repeatedly, about auctions they never asked about.
 */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = String(raw).trim().replace(/^whatsapp:/i, '').trim();
  if (!s) return null;

  const hadPlus = s.startsWith('+');
  s = s.replace(/[^\d]/g, '');
  if (!s) return null;

  if (hadPlus) {
    // Already international: trust it, but it still has to be plausible.
    return /^[1-9][0-9]{7,14}$/.test(s) ? `+${s}` : null;
  }
  // NANP is the only country we infer, because it is the only one where the
  // local format is unambiguous here.
  if (s.length === 10) return `+1${s}`;
  if (s.length === 11 && s.startsWith('1')) return `+${s}`;
  return null;
}

export interface NudgeInput {
  searchName: string;
  count: number;
  /** Origin of the tenant's app, e.g. https://lykehouse.gleeworld.org */
  appUrl: string;
}

/**
 * The alert text.
 *
 * A nudge, not a digest: the lots themselves live in the app and the email.
 * That is partly a WhatsApp constraint (templates are short and variable-
 * limited) and partly good manners — nobody wants twenty lots pushed into a
 * personal messaging app.
 *
 * It also says nothing about worth, value or price. This module never implies
 * a quote, and a one-line push notification is the easiest place to do that
 * accidentally.
 */
export function buildAuctionNudge({ searchName, count, appUrl }: NudgeInput): string {
  const name = searchName.length > MAX_NAME
    ? `${searchName.slice(0, MAX_NAME - 1)}…`
    : searchName;
  const noun = count === 1 ? 'new lot' : 'new lots';
  const link = `${appUrl.replace(/\/+$/, '')}/auctions/matches`;

  const body = `GleeWorld Auctions: ${count} ${noun} matched "${name}". See them: ${link}`;
  return body.length > WHATSAPP_BODY_LIMIT ? `${body.slice(0, WHATSAPP_BODY_LIMIT - 1)}…` : body;
}

export interface WhatsAppSendResult {
  ok: boolean;
  sid?: string;
  error?: string;
}

/**
 * Send one WhatsApp message through Twilio.
 *
 * Prefers an approved content template when TWILIO_WHATSAPP_TEMPLATE_SID is
 * set — required for business-initiated messages outside the 24-hour window.
 * Without one it sends a plain body, which works in Twilio's sandbox and for
 * replies inside the window, and which Meta will reject otherwise. That is
 * the honest failure: it surfaces as a Twilio error rather than as silence.
 */
export async function sendWhatsApp(
  toE164Number: string,
  body: string,
  vars: Record<string, string> = {},
): Promise<WhatsAppSendResult> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
  const token = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
  const from = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? '';
  const templateSid = Deno.env.get('TWILIO_WHATSAPP_TEMPLATE_SID') ?? '';

  if (!sid || !token) return { ok: false, error: 'Twilio credentials are not configured' };
  if (!from) return { ok: false, error: 'TWILIO_WHATSAPP_FROM is not configured' };

  const form = new URLSearchParams({
    To: `whatsapp:${toE164Number}`,
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
  });
  if (templateSid) {
    form.set('ContentSid', templateSid);
    form.set('ContentVariables', JSON.stringify(vars));
  } else {
    form.set('Body', body);
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: `Twilio ${res.status}: ${payload?.message ?? 'unknown error'}` };
  }
  return { ok: true, sid: payload?.sid };
}
