// The Documents word processor's editor page: loads one gw_personal_docs
// row, wires DocumentEditor (Task 6) + citation chips (Task 6) + footnotes
// (Task 7) + sources (Task 8) together, autosaves via useDocAutosave, and
// handles in-document image upload. Route registration is Task 10's job
// (this file renders its own content only — the dashboard shell wraps it).
import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { CitationStyle, DocFootnote, DocSource } from '@/lib/documents/types';
import { DocumentEditor, countWords } from '@/components/documents/DocumentEditor';
import { removeCitationsFor } from '@/components/documents/extensions/CitationChip';
import { orderedFootnoteIds } from '@/components/documents/extensions/FootnoteRef';
import { SourcesPanel } from '@/components/documents/SourcesPanel';
import { WorksCitedPreview } from '@/components/documents/WorksCitedPreview';
import { useDocAutosave } from './useDocAutosave';
import { uploadFileAndGetUrl } from '@/utils/storage';

type LoadState = 'loading' | 'ready' | 'error';

type SavePatch = Partial<
  Pick<PersonalDoc, 'title' | 'content' | 'citation_style' | 'sources' | 'footnotes' | 'word_count'>
>;

const IMAGE_UPLOAD_BUCKET = 'user-files';
const IMAGE_UPLOAD_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [style, setStyle] = useState<CitationStyle>('mla9');
  const [sources, setSources] = useState<DocSource[]>([]);
  const [footnotes, setFootnotes] = useState<DocFootnote[]>([]);
  const [initialContent, setInitialContent] = useState<unknown>(null);

  const [userId, setUserId] = useState<string | null>(null);

  const [openFootnoteId, setOpenFootnoteId] = useState<string | null>(null);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);

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
      setTitle(doc.title);
      setStyle(doc.citation_style);
      setSources(doc.sources);
      setFootnotes(doc.footnotes);
      setInitialContent(doc.content);
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

  const autosaver = useDocAutosave<SavePatch>(doSave, 2000);

  // Flush any pending edit immediately when the page goes away, so a
  // navigation doesn't leave the last few keystrokes stranded in the
  // debounce window (unsavedWork's beforeunload guard covers hard
  // reloads/closes; this covers in-app navigation).
  useEffect(() => () => { void autosaver.flush(); }, [autosaver]);

  const forceChipRerender = useCallback(() => {
    editorInstanceRef.current?.view.dispatch(editorInstanceRef.current.state.tr);
  }, []);

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
  // schedule the autosave. Also forces a re-render so footnote markers
  // renumber immediately (see FootnoteRef.ts's "Numbering refresh" note).
  const pruneAndSchedule = useCallback((json: unknown, wordCount: number) => {
    const activeIds = new Set(orderedFootnoteIds(json));
    const pruned = footnotesRef.current.filter((f) => activeIds.has(f.id));
    if (pruned.length !== footnotesRef.current.length) setFootnotes(pruned);
    autosaver.schedule({ content: json, word_count: wordCount, footnotes: pruned });
    forceChipRerender();
  }, [autosaver, forceChipRerender]);

  const handleTitleChange = useCallback((next: string) => {
    setTitle(next);
    autosaver.schedule({ title: next });
  }, [autosaver]);

  const handleStyleChange = useCallback((next: CitationStyle) => {
    setStyle(next);
    autosaver.schedule({ citation_style: next });
    forceChipRerender();
  }, [autosaver, forceChipRerender]);

  const handleSourcesChange = useCallback((next: DocSource[]) => {
    setSources(next);
    autosaver.schedule({ sources: next });
    forceChipRerender();
  }, [autosaver, forceChipRerender]);

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
    forceChipRerender();
    setDeletingSourceId(null);
  }, [deletingSourceId, autosaver, forceChipRerender]);

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
      const folder = `personal-docs/${userId}/${id}`;
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const result = await uploadFileAndGetUrl(file, IMAGE_UPLOAD_BUCKET, folder, fileName);
      if (!result) {
        toast.error('Image upload failed. Please try again.');
        return;
      }
      editorInstanceRef.current?.chain().focus().setImage({ src: result.url }).run();
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
