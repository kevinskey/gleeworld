// An explicit page break.
//
// On screen it draws a labelled dashed rule so you can see where the page
// will end; in print and in .docx export it becomes a real break. Without
// this the only way to push a heading onto a fresh page was to hammer the
// Enter key and hope the pagination didn't shift.
import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  // Nothing inside it, and it can't be split or partially selected.
  atom: true,
  selectable: true,

  parseHTML() {
    // Round-trips our own serialization, and also catches the div Word and
    // Google Docs emit when you paste a document that already has breaks.
    return [
      { tag: 'div[data-page-break]' },
      { tag: 'div.page-break' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-page-break': 'true',
      class: 'gw-page-break',
      // Inline style rather than a class so it survives into contexts that
      // don't load our stylesheet — the print view renders the same nodes.
      style: 'break-after: page; page-break-after: always;',
    })];
  },

  addCommands() {
    return {
      setPageBreak: () => ({ chain }) =>
        chain()
          .insertContent({ type: this.name })
          // A break as the last node would leave nowhere to type, so ensure
          // there's always a paragraph after it.
          .command(({ tr, state, dispatch }) => {
            const { doc } = state;
            const last = doc.lastChild;
            if (last?.type.name === this.name && dispatch) {
              tr.insert(doc.content.size, state.schema.nodes.paragraph.create());
            }
            return true;
          })
          .run(),
    };
  },
});
