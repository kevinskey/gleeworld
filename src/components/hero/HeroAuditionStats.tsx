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
        let countVal = 0;
        try {
          const { data: rpcVal, error: rpcError } = await supabase.rpc('get_scheduled_auditions_count');
          if (rpcError) throw rpcError;
          if (typeof rpcVal === 'number') {
            countVal = rpcVal;
          } else if (Array.isArray(rpcVal)) {
            const first: any = rpcVal[0];
            countVal = Number(first?.get_scheduled_auditions_count ?? first) || 0;
          } else if (rpcVal && typeof rpcVal === 'object') {
            countVal = Number((rpcVal as any).get_scheduled_auditions_count) || 0;
          }
        } catch (_) {
          // Fallback: try counting rows directly as a backup
          const { count } = await supabase
            .from('gw_auditions')
            .select('*', { count: 'exact', head: true });
          countVal = count ?? 0;
        }
        if (!isMounted) return;
        setTotal(countVal);
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
      .channel('gw_auditions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gw_auditions',
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
            <div className="text-[11px] md:text-xs text-muted-foreground">Number of Auditions Scheduled</div>
            <div className="text-xl md:text-2xl font-semibold tracking-tight">{loading ? '—' : (total ?? 0).toLocaleString()}</div>
          </div>
        </div>
        {error && <div className="mt-2 text-[11px] text-destructive">{error}</div>}
      </div>
    </div>
  );
};
