// Seating chart editor: chart-first layout. A slim icon rail (left on md+,
// bottom bar on phones) opens tool panels that overlay the canvas as
// flyouts (md+) or Sheets (phones) — the canvas itself never reflows.
// Loads people from gw_profiles_directory scoped to the current tenant.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Printer, Download, RefreshCw, Wand2, Share2, Users, FileText,
  Shapes, SlidersHorizontal, Users2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsCompactNav } from '@/hooks/use-mobile';
import { useSeatingChart } from '@/hooks/useSeatingChart';
import { PeoplePanel } from '@/features/seating-charts/engine/PeoplePanel';
import { ObjectsPanel } from '@/features/seating-charts/engine/ObjectsPanel';
import { PropertiesPanel } from '@/features/seating-charts/engine/PropertiesPanel';
import { CanvasEngine } from '@/features/seating-charts/engine/CanvasEngine';
import { ArrangementsSwitcher } from '@/features/seating-charts/editor/ArrangementsSwitcher';
import { EditorRail, type RailItem, type RailItemKey } from '@/features/seating-charts/editor/EditorRail';
import { EditorFlyout } from '@/features/seating-charts/editor/EditorFlyout';
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
import type { SeatingAssignment, SeatingObject, SeatingPerson } from '@/types/seatingCharts';
import { newDbId, isUuid } from '@/features/seating-charts/ids';

