// Sticky toolbar for DocumentEditor. Same ToolbarButton idiom as
// src/components/editor/RichTextEditor.tsx (onMouseDown preventDefault so
// the editor selection survives the click) but with the fuller group set a
// page-scale word processor needs.
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline as UnderlineIcon, Highlighter,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote, TableIcon, Image as ImageIcon,
  Link as LinkIcon, Superscript as FootnoteIcon, BookText,
  Undo, Redo,
} from 'lucide-react';

function ToolbarButton({
  active, disabled, onClick, title, children,
}: { active?: boolean; disabled?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${active ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
    >
      {children}
    </button>
  );
}

const BLOCK_OPTIONS = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
] as const;

function currentBlockValue(editor: Editor): string {
  if (editor.isActive('heading', { level: 1 })) return 'h1';
  if (editor.isActive('heading', { level: 2 })) return 'h2';
  if (editor.isActive('heading', { level: 3 })) return 'h3';
  return 'paragraph';
}

interface DocToolbarProps {
  editor: Editor;
  onCiteClick: () => void;
  onFootnoteClick: () => void;
}

export function DocToolbar({ editor, onCiteClick, onFootnoteClick }: DocToolbarProps) {
  const addLink = () => {
    const url = window.prompt('Link URL (https://…)', editor.getAttributes('link').href || '');
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
  };

  const handleBlockChange = (value: string) => {
    if (value === 'paragraph') { editor.chain().focus().setParagraph().run(); return; }
    const level = Number(value.slice(1)) as 1 | 2 | 3;
    editor.chain().focus().toggleHeading({ level }).run();
  };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-background/95 backdrop-blur px-2 py-1.5">
      <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo className="w-4 h-4" /></ToolbarButton>
      <div className="w-px h-5 bg-border mx-1" />

      <select
        value={currentBlockValue(editor)}
        onChange={(e) => handleBlockChange(e.target.value)}
        className="text-sm rounded border border-input bg-background px-1.5 py-1 text-foreground"
        aria-label="Block style"
      >
        {BLOCK_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter className="w-4 h-4" /></ToolbarButton>
      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="w-4 h-4" /></ToolbarButton>
      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></ToolbarButton>
      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton
        title="Insert 3x3 table"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <TableIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="Insert image (coming soon)" disabled onClick={() => {}}>
        <ImageIcon className="w-4 h-4" />
      </ToolbarButton>
      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton title="Insert footnote" onClick={onFootnoteClick}><FootnoteIcon className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton title="Insert / edit link" active={editor.isActive('link')} onClick={addLink}><LinkIcon className="w-4 h-4" /></ToolbarButton>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onCiteClick(); }}
        title="Insert citation"
        className="flex items-center gap-1 px-2 py-1 rounded text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <BookText className="w-4 h-4" />
        Cite
      </button>
    </div>
  );
}
