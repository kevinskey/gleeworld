import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * The prayer library — the actual texts a person prays, as opposed to the
 * lectionary citations that `usePrayerDay` returns.
 *
 * Platform reference data with no tenant scoping: the Our Father does not vary
 * by choir. Like `usePrayerDay`, a missing table is treated as a setup state
 * rather than an error, because the migrations are applied by hand.
 */

export interface PrayerText {
  id: string;
  slug: string;
  title: string;
  latin_title: string | null;
  body: string;
  category: 'daily' | 'marian' | 'devotional' | 'act' | 'seasonal' | 'canticle';
  time_of_day: 'morning' | 'midday' | 'evening' | 'night' | null;
  season: string | null;
  sort_order: number;
  source_note: string;
}

export const PRAYER_CATEGORY_LABELS: Record<PrayerText['category'], string> = {
  daily: 'Every day',
  marian: 'To Our Lady',
  act: 'Acts of faith, hope, love and contrition',
  devotional: 'Devotions',
  canticle: 'Canticles',
  seasonal: 'For the season',
};

export function usePrayerTexts() {
  const query = useQuery({
    queryKey: ['gw_prayer_texts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_prayer_texts')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) {
        // 42P01 = undefined_table; PGRST205 = PostgREST cannot find the table.
        if (error.code === '42P01' || error.code === 'PGRST205') return null;
        throw error;
      }
      return (data ?? []) as PrayerText[];
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  return {
    ...query,
    prayers: query.data ?? [],
    isNotInstalled: !query.isLoading && !query.isError && query.data === null,
  };
}

/**
 * The prayer to lead with right now. Prefers one matching the current part of
 * the day (Morning Offering before noon, the Examen at night), and falls back
 * to the Our Father, which is never the wrong answer.
 */
export function pickPrayerOfTheMoment(
  prayers: PrayerText[],
  hour: number,
): PrayerText | null {
  if (!prayers.length) return null;
  const slot =
    hour < 11 ? 'morning' : hour < 14 ? 'midday' : hour < 20 ? 'evening' : 'night';
  return (
    prayers.find((p) => p.time_of_day === slot) ??
    prayers.find((p) => p.slug === 'our-father') ??
    prayers[0]
  );
}
