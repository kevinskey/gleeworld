// Read-only performer view. Uses the same CanvasEngine but disables mutation
// and highlights the current viewer's seat.
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Armchair } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CanvasEngine } from '@/features/seating-charts/engine/CanvasEngine';
import { useSeatingChart } from '@/hooks/useSeatingChart';

export function SeatingChartViewPage() {
  const { chartId } = useParams<{ chartId: string }>();
  const { state, loading } = useSeatingChart(chartId);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setMyUserId(data.user?.id ?? null);
    })();
  }, []);

  const mySeatIds = useMemo(() => {
    if (!state || !myUserId) return [] as string[];
    return state.assignments.filter((a) => a.profile_id === myUserId).map((a) => a.chart_object_id);
  }, [state, myUserId]);

  if (loading || !state) {
    return <div className="p-6 text-sm text-muted-foreground">Loading chart…</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <header className="flex items-center justify-between gap-3 border-b bg-white px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/seating-charts">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <Armchair className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold truncate">{state.chart.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {mySeatIds.length > 0 ? `Your seat is highlighted (${mySeatIds.length})` : 'Read-only view'}
        </span>
      </header>
      <div className="flex-1 flex">
        <CanvasEngine
          width={state.chart.canvas_width}
          height={state.chart.canvas_height}
          objects={state.objects}
          assignments={state.assignments}
          selectedIds={mySeatIds}
          onSelectionChange={() => { /* no-op */ }}
          onObjectMove={() => { /* no-op */ }}
          readOnly
        />
      </div>
    </div>
  );
}

export default SeatingChartViewPage;
