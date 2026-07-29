// Load one chart + its default arrangement + all objects and assignments;
// expose an optimistic `mutate` that batches into a debounced autosave.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  SeatingArrangement,
  SeatingAssignment,
  SeatingChart,
  SeatingObject,
} from '@/types/seatingCharts';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface ChartState {
  chart: SeatingChart;
  arrangement: SeatingArrangement;
  objects: SeatingObject[];
  assignments: SeatingAssignment[];
}

// Serialized diff a single autosave push covers. Delete lists are id sets;
// updates are partial rows keyed by id.
export interface PendingDiff {
  chart?: Partial<SeatingChart>;
  arrangement?: Partial<SeatingArrangement>;
  objectInserts: SeatingObject[];
  objectUpdates: Record<string, Partial<SeatingObject>>;
  objectDeletes: Set<string>;
  assignmentInserts: SeatingAssignment[];
  assignmentUpdates: Record<string, Partial<SeatingAssignment>>;
  assignmentDeletes: Set<string>;
}

function emptyDiff(): PendingDiff {
  return {
    objectInserts: [],
    objectUpdates: {},
    objectDeletes: new Set(),
    assignmentInserts: [],
    assignmentUpdates: {},
    assignmentDeletes: new Set(),
  };
}

const AUTOSAVE_MS = 800;

