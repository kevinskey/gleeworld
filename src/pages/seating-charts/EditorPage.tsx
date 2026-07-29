// Seating chart editor: toolbar + palette + canvas + properties panel.
// Loads people from gw_profiles_directory scoped to the current tenant.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Printer, Download, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSeatingChart } from '@/hooks/useSeatingChart';
import { Palette } from '@/features/seating-charts/engine/Palette';
import { PropertiesPanel } from '@/features/seating-charts/engine/PropertiesPanel';
import { CanvasEngine } from '@/features/seating-charts/engine/CanvasEngine';
import type { SeatingAssignment, SeatingObject, SeatingPerson } from '@/types/seatingCharts';

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function SeatingChartEditorPage() {
  const params = useParams<{ chartId: string }>();
  const nav = useNavigate();
  const chartId = params.chartId;
  const {
    state, loading, saveStatus,
    patchChart, addObject, updateObject, deleteObjects,
    upsertAssignment, clearAssignment, forceSave, reload,
  } = useSeatingChart(chartId);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [people, setPeople] = useState<SeatingPerson[]>([]);
  const [peopleSearch, setPeopleSearch] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  const loadPeople = useCallback(async () => {
    const { data } = await supabase
      .from('gw_profiles_directory')
      .select('user_id, full_name, voice_part, avatar_url')
      .order('full_name');
    setPeople((data ?? []) as SeatingPerson[]);
  }, []);

  useEffect(() => { loadPeople(); }, [loadPeople]);

  const assignmentByObjectId = useMemo(() => {
    const m = new Map<string, SeatingAssignment>();
    state?.assignments.forEach((a) => m.set(a.chart_object_id, a));
    return m;
  }, [state?.assignments]);

  const assignedPersonIds = useMemo(() => {
    const s = new Set<string>();
    state?.assignments.forEach((a) => { if (a.profile_id) s.add(a.profile_id); });
    return s;
  }, [state?.assignments]);

  const selection = useMemo(
    () => (state?.objects ?? []).filter((o) => selectedIds.includes(o.id)),
    [state?.objects, selectedIds],
  );

  const handleAddObject = useCallback((partial: Omit<SeatingObject, 'id' | 'tenant_id' | 'arrangement_id' | 'created_at' | 'updated_at'>) => {
    if (!state) return;
    const object: SeatingObject = {
      ...partial,
      id: newId('obj'),
      tenant_id: state.chart.tenant_id,
      arrangement_id: state.arrangement.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    addObject(object);
    setSelectedIds([object.id]);
  }, [state, addObject]);

  const handleDropPerson = useCallback((objectId: string, profileId: string, displayName: string) => {
    if (!state) return;
    const existing = assignmentByObjectId.get(objectId);
    const assignment: SeatingAssignment = {
      id: existing?.id ?? newId('asn'),
      tenant_id: state.chart.tenant_id,
      arrangement_id: state.arrangement.id,
      chart_object_id: objectId,
      profile_id: profileId,
      external_person_id: null,
      display_name: displayName,
      section: existing?.section ?? null,
      voice_part: existing?.voice_part ?? null,
      instrument: existing?.instrument ?? null,
      chair_number: existing?.chair_number ?? null,
      assignment_status: 'assigned',
      properties: existing?.properties ?? {},
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    upsertAssignment(assignment);
  }, [state, assignmentByObjectId, upsertAssignment]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleExportPng = useCallback(async () => {
    const svg = canvasRef.current?.querySelector('svg');
    if (!svg || !state) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(state.chart.canvas_width));
    clone.setAttribute('height', String(state.chart.canvas_height));
    // Reset the pan/zoom transform for the exported PNG.
    const g = clone.querySelector('g');
    if (g) g.setAttribute('transform', '');
    const source = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('SVG load failed')); img.src = url; });
      const canvas = document.createElement('canvas');
      canvas.width = state.chart.canvas_width;
      canvas.height = state.chart.canvas_height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pngBlob);
        link.download = `${state.chart.name || 'seating-chart'}.png`;
        link.click();
      }, 'image/png');
    } finally {
      URL.revokeObjectURL(url);
    }
  }, [state]);

  if (loading || !state) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading chart…</div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <header className="flex items-center justify-between gap-3 border-b bg-white px-3 py-2 print:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => nav('/seating-charts')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Input
            value={state.chart.name}
            onChange={(e) => patchChart({ name: e.target.value })}
            className="h-8 w-72 text-sm font-semibold"
          />
          <span className="text-xs text-muted-foreground min-w-24">
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'dirty' && 'Unsaved changes'}
            {saveStatus === 'error' && <span className="text-red-600">Save error</span>}
            {saveStatus === 'idle' && 'Ready'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="Reload" onClick={() => reload()}>
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Save now" onClick={() => forceSave()}>
            <Save className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Print" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Export PNG" onClick={handleExportPng}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Palette
          people={people}
          assignedPersonIds={assignedPersonIds}
          peopleSearch={peopleSearch}
          onPeopleSearchChange={setPeopleSearch}
          onAddObject={handleAddObject}
          onRefreshPeople={loadPeople}
        />

        <div ref={canvasRef} className="flex-1 flex">
          <CanvasEngine
            width={state.chart.canvas_width}
            height={state.chart.canvas_height}
            objects={state.objects}
            assignments={state.assignments}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onObjectMove={(id, x, y) => updateObject(id, { x, y })}
            onObjectDropPerson={handleDropPerson}
          />
        </div>

        <PropertiesPanel
          selection={selection}
          assignmentByObjectId={assignmentByObjectId}
          onUpdate={updateObject}
          onClearAssignment={clearAssignment}
          onDelete={(ids) => { deleteObjects(ids); setSelectedIds([]); }}
        />
      </div>
    </div>
  );
}

export default SeatingChartEditorPage;
