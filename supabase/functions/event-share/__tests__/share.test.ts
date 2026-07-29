import { describe, it, expect, vi } from 'vitest';
import { runShare } from '../runShare';

function stubSupabase(opts: {
  googleRow?: any;
  iosRow?: any;
  calendarRow?: any;
  upsertResult?: { data: any; error: any };
}) {
  const from = (table: string) => {
    if (table === 'gw_google_events') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: opts.googleRow ?? null, error: null }),
            }),
          }),
        }),
      };
    }
    if (table === 'gw_ios_events') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: opts.iosRow ?? null, error: null }),
            }),
          }),
        }),
      };
    }
    if (table === 'gw_calendars') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: opts.calendarRow ?? null, error: null }),
          }),
        }),
      };
    }
    if (table === 'gw_events') {
      return {
        upsert: () => ({
          select: () => ({
            single: async () => opts.upsertResult ?? { data: null, error: { message: 'no stub' } },
          }),
        }),
      };
    }
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
  };
  return { from } as any;
}

describe('runShare', () => {
  const uid = 'user-1';
  const src = {
    tenant_id: 'tenant-a',
    title: 'Rehearsal',
    description: 'weekly rehearsal',
    location: 'Sisters Chapel',
    start_at: '2026-08-01T18:00:00Z',
    end_at: '2026-08-01T20:00:00Z',
    all_day: false,
  };

  it('happy path: creates gw_events row with fields copied from source', async () => {
    const supabase = stubSupabase({
      googleRow: src,
      calendarRow: { id: 'cal-1' },
      upsertResult: { data: { id: 'ev-1' }, error: null },
    });
    const res = await runShare({ user_id: uid, source: 'google_calendar', source_event_id: 'g-1', calendar_id: 'cal-1', supabase });
    expect(res).toEqual({ ok: true, shared_event_id: 'ev-1' });
  });

  it('returns source_not_found when the Google event does not exist for the caller', async () => {
    const supabase = stubSupabase({ googleRow: null, calendarRow: { id: 'cal-1' } });
    const res = await runShare({ user_id: uid, source: 'google_calendar', source_event_id: 'nope', calendar_id: 'cal-1', supabase });
    expect(res).toEqual({ error: 'source_not_found' });
  });

  it('returns calendar_not_found when the target calendar is not in the caller tenant', async () => {
    const supabase = stubSupabase({ googleRow: src, calendarRow: null });
    const res = await runShare({ user_id: uid, source: 'google_calendar', source_event_id: 'g-1', calendar_id: 'nope', supabase });
    expect(res).toEqual({ error: 'calendar_not_found' });
  });

  it('returns save_failed with detail when upsert errors', async () => {
    const supabase = stubSupabase({
      googleRow: src,
      calendarRow: { id: 'cal-1' },
      upsertResult: { data: null, error: { message: 'unique violation' } },
    });
    const res = await runShare({ user_id: uid, source: 'google_calendar', source_event_id: 'g-1', calendar_id: 'cal-1', supabase });
    expect(res).toMatchObject({ error: 'save_failed' });
  });

  it('reads from gw_ios_events when source=ios_calendar', async () => {
    const src = { tenant_id: 'tenant-a', title: 'iOS Ev', description: null, location: null, start_at: '2026-08-01T10:00:00Z', end_at: '2026-08-01T11:00:00Z', all_day: false };
    const supabase = stubSupabase({
      googleRow: null,
      calendarRow: { id: 'cal-1' },
      iosRow: src,
      upsertResult: { data: { id: 'ev-77' }, error: null },
    });
    const res = await runShare({ user_id: 'u1', source: 'ios_calendar', source_event_id: 'ek-77', calendar_id: 'cal-1', supabase });
    expect(res).toEqual({ ok: true, shared_event_id: 'ev-77' });
  });
});