export function useSeatingChart(chartId: string | undefined) {
  const [state, setState] = useState<ChartState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const pendingRef = useRef<PendingDiff>(emptyDiff());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!chartId) return;
    setLoading(true);
    const { data: chart, error } = await supabase
      .from('gw_seating_charts')
      .select('*')
      .eq('id', chartId)
      .maybeSingle();
    if (error || !chart) {
      toast({ title: 'Could not open chart', description: error?.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const { data: arr } = await supabase
      .from('gw_seating_chart_arrangements')
      .select('*')
      .eq('chart_id', chartId)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!arr) {
      toast({ title: 'Chart has no arrangement', variant: 'destructive' });
      setLoading(false);
      return;
    }
    const [{ data: objects }, { data: assignments }] = await Promise.all([
      supabase.from('gw_seating_chart_objects').select('*').eq('arrangement_id', arr.id),
      supabase.from('gw_seating_chart_assignments').select('*').eq('arrangement_id', arr.id),
    ]);
    setState({
      chart: chart as SeatingChart,
      arrangement: arr as SeatingArrangement,
      objects: (objects ?? []) as SeatingObject[],
      assignments: (assignments ?? []) as SeatingAssignment[],
    });
    setLoading(false);
  }, [chartId, toast]);

  useEffect(() => {
    load();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [load]);

  const flush = useCallback(async () => {
    if (!state) return;
    const diff = pendingRef.current;
    pendingRef.current = emptyDiff();
    setSaveStatus('saving');
    try {
      if (diff.chart) {
        await supabase.from('gw_seating_charts').update(diff.chart).eq('id', state.chart.id);
      }
      if (diff.arrangement) {
        await supabase
          .from('gw_seating_chart_arrangements')
          .update(diff.arrangement)
          .eq('id', state.arrangement.id);
      }
      if (diff.objectInserts.length > 0) {
        const rows = diff.objectInserts.map(({ id, tenant_id: _t, created_at: _c, updated_at: _u, ...rest }) => ({
          id,
          ...rest,
        }));
        await supabase.from('gw_seating_chart_objects').upsert(rows);
      }
      for (const [id, patch] of Object.entries(diff.objectUpdates)) {
        await supabase.from('gw_seating_chart_objects').update(patch).eq('id', id);
      }
      if (diff.objectDeletes.size > 0) {
        await supabase
          .from('gw_seating_chart_objects')
          .delete()
          .in('id', Array.from(diff.objectDeletes));
      }
      if (diff.assignmentInserts.length > 0) {
        const rows = diff.assignmentInserts.map(({ id, tenant_id: _t, created_at: _c, updated_at: _u, ...rest }) => ({
          id,
          ...rest,
        }));
        await supabase.from('gw_seating_chart_assignments').upsert(rows);
      }
      for (const [id, patch] of Object.entries(diff.assignmentUpdates)) {
        await supabase.from('gw_seating_chart_assignments').update(patch).eq('id', id);
      }
      if (diff.assignmentDeletes.size > 0) {
        await supabase
          .from('gw_seating_chart_assignments')
          .delete()
          .in('id', Array.from(diff.assignmentDeletes));
      }
      setSaveStatus('saved');
    } catch (e) {
      console.error('[seating] save failed', e);
      setSaveStatus('error');
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' });
    }
  }, [state, toast]);

  const scheduleSave = useCallback(() => {
    setSaveStatus('dirty');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flush();
    }, AUTOSAVE_MS);
  }, [flush]);

  // Optimistic mutators — update state immediately, queue for autosave.
  const patchChart = useCallback(
    (patch: Partial<SeatingChart>) => {
      setState((prev) => (prev ? { ...prev, chart: { ...prev.chart, ...patch } } : prev));
      pendingRef.current.chart = { ...pendingRef.current.chart, ...patch };
      scheduleSave();
    },
    [scheduleSave],
  );

  const addObject = useCallback(
    (object: SeatingObject) => {
      setState((prev) => (prev ? { ...prev, objects: [...prev.objects, object] } : prev));
      pendingRef.current.objectInserts.push(object);
      scheduleSave();
    },
    [scheduleSave],
  );

  const updateObject = useCallback(
    (id: string, patch: Partial<SeatingObject>) => {
      setState((prev) =>
        prev
          ? { ...prev, objects: prev.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) }
          : prev,
      );
      pendingRef.current.objectUpdates[id] = { ...pendingRef.current.objectUpdates[id], ...patch };
      scheduleSave();
    },
    [scheduleSave],
  );

  const deleteObjects = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      setState((prev) =>
        prev
          ? {
              ...prev,
              objects: prev.objects.filter((o) => !idSet.has(o.id)),
              assignments: prev.assignments.filter((a) => !idSet.has(a.chart_object_id)),
            }
          : prev,
      );
      ids.forEach((id) => pendingRef.current.objectDeletes.add(id));
      scheduleSave();
    },
    [scheduleSave],
  );

  const upsertAssignment = useCallback(
    (assignment: SeatingAssignment) => {
      setState((prev) => {
        if (!prev) return prev;
        const existing = prev.assignments.findIndex((a) => a.chart_object_id === assignment.chart_object_id);
        const next =
          existing >= 0
            ? prev.assignments.map((a, i) => (i === existing ? { ...a, ...assignment } : a))
            : [...prev.assignments, assignment];
        return { ...prev, assignments: next };
      });
      pendingRef.current.assignmentInserts.push(assignment);
      scheduleSave();
    },
    [scheduleSave],
  );

  const clearAssignment = useCallback(
    (chartObjectId: string) => {
      let removedId: string | null = null;
      setState((prev) => {
        if (!prev) return prev;
        const target = prev.assignments.find((a) => a.chart_object_id === chartObjectId);
        if (!target) return prev;
        removedId = target.id;
        return { ...prev, assignments: prev.assignments.filter((a) => a.chart_object_id !== chartObjectId) };
      });
      if (removedId) pendingRef.current.assignmentDeletes.add(removedId);
      scheduleSave();
    },
    [scheduleSave],
  );

  const forceSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await flush();
  }, [flush]);

  const api = useMemo(
    () => ({
      state,
      loading,
      saveStatus,
      patchChart,
      addObject,
      updateObject,
      deleteObjects,
      upsertAssignment,
      clearAssignment,
      forceSave,
      reload: load,
    }),
    [
      state,
      loading,
      saveStatus,
      patchChart,
      addObject,
      updateObject,
      deleteObjects,
      upsertAssignment,
      clearAssignment,
      forceSave,
      load,
    ],
  );

  return api;
}
