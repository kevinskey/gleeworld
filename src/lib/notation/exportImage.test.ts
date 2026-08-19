// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Imported FRESH per test. The font is cached in a module-level variable —
 * correct in a browser, where the bytes never change, but it means one test's
 * fetch satisfies the next one's and the suite silently stops testing what it
 * claims to.
 */
async function load() {
  vi.resetModules();
  return await import('./exportImage');
}

/**
 * The export produced staves of empty boxes: VexFlow draws every notehead and
 * clef as TEXT in the Bravura music font, and an SVG rasterised through an
 * <img> is an isolated document that cannot reach the app's font. These cover
 * the fix — the font must travel inside the SVG — and the two places where a
 * half-megabyte payload overflows the call stack if handled naively.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  svg.setAttribute('width', '384');
  svg.setAttribute('height', '200');
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('font-family', 'Bravura');
  text.textContent = ''; // SMuFL black notehead
  svg.appendChild(text);
  return svg;
}

/** Captured data: URLs, so a test can inspect what would be rasterised. */
let lastSrc = '';

beforeEach(() => {
  lastSrc = '';
  // jsdom neither loads images nor rasterises canvases; stand in for both.
  Object.defineProperty(globalThis.Image.prototype, 'src', {
    configurable: true,
    set(value: string) {
      lastSrc = value;
      setTimeout(() => this.onload?.(new Event('load')), 0);
    },
  });
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: '',
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
    cb(new Blob(['jpeg'], { type: 'image/jpeg' }));
  };
});

afterEach(() => vi.restoreAllMocks());

/** A font body big enough that a naive String.fromCharCode(...bytes) throws. */
function bigFontResponse(bytes = 513_000) {
  return {
    ok: true,
    arrayBuffer: async () => new Uint8Array(bytes).fill(65).buffer,
  } as unknown as Response;
}

describe('svgToJpegBlob — the music font travels with the SVG', () => {
  it('embeds an @font-face for Bravura in the rasterised document', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => bigFontResponse(2048)));
    const { svgToJpegBlob } = await load();
    await svgToJpegBlob(makeSvg());

    expect(lastSrc.startsWith('data:image/svg+xml;base64,')).toBe(true);
    const doc = atob(lastSrc.slice('data:image/svg+xml;base64,'.length));
    expect(doc).toContain('@font-face');
    expect(doc).toContain("font-family:'Bravura'");
    expect(doc).toContain('data:font/otf;base64,');
  });

  it('fetches the font once and reuses it across exports', async () => {
    const fetchMock = vi.fn(async () => bigFontResponse(2048));
    vi.stubGlobal('fetch', fetchMock);
    const { svgToJpegBlob } = await load();
    await svgToJpegBlob(makeSvg());
    await svgToJpegBlob(makeSvg());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // Both the font bytes and the finished SVG are large enough that
  // String.fromCharCode(...bytes) overflows the stack. Half a megabyte here
  // is the real size of Bravura.otf.
  it('survives a half-megabyte font without a stack overflow', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => bigFontResponse(513_000)));
    const { svgToJpegBlob } = await load();
    await expect(svgToJpegBlob(makeSvg())).resolves.toBeInstanceOf(Blob);
    expect(lastSrc.length).toBeGreaterThan(600_000);
  });

  // Silently exporting boxes is what the user reported; failing loudly is the
  // fix, so a caller can say why rather than hand over a broken image.
  it('refuses to export rather than produce boxes when the font is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 }) as Response));
    const { svgToJpegBlob } = await load();
    await expect(svgToJpegBlob(makeSvg())).rejects.toThrow(/music font/);
  });

  it('retries the font on a later export instead of caching the failure', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValue(bigFontResponse(2048));
    vi.stubGlobal('fetch', fetchMock);
    const { svgToJpegBlob } = await load();
    await expect(svgToJpegBlob(makeSvg())).rejects.toThrow(/music font/);
    await expect(svgToJpegBlob(makeSvg())).resolves.toBeInstanceOf(Blob);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses the SVG\'s intrinsic size, not its on-screen box', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => bigFontResponse(2048)));
    const { svgToJpegBlob } = await load();
    const svg = makeSvg();
    // A CSS-zoomed staff reports a larger rect than its own coordinates.
    svg.getBoundingClientRect = () => ({ width: 614, height: 320 }) as DOMRect;
    await svgToJpegBlob(svg);
    const doc = atob(lastSrc.slice('data:image/svg+xml;base64,'.length));
    expect(doc).toContain('width="384"');
    expect(doc).toContain('height="200"');
  });
});

describe('imageFileName', () => {
  it('separates on punctuation instead of fusing across it', async () => {
    const { imageFileName } = await load();
    // Dropping the colon outright would give "Psalm-342-9".
    expect(imageFileName('Psalm 34:2-9 — 19th Sunday')).toBe('Psalm-34-2-9-19th-Sunday.jpg');
  });
  it('strips diacritics rather than dropping the word', async () => {
    const { imageFileName } = await load();
    expect(imageFileName('Espíritu')).toBe('Espiritu.jpg');
  });
  it('falls back when a title has nothing usable', async () => {
    const { imageFileName } = await load();
    expect(imageFileName('///')).toBe('score.jpg');
  });
});
