// Find & replace for the Documents editor.
//
// TipTap 3 ships no search extension, so this is a small ProseMirror plugin:
// it keeps the current query in plugin state, recomputes matches whenever the
// doc or the query changes, and paints them with inline decorations. Nothing
// is written to the document for a search — decorations are view-only, so
// searching never dirties the doc or triggers an autosave.
//
// Known limit, deliberate: matches are found WITHIN a text node, so a phrase
// split across a formatting boundary ("the **quick** brown") won't match as
// one run. Handling that means flattening the doc to a string and mapping
// offsets back to positions, which is a different (and much fussier) piece of
// work than most people need from Find.
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface SearchMatch { from: number; to: number }

export interface DocumentSearchState {
  query: string;
  caseSensitive: boolean;
  matches: SearchMatch[];
  /** Index into `matches`, or -1 when there are none. */
  active: number;
}

export const documentSearchKey = new PluginKey<DocumentSearchState>('documentSearch');

const EMPTY: DocumentSearchState = { query: '', caseSensitive: false, matches: [], active: -1 };

export function findMatches(doc: PMNode, query: string, caseSensitive: boolean): SearchMatch[] {
  const matches: SearchMatch[] = [];
  if (!query) return matches;
  const needle = caseSensitive ? query : query.toLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const haystack = caseSensitive ? node.text : node.text.toLowerCase();
    let index = haystack.indexOf(needle);
    while (index !== -1) {
      matches.push({ from: pos + index, to: pos + index + query.length });
      index = haystack.indexOf(needle, index + needle.length);
    }
  });
  return matches;
}

/** Keep the active index in range as matches appear and disappear. */
function clampActive(matches: SearchMatch[], desired: number): number {
  if (matches.length === 0) return -1;
  if (desired < 0) return matches.length - 1;
  if (desired >= matches.length) return 0;
  return desired;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentSearch: {
      setSearchQuery: (query: string, caseSensitive?: boolean) => ReturnType;
      clearSearch: () => ReturnType;
      goToNextMatch: () => ReturnType;
      goToPreviousMatch: () => ReturnType;
      replaceCurrentMatch: (replacement: string) => ReturnType;
      replaceAllMatches: (replacement: string) => ReturnType;
    };
  }
}

export function getSearchState(state: EditorState): DocumentSearchState {
  return documentSearchKey.getState(state) ?? EMPTY;
}

export const DocumentSearch = Extension.create({
  name: 'documentSearch',

  addProseMirrorPlugins() {
    return [
      new Plugin<DocumentSearchState>({
        key: documentSearchKey,
        state: {
          init: () => EMPTY,
          apply(tr: Transaction, prev: DocumentSearchState, _old, newState): DocumentSearchState {
            const meta = tr.getMeta(documentSearchKey) as Partial<DocumentSearchState> | undefined;
            const query = meta?.query ?? prev.query;
            const caseSensitive = meta?.caseSensitive ?? prev.caseSensitive;

            // Recompute on a query change OR any doc change — a replace, or
            // plain typing, moves every match after the edit.
            const needsRecompute = meta !== undefined || tr.docChanged;
            const matches = needsRecompute
              ? findMatches(newState.doc, query, caseSensitive)
              : prev.matches;

            const desired = meta?.active ?? prev.active;
            return { query, caseSensitive, matches, active: clampActive(matches, desired) };
          },
        },
        props: {
          decorations(state) {
            const { matches, active } = getSearchState(state);
            if (matches.length === 0) return DecorationSet.empty;
            return DecorationSet.create(
              state.doc,
              matches.map((m, i) =>
                Decoration.inline(m.from, m.to, {
                  class: i === active ? 'gw-search-hit gw-search-hit-active' : 'gw-search-hit',
                })),
            );
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setSearchQuery: (query: string, caseSensitive = false) => ({ tr, dispatch }) => {
        // active: 0 so the first hit is selected as you type, the way every
        // find bar behaves.
        if (dispatch) dispatch(tr.setMeta(documentSearchKey, { query, caseSensitive, active: 0 }));
        return true;
      },

      clearSearch: () => ({ tr, dispatch }) => {
        if (dispatch) dispatch(tr.setMeta(documentSearchKey, { query: '', active: -1 }));
        return true;
      },

      goToNextMatch: () => ({ state, tr, dispatch }) => {
        const { matches, active } = getSearchState(state);
        if (matches.length === 0) return false;
        const next = clampActive(matches, active + 1);
        if (dispatch) {
          // scrollIntoView so the hit isn't selected somewhere off-screen.
          dispatch(tr.setMeta(documentSearchKey, { active: next }).scrollIntoView());
        }
        return true;
      },

      goToPreviousMatch: () => ({ state, tr, dispatch }) => {
        const { matches, active } = getSearchState(state);
        if (matches.length === 0) return false;
        const prev = clampActive(matches, active - 1);
        if (dispatch) dispatch(tr.setMeta(documentSearchKey, { active: prev }).scrollIntoView());
        return true;
      },

      replaceCurrentMatch: (replacement: string) => ({ state, tr, dispatch }) => {
        const { matches, active } = getSearchState(state);
        const match = matches[active];
        if (!match) return false;
        if (dispatch) {
          tr.insertText(replacement, match.from, match.to);
          // Stay on the same ordinal: after the edit the plugin recomputes,
          // and this index is now the NEXT occurrence — which is what you
          // want after replacing one.
          dispatch(tr.setMeta(documentSearchKey, { active }).scrollIntoView());
        }
        return true;
      },

      replaceAllMatches: (replacement: string) => ({ state, tr, dispatch }) => {
        const { matches } = getSearchState(state);
        if (matches.length === 0) return false;
        if (dispatch) {
          // Back to front: replacing shifts every position after the edit,
          // and iterating in reverse keeps the earlier ranges valid.
          for (let i = matches.length - 1; i >= 0; i -= 1) {
            tr.insertText(replacement, matches[i].from, matches[i].to);
          }
          dispatch(tr.setMeta(documentSearchKey, { active: 0 }));
        }
        return true;
      },
    };
  },
});
