// Seating chart editor: toolbar + palette + canvas + properties panel.
// Loads people from gw_profiles_directory scoped to the current tenant.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Printer, Download, Undo2, Wand2, Share2, Users, FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSeatingChart } from '@/hooks/useSeatingChart';
import { Palette } from '@/features/seating-charts/engine/Palette';
import { PropertiesPanel } from '@/features/seating-charts/engine/PropertiesPanel';
import { CanvasEngine } from '@/features/seating-charts/engine/CanvasEngine';
import { ArrangementsSwitcher } from '@/features/seating-charts/editor/ArrangementsSwitcher';
import { PlacementDialog } from '@/features/seating-charts/placement/PlacementDialog';
import { ShareDialog } from '@/features/seating-charts/sharing/ShareDialog';
import { RosterImportDialog } from '@/features/seating-charts/imports/RosterImportDialog';
import { VersionsMenu } from '@/features/seating-charts/versions/VersionsMenu';
import { exportChartPdf } from '@/features/seating-charts/exports/pdfExport';
import { AttendancePanel } from '@/features/seating-charts/attendance/AttendancePanel';
import { useChartAttendance } from '@/features/seating-charts/attendance/useChartAttendance';
import { AssociationsMenu } from '@/features/seating-charts/associations/AssociationsMenu';
import { GroupManager } from '@/features/seating-charts/placement/GroupManager';
import { OrchestraToolbar } from '@/features/seating-charts/orchestra/OrchestraToolbar';
import { Users2 } from 'lucide-react';
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
    upsertAssignment, updateAssignment, swapAssignments,
    bulkUpsertAssignments, clearAssignment, forceSave, reload,
    switchArrangement, createArrangement, renameArrangement, duplicateArrangement,
    deleteArrangement, setDefaultArrangement, replaceArrangementContents,
  } = useSeatingChart(chartId);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [people, setPeople] = useState<SeatingPerson[]>([]);
  const [importedGuests, setImportedGuests] = useState<SeatingPerson[]>([]);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [placementOpen, setPlacementOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const attendance = useChartAttendance(chartId);

  const loadPeople = useCallback(async () => {
    const { data } = await supabase
      .from('gw_profiles_directory')
      .select('user_id, full_name, voice_part, avatar_url')
      .order('full_name');
    setPeople((data ?? []) as SeatingPerson[]);
  }, []);

  useEffect(() => { loadPeople(); }, [loadPeople]);

  const mergedPeople = useMemo(() => {
    // Deduplicate: prefer directory entries; guests only if user_id not present.
    const byId = new Map<string, SeatingPerson>();
    people.forEach((p) => byId.set(p.user_id, p));
    importedGuests.forEach((g) => { if (!byId.has(g.user_id)) byId.set(g.user_id, g); });
    return Array.from(byId.values());
  }, [people, importedGuests]);

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

  const handleExportPdf = useCallback(async () => {
    const svg = canvasRef.current?.querySelector('svg');
    if (!svg || !state) return;
    await exportChartPdf({ chart: state.chart, objects: state.objects, assignments: state.assignments, svg });
  }, [state]);

  const handleImportRoster = useCallback((imported: SeatingPerson[]) => {
    setImportedGuests((prev) => {
      const seen = new Set(prev.map((p) => p.user_id));
      return [...prev, ...imported.filter((p) => !seen.has(p.user_id))];
    });
  }, []);

  const handleApplyPlacement = useCallback((newAssignments: SeatingAssignment[]) => {
    bulkUpsertAssignments(newAssignments);
  }, [bulkUpsertAssignments]);

  const handleReflow = useCallback((moves: Array<{ id: string; x: number; y: number }>) => {
    moves.forEach((m) => updateObject(m.id, { x: m.x, y: m.y }));
  }, [updateObject]);

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
          <ArrangementsSwitcher
            arrangements={state.arrangements}
            activeId={state.arrangement.id}
            onSwitch={switchArrangement}
            onCreate={(name) => createArrangement(name)}
            onRename={renameArrangement}
            onDuplicate={duplicateArrangement}
            onSetDefault={setDefaultArrangement}
            onDelete={deleteArrangement}
          />
          <Button variant="ghost" size="icon" title="Auto-place" onClick={() => setPlacementOpen(true)}>
            <Wand2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Import roster" onClick={() => setImportOpen(true)}>
            <Users className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Share" onClick={() => setShareOpen(true)}>
            <Share2 className="w-4 h-4" />
          </Button>
          <AssociationsMenu chartId={state.chart.id} />
          <Button variant="ghost" size="icon" title="Groups" onClick={() => setGroupsOpen(true)}>
            <Users2 className="w-4 h-4" />
          </Button>
          <OrchestraToolbar
            objects={state.objects}
            assignments={state.assignments}
            onApplyChairNumbers={(patches) => patches.forEach((p) => updateAssignment(p.id, { chair_number: p.chair_number }))}
            onRotateStands={(swaps) => swapAssignments(swaps)}
          />
          <AttendancePanel
            attendance={attendance}
            assignments={state.assignments}
            objects={state.objects}
            onReflow={handleReflow}
            onRefresh={attendance.refresh}
          />
          <VersionsMenu
            arrangementId={state.arrangement.id}
            objects={state.objects}
            assignments={state.assignments}
            onRestore={replaceArrangementContents}
          />
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
          <Button variant="ghost" size="icon" title="Export PDF" onClick={handleExportPdf}>
            <FileText className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Palette
          people={mergedPeople}
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
            attendanceByUserId={attendance.byUserId}
          />
        </div>

        <PropertiesPanel
          selection={selection}
          assignmentByObjectId={assignmentByObjectId}
          allAssignments={state.assignments}
          allObjects={state.objects}
          onUpdate={updateObject}
          onUpdateAssignment={updateAssignment}
          onClearAssignment={clearAssignment}
          onDelete={(ids) => { deleteObjects(ids); setSelectedIds([]); }}
        />
      </div>

      <PlacementDialog
        open={placementOpen}
        onOpenChange={setPlacementOpen}
        chart={state.chart}
        objects={state.objects}
        assignments={state.assignments}
        people={mergedPeople}
        arrangementId={state.arrangement.id}
        tenantId={state.chart.tenant_id}
        onApply={handleApplyPlacement}
        onOpenGroupManager={() => setGroupsOpen(true)}
      />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} chartId={state.chart.id} />
      <RosterImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImportRoster} />
      <GroupManager
        open={groupsOpen}
        onOpenChange={setGroupsOpen}
        chart={state.chart}
        people={mergedPeople}
        onPatchChart={patchChart}
      />
    </div>
  );
}

export default SeatingChartEditorPage;
