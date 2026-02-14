import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface AttendanceRecord {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  notes?: string;
  recorded_at: string;
  event?: {
    title: string;
    start_date: string;
    start_time?: string;
    event_type?: string;
    location?: string;
  };
}

export const useAttendance = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAttendance = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch from both legacy 'attendance' and new 'gw_event_attendance' tables
      const [legacyResult, gwResult] = await Promise.all([
        supabase
          .from('attendance')
          .select(`
            *,
            gw_events:event_id (
              title,
              start_date,
              event_type,
              location
            )
          `)
          .eq('user_id', user.id)
          .order('recorded_at', { ascending: false })
          .limit(20),
        supabase
          .from('gw_event_attendance')
          .select(`
            id,
            event_id,
            user_id,
            attendance_status,
            check_in_time,
            notes,
            created_at,
            gw_events!gw_event_attendance_event_id_fkey(
              title,
              start_date,
              event_type,
              location
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (legacyResult.error) throw legacyResult.error;

      // Format legacy records
      const legacyData = legacyResult.data?.map(record => ({
        ...record,
        event: record.gw_events
      })) || [];

      // Format gw_event_attendance records to match the same shape
      const gwData = (gwResult.data || []).map(record => ({
        id: record.id,
        event_id: record.event_id,
        user_id: record.user_id,
        status: record.attendance_status,
        notes: record.notes,
        recorded_at: record.check_in_time || record.created_at,
        event: record.gw_events
      }));

      // Combine, deduplicate by event_id (prefer gw_ records), and sort
      const seenEventIds = new Set<string>();
      const combined: AttendanceRecord[] = [];
      
      // Add gw records first (they're the newer system)
      for (const record of gwData) {
        if (!seenEventIds.has(record.event_id)) {
          seenEventIds.add(record.event_id);
          combined.push(record as AttendanceRecord);
        }
      }
      // Then add legacy records that aren't duplicates
      for (const record of legacyData) {
        if (!seenEventIds.has(record.event_id)) {
          seenEventIds.add(record.event_id);
          combined.push(record as AttendanceRecord);
        }
      }

      // Sort by recorded_at descending
      combined.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

      setAttendance(combined.slice(0, 20));
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast({
        title: "Error",
        description: "Failed to load attendance records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStats = () => {
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const excused = attendance.filter(a => a.status === 'excused').length;
    const unexcused = attendance.filter(a => a.status === 'absent').length;
    
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;
    
    return {
      total,
      present,
      excused,
      unexcused,
      attendanceRate
    };
  };

  useEffect(() => {
    fetchAttendance();
  }, [user]);

  return {
    attendance,
    loading,
    fetchAttendance,
    getAttendanceStats
  };
};