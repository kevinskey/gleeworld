// Shared by the ingest script (via the generated corpus) and the scorer.
export interface AcademyChunk {
  /** Stable id: "<page>/<slug>". */
  id: string;
  /** Manifest page key, e.g. "conductors". */
  page: string;
  /** Human page name, e.g. "Conductors Directory". */
  pageTitle: string;
  /** Chunk heading, e.g. "Robert Nathaniel Dett". */
  title: string;
  /** Plain text. No HTML. */
  text: string;
  /** Source URL, kept for traceability. Not shown to users. */
  url: string;
}

export interface AcademyHit {
  chunk: AcademyChunk;
  score: number;
  /** Possibly truncated to fit the character cap. */
  text: string;
}

export interface AcademyIndex {
  chunks: AcademyChunk[];
  /** token -> (chunk index -> term frequency in body+title) */
  postings: Map<string, Map<number, number>>;
  /** token -> set of chunk indexes whose title contains it */
  titlePostings: Map<string, Set<number>>;
}
