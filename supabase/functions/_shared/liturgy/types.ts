import type { SearchableChunk } from '../academy/types.ts';

/**
 * Catholic liturgy and sacred music knowledge.
 *
 * The Academy corpus gets away with `title + text + url` because everything in
 * it carries the same weight: a fact about the Fisk Jubilee Singers is a fact.
 * Liturgy does not work that way. The SAME question can have a universal norm,
 * a national adaptation and a diocesan policy all bearing on it, and they do
 * not rank equally — a parish custom cannot overrule the Missal. So the
 * authority of a passage has to travel WITH the passage, or an answer cannot
 * honestly say whether something is required or merely someone's preference.
 */

/**
 * Where a source sits in the hierarchy. Lower number = higher authority.
 * Ordered, not just labelled, because ranking is the whole point.
 */
export const AUTHORITY_RANK = {
  /** Ecumenical council, universal law, the liturgical books themselves. */
  universal_law: 1,
  /** Papal documents and Vatican dicastery instructions. */
  papal_or_dicastery: 2,
  /** Bishops' conference adaptations with recognitio — e.g. the US GIRM. */
  conference_adaptation: 3,
  /** Bishops' conference guidance without the force of law (Sing to the Lord). */
  conference_guidance: 4,
  /** Diocesan policy — binding locally, subordinate to everything above. */
  diocesan_policy: 5,
  /** Parish custom or a director's own practice. */
  local_practice: 6,
} as const;

export type AuthorityLevel = keyof typeof AUTHORITY_RANK;

/** What KIND of statement a passage is. An answer must not present a
 *  recommendation as a requirement, so the corpus records the difference. */
export type SourceKind =
  | 'law'            // canon, universal norm
  | 'rubric'         // instruction printed in a liturgical book
  | 'instruction'    // Vatican or conference instruction
  | 'guidance'       // pastoral guidance, non-binding
  | 'catechesis'     // teaching/explanatory
  | 'policy';        // diocesan or parish policy

export interface LiturgyChunk extends SearchableChunk {
  /** Stable id: "<document-slug>/<section>". */
  id: string;
  /** Short document code used in citations, e.g. "GIRM", "SC", "STL". */
  document: string;
  /** Full document title, e.g. "General Instruction of the Roman Missal". */
  documentTitle: string;
  /** Issuing authority, e.g. "USCCB", "Second Vatican Council". */
  issuedBy: string;
  authority: AuthorityLevel;
  kind: SourceKind;
  /**
   * Where it applies. 'universal', or a country/diocese code such as 'US' or
   * 'US/Atlanta'. A US adaptation must not be quoted at someone in Ghana as
   * though it were universal law.
   */
  jurisdiction: string;
  /** Article/paragraph/canon number as printed, e.g. "48", "Can. 838 §1". */
  section: string;
  /** Year of the edition this text is from. */
  year?: number;
  /** False when a later edition or document has superseded this passage. */
  current: boolean;
  /** Edition label, e.g. "3rd typical edition". */
  edition?: string;
  /** Public URL, for the on-screen citation only — never read aloud. */
  url?: string;
  /** Copyright holder. Recorded so it is always clear what may be quoted. */
  copyright?: string;
}

/** Citation as it should appear on screen. Never spoken in full. */
export function formatCitation(chunk: LiturgyChunk): string {
  const section = chunk.section ? `, no. ${chunk.section}` : '';
  return `${chunk.documentTitle}${section}`;
}

/** Plain-English authority line for the on-screen source list. */
export function authorityLabel(chunk: LiturgyChunk): string {
  switch (chunk.authority) {
    case 'universal_law': return 'Universal liturgical norm';
    case 'papal_or_dicastery': return 'Papal or Vatican instruction';
    case 'conference_adaptation': return `Approved adaptation (${chunk.jurisdiction})`;
    case 'conference_guidance': return `Bishops' conference guidance (${chunk.jurisdiction})`;
    case 'diocesan_policy': return `Diocesan policy (${chunk.jurisdiction})`;
    case 'local_practice': return 'Local practice';
  }
}

/**
 * Rank hits by authority first, then by the lexical score.
 *
 * Relevance alone is the wrong order here: a diocesan handbook may use the
 * user's exact words while the Missal answers the question. Superseded
 * passages sink below everything current regardless of either.
 */
export function byAuthorityThenScore(
  a: { chunk: LiturgyChunk; score: number },
  b: { chunk: LiturgyChunk; score: number },
): number {
  if (a.chunk.current !== b.chunk.current) return a.chunk.current ? -1 : 1;
  const ra = AUTHORITY_RANK[a.chunk.authority];
  const rb = AUTHORITY_RANK[b.chunk.authority];
  if (ra !== rb) return ra - rb;
  return b.score - a.score;
}

/**
 * Whether a passage applies to the person asking.
 *
 * Universal texts always apply. A national or diocesan text applies only
 * within its own jurisdiction — 'US' matches 'US' and 'US/Atlanta'.
 */
export function appliesTo(chunk: LiturgyChunk, jurisdiction: string | null): boolean {
  if (chunk.jurisdiction === 'universal') return true;
  if (!jurisdiction) return false;
  return jurisdiction === chunk.jurisdiction
    || jurisdiction.startsWith(`${chunk.jurisdiction}/`)
    || chunk.jurisdiction.startsWith(`${jurisdiction}/`);
}
