// Full-screen print/PDF overlay for the Documents word processor. NOT a
// route — deliberately, so opening it never re-fetches or re-mounts the
// document (that's the whole doc-loading page's job; this just renders a
// content snapshot the caller already has in memory).
//
// Body HTML comes from TipTap's `generateHTML`, reusing the exact same
// `documentExtensions` factory the live editor uses (DocumentEditor.tsx) —
// citation chips and footnote-ref markers render through the same
// getText/getIndex options as on-screen, so there's no second formatting
// path to drift out of sync with the editor or the .docx export.
import { useEffect, useMemo } from 'react';
import { generateHTML, type JSONContent } from '@tiptap/core';
import { Button } from '@/components/ui/button';
import { formatInText, buildWorksCited } from '@/lib/documents/citationFormat';
import { orderedFootnoteIds } from '@/components/documents/extensions/FootnoteRef';
import type { CitationStyle, DocFootnote, DocSource, PaperMeta } from '@/lib/documents/types';
import { documentExtensions } from './DocumentEditor';
import '@/styles/print-paper.css';

export interface PrintPaperViewProps {
  onClose: () => void;
  title: string;
  style: CitationStyle;
  meta: PaperMeta;
  /** TipTap JSON snapshot — the caller (ExportDialog) reads this fresh from
   * the live editor at click time, same freshness contract as the .docx
   * export. */
  content: unknown;
  sources: DocSource[];
  footnotes: DocFootnote[];
}

function nonEmptyLines(...values: (string | undefined)[]): string[] {
  return values.filter((v): v is string => !!v && v.trim().length > 0);
}

export function PrintPaperView({ onClose, title, style, meta, content, sources, footnotes }: PrintPaperViewProps) {
  // Esc closes, matching the ExportDialog it was opened from.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const orderedIds = useMemo(() => orderedFootnoteIds(content), [content]);

  const bodyHtml = useMemo(() => {
    const footnoteIndex = (noteId: string) => orderedIds.indexOf(noteId);
    const citationChipText = (sourceId: string, locator?: string) => {
      const source = sources.find((s) => s.id === sourceId);
      return source ? formatInText(source, style, locator) : '[missing source]';
    };
    try {
      return generateHTML(
        content as JSONContent,
        documentExtensions({ getCitationText: citationChipText, getFootnoteIndex: footnoteIndex }),
      );
    } catch {
      // Never let a malformed node crash the whole print view — an empty
      // body is recoverable (the student can still see the heading block
      // and Works Cited); a thrown render is not.
      return '<p>This document could not be rendered for print.</p>';
    }
  }, [content, orderedIds, sources, style]);

  // Deduped, in document order — same convention as docxExport's
  // buildFootnoteModels (first occurrence of a repeated noteId wins),
  // deliberately re-derived here rather than imported from docxExport.ts so
  // this component never pulls the `docx` package into its chunk.
  const orderedNotes = useMemo(() => {
    const seen = new Set<string>();
    const notes: { n: number; text: string }[] = [];
    orderedIds.forEach((id, idx) => {
      if (seen.has(id)) return;
      seen.add(id);
      const note = footnotes.find((f) => f.id === id);
      notes.push({ n: idx + 1, text: note?.text ?? '' });
    });
    return notes;
  }, [orderedIds, footnotes]);

  const worksCited = useMemo(
    () => (sources.length > 0 ? buildWorksCited(sources, style) : []),
    [sources, style],
  );
  const worksCitedHeading = style === 'mla9' ? 'Works Cited' : 'References';

  const mlaLines = style === 'mla9' ? nonEmptyLines(meta.studentName, meta.instructor, meta.course, meta.date) : [];
  const apaLines = style === 'apa7' ? nonEmptyLines(meta.studentName, meta.course, meta.instructor, meta.date) : [];

  return (
    <div className="print-paper-overlay fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <span className="text-sm font-semibold text-foreground">Print preview</span>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" className="text-xs" onClick={() => window.print()}>Print</Button>
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onClose}>Close</Button>
        </div>
      </div>

      <div className="print-paper mx-auto bg-white px-8 py-10 text-black">
        {style === 'mla9' ? (
          <div className="print-paper-heading">
            {mlaLines.map((line, i) => <p key={i} className="print-paper-meta-line">{line}</p>)}
            <p className="print-paper-title">{title || 'Untitled'}</p>
          </div>
        ) : (
          <div className="print-paper-titlepage">
            <p className="print-paper-title">{title || 'Untitled'}</p>
            {apaLines.map((line, i) => <p key={i} className="print-paper-meta-line print-paper-center">{line}</p>)}
          </div>
        )}

        {/* Trusted output of our own generateHTML call over the document's
            own TipTap JSON — not user-supplied raw HTML. */}
        <div className="print-paper-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

        {orderedNotes.length > 0 && (
          <div className="print-paper-notes">
            <p className="print-paper-section-heading">Notes</p>
            {orderedNotes.map((note) => (
              <p key={note.n} className="print-paper-hanging">{note.n}. {note.text}</p>
            ))}
          </div>
        )}

        {worksCited.length > 0 && (
          <div className="print-paper-workscited">
            <p className="print-paper-section-heading">{worksCitedHeading}</p>
            {worksCited.map(({ source, segments }) => (
              <p key={source.id} className="print-paper-hanging">
                {segments.map((seg, i) => (seg.italic ? <i key={i}>{seg.text}</i> : <span key={i}>{seg.text}</span>))}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PrintPaperView;
