import { PDFDocument, degrees } from 'pdf-lib';

export interface PageCropSettings {
  page: number;
  top: number; // percentage 0-100
  bottom: number;
  left: number;
  right: number;
  rotation: number; // degrees
}

export interface CropApplyResult {
  blob: Blob;
  pageCount: number;
  appliedSettings: PageCropSettings[];
}

/**
 * Apply crop and rotation settings to a PDF and return the modified PDF
 */
export async function applyCropToPDF(
  pdfSource: string | ArrayBuffer,
  settings: PageCropSettings[],
  options: {
    onProgress?: (current: number, total: number) => void;
  } = {}
): Promise<CropApplyResult> {
  const { onProgress } = options;

  // Load the PDF
  let pdfBytes: ArrayBuffer;
  if (typeof pdfSource === 'string') {
    const response = await fetch(pdfSource);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    pdfBytes = await response.arrayBuffer();
    
    // Validate PDF header - PDF files start with %PDF
    const header = new Uint8Array(pdfBytes.slice(0, 5));
    const headerString = String.fromCharCode(...header);
    if (!headerString.startsWith('%PDF')) {
      throw new Error('Invalid PDF: File does not have a valid PDF header. The file may be corrupted or not a PDF.');
    }
  } else {
    pdfBytes = pdfSource;
  }

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const appliedSettings: PageCropSettings[] = [];

  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    onProgress?.(pageNum, pages.length);

    // Find settings for this page
    const pageSetting = settings.find(s => s.page === pageNum);
    if (!pageSetting) continue;

    const page = pages[i];
    const { width, height } = page.getSize();

    // Apply rotation
    if (pageSetting.rotation !== 0) {
      page.setRotation(degrees(pageSetting.rotation));
    }

    // Apply crop using CropBox
    // CropBox defines the visible region of the page
    const cropTop = (pageSetting.top / 100) * height;
    const cropBottom = (pageSetting.bottom / 100) * height;
    const cropLeft = (pageSetting.left / 100) * width;
    const cropRight = (pageSetting.right / 100) * width;

    // Only apply crop if there are any non-zero values
    if (cropTop > 0 || cropBottom > 0 || cropLeft > 0 || cropRight > 0) {
      page.setCropBox(
        cropLeft,
        cropBottom, // PDF coordinates start from bottom
        width - cropLeft - cropRight,
        height - cropTop - cropBottom
      );
    }

    appliedSettings.push(pageSetting);
  }

  // Save the modified PDF
  const modifiedPdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' });

  return {
    blob,
    pageCount: pages.length,
    appliedSettings,
  };
}

/**
 * Apply uniform crop settings to all pages
 */
export async function applyUniformCropToPDF(
  pdfSource: string | ArrayBuffer,
  cropSettings: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    rotation: number;
  },
  options: {
    onProgress?: (current: number, total: number) => void;
  } = {}
): Promise<CropApplyResult> {
  // Load PDF to get page count
  let pdfBytes: ArrayBuffer;
  if (typeof pdfSource === 'string') {
    const response = await fetch(pdfSource);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    // Check content type to ensure it's a PDF
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('pdf') && !contentType.includes('octet-stream')) {
      throw new Error(`Invalid file type: ${contentType}. Expected a PDF file.`);
    }
    
    pdfBytes = await response.arrayBuffer();
    
    // Validate PDF header - PDF files start with %PDF
    const header = new Uint8Array(pdfBytes.slice(0, 5));
    const headerString = String.fromCharCode(...header);
    if (!headerString.startsWith('%PDF')) {
      throw new Error('Invalid PDF: File does not have a valid PDF header. The file may be corrupted or not a PDF.');
    }
  } else {
    pdfBytes = pdfSource;
  }

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  // Create settings for all pages
  const settings: PageCropSettings[] = [];
  for (let i = 1; i <= pageCount; i++) {
    settings.push({
      page: i,
      ...cropSettings,
    });
  }

  return applyCropToPDF(pdfSource, settings, options);
}

/**
 * Download the cropped PDF
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get PDF page count without loading entire document
 */
export async function getPDFPageCount(pdfSource: string | ArrayBuffer): Promise<number> {
  let pdfBytes: ArrayBuffer;
  if (typeof pdfSource === 'string') {
    const response = await fetch(pdfSource);
    pdfBytes = await response.arrayBuffer();
  } else {
    pdfBytes = pdfSource;
  }

  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.getPageCount();
}
