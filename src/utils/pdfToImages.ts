import * as pdfjsLib from 'pdfjs-dist';

// Ensure worker is configured
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface PDFPageImage {
  pageNum: number;
  canvas: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
}

export interface PDFConversionResult {
  pages: PDFPageImage[];
  totalPages: number;
  documentWidth: number;
  documentHeight: number;
}

/**
 * Load a PDF document from a URL or ArrayBuffer
 */
export async function loadPDF(source: string | ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument(source);
  return await loadingTask.promise;
}

/**
 * Render a single PDF page to canvas
 */
export async function renderPageToCanvas(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale: number = 1.5
): Promise<PDFPageImage | null> {
  if (pageNum < 1 || pageNum > pdf.numPages) {
    console.error(`Invalid page number: ${pageNum}`);
    return null;
  }

  try {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      console.error('Could not get 2D context');
      return null;
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render PDF page to canvas
    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    // Convert to data URL for AI analysis
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    return {
      pageNum,
      canvas,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
    };
  } catch (error) {
    console.error(`Error rendering page ${pageNum}:`, error);
    return null;
  }
}

/**
 * Convert all pages of a PDF to images
 */
export async function convertPDFToImages(
  source: string | ArrayBuffer,
  options: {
    scale?: number;
    maxPages?: number;
    onProgress?: (current: number, total: number) => void;
  } = {}
): Promise<PDFConversionResult> {
  const { scale = 1.5, maxPages, onProgress } = options;

  const pdf = await loadPDF(source);
  const totalPages = maxPages ? Math.min(pdf.numPages, maxPages) : pdf.numPages;
  const pages: PDFPageImage[] = [];

  let documentWidth = 0;
  let documentHeight = 0;

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(i, totalPages);
    
    const pageImage = await renderPageToCanvas(pdf, i, scale);
    if (pageImage) {
      pages.push(pageImage);
      // Use first page dimensions as document dimensions
      if (i === 1) {
        documentWidth = pageImage.width;
        documentHeight = pageImage.height;
      }
    }
  }

  return {
    pages,
    totalPages: pdf.numPages,
    documentWidth,
    documentHeight,
  };
}

/**
 * Convert a single page with rotation applied
 */
export async function renderPageWithRotation(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  rotation: number, // degrees
  scale: number = 1.5
): Promise<PDFPageImage | null> {
  if (pageNum < 1 || pageNum > pdf.numPages) {
    return null;
  }

  try {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale, rotation });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    return {
      pageNum,
      canvas,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
    };
  } catch (error) {
    console.error(`Error rendering page ${pageNum} with rotation:`, error);
    return null;
  }
}

/**
 * Apply crop to a canvas and return cropped result
 */
export function cropCanvas(
  canvas: HTMLCanvasElement,
  cropSettings: {
    top: number; // percentage 0-100
    bottom: number;
    left: number;
    right: number;
  }
): HTMLCanvasElement {
  const { top, bottom, left, right } = cropSettings;
  
  const cropTop = (top / 100) * canvas.height;
  const cropBottom = (bottom / 100) * canvas.height;
  const cropLeft = (left / 100) * canvas.width;
  const cropRight = (right / 100) * canvas.width;

  const newWidth = canvas.width - cropLeft - cropRight;
  const newHeight = canvas.height - cropTop - cropBottom;

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = newWidth;
  croppedCanvas.height = newHeight;

  const ctx = croppedCanvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(
      canvas,
      cropLeft, cropTop, newWidth, newHeight,
      0, 0, newWidth, newHeight
    );
  }

  return croppedCanvas;
}

/**
 * Apply rotation to a canvas
 */
export function rotateCanvas(
  canvas: HTMLCanvasElement,
  degrees: number
): HTMLCanvasElement {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));

  const newWidth = canvas.width * cos + canvas.height * sin;
  const newHeight = canvas.width * sin + canvas.height * cos;

  const rotatedCanvas = document.createElement('canvas');
  rotatedCanvas.width = newWidth;
  rotatedCanvas.height = newHeight;

  const ctx = rotatedCanvas.getContext('2d');
  if (ctx) {
    ctx.translate(newWidth / 2, newHeight / 2);
    ctx.rotate(radians);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  }

  return rotatedCanvas;
}
