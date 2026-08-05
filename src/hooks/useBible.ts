import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * The Bible — books, chapters, verses, and a reader's personal marks.
 *
 * Scripture itself is shared reference data (gw_bible_*, no tenant_id).
 * Annotations and notes are owner-private user data, so nothing here needs to
 * pass a user id: RLS scopes every read and write to auth.uid().
 */

export const TRANSLATION = 'WEBCE';

export interface BibleBook {
  id: string;
  usfm_code: string;
  name: string;
  canon_order: number;
  testament: 'OT' | 'NT' | 'DC';
}

export interface BibleVerse {
  id: string;
  chapter: number;
  verse: number;
  text: string;
}

export type AnnotationStyle = 'highlight' | 'underline';
export type AnnotationColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange' | 'purple';

export interface BibleAnnotation {
  id: string;
  usfm_code: string;
  chapter: number;
  verse: number;
  start_offset: number | null;
  end_offset: number | null;
  style: AnnotationStyle;
  color: AnnotationColor;
  created_via: string;
}

export interface BibleNote {
  id: string;
  usfm_code: string;
  chapter: number;
  verse: number | null;
  body: string;
  updated_at: string;
}

/** A missing table means the migration hasn't been applied — a setup state. */
const MISSING = new Set(['42P01', 'PGRST205']);

export function useBibleBooks() {
  return useQuery({
    queryKey: ['bible_books', TRANSLATION],
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<BibleBook[] | null> => {
      const { data, error } = await supabase
        .from('gw_bible_books')
        .select('id, usfm_code, name, canon_order, testament, gw_bible_translations!inner(code)')
        .eq('gw_bible_translations.code', TRANSLATION)
        .order('canon_order');
      if (error) {
        if (MISSING.has(error.code ?? '')) return null;
        throw error;
      }
      return (data ?? []) as unknown as BibleBook[];
    },
  });
}

export function useBibleChapter(bookId: string | null, chapter: number) {
  return useQuery({
    queryKey: ['bible_chapter', bookId, chapter],
    enabled: !!bookId,
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<BibleVerse[]> => {
      const { data, error } = await supabase
        .from('gw_bible_verses')
        .select('id, chapter, verse, text')
        .eq('book_id', bookId!)
        .eq('chapter', chapter)
        .order('verse');
      if (error) throw error;
      return (data ?? []) as BibleVerse[];
    },
  });
}

/** How many chapters a book has — the max chapter number present. */
export function useChapterCount(bookId: string | null) {
  return useQuery({
    queryKey: ['bible_chapter_count', bookId],
    enabled: !!bookId,
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('gw_bible_verses')
        .select('chapter')
        .eq('book_id', bookId!)
        .order('chapter', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0]?.chapter ?? 1;
    },
  });
}

export function useAnnotations(usfmCode: string | null, chapter: number) {
  const qc = useQueryClient();
  const key = ['bible_annotations', usfmCode, chapter];

  const query = useQuery({
    queryKey: key,
    enabled: !!usfmCode,
    retry: false,
    queryFn: async (): Promise<BibleAnnotation[]> => {
      const { data, error } = await supabase
        .from('gw_bible_annotations')
        .select('id, usfm_code, chapter, verse, start_offset, end_offset, style, color, created_via')
        .eq('translation_code', TRANSLATION)
        .eq('usfm_code', usfmCode!)
        .eq('chapter', chapter);
      if (error) {
        if (MISSING.has(error.code ?? '')) return [];
        throw error;
      }
      return (data ?? []) as BibleAnnotation[];
    },
  });

  const add = useMutation({
    mutationFn: async (a: {
      verse: number;
      style: AnnotationStyle;
      color: AnnotationColor;
      createdVia: string;
      startOffset?: number | null;
      endOffset?: number | null;
    }) => {
      // .select() and check the error: demo-tenant writes have failed
      // silently in this codebase before.
      const { data, error } = await supabase
        .from('gw_bible_annotations')
        .insert({
          translation_code: TRANSLATION,
          usfm_code: usfmCode,
          chapter,
          verse: a.verse,
          style: a.style,
          color: a.color,
          created_via: a.createdVia,
          start_offset: a.startOffset ?? null,
          end_offset: a.endOffset ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gw_bible_annotations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { annotations: query.data ?? [], isLoading: query.isLoading, add, remove };
}

export function useBibleNotes(usfmCode: string | null, chapter: number) {
  const qc = useQueryClient();
  const key = ['bible_notes', usfmCode, chapter];

  const query = useQuery({
    queryKey: key,
    enabled: !!usfmCode,
    retry: false,
    queryFn: async (): Promise<BibleNote[]> => {
      const { data, error } = await supabase
        .from('gw_bible_notes')
        .select('id, usfm_code, chapter, verse, body, updated_at')
        .eq('translation_code', TRANSLATION)
        .eq('usfm_code', usfmCode!)
        .eq('chapter', chapter)
        .order('verse', { nullsFirst: true });
      if (error) {
        if (MISSING.has(error.code ?? '')) return [];
        throw error;
      }
      return (data ?? []) as BibleNote[];
    },
  });

  const save = useMutation({
    mutationFn: async (n: { id?: string; verse: number | null; body: string }) => {
      if (n.id) {
        const { error } = await supabase
          .from('gw_bible_notes')
          .update({ body: n.body })
          .eq('id', n.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from('gw_bible_notes')
        .insert({
          translation_code: TRANSLATION,
          usfm_code: usfmCode,
          chapter,
          verse: n.verse,
          body: n.body,
        })
        .select('id')
        .single();
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gw_bible_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { notes: query.data ?? [], isLoading: query.isLoading, save, remove };
}

export interface BibleSearchHit {
  id: string;
  chapter: number;
  verse: number;
  text: string;
  book: { id: string; usfm_code: string; name: string };
}

/**
 * Full-text search across every verse, using the generated `search_tsv` column
 * and its GIN index — so "create" matches "created" and the query stays fast
 * over 35,379 rows without any external search service.
 *
 * `websearch` parsing means a reader can type quoted phrases and -exclusions
 * the way they would in a search engine.
 */
export function useBibleSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['bible_search', q],
    enabled: q.length >= 2,
    retry: false,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<BibleSearchHit[]> => {
      const { data, error } = await supabase
        .from('gw_bible_verses')
        .select('id, chapter, verse, text, book:gw_bible_books!inner(id, usfm_code, name, canon_order)')
        .textSearch('search_tsv', q, { type: 'websearch', config: 'english' })
        .limit(60);
      if (error) {
        if (MISSING.has(error.code ?? '')) return [];
        throw error;
      }
      const rows = (data ?? []) as unknown as (BibleSearchHit & { book: { canon_order: number } })[];
      // Canon order, then reference — a reader expects Genesis before John.
      return rows.sort(
        (a, b) =>
          a.book.canon_order - b.book.canon_order ||
          a.chapter - b.chapter ||
          a.verse - b.verse,
      );
    },
  });
}
