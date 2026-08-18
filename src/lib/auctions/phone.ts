// Phone normalisation for the WhatsApp opt-in form.
//
// Deliberately duplicated from supabase/functions/_shared/whatsapp.ts: src and
// the edge functions cannot import each other, and the alternative — sending
// whatever the user typed and letting the database CHECK reject it — turns a
// fixable typo into an error toast. Both copies have the same tests; change
// them together.

/**
 * Normalise a typed phone number to E.164, or null when it cannot be resolved.
 *
 * No country is ever guessed for an ambiguous number. Prefixing +1 onto a
 * 9-digit string would invent a real phone belonging to a stranger, and the
 * consequence is messaging them about auctions they never asked about.
 */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = String(raw).trim().replace(/^whatsapp:/i, '').trim();
  if (!s) return null;

  const hadPlus = s.startsWith('+');
  s = s.replace(/[^\d]/g, '');
  if (!s) return null;

  if (hadPlus) return /^[1-9][0-9]{7,14}$/.test(s) ? `+${s}` : null;
  if (s.length === 10) return `+1${s}`;
  if (s.length === 11 && s.startsWith('1')) return `+${s}`;
  return null;
}
