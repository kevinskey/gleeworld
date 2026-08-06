// Facts about instruments and voices, rendered into searchable chunks.
//
// Follows the _shared/liturgy precedent: reuse the generic scorer in
// _shared/academy rather than duplicating it. `SearchableChunk` is already the
// shared shape, and buildIndex/searchAcademy are generic over it.
import type { SearchableChunk, Hit, KnowledgeIndex } from '../academy/types.ts';

export interface MusicFactChunk extends SearchableChunk {
  /** Stable id, e.g. "strings/viola" or "voice/satb-alto". */
  id: string;
  /** Which body of facts this came from. */
  domain: 'instrument' | 'voice';
  /** The thing the chunk is about: "Viola", "Alto (SATB)". */
  subject: string;
}

export type MusicFactHit = Hit<MusicFactChunk>;
export type MusicFactIndex = KnowledgeIndex<MusicFactChunk>;
