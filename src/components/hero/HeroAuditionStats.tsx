import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuditionDayStats {
  date: string;
  count: number;
  formatted_date: string;
}

export const HeroAuditionStats: React.FC<{ className?: string }>
  = ({ className = '' }) => {
  const [auditionDays, setAuditionDays] = useState<AuditionDayStats[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAuditionStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get auditions grouped by date
        const { data: auditions, error: auditionsError } = await supabase
          .from('gw_auditions')
          .select('audition_date')
          .not('audition_date', 'is', null);
        
        if (auditionsError) throw auditionsError;
        
        // Group by date and count
        const dateGroups = auditions.reduce((acc: Record<string, number>, audition) => {
          const date = audition.audition_date;
          if (date) {
            acc[date] = (acc[date] || 0) + 1;
          }
          return acc;
        }, {});
        
        // Convert to array with formatted dates
        const dayStats: AuditionDayStats[] = Object.entries(dateGroups)
          .map(([date, count]) => ({
            date,
            count,
            formatted_date: new Date(date).toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const total = dayStats.reduce((sum, day) => sum + day.count, 0);
        
        if (!isMounted) return;
        setAuditionDays(dayStats);
        setTotalCount(total);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || 'Failed to load stats');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    loadAuditionStats();

    // Realtime: update stats when auditions change
    const channel = supabase
      .channel('gw_auditions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gw_auditions',
      }, () => {
        loadAuditionStats();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className={`mt-2 md:mt-3 ${className}`} aria-live="polite">
      <div className="rounded-lg border border-border bg-background/80 backdrop-blur-sm p-3 md:p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          {/* Total count */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-[11px] md:text-xs text-muted-foreground">Total Auditions Scheduled</div>
              <div className="text-xl md:text-2xl font-semibold tracking-tight">
                {loading ? '—' : totalCount.toLocaleString()}
              </div>
            </div>
          </div>
          
          {/* Breakdown by days */}
          {!loading && auditionDays.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] md:text-xs text-muted-foreground">By Day:</div>
              <div className="flex gap-4">
                {auditionDays.map((day, index) => (
                  <div key={day.date} className="text-center">
                    <div className="text-[10px] md:text-[11px] text-muted-foreground">{day.formatted_date}</div>
                    <div className="text-sm md:text-base font-medium">{day.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {error && <div className="mt-2 text-[11px] text-destructive">{error}</div>}
      </div>
    </div>
  );
};
