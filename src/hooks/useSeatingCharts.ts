// List / create / archive / duplicate seating charts for the current tenant.
// Owner + tenant-admin can mutate; every tenant member can read.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  SeatingChart,
  SeatingChartMode,
  SeatingArrangement,
  TemplateSpec,
} from '@/types/seatingCharts';

export interface CreateChartInput {
  name: string;
  description?: string;
  chart_mode: SeatingChartMode;
  template_key: string;
  template?: TemplateSpec;
}

export function useSeatingCharts() {
  const [charts, setCharts] = useState<SeatingChart[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gw_seating_charts')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      toast({ title: 'Could not load seating charts', description: error.message, variant: 'destructive' });
      setCharts([]);
    } else {
      setCharts((data ?? []) as SeatingChart[]);
    }
    setLoading(false);
  }, [toast]);

  const create = useCallback(
    async (input: CreateChartInput): Promise<SeatingChart | null> => {
      const template = input.template;
      // owner_id must be set explicitly: RLS write policy requires
      // owner_id = auth.uid() (or admin), and the column has no default.
      const { data: authData } = await supabase.auth.getUser();
      const { data: chart, error } = await supabase
        .from('gw_seating_charts')
        .insert({
          owner_id: authData.user?.id,
          name: input.name,
          description: input.description ?? null,
          chart_mode: input.chart_mode,
          template_key: input.template_key,
          canvas_width: template?.canvas_width ?? 1200,
          canvas_height: template?.canvas_height ?? 800,
          orientation: template?.orientation ?? 'landscape',
          settings: template?.settings ?? {},
        })
        .select()
        .single();
      if (error || !chart) {
        toast({ title: 'Could not create chart', description: error?.message, variant: 'destructive' });
        return null;
      }

      // Default arrangement + template objects.
      const { data: arrangement, error: arrErr } = await supabase
        .from('gw_seating_chart_arrangements')
        .insert({
          chart_id: chart.id,
          name: 'Default',
          is_default: true,
          sort_order: 0,
        })
        .select()
        .single();
      if (arrErr || !arrangement) {
        toast({ title: 'Could not create arrangement', description: arrErr?.message, variant: 'destructive' });
        return chart as SeatingChart;
      }

      if (template && template.objects.length > 0) {
        const rows = template.objects.map((o) => ({ ...o, arrangement_id: arrangement.id }));
        const { error: objErr } = await supabase.from('gw_seating_chart_objects').insert(rows);
        if (objErr) {
          toast({ title: 'Template objects failed to save', description: objErr.message, variant: 'destructive' });
        }
      }

      await refetch();
      return chart as SeatingChart;
    },
    [refetch, toast],
  );

  const duplicate = useCallback(
    async (chartId: string): Promise<SeatingChart | null> => {
      const source = charts.find((c) => c.id === chartId);
      if (!source) return null;
      const { data: authData } = await supabase.auth.getUser();
      const { data: copy, error } = await supabase
        .from('gw_seating_charts')
        .insert({
          owner_id: authData.user?.id,
          name: `${source.name} (copy)`,
          description: source.description,
          chart_mode: source.chart_mode,
          template_key: source.template_key,
          canvas_width: source.canvas_width,
          canvas_height: source.canvas_height,
          orientation: source.orientation,
          settings: source.settings,
        })
        .select()
        .single();
      if (error || !copy) {
        toast({ title: 'Could not duplicate', description: error?.message, variant: 'destructive' });
        return null;
      }

      // Copy default arrangement + all its objects/assignments.
      const { data: sourceArr } = await supabase
        .from('gw_seating_chart_arrangements')
        .select('*')
        .eq('chart_id', source.id)
        .eq('is_default', true)
        .maybeSingle();
      if (sourceArr) {
        const { data: newArr } = await supabase
          .from('gw_seating_chart_arrangements')
          .insert({
            chart_id: copy.id,
            name: sourceArr.name,
            description: sourceArr.description,
            is_default: true,
            sort_order: 0,
            layout_settings: sourceArr.layout_settings,
          })
          .select()
          .single();
        if (newArr) {
          const { data: sourceObjs } = await supabase
            .from('gw_seating_chart_objects')
            .select('*')
            .eq('arrangement_id', sourceArr.id);
          if (sourceObjs && sourceObjs.length > 0) {
            const rows = sourceObjs.map(
              ({ id: _id, tenant_id: _t, created_at: _c, updated_at: _u, arrangement_id: _a, ...rest }: any) => ({
                ...rest,
                arrangement_id: newArr.id,
              }),
            );
            await supabase.from('gw_seating_chart_objects').insert(rows);
          }
        }
      }

      await refetch();
      return copy as SeatingChart;
    },
    [charts, refetch, toast],
  );

  const archive = useCallback(
    async (chartId: string, archived: boolean) => {
      const { error } = await supabase
        .from('gw_seating_charts')
        .update({
          status: archived ? 'archived' : 'active',
          archived_at: archived ? new Date().toISOString() : null,
        })
        .eq('id', chartId);
      if (error) {
        toast({ title: 'Could not archive', description: error.message, variant: 'destructive' });
        return;
      }
      await refetch();
    },
    [refetch, toast],
  );

  const remove = useCallback(
    async (chartId: string) => {
      const { error } = await supabase.from('gw_seating_charts').delete().eq('id', chartId);
      if (error) {
        toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
        return;
      }
      await refetch();
    },
    [refetch, toast],
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { charts, loading, refetch, create, duplicate, archive, remove };
}

export interface DefaultArrangementHandle {
  chart: SeatingChart | null;
  arrangement: SeatingArrangement | null;
}
