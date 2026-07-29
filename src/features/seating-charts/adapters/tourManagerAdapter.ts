// Bridges the legacy Tour Manager riser/bus features to the shared Seating
// Charts feature. Phase 1 only offers `attachChart` (association) and
// `getAttachedCharts` — the legacy editors continue to write to their own
// tables until Phase 2 removes them.
import { supabase } from '@/integrations/supabase/client';
import type { SeatingAssociation, SeatingChart } from '@/types/seatingCharts';

export interface AttachChartInput {
  chartId: string;
  associationType: 'tour' | 'tour_event';
  associationId: string;
  arrangementId?: string;
}

export async function attachChart(input: AttachChartInput): Promise<SeatingAssociation | null> {
  const { data, error } = await supabase
    .from('gw_seating_chart_associations')
    .upsert(
      {
        chart_id: input.chartId,
        association_type: input.associationType,
        association_id: input.associationId,
        arrangement_id: input.arrangementId ?? null,
      },
      { onConflict: 'chart_id,association_type,association_id' },
    )
    .select()
    .single();
  if (error) {
    console.error('[tourManagerAdapter] attachChart failed', error);
    return null;
  }
  return data as SeatingAssociation;
}

export async function getAttachedCharts(
  associationType: 'tour' | 'tour_event',
  associationId: string,
): Promise<SeatingChart[]> {
  const { data, error } = await supabase
    .from('gw_seating_chart_associations')
    .select('chart_id')
    .eq('association_type', associationType)
    .eq('association_id', associationId);
  if (error || !data) return [];
  const chartIds = data.map((r: { chart_id: string }) => r.chart_id);
  if (chartIds.length === 0) return [];
  const { data: charts } = await supabase
    .from('gw_seating_charts')
    .select('*')
    .in('id', chartIds);
  return (charts ?? []) as SeatingChart[];
}

export async function detachChart(associationId: string): Promise<boolean> {
  const { error } = await supabase.from('gw_seating_chart_associations').delete().eq('id', associationId);
  return !error;
}
