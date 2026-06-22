// Minimal markdown renderer — handles what teachers actually write in a
// landing page body: headings, bold, italic, links, bullet & numbered
// lists, code spans, blockquotes, paragraphs. No external dep.
//
// Anything more elaborate (tables, footnotes, syntax highlight) can swap
// to react-markdown later; this stays under 100 lines and zero install.

import React from 'react';

interface Props {
  source: string;
  className?: string;
}

export function SimpleMarkdown({ source, className }: Props) {
  return <div className={className}>{renderBlocks(source)}</div>;
}

function renderBlocks(src: string): React.ReactNode[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      const Tag = (`h${Math.min(level + 1, 6)}`) as keyof JSX.IntrinsicElements;
      const sizeClass = ['', 'text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-base'][level];
      out.push(<Tag key={key++} className={`${sizeClass} font-bold mt-6 mb-2 leading-tight`}>{renderInline(text)}</Tag>);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      out.push(
        <blockquote key={key++} className="border-l-4 border-muted pl-4 my-4 italic text-muted-foreground">
          {renderInline(quoteLines.join(' '))}
        </blockquote>
      );
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      out.push(
        <ul key={key++} className="list-disc pl-6 my-3 space-y-1">
          {items.map((it, idx) => <li key={idx}>{renderInline(it)}</li>)}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push(
        <ol key={key++} className="list-decimal pl-6 my-3 space-y-1">
          {items.map((it, idx) => <li key={idx}>{renderInline(it)}</li>)}
        </ol>
      );
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      out.push(<hr key={key++} className="my-6 border-border" />);
      i++;
      continue;
    }

    // Blank line — paragraph break (consume and skip)
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph: collect until blank line or block-start
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !lines[i].startsWith('> ') &&
      !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) &&
      !/^---+$/.test(lines[i].trim())
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(<p key={key++} className="my-3 leading-relaxed">{renderInline(para.join(' '))}</p>);
  }

  return out;
}

// Inline markdown: links, bold, italic, code, @-mentions.
// @-mention pattern: word boundary + @ + one or more word chars / dots /
// dashes. Renders as a styled pill (no auto-linking — that's a Phase N+
// feature once we have the mention notification table).
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;
  // Order matters — first match wins. Mentions come before bold/italic so
  // "@foo" inside a bold span still renders correctly.
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|(^|[\s(.,;!?])@([A-Za-z][A-Za-z0-9._-]{1,40})/;
  let s = text;
  while (s.length) {
    const m = s.match(re);
    if (!m || m.index === undefined) {
      parts.push(s);
      break;
    }
    if (m.index > 0) parts.push(s.slice(0, m.index));
    if (m[1] !== undefined) {
      parts.push(<a key={key++} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline">{m[1]}</a>);
    } else if (m[3] !== undefined || m[4] !== undefined) {
      parts.push(<strong key={key++}>{m[3] ?? m[4]}</strong>);
    } else if (m[5] !== undefined || m[6] !== undefined) {
      parts.push(<em key={key++}>{m[5] ?? m[6]}</em>);
    } else if (m[7] !== undefined) {
      parts.push(<code key={key++} className="px-1 py-0.5 rounded bg-muted text-[0.92em]">{m[7]}</code>);
    } else if (m[9] !== undefined) {
      // Preserve the leading whitespace/punctuation captured in m[8] so
      // "Hey @kevin" still has the space before the pill.
      if (m[8]) parts.push(m[8]);
      parts.push(
        <span
          key={key++}
          className="inline-flex items-baseline px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-[0.9em]"
        >
          @{m[9]}
        </span>
      );
    }
    s = s.slice(m.index + m[0].length);
  }
  return <>{parts}</>;
}
