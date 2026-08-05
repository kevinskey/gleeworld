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
  // The live element carries no explicit width/height in some VexFlow paths,
  // and a cloned SVG without them rasterises at the browser's 300×150 default.
  // Measure the real box first, then stamp it on the clone.
  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || svg.clientWidth || 384));
  const height = Math.max(1, Math.round(rect.height || svg.clientHeight || 200));

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const source = new XMLSerializer().serializeToString(clone);
  // A data: URL rather than a blob: URL on purpose — an <img> loading a blob:
  // URL taints the canvas in some WebKit versions, and a tainted canvas makes
  // toBlob throw SecurityError. Encoded UTF-8 first so non-ASCII lyrics
  // ("Espíritu") survive btoa, which is Latin-1 only.
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(source)));
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
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
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
