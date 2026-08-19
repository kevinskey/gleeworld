/**
 * Rasterise an engraved staff (VexFlow renders SVG) to a JPEG.
 *
 * Why not html2canvas: it re-implements CSS layout to paint a DOM tree, and
 * gets SVG glyph positioning wrong often enough to matter for notation. The
 * staff is already a self-contained SVG, so the browser's own SVG rasteriser
 * is both more faithful and far cheaper.
 */

/** JPEG has no alpha. Without an explicit fill the transparent staff
 *  background rasterises to BLACK, which looks like a broken export. */
const DEFAULT_BACKGROUND = '#ffffff';

/**
 * The music font, embedded into the exported SVG.
 *
 * This is the whole reason exports came out as rows of empty boxes. VexFlow
 * draws every notehead, clef, rest and accidental as TEXT in the SMuFL font
 * Bravura, which the app self-hosts. But an SVG rasterised through an <img>
 * is an isolated document: it cannot reach /fonts/Bravura.otf, and the page's
 * @font-face does not apply to it. Every glyph fell back to a font that has
 * no such characters — tofu. Lyrics survived only because they are ordinary
 * words in a generic serif the rasteriser already has.
 *
 * So the font travels WITH the SVG, as a base64 @font-face. ~513KB of font
 * becomes ~684KB of data URL, which is transient: it exists only while the
 * image rasterises and never reaches the JPEG.
 */
const MUSIC_FONT_FAMILY = 'Bravura';
const MUSIC_FONT_URL = '/fonts/Bravura.otf';

/** Fetched once per session — the bytes never change. */
let musicFontCss: Promise<string> | null = null;

/** btoa over a large buffer, in chunks: String.fromCharCode(...bytes) on a
 *  half-megabyte font blows the call stack. */
function base64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

async function embeddedMusicFontCss(): Promise<string> {
  if (!musicFontCss) {
    musicFontCss = (async () => {
      const res = await fetch(MUSIC_FONT_URL);
      if (!res.ok) throw new Error(`music font ${res.status}`);
      const data = base64(await res.arrayBuffer());
      return `@font-face{font-family:'${MUSIC_FONT_FAMILY}';`
        + `src:url(data:font/otf;base64,${data}) format('opentype');}`;
    })().catch((err) => {
      // Let the next export try again rather than caching the failure.
      musicFontCss = null;
      throw err;
    });
  }
  return musicFontCss;
}

export interface SvgToJpegOptions {
  /** Pixel density multiplier. 2 keeps the notation crisp when the JPEG is
   *  printed or viewed on a retina display at its 4-inch size. */
  scale?: number;
  background?: string;
  /** 0-1. 0.92 is visually lossless for line art without tripling the size. */
  quality?: number;
}

export async function svgToJpegBlob(
  svg: SVGSVGElement,
  { scale = 2, background = DEFAULT_BACKGROUND, quality = 0.92 }: SvgToJpegOptions = {},
): Promise<Blob> {
  // INTRINSIC size first, on-screen box only as a fallback. The staff may be
  // CSS-scaled for on-screen readability while its internal coordinates stay
  // at the true print size; measuring the rendered box would then pair a
  // zoomed width with un-zoomed coordinates and stretch the export.
  const attrW = Number.parseFloat(svg.getAttribute('width') ?? '');
  const attrH = Number.parseFloat(svg.getAttribute('height') ?? '');
  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(
    Number.isFinite(attrW) && attrW > 0 ? attrW : (rect.width || svg.clientWidth || 384),
  ));
  const height = Math.max(1, Math.round(
    Number.isFinite(attrH) && attrH > 0 ? attrH : (rect.height || svg.clientHeight || 200),
  ));

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // Carry the music font into the isolated SVG document. Deliberately fatal
  // rather than best-effort: without it every notehead rasterises as an empty
  // box, and a silent broken export is worse than a message saying why.
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = await embeddedMusicFontCss();
  clone.insertBefore(style, clone.firstChild);

  const source = new XMLSerializer().serializeToString(clone);
  // A data: URL rather than a blob: URL on purpose — an <img> loading a blob:
  // URL taints the canvas in some WebKit versions, and a tainted canvas makes
  // toBlob throw SecurityError. Encoded UTF-8 first so non-ASCII lyrics
  // ("Espíritu") survive btoa, which is Latin-1 only.
  //
  // Chunked, via the same helper as the font: with the font embedded this
  // document is ~700KB, and String.fromCharCode(...bytes) over that many
  // arguments overflows the call stack.
  const encoded = base64(new TextEncoder().encode(source).buffer as ArrayBuffer);
  const url = `data:image/svg+xml;base64,${encoded}`;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not rasterise the staff.'));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image.'))),
      'image/jpeg',
      quality,
    );
  });
}

/** Filesystem-safe filename stem from a score title. */
export function imageFileName(title: string, ext = 'jpg'): string {
  const stem = title
    .normalize('NFKD')
    // Combining marks, spelled out: the literal range is invisible in a diff.
    .replace(/[\u0300-\u036f]/g, '')
    // Punctuation becomes a SEPARATOR, not nothing: dropping the colon in
    // "Psalm 34:2-9" fuses it into "342-9".
    .replace(/[^\w\s-]+/g, ' ')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 80) || 'score';
  return `${stem}.${ext}`;
}

/** Hand a blob to the browser as a download. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can cancel the download in Safari; one frame is
  // enough for the navigation to have been queued.
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}
