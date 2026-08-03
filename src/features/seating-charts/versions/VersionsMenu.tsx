// Save / restore snapshots for the current arrangement.
import { useCallback, useEffect, useState } from 'react';
import { History, Camera, RotateCcw, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import type { SeatingAssignment, SeatingObject } from '@/types/seatingCharts';

export interface VersionRow {
  id: string;
  name: string;
  created_at: string;
  snapshot: {
    objects: SeatingObject[];
    assignments: SeatingAssignment[];
  };
}

interface VersionsMenuProps {
  arrangementId: string;
  objects: SeatingObject[];
  assignments: SeatingAssignment[];
  onRestore: (objects: SeatingObject[], assignments: SeatingAssignment[]) => Promise<void>;
}

const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;

export function VersionsMenu({ arrangementId, objects, assignments, onRestore }: VersionsMenuProps) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('gw_seating_chart_versions')
      .select('id, name, created_at, snapshot')
      .eq('arrangement_id', arrangementId)
      .order('created_at', { ascending: false })
      .limit(20);
    setVersions((data ?? []) as VersionRow[]);
  }, [arrangementId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function save() {
    setSaving(true);
    const snapshot = { objects, assignments };
    const payload = JSON.stringify(snapshot);
    if (payload.length > MAX_SNAPSHOT_BYTES) {
      toast({ title: 'Chart too large to snapshot', description: `Snapshot is ${(payload.length / 1024 / 1024).toFixed(1)} MB (limit 2 MB).`, variant: 'destructive' });
      setSaving(false);
      return;
    }
    const { error } = await supabase.from('gw_seating_chart_versions').insert({
      arrangement_id: arrangementId,
      name: `Snapshot ${new Date().toLocaleString()}`,
      snapshot,
    });
    if (error) {
      toast({ title: 'Snapshot failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Snapshot saved' });
      await refresh();
    }
    setSaving(false);
  }

  async function restore(v: VersionRow) {
    if (!confirm(`Restore "${v.name}"? This replaces every object and assignment in the current arrangement.`)) return;
    await onRestore(v.snapshot.objects, v.snapshot.assignments);
    toast({ title: 'Restored', description: v.name });
  }

  async function remove(id: string) {
    const { error } = await supabase.from('gw_seating_chart_versions').delete().eq('id', id);
    if (error) { toast({ title: 'Could not delete', description: error.message, variant: 'destructive' }); return; }
    await refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Snapshots"><History className="w-4 h-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs">Snapshots</DropdownMenuLabel>
        <DropdownMenuItem disabled={saving} onClick={save} className="text-xs gap-2">
          <Camera className="w-4 h-4" /> Save snapshot
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {versions.length === 0 && (
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">No snapshots yet.</DropdownMenuItem>
        )}
        {versions.map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-1 px-2 py-1 text-xs">
            <div className="min-w-0 flex-1">
              <p className="truncate">{v.name}</p>
              <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => restore(v)} title="Restore"><RotateCcw className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm(`Delete snapshot "${v.name}"? This cannot be undone.`)) remove(v.id); }} title="Delete snapshot" aria-label="Delete snapshot"><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default VersionsMenu;
