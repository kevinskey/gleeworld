// The Planner note editor. TipTap (StarterKit) + task lists whose items
// carry a stable data-block-id — the join key to gw_planner_tasks rows.
// Autosaves (debounced) through notesApi.saveNote, which owns the whole
// pipeline: projections, tags, wiki links, task sync, revisions, and an
// optimistic version check. A conflict (second tab/device) surfaces as a
// banner with an explicit reload — never a silent clobber.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import Image from '@tiptap/extension-image';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered,
  ListChecks, Quote, Code, Undo2, Redo2, Heading1, Heading2, Heading3,
  Link2, FileText, Loader2, AlertTriangle, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { saveNote, listLinkTargets, NoteConflictError } from '@/lib/planner/notesApi';
import type { DocNode, PlannerNote } from '@/lib/planner/types';
import './noteEditor.css';

type SaveState = 'saved' | 'dirty' | 'saving' | 'conflict' | 'error';

// TaskItem with a persistent block id, the note↔task join key.
const PlannerTaskItem = TaskItem.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      blockId: {
        default: null,
        keepOnSplit: false,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-block-id'),
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.blockId ? { 'data-block-id': attributes.blockId } : {},
      },
    };
  },
});

/** Give every taskItem a blockId, outside the undo history. */
function assignBlockIds(editor: Editor): void {
  const { state } = editor;
  let tr = state.tr;
  let changed = false;
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'taskItem' && !node.attrs.blockId) {
      tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, blockId: crypto.randomUUID() });
      changed = true;
    }
  });
  if (changed) {
    tr.setMeta('addToHistory', false);
    editor.view.dispatch(tr);
  }
}

export interface NoteEditorProps {
  note: PlannerNote;
  onSaved?: (note: PlannerNote) => void;
  /** hide the title input (period notes render their own header) */
  hideTitle?: boolean;
}

export default function NoteEditor({ note, onSaved, hideTitle }: NoteEditorProps) {
  const [saveState, setSaveState] = useState<SaveState>('saved');
  // The title input is deliberately UNCONTROLLED (ref + DOM value): a
  // controlled value tied to React state could be reset by save-cycle
  // re-renders, eating typed characters (the launch-day "can't type a
  // title" bug). The DOM owns keystrokes; we only write to it when
  // switching notes or adopting a fresher server copy.
  const titleInputRef = useRef<HTMLInputElement>(null);
  const versionRef = useRef(note.version);
  const titleRef = useRef(note.title);
  const noteIdRef = useRef(note.id);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const stateRef = useRef<SaveState>('saved');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TaskList,
      PlannerTaskItem.configure({ nested: true }),
      Image,
    ],
    content: note.content,
    editorProps: {
      attributes: {
        class: 'planner-editor prose prose-base max-w-none focus:outline-none min-h-[40vh] text-foreground',
        'aria-label': 'Note body',
      },
    },
    onCreate: ({ editor: e }) => assignBlockIds(e),
    onUpdate: ({ editor: e }) => {
      assignBlockIds(e);
      markDirty();
    },
  });

  const doSave = useCallback(async () => {
    if (!editor || savingRef.current) {
      pendingRef.current = savingRef.current;
      return;
    }
    savingRef.current = true;
    stateRef.current = 'saving';
    setSaveState('saving');
    try {
      const saved = await saveNote(noteIdRef.current, {
        title: titleRef.current,
        content: editor.getJSON() as DocNode,
        expectedVersion: versionRef.current,
      });
      versionRef.current = saved.version;
      stateRef.current = 'saved';
      setSaveState('saved');
      onSaved?.(saved);
    } catch (err) {
      if (err instanceof NoteConflictError) {
        stateRef.current = 'conflict';
        setSaveState('conflict');
      } else {
        console.error(err);
        stateRef.current = 'error';
        setSaveState('error');
        toast.error('Could not save the note');
      }
    } finally {
      savingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        void doSave();
      }
    }
  }, [editor, onSaved]);

  const markDirty = useCallback(() => {
    // in conflict, autosaving again is futile (the version guard will
    // reject every attempt) — wait for reload/adoption instead
    if (stateRef.current === 'conflict') return;
    stateRef.current = 'dirty';
    setSaveState('dirty');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void doSave(), 1200);
  }, [doSave]);

  // Reconcile with the note prop: reset on a different note id, and ADOPT
  // fresher server copies of the SAME note (a remount initializes from the
  // React Query cache, which can be stale — the pre-fix failure mode was a
  // versionRef stuck at 1 silently losing every subsequent save).
  useEffect(() => {
    if (!editor) return;
    const switching = noteIdRef.current !== note.id;
    const serverIsAhead = !switching && note.version > versionRef.current;
    if (!switching && !serverIsAhead) return;
    if (serverIsAhead && (stateRef.current === 'dirty' || stateRef.current === 'saving')) {
      // genuine concurrent edit: local unsaved changes vs newer server copy
      stateRef.current = 'conflict';
      setSaveState('conflict');
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    noteIdRef.current = note.id;
    versionRef.current = note.version;
    titleRef.current = note.title;
    if (titleInputRef.current) titleInputRef.current.value = note.title;
    stateRef.current = 'saved';
    setSaveState('saved');
    editor.commands.setContent(note.content);
    assignBlockIds(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id, note.version, editor]);

  // flush on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const reloadAfterConflict = useCallback(() => {
    // simplest correct recovery: rehydrate from the server copy
    window.location.reload();
  }, []);

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        {!hideTitle ? (
          <input
            ref={titleInputRef}
            defaultValue={note.title}
            onChange={(e) => {
              titleRef.current = e.target.value;
              markDirty();
            }}
            placeholder="Untitled note"
            aria-label="Note title"
            className="w-full bg-transparent text-xl font-semibold text-foreground outline-none placeholder:text-muted-foreground"
          />
        ) : <div />}
        <SaveIndicator state={saveState} onReload={reloadAfterConflict} />
      </div>

      {saveState === 'conflict' && (
        <div className="flex items-center justify-between rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground" role="alert">
          <span>This note changed somewhere else. Reload to pick up the latest version.</span>
          <Button size="sm" variant="outline" onClick={reloadAfterConflict}>Reload</Button>
        </div>
      )}

      <EditorToolbar editor={editor} onDirty={markDirty} />
      <EditorContent editor={editor} />
    </div>
  );
}

