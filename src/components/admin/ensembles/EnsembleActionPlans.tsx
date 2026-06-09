import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Sparkles, Archive, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import type { ActionPlan, HealthSnapshot } from '@/types/programHealth';

interface Props {
  ensembleId: string;
  latestSnapshot: HealthSnapshot | undefined;
}

export function EnsembleActionPlans({ ensembleId, latestSnapshot }: Props) {
  const queryClient = useQueryClient();
  const { enabled: aiEnabled } = useFeatureFlag('health_ai');
  const [showHistory, setShowHistory] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['action_plans', ensembleId],
    queryFn: async (): Promise<ActionPlan[]> => {
      const { data, error } = await supabase
        .from('gw_action_plans')
        .select('*')
        .eq('ensemble_id', ensembleId)
        .order('generated_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as ActionPlan[];
    },
  });

  const activePlan = plans.find((p) => p.status === 'active');
  const archived = plans.filter((p) => p.status === 'archived');

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-action-plan', {
        body: { ensemble_id: ensembleId },
      });
      if (error) throw error;
      return data as { plan_id: string; recommendations: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['action_plans', ensembleId] });
      toast.success(`Plan generated · ${data.recommendations} recommendations`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_action_plans')
        .update({ status: 'archived' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action_plans', ensembleId] });
      toast.success('Plan archived');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!aiEnabled) return null; // health_ai flag gates the whole block

  const highFlags = (latestSnapshot?.flags ?? []).filter((f) => f.severity === 'high');
  const canGenerate = !!latestSnapshot && highFlags.length > 0;
  const generateDisabledReason = !latestSnapshot
    ? 'No snapshot yet — compute one first.'
    : highFlags.length === 0
      ? 'No high-severity flags to plan against.'
      : '';

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Action plan
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generate.mutate()}
          disabled={!canGenerate || generate.isPending}
          title={generateDisabledReason}
        >
          <Sparkles
            className={`h-4 w-4 mr-2 ${generate.isPending ? 'animate-pulse' : ''}`}
          />
          {activePlan ? 'Regenerate' : 'Generate'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-2">Loading…</p>
        ) : activePlan ? (
          <PlanView plan={activePlan} onArchive={(id) => archive.mutate(id)} />
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            {generateDisabledReason ||
              'No active plan. Generate one from the latest snapshot to get ranked recommendations.'}
          </p>
        )}

        {archived.length > 0 && (
          <div>
            <button
              type="button"
              className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:underline"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Previous plans ({archived.length})
            </button>
            {showHistory && (
              <div className="mt-2 space-y-3">
                {archived.map((p) => (
                  <div key={p.id} className="rounded border border-border p-3 bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-2">
                      {formatDistanceToNow(new Date(p.generated_at), { addSuffix: true })}
                      {p.model && ` · ${p.model}`}
                    </div>
                    <PlanView plan={p} readOnly />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlanView({
  plan,
  onArchive,
  readOnly,
}: {
  plan: ActionPlan;
  onArchive?: (id: string) => void;
  readOnly?: boolean;
}) {
  const recs = plan.plan?.recommendations ?? [];
  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Generated {formatDistanceToNow(new Date(plan.generated_at), { addSuffix: true })}
            {plan.model && ` · ${plan.model}`}
          </span>
          {onArchive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() => onArchive(plan.id)}
            >
              <Archive className="h-3 w-3 mr-1" />
              Archive
            </Button>
          )}
        </div>
      )}
      {recs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Plan has no recommendations.</p>
      ) : (
        <ol className="space-y-3">
          {recs.map((r) => (
            <li key={r.rank} className="space-y-1">
              <div className="flex items-baseline gap-2">
                <Badge variant="secondary" className="tabular-nums">
                  #{r.rank}
                </Badge>
                <span className="text-sm font-medium">{r.title}</span>
                <Badge variant="outline" className="text-[10px] uppercase ml-auto">
                  {r.flag_key}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{r.rationale}</p>
              <ul className="list-disc list-inside text-sm space-y-0.5 pl-2">
                {r.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              {r.owner_hint && (
                <p className="text-[11px] text-muted-foreground italic">Owner: {r.owner_hint}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
