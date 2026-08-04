// ActiveTripContext — the ONE answer to "which trip are we looking at?".
//
// Before this existed, every section resolved the trip itself, with different
// rules: the landing took `status = 'planning'` limit 1, Roll Call took the
// earliest start_date among planning/confirmed/active, Weather took the
// earliest of up to ten. With a single trip in the table those agreed by
// accident. With two they do not — the landing can say "Spring Tour" while
// Roll Call says "Fall Tour" on the same screen.
//
// Sections now call useActiveTrip() and read `tripId`. Nothing else should
// query gw_tours to decide what "the" trip is.
//
// Scoping note: gw_tours.course_id is NOT NULL — a migration deliberately made
// trips course-owned so multi-ensemble programs (Chamber Singers vs Concert
// Choir) tour separately. When Travel Manager is embedded in a course the trip
// list is pinned to it; at workspace level it spans every course RLS allows.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTourCourseId } from './TourCourseContext';
import { getTenantSlug } from '@/integrations/supabase/client';

export interface Trip {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  course_id: string | null;
}

interface ActiveTripValue {
  trips: Trip[];
  trip: Trip | null;
  tripId: string | null;
  setTripId: (id: string) => void;
  isLoading: boolean;
  refetch: () => void;
}

const ActiveTripContextObj = createContext<ActiveTripValue | null>(null);

/** Which trip should be selected on load. Extracted so the rule is testable:
 *  honour the stored choice ONLY if it's still visible in this scope (it may
 *  have been deleted, or belong to another course), otherwise prefer an
 *  in-flight trip so a fresh visit never lands on last year's archived tour. */
export function pickInitialTrip(trips: Trip[], storedId: string | null): Trip | null {
  if (trips.length === 0) return null;
  const stored = storedId ? trips.find(t => t.id === storedId) : undefined;
  if (stored) return stored;
  return trips.find(t => t.status !== 'archived') ?? trips[0];
}

// Persisted per tenant AND per course: the same browser can manage a workspace
// pool and an embedded course pool, and remembering one as the other would
// select a trip the current scope can't see.
const storageKey = (courseId: string | null) =>
  `gw_active_trip:${getTenantSlug()}:${courseId ?? 'workspace'}`;

export function ActiveTripProvider({ children }: { children: ReactNode }) {
  const courseId = useTourCourseId();
  const [tripId, setTripIdState] = useState<string | null>(null);

  const { data: trips = [], isLoading, refetch } = useQuery({
    queryKey: ['tm-trips', courseId],
    queryFn: async (): Promise<Trip[]> => {
      let q = supabase
        .from('gw_tours')
        .select('id, name, start_date, end_date, status, course_id')
        // Archived trips stay reachable in the switcher but sort last, so the
        // default landing is never last year's tour.
        .order('start_date', { ascending: false })
        .limit(200);
      if (courseId) q = q.eq('course_id', courseId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Trip[];
    },
  });

  const setTripId = useCallback((id: string) => {
    setTripIdState(id);
    try { localStorage.setItem(storageKey(courseId), id); } catch { /* private mode */ }
  }, [courseId]);

  // Resolve the selection once trips land: honour the stored choice, but only
  // if it's still visible in this scope (it may have been deleted, archived
  // out of reach, or belong to another course).
  useEffect(() => {
    if (isLoading || trips.length === 0) return;
    if (tripId && trips.some(t => t.id === tripId)) return;

    let stored: string | null = null;
    try { stored = localStorage.getItem(storageKey(courseId)); } catch { /* private mode */ }

    const picked = pickInitialTrip(trips, stored);
    if (picked) setTripIdState(picked.id);
  }, [trips, isLoading, tripId, courseId]);

  // A scope change must not carry the previous scope's selection.
  useEffect(() => { setTripIdState(null); }, [courseId]);

  const value = useMemo<ActiveTripValue>(() => ({
    trips,
    trip: trips.find(t => t.id === tripId) ?? null,
    tripId,
    setTripId,
    isLoading,
    refetch,
  }), [trips, tripId, setTripId, isLoading, refetch]);

  return <ActiveTripContextObj.Provider value={value}>{children}</ActiveTripContextObj.Provider>;
}

/** Returns null-safe defaults when no provider is mounted, so sections shared
 *  with pages outside Travel Manager (/weather, /wardrobe) keep working. */
export function useActiveTrip(): ActiveTripValue {
  return useContext(ActiveTripContextObj) ?? {
    trips: [], trip: null, tripId: null,
    setTripId: () => {}, isLoading: false, refetch: () => {},
  };
}
