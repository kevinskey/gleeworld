// trackEvent — the shared named-event primitive this codebase didn't have.
//
// Before this, "analytics" meant automatic page-view telemetry
// (useUsageTracking) plus per-vertical silos (gw_music_analytics). Nothing
// could answer "how many cohorts were created this week". This is the
// smallest thing that can: one insert into gw_analytics_events.
//
// Rules:
// - FIRE AND FORGET. Analytics must never break a feature, so this swallows
//   every error. Do not await it in a code path that matters.
// - Event names are snake_case, verb-last: all_state_cohort_created.
// - props is for small facts (ids, counts, slugs) — never free text a user
//   typed, never anything you'd call PII.

import { supabase } from '@/integrations/supabase/client';

export function trackEvent(name: string, props: Record<string, unknown> = {}): void {
  try {
    void supabase
      .from('gw_analytics_events')
      .insert({ event_name: name, props })
      .then(({ error }) => {
        if (error && import.meta.env.DEV) {
          console.warn('[trackEvent]', name, error.message);
        }
      });
  } catch {
    // Analytics never throws.
  }
}
