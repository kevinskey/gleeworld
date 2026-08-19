import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Reads one liturgical day — its celebrations and their Mass reading
 * citations — from the `prayer_day` RPC added in the Prayer module's Phase 0.
 *
 * The RPC reads platform reference data that is identical for every tenant
 * (the Roman calendar does not vary by choir), so there is nothing
 * tenant-scoped to pass.
 *
 * Note the RPC may legitimately not exist yet: the Phase 0 migrations are
 * applied by hand, so a database that has not had them run returns a
 * PostgREST "function not found" error. That is a setup state, not a bug, and
 * `isNotInstalled` lets the page say so plainly instead of showing a red
 * error to a director who has done nothing wrong.
 */

export interface PrayerReading {
  slot: string;
  citation: string;
  schema_label: string;
  source: string;
}

export interface PrayerEvent {
  event_key: string;
  name: string;
  rank_grade: number | null;
  rank_label: string | null;
  color: string[];
  liturgical_season: string | null;
  sunday_cycle: string | null;
  weekday_cycle: string | null;
  psalter_week: number | null;
  is_holy_day_of_obligation: boolean;
  readings: PrayerReading[];
}

export interface PrayerDay {
  date: string;
  rite: string;
  events: PrayerEvent[];
}

/** PostgREST's code for "the function does not exist". */
const UNDEFINED_FUNCTION = 'PGRST202';

export function usePrayerDay(date: string) {
  const query = useQuery({
    queryKey: ['prayer_day', date],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('prayer_day', {
        p_date: date,
        p_rite: 'roman_catholic',
      });
      if (error) {
        // Surface "not installed" as a value rather than a thrown error so
        // react-query does not retry it four times over a missing function.
        if (error.code === UNDEFINED_FUNCTION || /prayer_day/.test(error.message)) {
          return null;
        }
        throw error;
      }
      return (data ?? null) as PrayerDay | null;
    },
    // The liturgical calendar for a given date never changes.
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
  });

  return {
    ...query,
    day: query.data ?? null,
    isNotInstalled: !query.isLoading && !query.isError && query.data === null,
  };
}
