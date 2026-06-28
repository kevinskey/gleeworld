// MusicXML → PDF renderer. Lazy-loads Verovio (~5MB WASM) on first call,
// renders each page to SVG, rasterizes the SVG to a canvas, and emits a
// multi-page PDF via jsPDF.
//
// Used at sight-singing save time so generated exercises end up in
// gw_sheet_music with a real pdf_url — without that, saved exercises
// wouldn't show up in the Viewer reader (which requires a PDF).

import { jsPDF } from 'jspdf';

// US-letter at 72 DPI (jsPDF default unit is `pt`).
const PAGE_WIDTH_PT = 612;
const PAGE_HEIGHT_PT = 792;
// Rasterize SVG at this CSS-pixel width before placing into the PDF.
// 1600px ≈ ~190 DPI on a letter page — sharp on retina, modest filesize.
const RASTER_WIDTH = 1600;

let verovioPromise: Promise<any> | null = null;

async function loadVerovioToolkit(): Promise<any> {
  if (!verovioPromise) {
    verovioPromise = (async () => {
      const mod: any = await import(/* @vite-ignore */ 'verovio');
      const ToolkitCtor =
        mod?.VerovioToolkit
        ?? mod?.default?.VerovioToolkit
        ?? mod?.Toolkit
        ?? mod?.default?.Toolkit;
      if (!ToolkitCtor) throw new Error('verovio Toolkit not found');
      const initPromise =
        mod?.module?.onRuntimeInitialized
        ?? mod?.default?.module?.onRuntimeInitialized;
      if (typeof initPromise === 'function') await new Promise<void>((r) => initPromise(() => r()));
      return new ToolkitCtor();
    })();
  }
  return verovioPromise;
}

async function svgStringToPngDataUrl(svg: string, targetWidth: number): Promise<{ dataUrl: string; height: number }> {
  return new Promise((resolve, reject) => {
    // Make sure the <svg> root carries an explicit width — Safari refuses
    // to rasterize SVGs whose intrinsic dimensions are only set via
    // viewBox + percentage attrs.
    const svgWithSize = svg.includes('width="')
      ? svg
      : svg.replace('<svg ', `<svg width="${targetWidth}" `);
    const blob = new Blob([svgWithSize], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      // Preserve the SVG's aspect ratio so multi-system pages don't get
      // letterbox-squashed when we place them in a fixed-size PDF page.
      const ratio = img.naturalHeight / Math.max(1, img.naturalWidth);
      const height = Math.round(targetWidth * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('no 2d context')); return; }
      // White background — verovio SVGs are transparent, jsPDF would
      // place a black PNG with alpha=0 channels showing through.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL('image/png'), height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG rasterize failed'));
    };
    img.src = url;
  });
}

/** Render the given MusicXML string to a Blob containing a multi-page PDF
 *  in US-letter (612×792pt). Returns null if Verovio can't parse the XML. */
export async function musicxmlToPdfBlob(musicxml: string): Promise<Blob | null> {
  const toolkit = await loadVerovioToolkit();
  // Page sizing in MM (verovio default unit). 215.9 × 279.4 = letter.
  toolkit.setOptions({
    pageWidth: 2159,
    pageHeight: 2794,
    scale: 40,
    adjustPageHeight: true,
    breaks: 'auto',
  });
  const loaded = toolkit.loadData(musicxml);
  if (loaded === false) return null;
  const pageCount: number = toolkit.getPageCount();
  if (!pageCount || pageCount < 1) return null;

  const pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  for (let i = 1; i <= pageCount; i++) {
    const svg: string = toolkit.renderToSVG(i, {});
    const { dataUrl, height } = await svgStringToPngDataUrl(svg, RASTER_WIDTH);
    // Scale the rasterized page to fit the PDF page width. Vertical
    // overflow is OK — verovio is configured with adjustPageHeight so
    // each rendered SVG already matches its musical content height.
    const drawWidth = PAGE_WIDTH_PT;
    const drawHeight = (height / RASTER_WIDTH) * PAGE_WIDTH_PT;
    if (i > 1) pdf.addPage();
    pdf.addImage(dataUrl, 'PNG', 0, 0, drawWidth, Math.min(drawHeight, PAGE_HEIGHT_PT));
  }
  return pdf.output('blob');
}
