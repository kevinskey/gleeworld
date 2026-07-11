// Wiki links and tags. Links are typed as plain `[[Target]]` text in the
// document (portable — survives Markdown export untouched); on save the
// API resolves targets by title / date key and rebuilds the
// gw_planner_note_links rows, so renames never break resolved links
// (they're stored by id).
//
// GleeWorld entity links use the internal scheme
//   gleeworld://<entity>/<uuid>
// which the UI renders as safe app routes.
import type { PlannerEntityType } from './types';

export interface WikiLinkRef {
  /** raw text between the brackets */
  target: string;
}

export interface EntityRef {
  entityType: PlannerEntityType;
  entityId: string;
}

const WIKI_LINK_RE = /\[\[([^[\]]+)\]\]/g;
const TAG_RE = /(^|\s)#([a-z0-9][a-z0-9_/-]*)/gi;
const ENTITY_RE = /gleeworld:\/\/(event|concert_program|sheet_music|course|ensemble|member)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

/** All `[[...]]` targets in a text, deduped, order preserved. */
export function extractWikiLinks(text: string): WikiLinkRef[] {
  const seen = new Set<string>();
  const out: WikiLinkRef[] = [];
  for (const m of text.matchAll(WIKI_LINK_RE)) {
    const target = m[1].trim();
    if (target && !seen.has(target.toLowerCase())) {
      seen.add(target.toLowerCase());
      out.push({ target });
    }
  }
  return out;
}

/** All `#tags` in a text, deduped, lowercased, order preserved. */
export function extractTags(text: string): string[] {
  const seen = new Set<string>();
  for (const m of text.matchAll(TAG_RE)) {
    seen.add(m[2].toLowerCase());
  }
  return [...seen];
}

/** All gleeworld:// entity references in a text. */
export function extractEntityRefs(text: string): EntityRef[] {
  const seen = new Set<string>();
  const out: EntityRef[] = [];
  for (const m of text.matchAll(ENTITY_RE)) {
    const key = `${m[1]}:${m[2]}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ entityType: m[1].toLowerCase() as PlannerEntityType, entityId: m[2].toLowerCase() });
    }
  }
  return out;
}

/** App route for an entity link (browser-safe counterpart of gleeworld://). */
export function entityRoute(ref: EntityRef): string {
  switch (ref.entityType) {
    case 'event': return `/dashboard/calendar?event=${ref.entityId}`;
    case 'concert_program': return `/concert-planner/${ref.entityId}`;
    case 'sheet_music': return `/dashboard/music/${ref.entityId}`;
    case 'course': return `/academy/courses/${ref.entityId}`;
    case 'ensemble': return `/dashboard/ensembles/${ref.entityId}`;
    case 'member': return `/dashboard/members/${ref.entityId}`;
  }
}

/** True when a wiki target looks like a period-note date key. */
export function isDateKeyTarget(target: string): boolean {
  return /^\d{4}(-(\d{2}(-\d{2})?|W\d{2}|Q[1-4]))?$/.test(target.trim());
}
