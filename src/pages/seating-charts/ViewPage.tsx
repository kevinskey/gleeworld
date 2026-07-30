// Read-only chart view with role-based rendering.
//
// Query param `?role=…` variants:
//   performer (default)  — highlight the viewer's own seat.
//   section_leader       — highlight all seats matching the viewer's voice_part.
//   stage_crew           — hide people-seats; show only stage furniture, mics,
//                          instruments, monitors, and an equipment count strip.
//   substitute           — show desks + names, hide chart description/notes.
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Armchair } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CanvasEngine } from '@/features/seating-charts/engine/CanvasEngine';
import { useSeatingChart } from '@/hooks/useSeatingChart';
import { useChartAttendance } from '@/features/seating-charts/attendance/useChartAttendance';
import { buildEquipmentList } from '@/features/seating-charts/exports/pdfExport';
import type { SeatingObject } from '@/types/seatingCharts';

type ViewRole = 'performer' | 'section_leader' | 'stage_crew' | 'substitute';

const ROLE_LABEL: Record<ViewRole, string> = {
  performer: 'Performer view',
  section_leader: 'Section leader view',
  stage_crew: 'Stage crew view',
  substitute: 'Substitute view',
};

const STAGE_CREW_TYPES: SeatingObject['object_type'][] = [
  'stage_boundary', 'instrument', 'microphone', 'monitor',
  'music_stand', 'table', 'label', 'shape',
];

export function SeatingChartViewPage() {
  const { chartId } = useParams<{ chartId: string }>();
  const [params] = useSearchParams();
  const role = ((params.get('role') as ViewRole) ?? 'performer') as ViewRole;
  const { state, loading } = useSeatingChart(chartId);
  const attendance = useChartAttendance(chartId);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myVoicePart, setMyVoicePart] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setMyUserId(uid);
      if (uid) {
        const { data: pd } = await supabase
          .from('gw_profiles_directory')
          .select('voice_part')
          .eq('user_id', uid)
          .maybeSingle();
        setMyVoicePart(pd?.voice_part ?? null);
      }
    })();
  }, []);

  const mySeatIds = useMemo(() => {
    if (!state || !myUserId) return [] as string[];
    if (role === 'section_leader') {
      // Any assignment matching my voice part OR my user id
      return state.assignments
        .filter((a) => a.profile_id === myUserId || (myVoicePart && a.voice_part === myVoicePart))
        .map((a) => a.chart_object_id);
    }
    return state.assignments.filter((a) => a.profile_id === myUserId).map((a) => a.chart_object_id);
  }, [state, myUserId, myVoicePart, role]);

  const objectFilter = useMemo(() => {
    if (role === 'stage_crew') {
      return (o: SeatingObject) => STAGE_CREW_TYPES.includes(o.object_type);
    }
    return undefined;
  }, [role]);

  const equipmentSummary = useMemo(() => {
    if (role !== 'stage_crew' || !state) return null;
    return buildEquipmentList(state.objects);
  }, [role, state]);

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
          <Badge variant="secondary" className="text-[10px]">{ROLE_LABEL[role]}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {(['performer', 'section_leader', 'stage_crew', 'substitute'] as ViewRole[]).map((r) => (
            <Link key={r} to={`?role=${r}`} className={`text-[11px] ${role === r ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {ROLE_LABEL[r].replace(' view', '')}
            </Link>
          ))}
        </div>
      </header>

      {role === 'stage_crew' && equipmentSummary && (
        <div className="border-b bg-slate-50 px-3 py-2 text-xs flex flex-wrap gap-x-4 gap-y-1">
          {equipmentSummary.length === 0 ? (
            <span className="text-muted-foreground">No equipment on chart.</span>
          ) : (
            equipmentSummary.map((row, i) => (
              <span key={i}><strong>{row.count}×</strong> {row.label}</span>
            ))
          )}
        </div>
      )}

      {role === 'substitute' && state.chart.description && (
        <div className="border-b bg-amber-50 px-3 py-2 text-xs">
          <p className="font-medium">Notes for you:</p>
          <p>{state.chart.description}</p>
        </div>
      )}

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
          attendanceByUserId={role === 'section_leader' ? attendance.byUserId : undefined}
          objectFilter={objectFilter}
        />
      </div>
    </div>
  );
}

export default SeatingChartViewPage;
