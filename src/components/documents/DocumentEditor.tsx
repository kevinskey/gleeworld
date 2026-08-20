// Page-scale TipTap 3 editor shell for the Documents word processor.
// Mirrors the useEditor/ToolbarButton idiom from src/components/editor/RichTextEditor.tsx
// but persists TipTap JSON (not HTML) and renders as a serif "page" surface.
import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor, type AnyExtension, type Content } from '@tiptap/react';
import { LinkBubble } from './LinkBubble';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { TextAlign } from '@tiptap/extension-text-align';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle, Color, FontFamily, FontSize } from '@tiptap/extension-text-style';
import { CharacterCount } from '@tiptap/extensions';
import { PAGE_DIMENSIONS, PX_PER_IN, resolvePageSetup, type PaperMeta } from '@/lib/documents/types';
import { stripUnreadableColors } from '@/lib/documents/pasteColors';
import { pageContentHeightPx } from '@/lib/documents/pagination';
import { PageGuides } from './PageGuides';
import { DocToolbar } from './DocToolbar';
import { CitationChip } from './extensions/CitationChip';
import { FootnoteRef } from './extensions/FootnoteRef';
import { DocumentSearch } from './extensions/DocumentSearch';
import { PageBreak } from './extensions/PageBreak';
import { CommentMark } from './extensions/CommentMark';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import type { Collaboration as CollabSession } from '@/lib/documents/useCollaboration';
import { FindReplaceBar } from './FindReplaceBar';

/**
 * Image, extended with a `path` attribute (rendered as `data-path`) that
 * carries the Supabase Storage path alongside the (short-lived, 1hr signed)
 * `src`. `src` alone would go stale after the signed URL expires; storing
 * `path` too lets the page's load path (DocumentEditorPage) re-sign a fresh
 * `src` every time the doc is opened, instead of persisting a URL that dies
 * in an hour. `path` isn't part of @tiptap/extension-image's `setImage`
 * command type, so insert via `editor.commands.insertContent({ type:
 * 'image', attrs: { src, path } })` instead (see DocumentEditorPage).
 */
const DocImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      path: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-path'),
        renderHTML: (attributes: { path?: string | null }) =>
          attributes.path ? { 'data-path': attributes.path } : {},
      },
    };
  },
});

/**
 * Options for `documentExtensions`. Task 7 (FootnoteRef) will extend this
 * further with the data that node needs, without changing this factory's
 * call sites.
 */
export interface DocumentExtensionOptions {
  getCitationText?: (sourceId: string, locator?: string) => string;
  getFootnoteIndex?: (noteId: string) => number;
  /** Live session, when collaborative editing is configured AND connected. */
  collab?: CollabSession | null;
  collabUserName?: string;
  collabUserColor?: string;
}

/**
 * Builds the shared TipTap extension array for the Documents editor. Kept as
 * a factory (rather than inlined in `useEditor`) so later tasks can append
 * `CitationChip` / `FootnoteRef` here instead of touching DocumentEditor.
 */
