import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const HeroAuditionStats: React.FC<{ className?: string }>
  = ({ className = '' }) => {
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCount = async () => {
      try {
        setLoading(true);
        setError(null);
        // Total audition roster = number of applications received (secure RPC)
        const { data: appCount, error: countErr } = await supabase.rpc('get_audition_application_count');
        if (countErr) throw countErr;
        console.log('[HeroAuditionStats] application count RPC result:', appCount);
        if (!isMounted) return;
        setTotal(typeof appCount === 'number' ? appCount : Number(appCount) || 0);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || 'Failed to load stats');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    loadCount();

    // Realtime: update count when audition_applications change
    const channel = supabase
      .channel('audition_applications_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'audition_applications',
      }, () => {
        loadCount();
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
          {/* Audition Roster total */}
          <div className="flex-1">
            <div className="text-[11px] md:text-xs text-muted-foreground">Audition Roster</div>
            <div className="text-xl md:text-2xl font-semibold tracking-tight">{loading ? '—' : (total ?? 0).toLocaleString()}</div>
          </div>
        </div>
        {error && <div className="mt-2 text-[11px] text-destructive">{error}</div>}
      </div>
    </div>
  );
};
