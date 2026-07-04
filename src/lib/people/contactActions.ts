export interface ContactablePerson {
  full_name: string | null; display_name: string | null;
  first_name: string | null; last_name: string | null;
  email: string | null; phone: string | null; phone_number: string | null;
  voice_part: string | null;
}

export function displayName(p: ContactablePerson): string {
  const dn = p.display_name?.trim();
  if (dn) return dn;
  const fn = p.full_name?.trim();
  if (fn) return fn;
  const composed = [p.first_name, p.last_name].map((s) => s?.trim()).filter(Boolean).join(' ');
  if (composed) return composed;
  return p.email?.trim() || 'Member';
}

export function initials(p: ContactablePerson): string {
  const parts = displayName(p).split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '');
  return letters.join('') || 'M';
}

export function bestPhone(p: ContactablePerson): string | null {
  const v = p.phone_number?.trim() || p.phone?.trim() || '';
  return v.length > 0 ? v : null;
}

export function contactHrefs(p: ContactablePerson): { tel: string | null; sms: string | null; mailto: string | null } {
  const raw = bestPhone(p);
  const digits = raw ? raw.replace(/[^\d+]/g, '') : null;
  const valid = digits && /\d/.test(digits) ? digits : null;
  const email = p.email?.trim() || null;
  return {
    tel: valid ? `tel:${valid}` : null,
    sms: valid ? `sms:${valid}` : null,
    mailto: email ? `mailto:${email}` : null,
  };
}

export function sectionLabel(voicePart: string | null): string | null {
  if (!voicePart) return null;
  return voicePart.split('_').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}
