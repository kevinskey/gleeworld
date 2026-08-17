// Shared score viewer dialog — extracted from MusicLibraryPage so the
// Scores tab and My Music open PDFs through the SAME contain-fit viewer
// (whole page visible, no scrolling — PR #321). Wraps the lazy
// PDFViewerWithAnnotations; `viewing.id` may be a `personal:`-prefixed
// viewer id for My Music scores, which persist annotations via
// gw_personal_score_annotations while audio/bookmarks/layers stay
// tenant-only (FK gw_sheet_music) and are guarded off for those ids.
import { lazy, Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Maximize2, Minimize2, PencilLine, X } from 'lucide-react';

const PDFViewerWithAnnotations = lazy(() =>
  import('@/components/PDFViewerWithAnnotations').then((m) => ({ default: m.PDFViewerWithAnnotations })),
);

export interface ViewingScore {
  id?: string;
  title: string;
  pdfUrl: string;
}

export function ScoreViewerDialog({
  viewing, onClose, liveTitle, onEditScore,
}: {
  viewing: ViewingScore | null;
  onClose: () => void;
  // Live title override — the Scores page passes the react-query row title
  // so a rename via the pencil updates the header instantly. Falls back to
  // the snapshot captured at open time.
  liveTitle?: string | null;
  // When provided, renders the header pencil (librarian edit-metadata).
  onEditScore?: () => void;
}) {
  // Fullscreen toggle for the viewer dialog (max viewing area for annotation).
  // "Fullscreen" here means fill the browser window, not the whole monitor —
  // toggling a CSS state instead of calling the Fullscreen API keeps the
  // tab chrome visible and works identically on every device, including iOS
  // Safari where requestFullscreen() isn't available anyway.
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <Dialog
      open={!!viewing}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setIsFullscreen(false);
        }
      }}
    >
      <DialogContent
        // Hide default Radix X close — we render a properly-sized close
        // button next to fullscreen below. The defaults were 32px and
        // overlapping on iPhone.
        // The default Radix close is the only direct button child of
        // DialogContent — our own X+Maximize live inside DialogHeader — so
        // [&>button]:hidden hides exactly the duplicate. When the user
        // hits the Maximize button the dialog grows to fill the browser
        // window (not the whole monitor — that was confusing).
        // Safe-area: the app is edge-to-edge (status bar overlays the
        // webview), so a full-height dialog starts at y=0 UNDER the iPhone
        // clock. Fullscreen pads the header past the inset; the centered
        // variant caps its height so the translate-centered top edge can
        // never rise into the inset (2× top inset keeps the split-margin
        // math above the bar on notched phones).
        className={`p-0 flex flex-col overflow-hidden bg-background [&>button]:hidden ${
          isFullscreen
            ? 'w-screen h-[100dvh] max-w-none rounded-none pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]'
            : 'max-w-6xl h-[90dvh] max-h-[calc(100dvh-env(safe-area-inset-top,0px)*2-1rem)]'
        }`}
      >
        <DialogHeader className="p-4 border-b border-border shrink-0 flex-row items-center justify-between space-y-0 gap-3">
          <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl md:text-3xl font-bold tracking-tight min-w-0 flex-1">
            {onEditScore && (
              <button
                type="button"
                onClick={onEditScore}
                className="text-primary hover:opacity-70 transition-opacity shrink-0"
                aria-label="Edit score details"
                title="Edit title / metadata"
              >
                <PencilLine className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
            <span className="truncate">
              {liveTitle || viewing?.title || 'Score'}
            </span>
          </DialogTitle>
          {/* Bigger on desktop, still 44pt-safe on iOS. Outline variant + a
              subtle border so they read as actual buttons against the
              light header instead of tiny ghost icons in the corner. */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFullscreen((v) => !v)}
              className="h-11 w-11 md:h-12 md:w-12"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen (great on iPad)'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5 md:w-6 md:h-6" /> : <Maximize2 className="w-5 h-5 md:w-6 md:h-6" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => { onClose(); setIsFullscreen(false); }}
              className="h-11 w-11 md:h-12 md:w-12"
              aria-label="Close score viewer"
              title="Close"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {viewing && (
            <Suspense
              fallback={
                <div className="py-10 text-center">
                  <Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" />
                </div>
              }
            >
              <PDFViewerWithAnnotations
                pdfUrl={viewing.pdfUrl}
                musicId={viewing.id}
                musicTitle={liveTitle || viewing.title}
                startInAnnotationMode={false}
                className="h-full"
              />
            </Suspense>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
