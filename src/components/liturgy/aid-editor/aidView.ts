import type { PanelId } from '@/lib/liturgy/worshipAid';

/**
 * Which view of the sheets the screen is showing.
 *
 * 'focus' shows one panel, scaled up, for editing. 'full' is what the sheets
 * render natively: both 11x8.5in sheets at exact size.
 */
export type AidView = 'focus' | 'full';

/** Attribute the stage wrapper carries; screen-only CSS keys off it. */
export const AID_VIEW_ATTR = 'data-aid-view';

/** The one copy. Rail, stage and page all import this. */
export const PANEL_LABEL: Record<PanelId, string> = {
  front: 'Cover',
  insideLeft: 'Inside left',
  insideRight: 'Inside right',
  back: 'Back',
};

/** Two frames: one to apply the attribute, one for layout to settle under it. */
function nextFrames(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') { resolve(); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Run `fn` with the sheets in their full, unscaled, un-hidden state.
 *
 * The archived PDF is produced by html2canvas walking every
 * `.worship-aid-sheet` in the DOM. Focus mode hides three of the four panels
 * and scales what is left, and html2canvas honours both — so capturing while
 * focused would file a PDF missing most of the program. Nobody would notice
 * until they opened the archive a year later.
 *
 * Restores in a `finally`, so a capture that throws cannot leave the editor
 * stuck showing the full sheet.
 */
export async function withFullView<T>(
  el: HTMLElement | null,
  fn: () => Promise<T>,
): Promise<T> {
  if (!el) return fn();
  const previous = el.getAttribute(AID_VIEW_ATTR);
  el.setAttribute(AID_VIEW_ATTR, 'full');
  try {
    await nextFrames();
    return await fn();
  } finally {
    if (previous === null) el.removeAttribute(AID_VIEW_ATTR);
    else el.setAttribute(AID_VIEW_ATTR, previous);
  }
}
