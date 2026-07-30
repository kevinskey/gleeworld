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
  arrangements: SeatingArrangement[];
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
  const [activeArrangementIdOverride, setActiveArrangementIdOverride] = useState<string | null>(null);
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
    const { data: arrangements } = await supabase
      .from('gw_seating_chart_arrangements')
      .select('*')
      .eq('chart_id', chartId)
      .order('is_default', { ascending: false })
      .order('sort_order', { ascending: true });
    const allArrangements = (arrangements ?? []) as SeatingArrangement[];
    const arr = allArrangements.find((a) => a.id === activeArrangementIdOverride)
      ?? allArrangements.find((a) => a.is_default)
      ?? allArrangements[0];
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
      arrangement: arr,
      arrangements: allArrangements,
      objects: (objects ?? []) as SeatingObject[],
      assignments: (assignments ?? []) as SeatingAssignment[],
    });
    setLoading(false);
  }, [chartId, toast, activeArrangementIdOverride]);

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

  const updateAssignment = useCallback(
    (id: string, patch: Partial<SeatingAssignment>) => {
      setState((prev) =>
        prev
          ? { ...prev, assignments: prev.assignments.map((a) => (a.id === id ? { ...a, ...patch } : a)) }
          : prev,
      );
      pendingRef.current.assignmentUpdates[id] = { ...pendingRef.current.assignmentUpdates[id], ...patch };
      scheduleSave();
    },
    [scheduleSave],
  );

  const swapAssignments = useCallback(
    (swaps: Array<{ aId: string; bId: string; aChartObjectId: string; bChartObjectId: string }>) => {
      setState((prev) => {
        if (!prev) return prev;
        // Build a map of assignment id → new chart_object_id
        const idToNewObject = new Map<string, string>();
        swaps.forEach((s) => {
          idToNewObject.set(s.aId, s.bChartObjectId);
          idToNewObject.set(s.bId, s.aChartObjectId);
        });
        return {
          ...prev,
          assignments: prev.assignments.map((a) => {
            const nextObj = idToNewObject.get(a.id);
            return nextObj ? { ...a, chart_object_id: nextObj } : a;
          }),
        };
      });
      swaps.forEach((s) => {
        pendingRef.current.assignmentUpdates[s.aId] = {
          ...pendingRef.current.assignmentUpdates[s.aId], chart_object_id: s.bChartObjectId,
        };
        pendingRef.current.assignmentUpdates[s.bId] = {
          ...pendingRef.current.assignmentUpdates[s.bId], chart_object_id: s.aChartObjectId,
        };
      });
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

  const switchArrangement = useCallback(async (arrangementId: string) => {
    await forceSave();
    setActiveArrangementIdOverride(arrangementId);
  }, [forceSave]);

  const createArrangement = useCallback(async (name: string): Promise<string | null> => {
    if (!state) return null;
    const { data, error } = await supabase
      .from('gw_seating_chart_arrangements')
      .insert({
        chart_id: state.chart.id,
        name,
        is_default: false,
        sort_order: state.arrangements.length,
      })
      .select()
      .single();
    if (error || !data) {
      toast({ title: 'Could not create arrangement', description: error?.message, variant: 'destructive' });
      return null;
    }
    await load();
    return data.id;
  }, [state, load, toast]);

  const renameArrangement = useCallback(async (id: string, name: string) => {
    await supabase.from('gw_seating_chart_arrangements').update({ name }).eq('id', id);
    await load();
  }, [load]);

  const duplicateArrangement = useCallback(async (sourceId: string): Promise<string | null> => {
    if (!state) return null;
    const source = state.arrangements.find((a) => a.id === sourceId);
    if (!source) return null;
    const { data: newArr, error } = await supabase
      .from('gw_seating_chart_arrangements')
      .insert({
        chart_id: state.chart.id,
        name: `${source.name} (copy)`,
        is_default: false,
        sort_order: state.arrangements.length,
        layout_settings: source.layout_settings,
      })
      .select()
      .single();
    if (error || !newArr) {
      toast({ title: 'Could not duplicate arrangement', description: error?.message, variant: 'destructive' });
      return null;
    }
    const { data: sourceObjs } = await supabase
      .from('gw_seating_chart_objects')
      .select('*')
      .eq('arrangement_id', sourceId);
    const oldToNew = new Map<string, string>();
    if (sourceObjs && sourceObjs.length > 0) {
      const inserted: Array<{ id: string; oldId: string }> = [];
      for (const o of sourceObjs as SeatingObject[]) {
        const { id: oldId, tenant_id: _t, created_at: _c, updated_at: _u, arrangement_id: _a, ...rest } = o;
        const { data: ins } = await supabase
          .from('gw_seating_chart_objects')
          .insert({ ...rest, arrangement_id: newArr.id })
          .select('id')
          .single();
        if (ins) { oldToNew.set(oldId, ins.id); inserted.push({ id: ins.id, oldId }); }
      }
      const { data: sourceAsn } = await supabase
        .from('gw_seating_chart_assignments')
        .select('*')
        .eq('arrangement_id', sourceId);
      if (sourceAsn) {
        for (const a of sourceAsn as SeatingAssignment[]) {
          const newObjId = oldToNew.get(a.chart_object_id);
          if (!newObjId) continue;
          const { id: _id, tenant_id: _t, arrangement_id: _a, chart_object_id: _co, created_at: _c, updated_at: _u, ...rest } = a;
          await supabase.from('gw_seating_chart_assignments').insert({
            ...rest,
            arrangement_id: newArr.id,
            chart_object_id: newObjId,
          });
        }
      }
    }
    await load();
    return newArr.id;
  }, [state, load, toast]);

  const deleteArrangement = useCallback(async (id: string) => {
    if (!state || state.arrangements.length <= 1) {
      toast({ title: 'Cannot delete the only arrangement', variant: 'destructive' });
      return;
    }
    await supabase.from('gw_seating_chart_arrangements').delete().eq('id', id);
    if (state.arrangement.id === id) {
      const next = state.arrangements.find((a) => a.id !== id);
      if (next) setActiveArrangementIdOverride(next.id);
    }
    await load();
  }, [state, load, toast]);

  const setDefaultArrangement = useCallback(async (id: string) => {
    if (!state) return;
    // Clear existing default first (the partial unique index prevents two defaults).
    await supabase
      .from('gw_seating_chart_arrangements')
      .update({ is_default: false })
      .eq('chart_id', state.chart.id)
      .eq('is_default', true);
    await supabase.from('gw_seating_chart_arrangements').update({ is_default: true }).eq('id', id);
    await load();
  }, [state, load]);

  const bulkUpsertAssignments = useCallback((assignments: SeatingAssignment[]) => {
    setState((prev) => {
      if (!prev) return prev;
      const byObj = new Map(prev.assignments.map((a) => [a.chart_object_id, a] as const));
      assignments.forEach((a) => byObj.set(a.chart_object_id, a));
      return { ...prev, assignments: Array.from(byObj.values()) };
    });
    assignments.forEach((a) => pendingRef.current.assignmentInserts.push(a));
    scheduleSave();
  }, [scheduleSave]);

  const replaceArrangementContents = useCallback(async (
    objects: SeatingObject[],
    assignments: SeatingAssignment[],
  ) => {
    if (!state) return;
    // Cancel any pending debounced save; we're doing a hard reset.
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    pendingRef.current = emptyDiff();
    setSaveStatus('saving');
    try {
      await supabase.from('gw_seating_chart_assignments').delete().eq('arrangement_id', state.arrangement.id);
      await supabase.from('gw_seating_chart_objects').delete().eq('arrangement_id', state.arrangement.id);
      if (objects.length > 0) {
        const rows = objects.map(({ id, tenant_id: _t, created_at: _c, updated_at: _u, ...rest }) => ({
          id, ...rest, arrangement_id: state.arrangement.id,
        }));
        await supabase.from('gw_seating_chart_objects').insert(rows);
      }
      if (assignments.length > 0) {
        const rows = assignments.map(({ id, tenant_id: _t, created_at: _c, updated_at: _u, ...rest }) => ({
          id, ...rest, arrangement_id: state.arrangement.id,
        }));
        await supabase.from('gw_seating_chart_assignments').insert(rows);
      }
      await load();
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error');
      toast({ title: 'Restore failed', description: (e as Error).message, variant: 'destructive' });
    }
  }, [state, load, toast]);

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
      updateAssignment,
      swapAssignments,
      bulkUpsertAssignments,
      clearAssignment,
      forceSave,
      reload: load,
      switchArrangement,
      createArrangement,
      renameArrangement,
      duplicateArrangement,
      deleteArrangement,
      setDefaultArrangement,
      replaceArrangementContents,
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
      updateAssignment,
      swapAssignments,
      bulkUpsertAssignments,
      clearAssignment,
      forceSave,
      load,
      switchArrangement,
      createArrangement,
      renameArrangement,
      duplicateArrangement,
      deleteArrangement,
      setDefaultArrangement,
      replaceArrangementContents,
    ],
  );

  return api;
}
