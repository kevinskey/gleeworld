// Page-scale TipTap 3 editor shell for the Documents word processor.
// Mirrors the useEditor/ToolbarButton idiom from src/components/editor/RichTextEditor.tsx
// but persists TipTap JSON (not HTML) and renders as a serif "page" surface.
import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor, type AnyExtension, type Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { TextAlign } from '@tiptap/extension-text-align';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Highlight } from '@tiptap/extension-highlight';
import { CharacterCount } from '@tiptap/extensions';
import { DocToolbar } from './DocToolbar';

/**
 * Options for `documentExtensions`. Empty for now — Task 6 (CitationChip) and
 * Task 7 (FootnoteRef) will extend this with the data those marks/nodes need
 * (e.g. a source lookup) without changing this factory's call sites.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DocumentExtensionOptions {}

/**
 * Builds the shared TipTap extension array for the Documents editor. Kept as
 * a factory (rather than inlined in `useEditor`) so later tasks can append
 * `CitationChip` / `FootnoteRef` here instead of touching DocumentEditor.
 */
export function documentExtensions(_opts: DocumentExtensionOptions = {}): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank', class: 'text-primary underline' },
    }),
    Image,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Subscript,
    Superscript,
    Highlight,
    CharacterCount,
    // Tasks 6-7 append CitationChip and FootnoteRef here.
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
  // Task 6 wires this into CitationChip's node view to render "(Author, Year)"-
  // style chip labels; unused until then.
  citationChipText: (sourceId: string, locator?: string) => string;
  onCiteClick: () => void;
  onFootnoteClick: () => void;
  editorRef?: (editor: Editor | null) => void;
}

export function DocumentEditor({
  content,
  onUpdate,
  onCiteClick,
  onFootnoteClick,
  editorRef,
}: DocumentEditorProps) {
  const editor = useEditor({
    extensions: documentExtensions(),
    // `content` is typed `unknown` on the public props so callers don't need
    // to import TipTap's JSON type; TipTap's own Content union is what
    // useEditor actually wants.
    content: (content ?? '') as Content,
    editorProps: {
      attributes: {
        class: 'font-serif text-[17px] leading-relaxed text-foreground focus:outline-none min-h-[60vh]',
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
      <DocToolbar editor={editor} onCiteClick={onCiteClick} onFootnoteClick={onFootnoteClick} />
      <div className="mx-auto max-w-[700px] px-6 py-10 bg-card rounded-xl">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
