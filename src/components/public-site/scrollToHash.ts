/**
 * In-page anchor scrolling for public tenant sites.
 *
 * `html` carries `scroll-behavior: smooth`, so a native fragment navigation
 * animates the jump. Across the distance a tenant home page spans (yo-doc's
 * Listen section sits ~3200px down, below a long About block) that animation
 * routinely fails to finish: the URL updates to `#music` and the viewport
 * stops short or never moves, which reads as "the music player is gone"
 * (Kevin, 2026-08-18 — the Listen link left him in the middle of About).
 * An explicit instant scroll lands every time.
 *
 * `headerOffset` keeps the target from hiding under the sticky header bar.
 * Returns false when the fragment names nothing on the page, so callers can
 * fall through to normal link behavior.
 */
export function scrollToHash(hash: string, headerOffset = 0): boolean {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return false;

  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    // A malformed escape is not worth throwing over — try the literal id.
  }

  const el = document.getElementById(id) ?? document.getElementById(raw);
  if (!el) return false;

  const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
  window.scrollTo({ top: Math.max(0, top), behavior: 'instant' as ScrollBehavior });
  return true;
}
