import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface VoiceStats {
  soprano: number;
  alto: number;
  other: number;
}


export const HeroAuditionStats: React.FC<{ className?: string }>
  = ({ className = '' }) => {
  const [total, setTotal] = useState<number | null>(null);
  const [voiceStats, setVoiceStats] = useState<VoiceStats>({ soprano: 0, alto: 0, other: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Total auditioners = current applications count
        // Total auditioners = number of applications received (secure RPC)
        const { data: appCount, error: countErr } = await supabase.rpc('get_audition_application_count');
        if (countErr) throw countErr;
        console.log('[HeroAuditionStats] application count RPC result:', appCount);
        setTotal(typeof appCount === 'number' ? appCount : Number(appCount) || 0);

        // Voice part preference breakdown
        const { data: voices, error: vErr } = await supabase
          .from('audition_applications')
          .select('voice_part_preference');
        if (vErr) throw vErr;
        const agg: VoiceStats = { soprano: 0, alto: 0, other: 0 };
        voices?.forEach((row: any) => {
          const v = (row.voice_part_preference || '').toString().trim().toLowerCase();
          if (v.includes('soprano')) agg.soprano += 1;
          else if (v.includes('alto')) agg.alto += 1;
          else agg.other += 1;
        });
        setVoiceStats(agg);
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
        {error && <div className="mt-2 text-[11px] text-destructive">{error}</div>}
      </div>
    </div>
  );
};
