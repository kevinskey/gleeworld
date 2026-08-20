// @vitest-environment jsdom
// Reproduction for "I pasted text and it just looked like this" (Kevin,
// 2026-08-20 — a blank page). Parses the HTML real sources put on the
// clipboard through the document schema and asserts what survives.
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import { documentExtensions } from './DocumentEditor';
import { stripUnreadableColors } from '@/lib/documents/pasteColors';

/** Mirrors the editor's paste path: transformPastedHTML, then parse. */
function parse(html: string) {
  const editor = new Editor({ extensions: documentExtensions(), content: stripUnreadableColors(html) });
  const json = editor.getJSON();
  const text = editor.getText();
  editor.destroy();
  return { json, text };
}

/** Every textStyle color mark in a parsed document. */
function colors(json: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== 'object') return;
    const obj = v as Record<string, unknown>;
    if (Array.isArray(obj.marks)) {
      for (const m of obj.marks as Record<string, unknown>[]) {
        const attrs = m.attrs as Record<string, unknown> | undefined;
        if (m.type === 'textStyle' && typeof attrs?.color === 'string') out.push(attrs.color);
      }
    }
    Object.values(obj).forEach(walk);
  };
  walk(json);
  return out;
}

describe('pasting from a dark-themed source', () => {
  it('keeps the text', () => {
    // What a copy out of a dark-mode page (ChatGPT, Claude, a dark docs
    // site, Notion in dark mode) actually puts on the clipboard.
    const { text } = parse('<p><span style="color: rgb(255, 255, 255)">Hello from a dark page</span></p>');
    expect(text).toContain('Hello from a dark page');
  });

  it('REPRO: carries a white color mark onto white paper', () => {
    const { json } = parse('<p><span style="color: rgb(255, 255, 255)">invisible</span></p>');
    // Before the fix this is ['rgb(255, 255, 255)'] — the text is present,
    // correctly parsed, and renders white-on-white. The page looks empty and
    // the user reports "I can't paste".
    expect(colors(json)).toEqual([]);
  });

  it('also catches #fff and near-white', () => {
    expect(colors(parse('<p><span style="color:#fff">x</span></p>').json)).toEqual([]);
    expect(colors(parse('<p><span style="color:#fafafa">x</span></p>').json)).toEqual([]);
  });

  it('keeps colors that are actually readable', () => {
    // The point of preserving color at all — a red heading pasted from Word
    // must stay red.
    expect(colors(parse('<p><span style="color:#c00000">warning</span></p>').json))
      .toEqual(['#c00000']);
    expect(colors(parse('<p><span style="color:#333333">body</span></p>').json))
      .toEqual(['#333333']);
  });

  it('leaves font family and size alone', () => {
    // Only color is dropped; the rest of the pasted formatting is the whole
    // reason TextStyle was added.
    const { json } = parse('<p><span style="font-size: 24px; font-family: Georgia">big</span></p>');
    const str = JSON.stringify(json);
    expect(str).toContain('24px');
    expect(str).toContain('Georgia');
  });
});
