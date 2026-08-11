// Export flow for the Documents word processor: a paper-details form
// (student name / instructor / course / date, prefilled from `paper_meta`
// and saved back through the caller's autosaver) plus two export actions —
// download a real .docx, or open the full-screen print/PDF view
// (PrintPaperView, Task 12 Step 2).
//
// Dynamically imported by DocumentEditorPage (`React.lazy`) so `docx`
// (~500KB, imported transitively via docxExport.ts) only loads once the
// user actually opens Export — see the `docx` entry in vite.config.ts's
// `manualChunks`.
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { exportDocx, exportFilename, type ExportInput } from '@/lib/documents/docxExport';
import type { CitationStyle, DocFootnote, DocSource, PaperMeta } from '@/lib/documents/types';

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docTitle: string;
  style: CitationStyle;
  sources: DocSource[];
  footnotes: DocFootnote[];
  meta: PaperMeta;
  /** Called on every field change; the caller owns persistence (schedules a
   * `paper_meta` autosave patch), matching how title/style edits work
   * elsewhere on the page. */
  onMetaChange: (meta: PaperMeta) => void;
  /**
   * Reads FRESH editor state at the moment export is triggered — never a
   * snapshot captured at page-load. Image `src` attributes are re-signed
   * once, when the page loads (`resignDocumentImages` in
   * DocumentEditorPage); exporting old load-time state risks shipping
   * signed URLs that already expired. Residual risk this doesn't close: a
   * session left open past the signed URL's ~1h lifetime can still export
   * expired `src`s, since nothing re-signs mid-session.
   */
  getContent: () => unknown;
  /** Autosaver's `flush()` — awaited before either export action so a
   * paper-details edit made seconds ago is durably saved first. */
  flush: () => Promise<void>;
  /** Opens PrintPaperView with a content snapshot taken at click time. */
  onPrint: (content: unknown) => void;
}

export function ExportDialog({
  open, onOpenChange, docTitle, style, sources, footnotes, meta,
  onMetaChange, getContent, flush, onPrint,
}: ExportDialogProps) {
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const updateMeta = useCallback((patch: Partial<PaperMeta>) => {
    onMetaChange({ ...meta, ...patch });
  }, [meta, onMetaChange]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await flush();
      const input: ExportInput = { content: getContent(), title: docTitle, style, sources, footnotes, meta };
      const blob = await exportDocx(input);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFilename(docTitle, 'docx');
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export to .docx failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [flush, getContent, docTitle, style, sources, footnotes, meta]);

  const handlePrint = useCallback(async () => {
    setPrinting(true);
    try {
      await flush();
      const content = getContent();
      // `getContent()` falls back to `initialContent`, which can still be
      // `null` in the (practically unreachable, but not impossible) case
      // the editor ref hasn't mounted yet — opening the overlay with no
      // content would silently render an empty paper instead of failing
      // loudly, so bail out with a toast instead of calling `onPrint`.
      if (content === null || content === undefined) {
        toast.error('Could not open the print view — the document is not ready yet. Please try again.');
        return;
      }
      onPrint(content);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the print view. Please try again.');
    } finally {
      setPrinting(false);
    }
  }, [flush, getContent, onPrint, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Export paper</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="export-student-name" className="text-xs">Student name</Label>
            <Input
              id="export-student-name"
              className="text-sm"
              value={meta.studentName ?? ''}
              onChange={(e) => updateMeta({ studentName: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="export-instructor" className="text-xs">Instructor</Label>
            <Input
              id="export-instructor"
              className="text-sm"
              value={meta.instructor ?? ''}
              onChange={(e) => updateMeta({ instructor: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="export-course" className="text-xs">Course</Label>
            <Input
              id="export-course"
              className="text-sm"
              value={meta.course ?? ''}
              onChange={(e) => updateMeta({ course: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="export-date" className="text-xs">Date</Label>
            {/* Plain text, defaults empty — never auto-filled with today's
             * date. The student may be post-dating (e.g. writing ahead of a
             * due date), so guessing "today" would silently write a wrong
             * date into the paper. */}
            <Input
              id="export-date"
              className="text-sm"
              placeholder="e.g. 3 March 2026"
              value={meta.date ?? ''}
              onChange={(e) => updateMeta({ date: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={printing}
            onClick={() => void handlePrint()}
          >
            {printing ? 'Preparing…' : 'Print / Save as PDF'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="text-xs"
            disabled={downloading}
            onClick={() => void handleDownload()}
          >
            {downloading ? 'Exporting…' : 'Download .docx'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExportDialog;
