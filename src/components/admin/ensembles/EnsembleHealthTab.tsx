import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  RefreshCw,
  TrendingDown,
  Users2,
  CalendarClock,
  PercentCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import {
  VOICE_PART_LABEL,
  type HealthSnapshot,
  type HealthFlag,
  type VoicePart,
} from '@/types/programHealth';

interface Props {
  ensembleId: string;
}

export function EnsembleHealthTab({ ensembleId }: Props) {
  const queryClient = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['health_snapshots', ensembleId],
    queryFn: async (): Promise<HealthSnapshot[]> => {
      const { data, error } = await supabase
        .from('gw_health_snapshots')
        .select('*')
        .eq('ensemble_id', ensembleId)
        .order('computed_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as HealthSnapshot[];
    },
  });

  const latest = history[0];

  const recompute = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('recompute-health', {
        body: { ensemble_id: ensembleId },
      });
      if (error) throw error;
      return data as { snapshot_id: string | null };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['health_snapshots', ensembleId] });
      if (data?.snapshot_id) {
        toast.success('Health snapshot updated');
      } else {
        toast.message('No snapshot written', {
          description: 'Ensemble has no members yet.',
        });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>;
  }

  if (!latest) {
    return (
      <div className="space-y-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          No health snapshot has been computed for this ensemble yet.
        </p>
        <Button
          onClick={() => recompute.mutate()}
          disabled={recompute.isPending}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${recompute.isPending ? 'animate-spin' : ''}`}
          />
          Compute now
        </Button>
      </div>
    );
  }

  // Reverse for sparkline (oldest left, newest right).
  const sparkData = [...history]
    .reverse()
    .map((s) => ({ score: s.stability_score ?? 0, ts: s.computed_at }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <ScoreBlock snapshot={latest} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => recompute.mutate()}
          disabled={recompute.isPending}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${recompute.isPending ? 'animate-spin' : ''}`}
          />
          Recompute
        </Button>
      </div>

      {sparkData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Score history ({sparkData.length} snapshot{sparkData.length === 1 ? '' : 's'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    cursor={{ stroke: 'hsl(var(--muted))' }}
                    contentStyle={{
                      background: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      fontSize: 12,
                      padding: '4px 8px',
                    }}
                    labelFormatter={(_, payload) => {
                      const ts = payload?.[0]?.payload?.ts;
                      return ts ? new Date(ts).toLocaleString() : '';
                    }}
                    formatter={(v: number) => [v, 'score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <MetricsGrid snapshot={latest} />

      <FlagsList flags={latest.flags ?? []} />
    </div>
  );
}

/* ─────────────────────── pieces ─────────────────────── */

function scoreTone(score: number | null): {
  label: string;
  className: string;
} {
  if (score === null) return { label: '—', className: 'text-muted-foreground' };
  if (score >= 85) return { label: 'Healthy', className: 'text-emerald-600' };
  if (score >= 70) return { label: 'Watch', className: 'text-amber-600' };
  if (score >= 50) return { label: 'At risk', className: 'text-orange-600' };
  return { label: 'Critical', className: 'text-red-600' };
}

function ScoreBlock({ snapshot }: { snapshot: HealthSnapshot }) {
  const tone = scoreTone(snapshot.stability_score);
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-semibold tabular-nums ${tone.className}`}>
          {snapshot.stability_score ?? '—'}
        </span>
        <span className={`text-sm font-medium ${tone.className}`}>{tone.label}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Updated {formatDistanceToNow(new Date(snapshot.computed_at), { addSuffix: true })}
        {snapshot.weights_version && ` · weights ${snapshot.weights_version}`}
      </p>
    </div>
  );
}

function MetricsGrid({ snapshot }: { snapshot: HealthSnapshot }) {
  const thinCount = snapshot.thin_sections?.length ?? 0;

  return (
    <div className="grid grid-cols-2 gap-2">
      <Metric
        icon={<PercentCircle className="h-4 w-4" />}
        label="Attendance, 30d"
        value={snapshot.attendance_rate_30d != null ? `${snapshot.attendance_rate_30d}%` : '—'}
        sub={
          snapshot.attendance_delta != null
            ? `${snapshot.attendance_delta > 0 ? '+' : ''}${snapshot.attendance_delta} vs. prior 30d`
            : 'no prior period'
        }
        tone={snapshot.attendance_delta != null && snapshot.attendance_delta < 0 ? 'warn' : 'ok'}
      />
      <Metric
        icon={<Users2 className="h-4 w-4" />}
        label="Retention, 90d"
        value={snapshot.retention_rate != null ? `${snapshot.retention_rate}%` : '—'}
        sub="active / (active + dropped)"
      />
      <Metric
        icon={<TrendingDown className="h-4 w-4" />}
        label="Thin sections"
        value={String(thinCount)}
        sub={
          thinCount === 0
            ? 'all sections on target'
            : (snapshot.thin_sections ?? [])
                .map(
                  (t) =>
                    `${VOICE_PART_LABEL[t.voice_part as VoicePart] ?? t.voice_part} ${t.current}/${t.target}`,
                )
                .join(' · ')
        }
        tone={thinCount > 0 ? 'warn' : 'ok'}
      />
      <Metric
        icon={<CalendarClock className="h-4 w-4" />}
        label="Readiness gap"
        value={
          snapshot.readiness_gap_days != null
            ? `${snapshot.readiness_gap_days}d to next req. event`
            : '—'
        }
        sub={
          snapshot.readiness_gap_days != null
            ? 'attendance below threshold'
            : 'no upcoming gap'
        }
        tone={snapshot.readiness_gap_days != null ? 'warn' : 'ok'}
      />
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
  tone = 'ok',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: 'ok' | 'warn';
}) {
  return (
    <Card>
      <CardContent className="p-3 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className={`text-lg font-semibold tabular-nums ${tone === 'warn' ? 'text-amber-700' : ''}`}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground line-clamp-2">{sub}</div>
      </CardContent>
    </Card>
  );
}

function FlagsList({ flags }: { flags: HealthFlag[] }) {
  if (flags.length === 0) {
    return (
      <Card>
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          No active flags. Nice.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {flags.length} flag{flags.length === 1 ? '' : 's'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {flags.map((f, i) => (
          <div key={i} className="flex items-start gap-2">
            <Badge variant={severityVariant(f.severity)}>{f.severity}</Badge>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{f.title}</div>
              <div className="text-xs text-muted-foreground">{f.detail}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function severityVariant(sev: string): 'destructive' | 'secondary' | 'outline' {
  if (sev === 'high') return 'destructive';
  if (sev === 'medium') return 'secondary';
  return 'outline';
}
