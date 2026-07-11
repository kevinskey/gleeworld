// Safe template substitution: a fixed allowlist of {{placeholders}},
// plain string replacement over the doc's text nodes. No expressions,
// no helpers, no code execution — unknown placeholders pass through
// unchanged so nothing silently disappears.
import { format } from 'date-fns';
import type { DocNode } from './types';

export const TEMPLATE_VARS = [
  'date', 'time', 'user_name', 'ensemble_name',
  'concert_title', 'concert_date', 'rehearsal_location', 'course_name',
] as const;
export type TemplateVar = (typeof TEMPLATE_VARS)[number];

export type TemplateContext = Partial<Record<TemplateVar, string>>;

export function defaultTemplateContext(now: Date = new Date()): TemplateContext {
  return {
    date: format(now, 'EEEE, MMMM d, yyyy'),
    time: format(now, 'h:mm a'),
  };
}

const PLACEHOLDER_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;

export function substituteText(text: string, ctx: TemplateContext): string {
  return text.replace(PLACEHOLDER_RE, (whole, name: string) => {
    if ((TEMPLATE_VARS as readonly string[]).includes(name)) {
      const value = ctx[name as TemplateVar];
      if (value !== undefined) return value;
    }
    return whole; // unknown or unprovided → leave visible
  });
}

/** Deep-clones the doc with placeholders substituted in every text node. */
export function substituteDoc(doc: DocNode, ctx: TemplateContext): DocNode {
  const walk = (node: DocNode): DocNode => {
    const out: DocNode = { ...node };
    if (typeof out.text === 'string') out.text = substituteText(out.text, ctx);
    if (node.content) out.content = node.content.map(walk);
    return out;
  };
  return walk(doc);
}
