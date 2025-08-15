import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const HeroAuditionStats: React.FC<{ className?: string }>
  = ({ className = '' }) => {
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAuditionCount = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get total count from gw_appointments table (same source as booking page)
        const { count, error: appointmentsError } = await supabase
          .from('gw_appointments')
          .select('*', { count: 'exact', head: true })
          .eq('appointment_type', 'audition')
          .eq('status', 'scheduled');
        
        if (appointmentsError) throw appointmentsError;
        
        if (!isMounted) return;
        setTotal(count || 0);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || 'Failed to load stats');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    loadAuditionCount();

    // Realtime: update count when appointments change
    const channel = supabase
      .channel('gw_appointments_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gw_appointments',
      }, () => {
        loadAuditionCount();
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Audition total */}
          <div className="flex-1">
            <div className="text-[11px] md:text-xs text-muted-foreground">Number of Auditions Scheduled</div>
            <div className="text-xl md:text-2xl font-semibold tracking-tight">{loading ? '—' : total.toLocaleString()}</div>
          </div>
        </div>
        {error && <div className="mt-2 text-[11px] text-destructive">{error}</div>}
      </div>
    </div>
  );
};
