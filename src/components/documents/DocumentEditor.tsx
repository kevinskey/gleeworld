// Page-scale TipTap 3 editor shell for the Documents word processor.
// Mirrors the useEditor/ToolbarButton idiom from src/components/editor/RichTextEditor.tsx
// but persists TipTap JSON (not HTML) and renders as a serif "page" surface.
import { useEffect, useRef } from 'react';
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
import { DocToolbar } from './DocToolbar';
import { CitationChip } from './extensions/CitationChip';
import { FootnoteRef } from './extensions/FootnoteRef';
import { DocumentSearch } from './extensions/DocumentSearch';
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
  /** Upload + insert image files from the clipboard or a drop. Without this
   *  the editor silently swallows a pasted screenshot. */
  onImageFiles?: (files: File[]) => void;
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
  onImageFiles,
  editorRef,
}: DocumentEditorProps) {
  // Held in a ref so the ProseMirror handlers below (created once, at editor
  // construction) always call the CURRENT callback rather than the one that
  // existed on first render.
  const imageFilesRef = useRef(onImageFiles);
  imageFilesRef.current = onImageFiles;
  const editor = useEditor({
    extensions: documentExtensions({ getCitationText: citationChipText, getFootnoteIndex: footnoteIndex }),
    // `content` is typed `unknown` on the public props so callers don't need
    // to import TipTap's JSON type; TipTap's own Content union is what
    // useEditor actually wants.
    content: (content ?? '') as Content,
    editorProps: {
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
    editorRef?.(editor ?? null);
    return () => editorRef?.(null);
  }, [editor, editorRef]);

  if (!editor) return null;

  return (
    <div className="flex flex-col">
      <DocToolbar editor={editor} onCiteClick={onCiteClick} onFootnoteClick={onFootnoteClick} onImageClick={onImageClick} />
      <FindReplaceBar editor={editor} />
      {/* w-full is load-bearing: in a flex-col parent, mx-auto overrides the
          default cross-axis stretch and the card shrink-wraps its content
          (an empty doc collapsed to ~90px). */}
      {/* 816px ≈ a US-letter page at 96dpi — the sources rail is gone
          (Kevin, 2026-08-13: "let doc have width"), so the paper can be
          paper-sized. */}
      <div className="w-full mx-auto max-w-[816px] px-6 py-10 bg-card rounded-xl">
        <EditorContent editor={editor} />
        <LinkBubble editor={editor} />
      </div>
    </div>
  );
}
