// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { DocumentSearch, findMatches, getSearchState } from './DocumentSearch';

function makeEditor(content: string) {
  return new Editor({ extensions: [StarterKit, DocumentSearch], content });
}

describe('findMatches', () => {
  it('finds every occurrence in a paragraph', () => {
    const editor = makeEditor('<p>the cat sat on the mat</p>');
    expect(findMatches(editor.state.doc, 'the', false)).toHaveLength(2);
    editor.destroy();
  });

  it('is case-insensitive by default and case-sensitive on request', () => {
    const editor = makeEditor('<p>Bowman bowman BOWMAN</p>');
    expect(findMatches(editor.state.doc, 'bowman', false)).toHaveLength(3);
    expect(findMatches(editor.state.doc, 'bowman', true)).toHaveLength(1);
    editor.destroy();
  });

  it('does not overlap matches for repeated characters', () => {
    // "aaaa" contains "aa" twice without overlapping, not three times.
    const editor = makeEditor('<p>aaaa</p>');
    expect(findMatches(editor.state.doc, 'aa', false)).toHaveLength(2);
    editor.destroy();
  });

  it('spans multiple block nodes', () => {
    const editor = makeEditor('<p>alpha</p><p>alpha</p><h2>alpha</h2>');
    expect(findMatches(editor.state.doc, 'alpha', false)).toHaveLength(3);
    editor.destroy();
  });

  it('returns nothing for an empty query', () => {
    const editor = makeEditor('<p>anything</p>');
    expect(findMatches(editor.state.doc, '', false)).toEqual([]);
    editor.destroy();
  });

  it('reports ranges that select exactly the matched text', () => {
    const editor = makeEditor('<p>find me</p>');
    const [match] = findMatches(editor.state.doc, 'me', false);
    expect(editor.state.doc.textBetween(match.from, match.to)).toBe('me');
    editor.destroy();
  });
});

describe('search commands', () => {
  it('setSearchQuery selects the first match', () => {
    const editor = makeEditor('<p>one two one</p>');
    editor.commands.setSearchQuery('one');
    const state = getSearchState(editor.state);
    expect(state.matches).toHaveLength(2);
    expect(state.active).toBe(0);
    editor.destroy();
  });

  it('next/previous wrap around in both directions', () => {
    const editor = makeEditor('<p>x x x</p>');
    editor.commands.setSearchQuery('x');
    editor.commands.goToNextMatch();
    expect(getSearchState(editor.state).active).toBe(1);
    editor.commands.goToNextMatch();
    editor.commands.goToNextMatch();
    expect(getSearchState(editor.state).active).toBe(0); // wrapped forward
    editor.commands.goToPreviousMatch();
    expect(getSearchState(editor.state).active).toBe(2); // wrapped back
    editor.destroy();
  });

  it('replaceCurrentMatch swaps only the active occurrence', () => {
    const editor = makeEditor('<p>cat cat</p>');
    editor.commands.setSearchQuery('cat');
    editor.commands.replaceCurrentMatch('dog');
    expect(editor.getText()).toBe('dog cat');
    editor.destroy();
  });

  it('replaceAllMatches swaps every occurrence', () => {
    const editor = makeEditor('<p>cat cat cat</p>');
    editor.commands.setSearchQuery('cat');
    editor.commands.replaceAllMatches('dog');
    expect(editor.getText()).toBe('dog dog dog');
    editor.destroy();
  });

  it('replaceAll handles a replacement longer than the match', () => {
    // Back-to-front iteration matters here: replacing left-to-right with a
    // longer string invalidates every later range.
    const editor = makeEditor('<p>a a a</p>');
    editor.commands.setSearchQuery('a');
    editor.commands.replaceAllMatches('alpha');
    expect(editor.getText()).toBe('alpha alpha alpha');
    editor.destroy();
  });

  it('recomputes matches after the document changes', () => {
    const editor = makeEditor('<p>hit</p>');
    editor.commands.setSearchQuery('hit');
    expect(getSearchState(editor.state).matches).toHaveLength(1);
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, ' hit');
    expect(getSearchState(editor.state).matches).toHaveLength(2);
    editor.destroy();
  });

  it('clearSearch drops the query and the matches', () => {
    const editor = makeEditor('<p>gone</p>');
    editor.commands.setSearchQuery('gone');
    editor.commands.clearSearch();
    const state = getSearchState(editor.state);
    expect(state.matches).toHaveLength(0);
    expect(state.active).toBe(-1);
    editor.destroy();
  });

  it('next/previous are no-ops with no matches', () => {
    const editor = makeEditor('<p>nothing here</p>');
    editor.commands.setSearchQuery('zzz');
    expect(editor.commands.goToNextMatch()).toBe(false);
    expect(getSearchState(editor.state).active).toBe(-1);
    editor.destroy();
  });
});
