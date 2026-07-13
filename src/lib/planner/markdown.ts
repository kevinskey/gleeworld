// Projections of a TipTap document: portable Markdown (content_md) and
// plain text (content_text, the search column). The JSON doc stays the
// authoritative editor state; these are derived on every save so notes
// are never trapped in editor-specific JSON.
import type { DocNode } from './types';

function markText(node: DocNode): string {
  let text = node.text ?? '';
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case 'bold': text = `**${text}**`; break;
      case 'italic': text = `*${text}*`; break;
      case 'strike': text = `~~${text}~~`; break;
      case 'code': text = `\`${text}\``; break;
      case 'underline': text = `<u>${text}</u>`; break;
      case 'link': {
        const href = (mark.attrs?.href as string) ?? '';
        text = `[${text}](${href})`;
        break;
      }
    }
  }
  return text;
}

function inline(node: DocNode): string {
  if (node.text !== undefined) return markText(node);
  if (node.type === 'hardBreak') return '  \n';
  return (node.content ?? []).map(inline).join('');
}

function blocks(nodes: DocNode[] | undefined, indent: string): string[] {
  const out: string[] = [];
  for (const node of nodes ?? []) {
    switch (node.type) {
      case 'paragraph':
        out.push(indent + inline(node));
        break;
      case 'heading': {
        const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)));
        out.push(indent + '#'.repeat(level) + ' ' + inline(node));
        break;
      }
      case 'bulletList':
        for (const item of node.content ?? []) {
          out.push(...listItem(item, indent, '- '));
        }
        break;
      case 'orderedList': {
        let i = Number(node.attrs?.start ?? 1);
        for (const item of node.content ?? []) {
          out.push(...listItem(item, indent, `${i}. `));
          i += 1;
        }
        break;
      }
      case 'taskList':
        for (const item of node.content ?? []) {
          const checked = item.attrs?.checked === true;
          out.push(...listItem(item, indent, checked ? '- [x] ' : '- [ ] '));
        }
        break;
      case 'blockquote':
        out.push(...blocks(node.content, indent).map((l) => `> ${l}`));
        break;
      case 'codeBlock':
        out.push(indent + '```' + ((node.attrs?.language as string) ?? ''));
        out.push(...inline(node).split('\n'));
        out.push(indent + '```');
        break;
      case 'horizontalRule':
        out.push(indent + '---');
        break;
      default:
        // unknown block: recurse so no text is dropped
        if (node.content) out.push(...blocks(node.content, indent));
        else if (node.text !== undefined) out.push(indent + markText(node));
    }
  }
  return out;
}

function listItem(item: DocNode, indent: string, marker: string): string[] {
  const lines = blocks(item.content, '');
  if (lines.length === 0) return [indent + marker.trimEnd()];
  const [first, ...rest] = lines;
  return [indent + marker + first, ...rest.map((l) => indent + '  ' + l)];
}

/** TipTap doc → GitHub-flavored Markdown. */
export function docToMarkdown(doc: DocNode): string {
  return blocks(doc.content, '').join('\n\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

/** TipTap doc → plain text (one line per block; for search indexing). */
export function docToText(doc: DocNode): string {
  const lines: string[] = [];
  const walk = (node: DocNode) => {
    if (node.text !== undefined) {
      lines[lines.length - 1] = (lines[lines.length - 1] ?? '') + node.text;
      return;
    }
    const isBlock = node.type !== undefined
      && !['hardBreak'].includes(node.type)
      && node.content !== undefined;
    if (isBlock && node.type !== 'doc') lines.push('');
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc);
  return lines.map((l) => l.trim()).filter(Boolean).join('\n');
}

export const EMPTY_DOC: DocNode = { type: 'doc', content: [{ type: 'paragraph' }] };

export function textToDoc(text: string): DocNode {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return EMPTY_DOC;
  return {
    type: 'doc',
    content: lines.map((line) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  };
}

export function isDocEmpty(doc: DocNode): boolean {
  return docToText(doc).trim().length === 0;
}
