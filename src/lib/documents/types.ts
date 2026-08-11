export type CitationStyle = 'mla9' | 'apa7';
export type SourceType = 'book' | 'journal' | 'website' | 'video';
export interface SourceAuthor { family: string; given: string }
export interface DocSource {
  id: string; type: SourceType; authors: SourceAuthor[];
  title: string; container?: string; publisher?: string; year?: string;
  volume?: string; issue?: string; pages?: string;
  url?: string; doi?: string; isbn?: string; accessed?: string;
}
export interface DocFootnote { id: string; text: string }
export interface PaperMeta { studentName?: string; instructor?: string; course?: string; date?: string }
