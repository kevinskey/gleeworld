// Atomic inline node representing a citation "chip" — e.g. "(Southern 132)" —
// embedded in the running text. The chip renders its own label via
// `options.getText(sourceId, locator)` rather than storing formatted text in
// the node itself, so switching citation style (MLA9 <-> APA7) or editing a
// source relabels every chip without touching document content.
//
// Style/label refresh: TipTap only re-renders a node's `renderHTML` output
// when the node (or the schema) changes; changing `sources` or
// `citation_style` in React state does neither. The consuming component
// (Task 9) must force a re-render after such changes by dispatching an empty
// transaction: `editor.view.dispatch(editor.state.tr)`.
import { Node, mergeAttributes, type Editor } from '@tiptap/core';

export interface CitationChipOptions {
  getText: (sourceId: string, locator?: string) => string;
}

export interface CitationChipAttrs {
  sourceId: string;
  locator: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    citationChip: {
      /**
       * Insert a citation chip at the current selection.
       * @example editor.commands.insertCitation({ sourceId: 's1', locator: '132' })
       */
      insertCitation: (attrs: CitationChipAttrs) => ReturnType;
    };
  }
}

export const CitationChip = Node.create<CitationChipOptions>({
  name: 'citationChip',

  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return {
      getText: () => '[citation]',
    };
  },

  addAttributes() {
    return {
      sourceId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-source-id'),
        renderHTML: (attributes) => ({ 'data-source-id': attributes.sourceId }),
      },
      locator: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-locator') || null,
        renderHTML: (attributes) => ({ 'data-locator': attributes.locator }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-citation-chip]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const text = this.options.getText(
      node.attrs.sourceId as string,
      (node.attrs.locator as string | null) ?? undefined,
    );
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-citation-chip': '',
        class: 'rounded bg-muted px-0.5',
      }),
      text,
    ];
  },

  addCommands() {
    return {
      insertCitation:
        (attrs: CitationChipAttrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export default CitationChip;

/** Walks a TipTap JSON doc recursively, collecting every distinct `sourceId`
 * referenced by a `citationChip` node. Used to warn/prune a source that no
 * chip cites anymore. */
export function collectCitedSourceIds(docJson: unknown): Set<string> {
  const ids = new Set<string>();

  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const obj = node as { type?: string; attrs?: { sourceId?: string }; content?: unknown[] };
    if (obj.type === 'citationChip' && obj.attrs?.sourceId) {
      ids.add(obj.attrs.sourceId);
    }
    if (Array.isArray(obj.content)) {
      obj.content.forEach(walk);
    }
  };

  walk(docJson);
  return ids;
}

/** Removes every `citationChip` node citing `sourceId` from the editor's
 * document. Collects match positions first, then deletes back-to-front in
 * one chained transaction so earlier deletions never shift the positions of
 * later ones. */
export function removeCitationsFor(editor: Editor, sourceId: string): void {
  const positions: { from: number; to: number }[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'citationChip' && node.attrs.sourceId === sourceId) {
      positions.push({ from: pos, to: pos + node.nodeSize });
    }
  });

  if (positions.length === 0) return;

  let chain = editor.chain();
  for (let i = positions.length - 1; i >= 0; i--) {
    const { from, to } = positions[i];
    chain = chain.deleteRange({ from, to });
  }
  chain.run();
}
