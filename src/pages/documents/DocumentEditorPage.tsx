// The Documents word processor's editor page: loads one gw_personal_docs
// row, wires DocumentEditor (Task 6) + citation chips (Task 6) + footnotes
// (Task 7) + sources (Task 8) together, autosaves via useDocAutosave, and
// handles in-document image upload. Route registration is Task 10's job
// (this file renders its own content only — the dashboard shell wraps it).
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Editor } from '@tiptap/react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { getDoc, saveDoc, type PersonalDoc } from '@/lib/documents/personalDocsApi';
import { formatInText } from '@/lib/documents/citationFormat';
import type { CitationStyle, DocFootnote, DocSource, PaperMeta } from '@/lib/documents/types';
import { DocumentEditor, countWords } from '@/components/documents/DocumentEditor';
import { removeCitationsFor } from '@/components/documents/extensions/CitationChip';
import { orderedFootnoteIds } from '@/components/documents/extensions/FootnoteRef';
import { SourcesPanel } from '@/components/documents/SourcesPanel';
import { WorksCitedPreview } from '@/components/documents/WorksCitedPreview';
import { PrintPaperView } from '@/components/documents/PrintPaperView';
import { useDocAutosave } from './useDocAutosave';
import { uploadFileAndGetUrl, getSignedUrl } from '@/utils/storage';

// Lazy: ExportDialog pulls in docxExport.ts, which imports the `docx`
// package (~500KB, split into its own vite chunk — see `manualChunks` in
// vite.config.ts). Loading it eagerly would put `docx` in every editor
// page load even for the vast majority of sessions that never export.
const ExportDialog = lazy(() =>
  import('@/components/documents/ExportDialog').then((m) => ({ default: m.ExportDialog })));

type LoadState = 'loading' | 'ready' | 'error';

type SavePatch = Partial<
  Pick<PersonalDoc, 'title' | 'content' | 'citation_style' | 'sources' | 'footnotes' | 'paper_meta' | 'word_count'>
>;

// Dedicated private bucket (migration: 20260811230000_personal_docs.sql) —
// NOT the shared 'user-files' bucket, which carries pre-existing PERMISSIVE
// policies ("storage_select_all" USING (true), blanket bucket-only
// insert/update/delete) that would silently swallow any owner-scoped policy
// added alongside them. Path: <user_id>/<doc_id>/<uuid>.<ext> — the bucket
// itself is the isolation boundary, so no extra folder prefix is needed.
const IMAGE_UPLOAD_BUCKET = 'personal-docs';
const IMAGE_UPLOAD_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';

/**
 * `uploadFileAndGetUrl` hands back a 1-hour signed URL — persisting that
 * directly as an image node's `src` means the image silently breaks an
 * hour after it's inserted. Every inserted/loaded image node also carries a
 * `path` attribute (the stable storage path, via DocImage in
 * DocumentEditor.tsx) so it can be re-signed. Called once per load, before
 * the editor mounts (the load gate already guarantees that ordering), so
 * every open of the document gets a fresh hour instead of persisting a URL
 * that dies.
 */
