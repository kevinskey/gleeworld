import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface AttendanceSession {
  id: string;
  course_id: string;
  event_id?: string;
  title: string;
  description?: string;
  opens_at: string;
  closes_at: string;
  status: 'scheduled' | 'open' | 'closed' | 'cancelled';
  mode: 'qr' | 'manual' | 'hybrid';
  roster_scope: 'enrolled_students' | 'tour_roster' | 'custom_group';
  allow_late_checkin: boolean;
  late_threshold_minutes: number;
  requires_grading: boolean;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  attendance_session_id: string;
  student_profile_id: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  marked_by?: string;
  marked_at: string;
  check_in_method: 'qr' | 'manual' | 'pin' | 'auto';
  note?: string;
  student?: {
    full_name: string;
    email: string;
    profile_image_url?: string;
  };
}

export const useAttendanceSessions = (courseId: string) => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSessions = useCallback(async () => {
    if (!courseId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_attendance_sessions')
        .select('*')
        .eq('course_id', courseId)
        .order('opens_at', { ascending: false });

      if (error) throw error;
      setSessions((data as AttendanceSession[]) || []);
    } catch (error) {
      console.error('Error fetching attendance sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const createSession = async (session: Partial<AttendanceSession>) => {
    try {
      const { data, error } = await supabase
        .from('gw_attendance_sessions')
        .insert([{
          title: session.title || 'Attendance Session',
          opens_at: session.opens_at || new Date().toISOString(),
          closes_at: session.closes_at || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          course_id: courseId,
          created_by: user?.id,
          status: session.status || 'scheduled',
          mode: session.mode || 'qr',
          roster_scope: session.roster_scope || 'enrolled_students',
        }])
        .select()
        .single();

      if (error) throw error;
      
      toast({ title: 'Session created', description: 'Attendance session created successfully' });
      await fetchSessions();
      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      toast({ title: 'Error', description: 'Failed to create session', variant: 'destructive' });
      throw error;
    }
  };

  const updateSessionStatus = async (sessionId: string, status: AttendanceSession['status']) => {
    try {
      const { error } = await supabase
        .from('gw_attendance_sessions')
        .update({ status })
        .eq('id', sessionId);

      if (error) throw error;
      
      toast({ title: 'Session updated', description: `Session ${status}` });
      await fetchSessions();
    } catch (error) {
      console.error('Error updating session:', error);
      toast({ title: 'Error', description: 'Failed to update session', variant: 'destructive' });
    }
  };

  const generateQRToken = async (sessionId: string, expiresInMinutes = 5) => {
    try {
      const { data, error } = await supabase.rpc('generate_attendance_qr_token', {
        p_session_id: sessionId,
        p_expires_in_minutes: expiresInMinutes,
      });

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Error generating QR token:', error);
      toast({ title: 'Error', description: 'Failed to generate QR code', variant: 'destructive' });
      throw error;
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    fetchSessions,
    createSession,
    updateSessionStatus,
    generateQRToken,
  };
};

export const useAttendanceRecords = (sessionId: string) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecords = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_attendance_records')
        .select('*')
        .eq('attendance_session_id', sessionId)
        .order('marked_at', { ascending: false });

      if (error) throw error;
      setRecords((data as unknown as AttendanceRecord[]) || []);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const markAttendance = async (
    studentId: string, 
    status: AttendanceRecord['status'],
    note?: string
  ) => {
    try {
      const { error } = await supabase
        .from('gw_attendance_records')
        .upsert({
          attendance_session_id: sessionId,
          student_profile_id: studentId,
          status,
          check_in_method: 'manual',
          note,
        }, { onConflict: 'attendance_session_id,student_profile_id' });

      if (error) throw error;
      
      toast({ title: 'Attendance updated' });
      await fetchRecords();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({ title: 'Error', description: 'Failed to update attendance', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchRecords();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`attendance_records_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gw_attendance_records',
        filter: `attendance_session_id=eq.${sessionId}`,
      }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecords, sessionId]);

  return {
    records,
    loading,
    fetchRecords,
    markAttendance,
  };
};