export function documentExtensions(opts: DocumentExtensionOptions = {}): AnyExtension[] {
  return [
    // StarterKit 3.26 already bundles Link and Underline. Re-adding them
    // alongside it registers each extension twice ("[tiptap warn] Duplicate
    // extension names found"), and which configuration survives — including
    // Link's href protocol validation — depends on resolution order rather
    // than on anything written here. Turn StarterKit's copies off so the
    // explicitly configured ones below are unambiguously the ones in effect.
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false,
      underline: false,
      // See the Collaboration block below: a shared document needs Yjs's
      // history, not ProseMirror's, or undo reaches into other people's text.
      ...(opts.collab?.ydoc ? { undoRedo: false as const } : {}),
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank', class: 'text-primary underline' },
    }),
    DocImage,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Subscript,
    Superscript,
    Highlight,
    // TextStyle + its attribute marks. Two reasons, and the first matters
    // more: without them, pasting from Word or Google Docs threw away every
    // font, size, and color in the pasted run, because there was no mark in
    // the schema to hold them. They also back the toolbar's font controls.
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    CharacterCount,
    DocumentSearch,
    PageBreak,
    CommentMark,
    // Collaboration replaces ProseMirror's history: that undo stack is
    // per-client and would reach into OTHER people's edits. Yjs keeps a
    // per-client history instead, which is why StarterKit's undoRedo is
    // switched off above whenever a session is present.
    ...(opts.collab?.ydoc
      ? [
          Collaboration.configure({ document: opts.collab.ydoc }),
          ...(opts.collab.provider
            ? [CollaborationCaret.configure({
                provider: opts.collab.provider,
                user: { name: opts.collabUserName ?? 'Someone', color: opts.collabUserColor ?? '#0f172a' },
              })]
            : []),
        ]
      : []),
    CitationChip.configure({ getText: opts.getCitationText ?? (() => '[citation]') }),
    FootnoteRef.configure({ getIndex: opts.getFootnoteIndex ?? (() => -1) }),
  ];
}

/** Same word-splitting rule CharacterCount uses for its live footer count; kept
 * here so the persisted count (via onUpdate) and the displayed count agree. */
export function countWords(text: string): number {
  return (text.trim().match(/\S+/g) ?? []).length;
}

export interface DocumentEditorProps {
  content: unknown; // TipTap JSON
  onUpdate: (json: unknown, wordCount: number) => void;
  // Renders "(Author, Year)"-style chip labels inside CitationChip nodes.
  citationChipText: (sourceId: string, locator?: string) => string;
  // Looks up a footnoteRef's display number (position in orderedFootnoteIds);
  // returning -1 or omitting this renders the marker as `[?]`.
  footnoteIndex?: (noteId: string) => number;
  onCiteClick: () => void;
  onFootnoteClick: () => void;
  onImageClick: () => void;
  /** Start a comment on the current selection. Disabled when nothing is
   *  selected — a comment with no anchor has nothing to point at. */
  onCommentClick?: () => void;
  /** Upload + insert image files from the clipboard or a drop. Without this
   *  the editor silently swallows a pasted screenshot. */
  onImageFiles?: (files: File[]) => void;
  /** Told how many physical pages the document currently occupies. */
  onPageCountChange?: (pages: number) => void;
  /** Live collaboration session, or null for solo editing. */
  collab?: CollabSession | null;
  collabUserName?: string;
  collabUserColor?: string;
  /** False for someone the doc was shared with read-only. The RLS policy is
   *  the real gate; this stops the UI inviting an edit that would be
   *  rejected on save. */
  editable?: boolean;
  /** Page size + margins (from the doc's paper_meta). Absent = Letter, 1in. */
  pageSetup?: Pick<PaperMeta, 'pageSize' | 'marginIn'>;
  editorRef?: (editor: Editor | null) => void;
}

