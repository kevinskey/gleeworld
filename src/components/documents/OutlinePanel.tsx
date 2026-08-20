// Document outline — every heading in the doc, indented by level, click to
// jump. Derived from editor state on each transaction rather than stored, so
// it can never drift from the document.
import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ListTree } from 'lucide-react';

interface OutlineEntry {
  pos: number;
  level: number;
  text: string;
}

function readOutline(editor: Editor): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return;
    entries.push({
      pos,
      level: (node.attrs.level as number) ?? 1,
      // An empty heading still gets a row — it's a real position in the doc
      // and leaving it out makes the outline disagree with the page.
      text: node.textContent.trim() || 'Untitled section',
    });
  });
  return entries;
}

export function OutlinePanel({ editor }: { editor: Editor | null }) {
  const [entries, setEntries] = useState<OutlineEntry[]>([]);

  useEffect(() => {
    if (!editor) { setEntries([]); return; }
    const sync = () => setEntries(readOutline(editor));
    sync();
    editor.on('transaction', sync);
    return () => { editor.off('transaction', sync); };
  }, [editor]);

  if (!editor) return null;

  if (entries.length === 0) {
    return (
      <div className="px-1 py-6 text-center text-sm text-muted-foreground">
        <ListTree className="mx-auto mb-2 h-5 w-5 opacity-50" />
        No headings yet. Use the block-style menu to mark a line as Heading 1,
        2, or 3 and it will show up here.
      </div>
    );
  }

  return (
    <nav className="space-y-0.5 py-1" aria-label="Document outline">
      {entries.map((entry) => (
        <button
          key={`${entry.pos}-${entry.text}`}
          type="button"
          onClick={() => {
            // +1 lands the caret inside the heading rather than before it.
            editor.chain().focus().setTextSelection(entry.pos + 1).scrollIntoView().run();
          }}
          className="block w-full truncate rounded px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          style={{ paddingLeft: `${0.5 + (entry.level - 1) * 0.85}rem` }}
          title={entry.text}
        >
          {entry.text}
        </button>
      ))}
    </nav>
  );
}
