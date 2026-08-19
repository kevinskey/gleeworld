// LinkBubble — Google-Docs-style popover for links inside DocumentEditor.
//
// The Link extension runs with openOnClick: false (a plain click must place
// the cursor for editing, not navigate away mid-essay), so this bubble is
// the way a reader actually FOLLOWS a link: put the cursor in one and a
// small bar appears with the URL (opens in a new tab), Edit, and Remove.
// Positioned with position:fixed from coordsAtPos — no floating-ui dep.
import { useCallback, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';

interface BubbleState {
  href: string;
  left: number;
  top: number;
}

export function LinkBubble({ editor }: { editor: Editor }) {
  const [bubble, setBubble] = useState<BubbleState | null>(null);

  const refresh = useCallback(() => {
    if (editor.isDestroyed) return;
    if (!editor.isActive('link')) {
      setBubble(null);
      return;
    }
    const href = editor.getAttributes('link').href as string | undefined;
    if (!href) {
      setBubble(null);
      return;
    }
    // Anchor the bubble under the caret end of the current selection.
    const coords = editor.view.coordsAtPos(editor.state.selection.to);
    setBubble({ href, left: coords.left, top: coords.bottom + 6 });
  }, [editor]);

  useEffect(() => {
    // Scrolling moves the fixed-position anchor point out from under us,
    // and focus leaving the editor means the bubble would float over
    // unrelated UI; cheapest correct behavior is to dismiss for both.
    const dismiss = () => setBubble(null);
    editor.on('selectionUpdate', refresh);
    editor.on('transaction', refresh);
    editor.on('blur', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      editor.off('selectionUpdate', refresh);
      editor.off('transaction', refresh);
      editor.off('blur', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [editor, refresh]);

  if (!bubble) return null;

  const editLink = () => {
    const url = window.prompt('Link URL (https://…)', bubble.href);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  };

  return (
    <div
      className="fixed z-30 flex items-center gap-1 rounded-lg border border-border bg-popover px-2 py-1 shadow-md"
      style={{ left: bubble.left, top: bubble.top }}
      // Keep clicks here from re-entering the editor and moving the caret.
      onMouseDown={(e) => e.preventDefault()}
    >
      <a
        href={bubble.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex max-w-[240px] items-center gap-1 truncate text-sm text-primary underline underline-offset-2"
        title={bubble.href}
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{bubble.href.replace(/^https?:\/\//i, '')}</span>
      </a>
      <div className="mx-0.5 h-4 w-px bg-border" />
      <button
        type="button"
        onClick={editLink}
        title="Edit link"
        aria-label="Edit link"
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={removeLink}
        title="Remove link"
        aria-label="Remove link"
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
