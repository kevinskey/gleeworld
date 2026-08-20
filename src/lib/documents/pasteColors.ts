// Drop unreadable text colours from pasted HTML.
//
// Adding TextStyle + Color so pasted formatting survives had a failure mode
// nobody sees coming: copy from a dark-themed source (ChatGPT, Claude, a dark
// docs site, Notion in dark mode) and the clipboard HTML carries
// `color: rgb(255,255,255)`. Preserved faithfully onto white paper, the text
// is invisible — and the person pasting reports that paste is broken, because
// from where they sit it is. Kevin, 2026-08-20.
//
// The rule is deliberately narrow: only colours that would be unreadable ON
// THE PAGE are removed, so a red heading pasted from Word stays red. Nothing
// else about the pasted formatting is touched.

/** Relative luminance, 0 (black) to 1 (white). sRGB coefficients. */
function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Parse `#fff`, `#ffffff`, `rgb(255,255,255)`, `rgba(255,255,255,.9)`. */
export function parseCssColor(value: string): { r: number; g: number; b: number } | null {
  const v = value.trim().toLowerCase();

  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1];
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }

  const rgb = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (rgb) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  }

  // Named colours: only the one that actually matters here. Anything else is
  // left alone rather than guessed at.
  if (v === 'white') return { r: 255, g: 255, b: 255 };
  return null;
}

/**
 * Luminance at or above which text is unreadable on the document's white
 * page. 0.85 keeps #d0d0d0 (a legitimate, if faint, grey) and drops #fafafa.
 */
export const UNREADABLE_LUMINANCE = 0.85;

export function isUnreadableOnWhite(color: string): boolean {
  const rgb = parseCssColor(color);
  if (!rgb) return false; // unparseable — leave it alone rather than guess
  return luminance(rgb.r, rgb.g, rgb.b) >= UNREADABLE_LUMINANCE;
}

/**
 * Remove `color:` declarations that would be invisible on the page, leaving
 * every other style intact. Operates on the clipboard HTML string, before
 * ProseMirror parses it, so nothing downstream needs to know about this.
 */
export function stripUnreadableColors(html: string): string {
  // Rewrites the `color: X` declaration inside any style attribute. Kept as a
  // string transform rather than a DOM pass because transformPastedHTML runs
  // on every paste and this stays cheap on a large document.
  return html.replace(/style\s*=\s*"([^"]*)"/gi, (whole, styles: string) => {
    const cleaned = styles
      .split(';')
      .filter((decl) => {
        const [prop, ...rest] = decl.split(':');
        if (!rest.length) return decl.trim().length > 0;
        // `color` only — never `background-color`, which is handled by
        // Highlight and is legitimately light by nature.
        if (prop.trim().toLowerCase() !== 'color') return true;
        return !isUnreadableOnWhite(rest.join(':'));
      })
      .join(';');
    return cleaned.trim() ? `style="${cleaned}"` : '';
  });
}
