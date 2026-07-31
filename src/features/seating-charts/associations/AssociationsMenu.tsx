// Toolbar menu for attaching a chart to an ensemble / course / event / tour.
// Backed by gw_seating_chart_associations from Phase 1.
import { useCallback, useEffect, useState } from 'react';
import { Link2, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  attachChart, detachChart,
} from '../adapters/tourManagerAdapter';
import type { SeatingAssociationType } from '@/types/seatingCharts';

interface Option { id: string; label: string; }

const TYPE_LABEL: Record<SeatingAssociationType, string> = {
  ensemble: 'Ensemble',
  course: 'Course',
  event: 'Event',
  tour: 'Tour',
  tour_event: 'Tour event',
  venue: 'Venue',
  production: 'Production',
};

async function loadOptions(type: SeatingAssociationType): Promise<Option[]> {
  if (type === 'ensemble') {
    const { data } = await supabase.from('gw_ensembles').select('id, name').eq('is_active', true).order('name');
    return (data ?? []).map((r: any) => ({ id: r.id, label: r.name }));
  }
  if (type === 'course') {
    const { data } = await supabase.from('gw_courses').select('id, title').order('title').limit(200);
    return (data ?? []).map((r: any) => ({ id: r.id, label: r.title }));
  }
  if (type === 'tour' || type === 'tour_event') {
    const { data } = await supabase.from('gw_tour_events').select('id, title').order('start_date', { ascending: false }).limit(50);
    return (data ?? []).map((r: any) => ({ id: r.id, label: r.title }));
  }
  if (type === 'event') {
    const { data } = await supabase.from('events').select('id, title').order('created_at', { ascending: false }).limit(50);
    return (data ?? []).map((r: any) => ({ id: r.id, label: r.title }));
  }
  return [];
}

interface AssociationsMenuProps {
  chartId: string;
}

interface AssociationRow {
  id: string;
  association_type: SeatingAssociationType;
  association_id: string;
  label?: string | null;
}

export function AssociationsMenu({ chartId }: AssociationsMenuProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<AssociationRow[]>([]);
  const [type, setType] = useState<SeatingAssociationType>('event');
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('gw_seating_chart_associations')
      .select('id, association_type, association_id')
      .eq('chart_id', chartId);
    const list = (data ?? []) as AssociationRow[];
    // Hydrate labels lazily per type.
    const hydrated: AssociationRow[] = [];
    for (const r of list) {
      let label: string | null = null;
      try {
        if (r.association_type === 'ensemble') {
          const { data: e } = await supabase.from('gw_ensembles').select('name').eq('id', r.association_id).maybeSingle();
          label = e?.name ?? null;
        } else if (r.association_type === 'course') {
          const { data: c } = await supabase.from('gw_courses').select('title').eq('id', r.association_id).maybeSingle();
          label = c?.title ?? null;
        } else if (r.association_type === 'tour' || r.association_type === 'tour_event') {
          const { data: t } = await supabase.from('gw_tour_events').select('title').eq('id', r.association_id).maybeSingle();
          label = t?.title ?? null;
        } else if (r.association_type === 'event') {
          const { data: ev } = await supabase.from('events').select('title').eq('id', r.association_id).maybeSingle();
          label = ev?.title ?? null;
        }
      } catch { /* ignore lookup errors so a missing target doesn't hide the association */ }
      hydrated.push({ ...r, label });
    }
    setRows(hydrated);
  }, [chartId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    setSelectedId('');
    setLoading(true);
    loadOptions(type).then(setOptions).finally(() => setLoading(false));
  }, [type]);

  async function onAttach() {
    if (!selectedId) return;
    const assocType = type === 'tour_event' ? 'tour_event' : (type === 'tour' ? 'tour' : type) as any;
    const result = await attachChart({
      chartId, associationType: assocType,
      associationId: selectedId,
    }).catch(() => null);
    if (!result) {
      toast({ title: 'Attach failed', variant: 'destructive' });
      return;
    }
    setSelectedId('');
    await refresh();
    toast({ title: 'Attached' });
  }

  async function onDetach(id: string) {
    const ok = await detachChart(id);
    if (!ok) { toast({ title: 'Detach failed', variant: 'destructive' }); return; }
    await refresh();
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Associations">
          <Link2 className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 text-xs">
        <div>
          <p className="font-semibold text-sm">Chart associations</p>
          <p className="text-muted-foreground">Link this chart to something in GleeWorld — an ensemble, class, event, or tour.</p>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={type} onValueChange={(v) => setType(v as SeatingAssociationType)}>
              <SelectTrigger className="w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ensemble" className="text-xs">Ensemble</SelectItem>
                <SelectItem value="course" className="text-xs">Course</SelectItem>
                <SelectItem value="event" className="text-xs">Event</SelectItem>
                <SelectItem value="tour_event" className="text-xs">Tour event</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedId} onValueChange={setSelectedId} disabled={loading}>
              <SelectTrigger className="flex-1 text-xs">
                <SelectValue placeholder={loading ? 'Loading…' : `Choose a ${TYPE_LABEL[type].toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => <SelectItem key={o.id} value={o.id} className="text-xs">{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="w-full h-7 text-xs gap-1.5" disabled={!selectedId} onClick={onAttach}>
            <Plus className="w-3.5 h-3.5" /> Attach
          </Button>
        </div>

        <div className="space-y-1">
          <p className="font-medium">Current associations</p>
          {rows.length === 0 ? (
            <p className="text-muted-foreground py-1">Not attached to anything yet.</p>
          ) : (
            <ul className="border rounded-md divide-y">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{r.label ?? r.association_id.slice(0, 8)}</p>
                    <Badge variant="secondary" className="text-[10px] mt-0.5">{TYPE_LABEL[r.association_type]}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDetach(r.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default AssociationsMenu;
