import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface VoiceStats {
  soprano: number;
  alto: number;
  other: number;
}

interface TopCity {
  city: string;
  count: number;
}

export const HeroAuditionStats: React.FC<{ className?: string }>
  = ({ className = '' }) => {
  const [total, setTotal] = useState<number | null>(null);
  const [voiceStats, setVoiceStats] = useState<VoiceStats>({ soprano: 0, alto: 0, other: 0 });
  const [topCities, setTopCities] = useState<TopCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase.rpc('get_audition_stats');
        if (error) throw error;
        const totalVal = (data as any)?.total as number | null;
        const sopranoVal = (data as any)?.soprano as number | null;
        const altoVal = (data as any)?.alto as number | null;
        const cities = ((data as any)?.top_cities || []) as { city: string; count: number }[];
        setTotal(totalVal ?? 0);
        setVoiceStats({ soprano: sopranoVal ?? 0, alto: altoVal ?? 0, other: 0 });
        setTopCities(cities);
      } catch (e: any) {
        setError(e?.message || 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const ratio = useMemo(() => {
    const denom = voiceStats.soprano + voiceStats.alto;
    if (denom <= 0) return { sPct: 0, aPct: 0 };
    const sPct = Math.round((voiceStats.soprano / denom) * 100);
    const aPct = 100 - sPct;
    return { sPct, aPct };
  }, [voiceStats]);

  return (
    <div className={`mt-2 md:mt-3 ${className}`} aria-live="polite">
      <div className="rounded-lg border border-border bg-background/80 backdrop-blur-sm p-3 md:p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Total auditioners */}
          <div className="flex-1">
            <div className="text-[11px] md:text-xs text-muted-foreground">Auditioners to date</div>
            <div className="text-xl md:text-2xl font-semibold tracking-tight">{loading ? '—' : (total ?? 0).toLocaleString()}</div>
          </div>

          <Separator orientation="vertical" className="hidden md:block h-10" />

          {/* Soprano vs Alto ratio */}
          <div className="flex-1">
            <div className="text-[11px] md:text-xs text-muted-foreground">Soprano vs Alto</div>
            <div className="text-sm md:text-base font-medium">
              {loading ? '—' : `${ratio.sPct}% : ${ratio.aPct}%`}
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${ratio.sPct}%` }}
                aria-label={`Soprano ${ratio.sPct}%`}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>Soprano</span>
              <span>Alto</span>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-[11px] md:text-xs text-muted-foreground">Top Cities</div>
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {loading ? (
              <div className="text-xs text-muted-foreground">—</div>
            ) : (
              topCities.length > 0 ? (
                topCities.map((c) => (
                  <div key={c.city} className="flex items-center justify-between text-xs">
                    <span className="truncate" title={c.city}>{c.city}</span>
                    <span className="text-muted-foreground">{c.count}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">No city data yet</div>
              )
            )}
          </div>
        </div>
        {error && <div className="mt-2 text-[11px] text-destructive">{error}</div>}
      </div>
    </div>
  );
};