function SaveIndicator({ state, onReload }: { state: SaveState; onReload: () => void }) {
  switch (state) {
    case 'saving':
      return <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Saving…</span>;
    case 'dirty':
      return <span className="shrink-0 text-xs text-muted-foreground">Unsaved changes</span>;
    case 'conflict':
      return (
        <button onClick={onReload} className="flex shrink-0 items-center gap-1 text-xs text-warning">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Conflict
        </button>
      );
    case 'error':
      return <span className="flex shrink-0 items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Save failed</span>;
    default:
      return <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5" aria-hidden /> Saved</span>;
  }
}

function ToolbarButton({ onClick, active, label, children }: {
  onClick: () => void; active?: boolean; label: string; children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="sm"
      className="h-8 w-8 p-0"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function EditorToolbar({ editor, onDirty }: { editor: Editor; onDirty: () => void }) {
  const run = (fn: () => boolean) => () => {
    fn();
    onDirty();
  };
  // MUST be a function: tiptap chains execute each command's side effects
  // the moment it's invoked (.run() only dispatches), so a shared
  // `editor.chain().focus()` built during render stole focus into the
  // editor on every toolbar re-render — scrolling the page to the editor
  // on load and instantly dismissing any open popover/menu.
  const c = () => editor.chain().focus();
  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-card px-1 py-0.5" role="toolbar" aria-label="Formatting">
      <ToolbarButton label="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={run(() => c().toggleHeading({ level: 1 }).run())}><Heading1 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={run(() => c().toggleHeading({ level: 2 }).run())}><Heading2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={run(() => c().toggleHeading({ level: 3 }).run())}><Heading3 className="h-4 w-4" /></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={run(() => c().toggleBold().run())}><Bold className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={run(() => c().toggleItalic().run())}><Italic className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Underline" active={editor.isActive('underline')} onClick={run(() => c().toggleUnderline().run())}><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Strikethrough" active={editor.isActive('strike')} onClick={run(() => c().toggleStrike().run())}><Strikethrough className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Inline code" active={editor.isActive('code')} onClick={run(() => c().toggleCode().run())}><Code className="h-4 w-4" /></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <ToolbarButton label="Bulleted list" active={editor.isActive('bulletList')} onClick={run(() => c().toggleBulletList().run())}><List className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Numbered list" active={editor.isActive('orderedList')} onClick={run(() => c().toggleOrderedList().run())}><ListOrdered className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Task list" active={editor.isActive('taskList')} onClick={run(() => c().toggleTaskList().run())}><ListChecks className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Quote" active={editor.isActive('blockquote')} onClick={run(() => c().toggleBlockquote().run())}><Quote className="h-4 w-4" /></ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <WikiLinkButton editor={editor} onDirty={onDirty} />
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <ToolbarButton label="Undo" onClick={run(() => c().undo().run())}><Undo2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton label="Redo" onClick={run(() => c().redo().run())}><Redo2 className="h-4 w-4" /></ToolbarButton>
    </div>
  );
}

/**
 * Insert a `[[Note Title]]` wiki link (portable plain text; resolved to
 * a real link row on save). v1 inserts via this picker; typing `[[` with
 * live autocomplete is a documented follow-up.
 */
function WikiLinkButton({ editor, onDirty }: { editor: Editor; onDirty: () => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [targets, setTargets] = useState<{ id: string; title: string; date_key: string | null }[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listLinkTargets(query)
      .then((rows) => { if (!cancelled) setTargets(rows); })
      .catch(() => { /* picker stays usable with stale rows */ });
    return () => { cancelled = true; };
  }, [open, query]);

  const insert = (label: string) => {
    editor.chain().focus().insertContent(`[[${label}]] `).run();
    onDirty();
    setOpen(false);
    setQuery('');
  };

  const items = useMemo(
    () => targets.filter((t) => (t.title ?? t.date_key ?? '').trim().length > 0),
    [targets],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2" aria-label="Link to note">
          <Link2 className="h-4 w-4" />
          <span className="hidden text-xs sm:inline">Link note</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Find a note…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No matching notes.</CommandEmpty>
            <CommandGroup>
              {items.map((t) => (
                <CommandItem key={t.id} value={t.id} onSelect={() => insert(t.title || t.date_key || '')}>
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{t.title || t.date_key}</span>
                </CommandItem>
              ))}
              {query.trim() && (
                <CommandItem value={`__new__${query}`} onSelect={() => insert(query.trim())}>
                  <Link2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  Link “{query.trim()}”
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
