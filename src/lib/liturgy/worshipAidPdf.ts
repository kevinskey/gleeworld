/**
 * Turn the rendered worship-aid sheets into a two-page PDF.
 *
 * This is the ARCHIVE copy — the one filed in the Media Library so a program
 * can be found again next year, mailed to a cantor, or handed to someone who
 * was not at the Mass. For the copies that go in people's hands, use Print:
 * the browser prints the same DOM as real vector type at the printer's own
 * resolution, which is sharper than any rasterisation.
 *
 * Sheets are captured rather than re-laid-out for exactly the reason the
 * preview is inch-sized in the first place: a second layout engine would
 * decide different line breaks, and a folded document whose archive copy
 * disagrees with the printed one is worse than no archive.
 */

/** 11 × 8.5 landscape, in inches — the folded sheet. */
export const SHEET_W_IN = 11;
export const SHEET_H_IN = 8.5;

/** Capture density. 2× keeps engraved notation legible when the PDF is
 *  zoomed or reprinted, without producing a file too large to email. */
const CAPTURE_SCALE = 2;

export interface WorshipAidPdf {
  blob: Blob;
  pages: number;
}

/**
 * Render every `.worship-aid-sheet` inside `root` to a PDF.
 *
 * Both libraries are imported lazily: jsPDF and html2canvas together are
 * several hundred kilobytes, and nobody who is only planning a Mass should
 * pay for them on page load.
 */
export async function worshipAidToPdf(root: HTMLElement): Promise<WorshipAidPdf> {
  const sheets = Array.from(root.querySelectorAll<HTMLElement>('.worship-aid-sheet'));
  if (sheets.length === 0) throw new Error('Nothing to export yet.');

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [SHEET_W_IN, SHEET_H_IN] });

  for (let i = 0; i < sheets.length; i++) {
    const canvas = await html2canvas(sheets[i], {
      scale: CAPTURE_SCALE,
      // The cover art and the engraved psalm are served from the storage
      // host, a different origin from the app. Without useCORS they would be
      // dropped and the archive copy would have no artwork and no music —
      // the two things worth archiving. (Storage does send
      // Access-Control-Allow-Origin, so this succeeds rather than tainting.)
      useCORS: true,
      // JPEG has no alpha, so an unpainted background rasterises black.
      backgroundColor: '#ffffff',
      logging: false,
    });

    if (i > 0) pdf.addPage([SHEET_W_IN, SHEET_H_IN], 'landscape');
    // 0.92 is visually lossless for type and line art at this density while
    // keeping a two-page program small enough to send.
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, SHEET_W_IN, SHEET_H_IN);
  }

  return { blob: pdf.output('blob') as Blob, pages: sheets.length };
}

/** Filesystem- and library-safe name for the archived program. */
export function worshipAidFileName(day: string, isoDate: string): string {
  const stem = `${day || 'Worship Aid'} ${isoDate}`
    .normalize('NFKD')
    // Combining marks, spelled out: the literal range is invisible in a diff.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]+/g, ' ')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 90) || 'worship-aid';
  return `${stem}.pdf`;
}
