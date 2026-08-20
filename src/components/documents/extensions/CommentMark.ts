// The anchor half of comments: a mark carrying a comment's id, painted as a
// highlight on the commented text. The thread itself lives in
// gw_doc_comments — see the migration for why the text isn't in the doc.
//
// A mark (not a node) because a comment covers a RANGE of existing text and
// must not alter its structure: bolding, links, and citations inside a
// commented sentence all have to keep working.
import { Mark, mergeAttributes } from '@tiptap/core';

export interface CommentMarkAttrs {
  commentId: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    commentMark: {
      setComment: (commentId: string) => ReturnType;
      unsetComment: (commentId: string) => ReturnType;
    };
  }
}

export const CommentMark = Mark.create({
  name: 'comment',

  // Comments overlap freely — two people can comment on overlapping phrases,
  // and one range can carry several ids' worth of discussion.
  excludes: '',
  // Typing at the edge of a commented range should NOT extend the comment;
  // that silently grows someone's anchor under them.
  inclusive: false,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-comment-id'),
        renderHTML: (attrs: CommentMarkAttrs) =>
          attrs.commentId ? { 'data-comment-id': attrs.commentId } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'gw-comment-anchor' }), 0];
  },

  addCommands() {
    return {
      setComment: (commentId: string) => ({ commands }) =>
        commands.setMark(this.name, { commentId }),

      // Removing one comment must not remove the others on the same text.
      // setMark/unsetMark work on the whole mark type, so this walks the
      // document and clears only the ranges whose id matches.
      unsetComment: (commentId: string) => ({ tr, state, dispatch }) => {
        const markType = state.schema.marks[this.name];
        if (!markType) return false;
        const ranges: { from: number; to: number }[] = [];
        state.doc.descendants((node, pos) => {
          if (!node.isText) return;
          const mark = node.marks.find(
            (m) => m.type === markType && m.attrs.commentId === commentId,
          );
          if (mark) ranges.push({ from: pos, to: pos + node.nodeSize });
        });
        if (ranges.length === 0) return false;
        if (dispatch) {
          for (const range of ranges) {
            tr.removeMark(range.from, range.to, markType.create({ commentId }));
          }
          dispatch(tr);
        }
        return true;
      },
    };
  },
});

/** Every comment id currently anchored in a TipTap JSON document. Used to
 *  spot threads whose text was deleted (see orphanedComments). */
export function anchoredCommentIds(docJson: unknown): Set<string> {
  const ids = new Set<string>();
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (!value || typeof value !== 'object') return;
    const obj = value as Record<string, unknown>;
    const marks = obj.marks;
    if (Array.isArray(marks)) {
      for (const mark of marks as Record<string, unknown>[]) {
        if (mark?.type === 'comment') {
          const id = (mark.attrs as Record<string, unknown> | undefined)?.commentId;
          if (typeof id === 'string') ids.add(id);
        }
      }
    }
    Object.values(obj).forEach(walk);
  };
  walk(docJson);
  return ids;
}
