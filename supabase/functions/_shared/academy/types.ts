// Shared by the ingest script (via the generated corpus) and the scorer.

/**
 * The minimum a chunk needs to be searchable.
 *
 * The scorer reads only these two fields, so any knowledge domain — choral
 * reference, Catholic liturgy, whatever comes next — can reuse the same index
 * and ranking while carrying its own metadata alongside.
 */
export interface SearchableChunk {
  title: string;
  text: string;
}

export interface AcademyChunk extends SearchableChunk {
  /** Stable id: "<page>/<slug>". */
  id: string;
  /** Manifest page key, e.g. "conductors". */
  page: string;
  /** Human page name, e.g. "Conductors Directory". */
  pageTitle: string;
  /** Source URL, kept for traceability. Not shown to users. */
  url: string;
}

export interface Hit<C extends SearchableChunk = SearchableChunk> {
  chunk: C;
  score: number;
  /** Possibly truncated to fit the character cap. */
  text: string;
}

export interface KnowledgeIndex<C extends SearchableChunk = SearchableChunk> {
  chunks: C[];
  /** token -> (chunk index -> term frequency in body+title) */
  postings: Map<string, Map<number, number>>;
  /** token -> set of chunk indexes whose title contains it */
  titlePostings: Map<string, Set<number>>;
}

/** Names the Academy domain kept before the scorer was shared. */
export type AcademyHit = Hit<AcademyChunk>;
export type AcademyIndex = KnowledgeIndex<AcademyChunk>;
