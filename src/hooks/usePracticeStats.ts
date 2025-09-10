import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PracticeStats {
  lastPracticed?: Date;
  totalMinutes: number;
  thisWeekMinutes: number;
  totalSessions: number;
}

export const usePracticeStats = () => {
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPracticeStats = async () => {
      try {
        setLoading(true);

        // Get practice sessions from sight singing assessments and recordings
        const { data: assessments } = await supabase
          .from('sight_singing_assessments')
          .select('created_at, audio_duration_seconds')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const { data: recordings } = await supabase
          .from('gw_recordings')
          .select('created_at, duration')
          .eq('recorded_by', user.id)
          .order('created_at', { ascending: false });

        // Combine and process data
        const allSessions = [
          ...(assessments || []).map(a => ({
            date: new Date(a.created_at || ''),
            duration: a.audio_duration_seconds || 0
          })),
          ...(recordings || []).map(r => ({
            date: new Date(r.created_at || ''),
            duration: r.duration || 0
          }))
        ].sort((a, b) => b.date.getTime() - a.date.getTime());

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const totalMinutes = allSessions.reduce((acc, session) => 
          acc + Math.floor(session.duration / 60), 0
        );

        const thisWeekMinutes = allSessions
          .filter(session => session.date >= oneWeekAgo)
          .reduce((acc, session) => acc + Math.floor(session.duration / 60), 0);

        const lastPracticed = allSessions.length > 0 ? allSessions[0].date : undefined;

        setStats({
          lastPracticed,
          totalMinutes,
          thisWeekMinutes,
          totalSessions: allSessions.length
        });
      } catch (error) {
        console.error('Error fetching practice stats:', error);
        setStats({
          totalMinutes: 0,
          thisWeekMinutes: 0,
          totalSessions: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPracticeStats();
  }, [user]);

  return { stats, loading };
};