export function DocumentEditor({
  content,
  onUpdate,
  citationChipText,
  footnoteIndex,
  onCiteClick,
  onFootnoteClick,
  onImageClick,
  onCommentClick,
  onImageFiles,
  onPageCountChange,
  collab,
  collabUserName,
  collabUserColor,
  editable = true,
  pageSetup,
  editorRef,
}: DocumentEditorProps) {
  // Held in a ref so the ProseMirror handlers below (created once, at editor
  // construction) always call the CURRENT callback rather than the one that
  // existed on first render.
  const imageFilesRef = useRef(onImageFiles);
  imageFilesRef.current = onImageFiles;
  // The rendered ProseMirror element, in state rather than a ref: PageGuides
  // has to re-run its measurement when the node actually appears, and a ref
  // mutation doesn't re-render.
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);
  const editor = useEditor({
    extensions: documentExtensions({
      getCitationText: citationChipText,
      getFootnoteIndex: footnoteIndex,
      collab,
      collabUserName,
      collabUserColor,
    }),
    // `content` is typed `unknown` on the public props so callers don't need
    // to import TipTap's JSON type; TipTap's own Content union is what
    // useEditor actually wants.
    // With Yjs holding the document, `content` must be empty: every client
    // passing it would insert its own copy into the shared doc and everyone
    // would see the text N times. Seeding an unmigrated document happens
    // once, in DocumentEditorPage, by the first client to arrive.
    content: (collab?.ydoc ? '' : (content ?? '')) as Content,
    editable,
    editorProps: {
      /**
       * Copying from a dark-themed source puts `color: rgb(255,255,255)` on
       * the clipboard. Preserved onto white paper the text is invisible, and
       * the person pasting reasonably concludes that paste is broken (Kevin,
       * 2026-08-20). Only unreadable colours are dropped — a red heading
       * pasted from Word stays red.
       */
      transformPastedHTML(html) {
        return stripUnreadableColors(html);
      },
      /**
       * Images from the clipboard. TipTap/ProseMirror drop image FILES on the
       * floor — the clipboard's text/html flavor is what it reads, and for a
       * screenshot there isn't one — so pasting a screenshot did nothing at
       * all. Returning false for everything else leaves normal text/HTML
       * paste exactly as it was.
       */
      handlePaste(_view, event) {
        const files = Array.from(event.clipboardData?.files ?? [])
          .filter((f) => f.type.startsWith('image/'));
        if (files.length === 0 || !imageFilesRef.current) return false;
        event.preventDefault();
        imageFilesRef.current(files);
        return true;
      },
      /** Same for dragging an image file in from the desktop. */
      handleDrop(_view, event) {
        const dropped = (event as DragEvent).dataTransfer?.files;
        const files = Array.from(dropped ?? []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0 || !imageFilesRef.current) return false;
        event.preventDefault();
        imageFilesRef.current(files);
        return true;
      },
      attributes: {
        // focus-visible ring-0: index.css applies a global tenant-tinted
        // :focus-visible ring; outline-none alone doesn't suppress it.
        class: 'font-serif text-[17px] leading-relaxed text-foreground focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[60vh]',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON(), countWords(editor.getText()));
    },
  });

  useEffect(() => {
    // Permission arrives asynchronously, after the editor is constructed.
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    editorRef?.(editor ?? null);
    return () => editorRef?.(null);
  }, [editor, editorRef]);

  if (!editor) return null;

  const { pageSize: pageWidthKey, marginIn } = resolvePageSetup(pageSetup);

  return (
    <div className="flex flex-col">
      <DocToolbar
        editor={editor}
        onCiteClick={onCiteClick}
        onFootnoteClick={onFootnoteClick}
        onImageClick={onImageClick}
        onCommentClick={onCommentClick}
      />
      <FindReplaceBar editor={editor} />
      {/* w-full is load-bearing: in a flex-col parent, mx-auto overrides the
          default cross-axis stretch and the card shrink-wraps its content
          (an empty doc collapsed to ~90px). */}
      {/* Width and padding come from the doc's page setup rather than the old
          hardcoded 816px/px-6: 816px WAS US Letter at 96dpi, so a doc with no
          setup stored renders byte-identically to before. Padding is the real
          margin, so what you type sits where it will print. */}
      <div
        className="w-full mx-auto bg-card rounded-xl"
        style={{
          maxWidth: PAGE_DIMENSIONS[pageWidthKey].width * PX_PER_IN,
          paddingInline: marginIn * PX_PER_IN,
          paddingBlock: marginIn * PX_PER_IN,
        }}
      >
        {/* relative: the page rules are absolutely positioned against this
            box, so their offsets are measured from the top of the content
            column — the same origin the page setup's margins use. */}
        <div className="relative">
          <PageGuides
            contentEl={contentEl}
            pageHeightPx={pageContentHeightPx(pageSetup)}
            offsetTopPx={0}
            onPageCountChange={onPageCountChange}
          />
          <div ref={setContentEl}>
            <EditorContent editor={editor} />
          </div>
        </div>
        <LinkBubble editor={editor} />
      </div>
    </div>
  );
}
