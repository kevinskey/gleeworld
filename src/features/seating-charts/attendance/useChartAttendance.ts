// Resolves a chart's associations to attendance session + records and
// returns a Map<user_id, AttendanceStatus>. The mapping between
// `gw_attendance_records.student_profile_id` (=gw_profiles.id) and our
// `gw_seating_chart_assignments.profile_id` (=auth.uid) is done here.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AttendanceStatus } from './attendanceStatus';

export interface ChartAttendanceSession {
  id: string;
  title: string;
  opens_at: string;
  closes_at: string;
  status: string;
}

export interface ChartAttendanceState {
  loading: boolean;
  hasAssociation: boolean;
  session: ChartAttendanceSession | null;
  byUserId: Map<string, AttendanceStatus>;
}

export function useChartAttendance(chartId: string | undefined) {
  const [state, setState] = useState<ChartAttendanceState>({
    loading: false, hasAssociation: false, session: null, byUserId: new Map(),
  });

  const load = useCallback(async () => {
    if (!chartId) return;
    setState((s) => ({ ...s, loading: true }));

    const { data: associations } = await supabase
      .from('gw_seating_chart_associations')
      .select('association_type, association_id')
      .eq('chart_id', chartId)
      .in('association_type', ['event', 'course', 'tour_event']);

    if (!associations || associations.length === 0) {
      setState({ loading: false, hasAssociation: false, session: null, byUserId: new Map() });
      return;
    }

    // Find the most recent open/scheduled attendance session for any association.
    let sessionRow: ChartAttendanceSession | null = null;
    for (const assoc of associations) {
      let query = supabase
        .from('gw_attendance_sessions')
        .select('id, title, opens_at, closes_at, status')
        .in('status', ['open', 'scheduled', 'closed'])
        .order('opens_at', { ascending: false })
        .limit(1);
      if (assoc.association_type === 'event' || assoc.association_type === 'tour_event') {
        query = query.eq('event_id', assoc.association_id);
      } else if (assoc.association_type === 'course') {
        query = query.eq('course_id', assoc.association_id);
      }
      const { data } = await query.maybeSingle();
      if (data) { sessionRow = data as ChartAttendanceSession; break; }
    }

    if (!sessionRow) {
      setState({ loading: false, hasAssociation: true, session: null, byUserId: new Map() });
      return;
    }

    const { data: records } = await supabase
      .from('gw_attendance_records')
      .select('student_profile_id, status')
      .eq('attendance_session_id', sessionRow.id);

    const profileIds = (records ?? []).map((r: { student_profile_id: string }) => r.student_profile_id);
    let profileToUser = new Map<string, string>();
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('id, user_id')
        .in('id', profileIds);
      (profiles ?? []).forEach((p: { id: string; user_id: string }) => {
        profileToUser.set(p.id, p.user_id);
      });
    }

    const byUserId = new Map<string, AttendanceStatus>();
    (records ?? []).forEach((r: { student_profile_id: string; status: string }) => {
      const uid = profileToUser.get(r.student_profile_id);
      if (uid) byUserId.set(uid, r.status as AttendanceStatus);
    });

    setState({ loading: false, hasAssociation: true, session: sessionRow, byUserId });
  }, [chartId]);

  useEffect(() => { load(); }, [load]);

  return { ...state, refresh: load };
}