const FLYOUT_TITLES: Record<string, string> = {
  people: 'People',
  objects: 'Objects',
  properties: 'Properties',
  share: 'Share & export',
};

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
  const [activeFlyout, setActiveFlyout] = useState<RailItemKey | null>(null);
  // Tap-to-place: native HTML5 drag-and-drop never fires on touch, so a
  // tapped person is "armed" and the next tapped seat receives them.
  const [armedPerson, setArmedPerson] = useState<{ id: string; name: string } | null>(null);
  // Same 768px gate as the rail's `md:` classes — a useIsPhone (640px) gate
  // here left 640-767px viewports with buttons that opened nothing.
  const isCompact = useIsCompactNav();
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

  // Selecting on the canvas opens Properties; deselecting closes it.
  // Compact viewports keep it manual — an auto-opening sheet would cover
  // the chart on every tap.
  useEffect(() => {
    if (isCompact) return;
    if (selection.length > 0) {
      setActiveFlyout('properties');
    } else {
      setActiveFlyout((k) => (k === 'properties' ? null : k));
    }
  }, [selection.length, isCompact]);

  const handleRailSelect = useCallback((key: RailItemKey) => {
    if (key === 'autoplace') { setPlacementOpen(true); return; }
    if (key === 'groups') { setGroupsOpen(true); return; }
    setActiveFlyout((k) => (k === key ? null : key));
  }, []);

  const handleAddObject = useCallback((partial: Omit<SeatingObject, 'id' | 'tenant_id' | 'arrangement_id' | 'created_at' | 'updated_at'>) => {
    if (!state) return;
    const object: SeatingObject = {
      ...partial,
      id: newDbId(),
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
    // Imported guests have synthetic ids; only real user uuids may go in profile_id.
    const isRealUser = isUuid(profileId);
    const assignment: SeatingAssignment = {
      id: existing?.id ?? newDbId(),
      tenant_id: state.chart.tenant_id,
      arrangement_id: state.arrangement.id,
      chart_object_id: objectId,
      profile_id: isRealUser ? profileId : null,
      external_person_id: isRealUser ? null : profileId,
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

  // Arm a person from the People panel (tap-to-place). On compact
  // viewports the panel is a Sheet covering the chart, so close it to
  // expose the seats.
  const handleArmPerson = useCallback((person: { id: string; name: string } | null) => {
    setArmedPerson(person);
    if (person && isCompact) setActiveFlyout(null);
  }, [isCompact]);

  // Second half of tap-to-place: tapping a seat selects it; if someone is
  // armed, that selection becomes their assignment.
  useEffect(() => {
    if (!armedPerson || selection.length !== 1) return;
    const obj = selection[0];
    if (!['seat', 'chair', 'riser_slot', 'desk'].includes(obj.object_type)) return;
    handleDropPerson(obj.id, armedPerson.id, armedPerson.name);
    setArmedPerson(null);
    setSelectedIds([]);
  }, [armedPerson, selection, handleDropPerson]);

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

  const railItems: RailItem[] = [
    { key: 'people', icon: Users, label: 'People' },
    { key: 'objects', icon: Shapes, label: 'Objects' },
    { key: 'properties', icon: SlidersHorizontal, label: 'Properties', badge: selection.length },
    { key: 'autoplace', icon: Wand2, label: 'Auto-place', dividerBefore: true },
    { key: 'groups', icon: Users2, label: 'Groups' },
    { key: 'share', icon: Share2, label: 'Share & export', dividerBefore: true },
  ];

  const railExtras = (
    <AttendancePanel
      attendance={attendance}
      assignments={state.assignments}
      objects={state.objects}
      onReflow={handleReflow}
      onRefresh={attendance.refresh}
    />
  );

  const flyoutContent = (key: RailItemKey) => {
    switch (key) {
      case 'people':
        return (
          <PeoplePanel
            people={mergedPeople}
            assignedPersonIds={assignedPersonIds}
            peopleSearch={peopleSearch}
            onPeopleSearchChange={setPeopleSearch}
            onRefreshPeople={loadPeople}
            onImportRoster={() => setImportOpen(true)}
            armedPersonId={armedPerson?.id ?? null}
            onArmPerson={handleArmPerson}
          />
        );
      case 'objects':
        return (
          <ObjectsPanel
            onAddObject={(partial) => {
              handleAddObject(partial);
              if (isCompact) setActiveFlyout(null);
            }}
          />
        );
      case 'properties':
        return (
          <PropertiesPanel
            selection={selection}
            assignmentByObjectId={assignmentByObjectId}
            allAssignments={state.assignments}
            allObjects={state.objects}
            onUpdate={updateObject}
            onUpdateAssignment={updateAssignment}
            onClearAssignment={clearAssignment}
            onDelete={(ids) => { deleteObjects(ids); setSelectedIds([]); setActiveFlyout(null); }}
          />
        );
      case 'share':
        return (
          <div className="p-2 space-y-1">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => setShareOpen(true)}>
              <Share2 className="w-4 h-4" /> Share
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={handleExportPng}>
              <Download className="w-4 h-4" /> Export PNG
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={handleExportPdf}>
              <FileText className="w-4 h-4" /> Export PDF
            </Button>
            <div className="border-t my-2" />
            <div className="flex items-center gap-1 text-xs">
              <OrchestraToolbar
                objects={state.objects}
                assignments={state.assignments}
                onApplyChairNumbers={(patches) => patches.forEach((p) => updateAssignment(p.id, { chair_number: p.chair_number }))}
                onRotateStands={(swaps) => swapAssignments(swaps)}
              />
              <span>Orchestra tools</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <VersionsMenu
                arrangementId={state.arrangement.id}
                objects={state.objects}
                assignments={state.assignments}
                onRestore={replaceArrangementContents}
              />
              <span>Snapshots</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <AssociationsMenu chartId={state.chart.id} />
              <span>Calendar links</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    // Mobile: DashboardShell keeps an 80px+safe-top TopBar and a docked
    // 4rem+safe-bottom footer. 100vh-56px overflowed that box, shoving the
    // bottom tool rail underneath the app footer — the editor looked like
    // it had no People/Objects tools at all on phones. dvh (not vh) so
    // Safari's collapsing URL bar doesn't re-hide the rail.
    <div className="flex flex-col h-[calc(100dvh-80px-4rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-[calc(100vh-56px)]">
      <header className="flex items-center gap-2 border-b bg-card px-2 md:px-3 py-2 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => nav('/seating-charts')} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Input
          value={state.chart.name}
          onChange={(e) => patchChart({ name: e.target.value })}
          className="h-8 min-w-0 flex-1 md:flex-none md:w-72 text-sm font-semibold"
        />
        <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">
          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'saved' && 'Saved'}
          {saveStatus === 'dirty' && 'Unsaved changes'}
          {saveStatus === 'error' && <span className="text-destructive">Save error</span>}
          {saveStatus === 'idle' && 'Ready'}
        </span>
        <div className="flex items-center gap-1 ml-auto shrink-0">
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
          <Button variant="ghost" size="icon" title="Reload from server" aria-label="Reload from server" onClick={() => { if (saveStatus !== 'dirty' || confirm('Reload from server? Your unsaved changes will be discarded.')) reload(); }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Save now" aria-label="Save now" onClick={() => forceSave()}>
            <Save className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:flex">
          <EditorRail items={railItems} activeKey={activeFlyout} onSelect={handleRailSelect}>
            {railExtras}
          </EditorRail>
        </div>

        <div className="relative flex-1 flex overflow-hidden">
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
          {armedPerson && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-primary text-primary-foreground text-xs px-3 py-2 shadow print:hidden">
              <span>Tap a seat to place {armedPerson.name}</span>
              <button type="button" className="underline font-semibold" onClick={() => setArmedPerson(null)}>
                Cancel
              </button>
            </div>
          )}
          {!isCompact && activeFlyout && (
            <EditorFlyout title={FLYOUT_TITLES[activeFlyout] ?? ''} onClose={() => {
              if (activeFlyout === 'properties') setSelectedIds([]);
              setActiveFlyout(null);
            }}>
              {flyoutContent(activeFlyout)}
            </EditorFlyout>
          )}
        </div>
      </div>

      {/* Phone: rail docks to the bottom edge; panels open as Sheets. */}
      <div className="flex md:hidden print:hidden">
        <EditorRail items={railItems} activeKey={activeFlyout} onSelect={handleRailSelect}>
          {railExtras}
        </EditorRail>
      </div>

      {isCompact && (
        <Sheet open={activeFlyout !== null} onOpenChange={(open) => { if (!open) setActiveFlyout(null); }}>
          <SheetContent side={activeFlyout === 'properties' ? 'right' : 'left'} className="p-0 w-[85vw] max-w-sm">
            <SheetHeader className="p-3 border-b">
              <SheetTitle className="text-sm">{activeFlyout ? FLYOUT_TITLES[activeFlyout] : ''}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-[calc(100%-49px)]">
              {activeFlyout && flyoutContent(activeFlyout)}
            </div>
          </SheetContent>
        </Sheet>
      )}

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
