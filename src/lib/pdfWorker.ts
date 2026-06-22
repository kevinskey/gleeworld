// Single source of truth for the pdfjs worker.
//
// We had six different files setting GlobalWorkerOptions independently —
// inline blob workers, cdnjs URLs, new URL(..., import.meta.url), the
// PDFViewer's platform-conditional setup — and depending on which one
// happened to be imported last, the score viewer would either render or
// hang forever on "Loading PDF…". Anyone touching pdfjs should import
// PDF_WORKER_READY from this module so the value-import keeps Vite from
// tree-shaking the setup.
//
// Strategy: point workerSrc at the .mjs file emitted by Vite as a hashed
// static asset, on every platform. We previously tried `?worker&inline`
// for desktop (bundle the worker as a Blob URL) — Chrome / Firefox would
// fail to instantiate the module worker silently, with no thrown error
// and no console event, leaving pdfjs hung on getDocument forever.
// Static URL is universally supported and serves correctly from both
// gleeworld.org and capacitor://localhost.

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerStaticUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerStaticUrl;
console.log('[pdfWorker] workerSrc =', pdfWorkerStaticUrl);

export const PDF_WORKER_READY = true;
