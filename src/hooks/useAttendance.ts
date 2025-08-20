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
      
      const { data, error } = await supabase
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
        .limit(20);

      if (error) throw error;

      const formattedData = data?.map(record => ({
        ...record,
        event: record.gw_events
      })) || [];

      setAttendance(formattedData);
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