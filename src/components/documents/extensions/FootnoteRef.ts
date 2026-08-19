// Atomic inline node representing a footnote marker embedded in the running
// text. The marker itself carries only a `noteId` — the note TEXT lives in
// the document row's `footnotes: DocFootnote[]` column (Task 1), edited in a
// plain textarea popover (Task 9). The visible number is derived, not
// stored: `options.getIndex(noteId)` looks up the marker's position in
// `orderedFootnoteIds` of the current document JSON, so deleting or
// reordering markers renumbers every remaining one automatically. A
// `noteId` with no matching entry (or `getIndex` returning -1) renders as
// `[?]` rather than a number — orphan hygiene in that direction; the
// opposite direction (a `footnotes[]` entry whose ref was deleted) is
// Task 9's job to prune on save.
//
// Numbering refresh: TipTap only re-renders a node's `renderHTML` output
// when the node (or the schema) changes; recomputing `getIndex` from fresh
// document JSON in React state does neither. As with CitationChip, the
// consuming component (Task 9, in the same `onUpdate` that autosaves) must
// force a re-render after such changes by dispatching an empty
// transaction: `editor.view.dispatch(editor.state.tr)`.
import { Node, mergeAttributes } from '@tiptap/core';

export interface FootnoteRefOptions {
  getIndex: (noteId: string) => number;
}

export interface FootnoteRefAttrs {
  noteId: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnoteRef: {
      /**
       * Insert a footnote reference marker at the current selection.
       * @example editor.commands.insertFootnoteRef({ noteId: 'n1' })
       */
      insertFootnoteRef: (attrs: FootnoteRefAttrs) => ReturnType;
    };
  }
}

export const FootnoteRef = Node.create<FootnoteRefOptions>({
  name: 'footnoteRef',

  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return {
      getIndex: () => -1,
    };
  },

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-note-id'),
        renderHTML: (attributes) => ({ 'data-note-id': attributes.noteId }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-footnote-ref]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const index = this.options.getIndex(node.attrs.noteId as string);
    const text = index < 0 ? '[?]' : String(index + 1);
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-footnote-ref': '',
        class: 'align-super text-xs',
      }),
      ['sup', {}, text],
    ];
  },

  addCommands() {
    return {
      insertFootnoteRef:
        (attrs: FootnoteRefAttrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export default FootnoteRef;

/** Walks a TipTap JSON doc recursively, collecting every `footnoteRef`
 * node's `noteId` in document order (duplicates included, matching the
 * order markers appear in the running text). Used to derive footnote
 * numbering: position in this array + 1. */
export function orderedFootnoteIds(docJson: unknown): string[] {
  const ids: string[] = [];

  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const obj = node as { type?: string; attrs?: { noteId?: string }; content?: unknown[] };
    if (obj.type === 'footnoteRef' && obj.attrs?.noteId) {
      ids.push(obj.attrs.noteId);
    }
    if (Array.isArray(obj.content)) {
      obj.content.forEach(walk);
    }
  };

  walk(docJson);
  return ids;
}