async function resignDocumentImages(docJson: unknown): Promise<unknown> {
  const imageAttrNodes: Record<string, unknown>[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const obj = node as { type?: string; attrs?: Record<string, unknown>; content?: unknown[] };
    if (obj.type === 'image' && obj.attrs && typeof obj.attrs.path === 'string') {
      imageAttrNodes.push(obj.attrs);
    }
    if (Array.isArray(obj.content)) obj.content.forEach(walk);
  };
  walk(docJson);

  if (imageAttrNodes.length === 0) return docJson;

  await Promise.all(imageAttrNodes.map(async (attrs) => {
    const fresh = await getSignedUrl(IMAGE_UPLOAD_BUCKET, attrs.path as string);
    if (fresh) attrs.src = fresh; // mutated in place; stale src is harmless to overwrite
  }));

  return docJson;
}

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [style, setStyle] = useState<CitationStyle>('mla9');
  const [sources, setSources] = useState<DocSource[]>([]);
  const [footnotes, setFootnotes] = useState<DocFootnote[]>([]);
  const [paperMeta, setPaperMeta] = useState<PaperMeta>({});
  const [initialContent, setInitialContent] = useState<unknown>(null);

  const [userId, setUserId] = useState<string | null>(null);

  const [openFootnoteId, setOpenFootnoteId] = useState<string | null>(null);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [printContent, setPrintContent] = useState<unknown>(null);

  // Live refs so citationChipText/footnoteIndex — stable callbacks handed
  // once to DocumentEditor/its TipTap extensions — always read the latest
  // state instead of whatever was captured on the render they were created.
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;
  const styleRef = useRef(style);
  styleRef.current = style;
  const footnotesRef = useRef(footnotes);
  footnotesRef.current = footnotes;

  const editorInstanceRef = useRef<Editor | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoadState('loading');
    setLoadError(null);
    try {
      const doc = await getDoc(id);
      const resolvedContent = await resignDocumentImages(doc.content);
      setTitle(doc.title);
      setStyle(doc.citation_style);
      setSources(doc.sources);
      setFootnotes(doc.footnotes);
      setPaperMeta(doc.paper_meta ?? {});
      setInitialContent(resolvedContent);
      setLoadState('ready');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load this document.');
      setLoadState('error');
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const doSave = useCallback(async (patch: SavePatch) => {
    if (!id) return;
    await saveDoc(id, patch);
  }, [id]);

  // Flushing on unmount (so in-app navigation doesn't strand the last few
  // keystrokes in the debounce window — unsavedWork's beforeunload guard
  // separately covers hard reloads/closes) lives INSIDE useDocAutosave
  // itself now, registered with `[]` deps against a ref. It used to live
  // here as `useEffect(() => () => flush(), [autosaver])`, but
  // useDocAutosave returned a fresh object every render, so that effect's
  // cleanup fired (and flushed) on every render — i.e. every keystroke.
  const autosaver = useDocAutosave<SavePatch>(doSave, 2000);

  const forceChipRerender = useCallback(() => {
    editorInstanceRef.current?.view.dispatch(editorInstanceRef.current.state.tr);
  }, []);

  // Citation-chip labels and footnote numbers are computed from `sources`/
  // `style`/live-doc-state at TipTap render (toDOM) time, which only
  // re-runs on an actual transaction — hence the forced empty-transaction
  // dispatch below. It must run in an effect (post-commit), not inline in
  // the event handlers that call setSources/setStyle/setFootnotes: TipTap's
  // renderHTML reads `sourcesRef.current`/`styleRef.current`, and those
  // refs are only updated in THIS render's body (further down). Dispatching
  // synchronously right after `setSources(next)` — before React has
  // re-rendered and re-assigned the refs — would force a re-render of the
  // chips against the OLD, stale ref values, leaving them wrong until
  // whatever the next unrelated edit happened to be.
  useEffect(() => {
    if (loadState !== 'ready') return;
    forceChipRerender();
  }, [style, sources, footnotes, loadState, forceChipRerender]);

  const citationChipText = useCallback((sourceId: string, locator?: string) => {
    const s = sourcesRef.current.find((x) => x.id === sourceId);
    return s ? formatInText(s, styleRef.current, locator) : '[missing source]';
  }, []);

  const footnoteIndex = useCallback((noteId: string) => {
    const ed = editorInstanceRef.current;
    if (!ed) return -1;
    return orderedFootnoteIds(ed.getJSON()).indexOf(noteId);
  }, []);

  // onUpdate: recompute footnote numbering source-of-truth (the live doc),
  // prune any footnotes[] entry whose ref was deleted from the text, and
  // schedule the autosave. Only actually calls setFootnotes when pruning
  // changed something, so a plain keystroke doesn't re-identity the
  // `footnotes` array — which would otherwise re-trigger the chip-rerender
  // effect above on every keystroke for no reason.
  const pruneAndSchedule = useCallback((json: unknown, wordCount: number) => {
    const activeIds = new Set(orderedFootnoteIds(json));
    const pruned = footnotesRef.current.filter((f) => activeIds.has(f.id));
    if (pruned.length !== footnotesRef.current.length) setFootnotes(pruned);
    autosaver.schedule({ content: json, word_count: wordCount, footnotes: pruned });
  }, [autosaver]);

  const handleTitleChange = useCallback((next: string) => {
    setTitle(next);
    autosaver.schedule({ title: next });
  }, [autosaver]);

  const handleStyleChange = useCallback((next: CitationStyle) => {
    setStyle(next);
    autosaver.schedule({ citation_style: next });
  }, [autosaver]);

  const handleSourcesChange = useCallback((next: DocSource[]) => {
    setSources(next);
    autosaver.schedule({ sources: next });
  }, [autosaver]);

  const handleMetaChange = useCallback((next: PaperMeta) => {
    setPaperMeta(next);
    autosaver.schedule({ paper_meta: next });
  }, [autosaver]);

  // Export must read FRESH editor state, never `initialContent` (which is
  // only correct as of page load) — the editor's image `src` attributes
  // were re-signed once at load (`resignDocumentImages`), and a doc open
  // long enough for those signed URLs to expire would otherwise export
  // broken image links. `editor.getJSON()` is the live source of truth;
  // `initialContent` is only a fallback for the (practically unreachable,
  // since Export is only rendered once loadState === 'ready') case where
  // the editor instance ref hasn't mounted yet.
  const getExportContent = useCallback(() => editorInstanceRef.current?.getJSON() ?? initialContent, [initialContent]);

  const handleOpenPrintView = useCallback((content: unknown) => {
    setPrintContent(content);
  }, []);

  const handleCite = useCallback((sourceId: string, locator?: string) => {
    editorInstanceRef.current?.chain().focus().insertCitation({ sourceId, locator: locator ?? null }).run();
  }, []);

  const handleFootnoteToolbarClick = useCallback(() => {
    const ed = editorInstanceRef.current;
    if (!ed) return;
    const noteId = crypto.randomUUID();
    ed.chain().focus().insertFootnoteRef({ noteId }).run();
    const next = [...footnotesRef.current, { id: noteId, text: '' }];
    setFootnotes(next);
    autosaver.schedule({ footnotes: next });
    setOpenFootnoteId(noteId);
  }, [autosaver]);

  const handleFootnoteMarkerClick = useCallback((noteId: string) => {
    setOpenFootnoteId(noteId);
  }, []);

  // DocumentEditor doesn't expose a click handler prop directly for markers
  // inside the running text (only the toolbar's onFootnoteClick), so we
  // listen for clicks on the rendered [data-footnote-ref] span via a plain
  // DOM listener scoped to the editor's own container.
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('[data-footnote-ref]');
      const noteId = target?.getAttribute('data-note-id');
      if (noteId) handleFootnoteMarkerClick(noteId);
    };
    container.addEventListener('click', onClick);
    return () => container.removeEventListener('click', onClick);
  }, [handleFootnoteMarkerClick, loadState]);

  const handleFootnoteTextChange = useCallback((noteId: string, text: string) => {
    const next = footnotesRef.current.map((f) => (f.id === noteId ? { ...f, text } : f));
    setFootnotes(next);
    autosaver.schedule({ footnotes: next });
  }, [autosaver]);

  const requestDeleteSource = useCallback((sourceId: string) => {
    setDeletingSourceId(sourceId);
  }, []);

  const confirmDeleteSource = useCallback(() => {
    if (!deletingSourceId) return;
    const ed = editorInstanceRef.current;
    if (ed) removeCitationsFor(ed, deletingSourceId);
    const next = sourcesRef.current.filter((s) => s.id !== deletingSourceId);
    setSources(next);
    autosaver.schedule({ sources: next });
    setDeletingSourceId(null);
  }, [deletingSourceId, autosaver]);

  const deletingSource = deletingSourceId ? sources.find((s) => s.id === deletingSourceId) : undefined;
  const citedCount = deletingSourceId && editorInstanceRef.current
    ? countCitations(editorInstanceRef.current, deletingSourceId)
    : 0;

  const handleImageButtonClick = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file || !id || !userId) return;
    setUploadingImage(true);
    try {
      const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? 'png').toLowerCase();
      // Bucket is 'personal-docs' itself, so the path doesn't repeat the
      // bucket name as a folder prefix — just <user_id>/<doc_id>/<uuid>.ext.
      const folder = `${userId}/${id}`;
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const result = await uploadFileAndGetUrl(file, IMAGE_UPLOAD_BUCKET, folder, fileName);
      if (!result) {
        toast.error('Image upload failed. Please try again.');
        return;
      }
      // `setImage`'s TS type (from @tiptap/extension-image) doesn't know
      // about the `path` attribute DocImage adds, so insert via the
      // generic `insertContent` instead of the narrower `setImage` command
      // — both `src` (fresh signed URL, used now) and `path` (stable
      // storage path, used to re-sign on next load) land on the node.
      editorInstanceRef.current?.chain().focus().insertContent({
        type: 'image',
        attrs: { src: result.url, path: result.path },
      }).run();
    } catch {
      toast.error('Image upload failed. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  }, [id, userId]);

  if (loadState === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="flex max-w-sm flex-col items-center gap-3 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-foreground">{loadError ?? 'Failed to load this document.'}</p>
          <Button type="button" size="sm" onClick={() => void load()}>Retry</Button>
        </Card>
      </div>
    );
  }

  const statusLabel = autosaver.status === 'saving' ? 'Saving…'
    : autosaver.status === 'error' ? 'Save failed — retrying…'
    : autosaver.status === 'saved' ? 'Saved'
    : '';

  const sourcesPanel = (
    <SourcesPanel
      sources={sources}
      style={style}
      onChange={handleSourcesChange}
      onCite={handleCite}
      onDeleteSource={requestDeleteSource}
    />
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onBlur={() => void autosaver.flush()}
          placeholder="Untitled"
          aria-label="Document title"
          className="min-w-0 flex-1 bg-transparent text-2xl font-semibold text-foreground focus:outline-none"
        />

        <ToggleGroup
          type="single"
          value={style}
          onValueChange={(v) => { if (v === 'mla9' || v === 'apa7') handleStyleChange(v); }}
          className="rounded-lg border border-border p-0.5"
        >
          <ToggleGroupItem value="mla9" className="h-7 px-2.5 text-xs data-[state=on]:bg-muted">MLA</ToggleGroupItem>
          <ToggleGroupItem value="apa7" className="h-7 px-2.5 text-xs data-[state=on]:bg-muted">APA</ToggleGroupItem>
        </ToggleGroup>

        <span className="text-xs text-muted-foreground" role="status">{statusLabel}</span>

        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setExportOpen(true)}>
          Export
        </Button>

        <Sheet open={sourcesSheetOpen} onOpenChange={setSourcesSheetOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="text-xs lg:hidden">Sources</Button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader><SheetTitle>Sources</SheetTitle></SheetHeader>
            <div className="mt-3">{sourcesPanel}</div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1" ref={editorContainerRef}>
          <DocumentEditor
            content={initialContent}
            onUpdate={pruneAndSchedule}
            citationChipText={citationChipText}
            footnoteIndex={footnoteIndex}
            onCiteClick={() => setSourcesSheetOpen(true)}
            onFootnoteClick={handleFootnoteToolbarClick}
            onImageClick={handleImageButtonClick}
            editorRef={(editor) => { editorInstanceRef.current = editor; }}
          />

          {openFootnoteId && (
            <div className="mx-auto mt-2 max-w-[700px]">
              <Card className="flex flex-col gap-2 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Footnote</span>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpenFootnoteId(null)}>Close</Button>
                </div>
                <Textarea
                  autoFocus
                  className="min-h-[80px] text-sm"
                  value={footnotes.find((f) => f.id === openFootnoteId)?.text ?? ''}
                  onChange={(e) => handleFootnoteTextChange(openFootnoteId, e.target.value)}
                  placeholder="Footnote text…"
                />
              </Card>
            </div>
          )}

          <div className="mx-auto mt-8 max-w-[700px]">
            <WorksCitedPreview sources={sources} style={style} />
          </div>
        </div>

        <div className="hidden lg:flex">{sourcesPanel}</div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => void handleImageFileChange(e)}
        disabled={uploadingImage}
        aria-label="Upload image"
      />

      <AlertDialog open={!!deletingSourceId} onOpenChange={(open) => { if (!open) setDeletingSourceId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this source and its {citedCount} citation{citedCount === 1 ? '' : 's'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingSource ? `"${deletingSource.title}" ` : ''}
              will be removed from Sources, and every citation chip pointing to it will be deleted from the document. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingSourceId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSource}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {exportOpen && (
        <Suspense fallback={null}>
          <ExportDialog
            open={exportOpen}
            onOpenChange={setExportOpen}
            docTitle={title}
            style={style}
            sources={sources}
            footnotes={footnotes}
            meta={paperMeta}
            onMetaChange={handleMetaChange}
            getContent={getExportContent}
            flush={autosaver.flush}
            onPrint={handleOpenPrintView}
          />
        </Suspense>
      )}

      {printContent !== null && (
        <PrintPaperView
          onClose={() => setPrintContent(null)}
          title={title}
          style={style}
          meta={paperMeta}
          content={printContent}
          sources={sources}
          footnotes={footnotes}
        />
      )}
    </div>
  );
}

function countCitations(editor: Editor, sourceId: string): number {
  let count = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'citationChip' && node.attrs.sourceId === sourceId) count += 1;
  });
  return count;
}
