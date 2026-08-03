// Roster import dialog. Loads people from a chosen source (ensemble /
// course / tour) via the list_seating_chart_roster RPC, or parses CSV
// client-side. The returned list is passed back to the caller to merge
// into the People palette — nothing is persisted until placed.
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { SeatingPerson } from '@/types/seatingCharts';

interface RosterImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (people: SeatingPerson[]) => void;
}

interface AssociationOption { id: string; label: string; }

async function loadAssociations(type: 'ensemble' | 'course' | 'tour_event'): Promise<AssociationOption[]> {
  if (type === 'ensemble') {
    const { data } = await supabase.from('gw_ensembles').select('id, name').eq('is_active', true).order('name');
    return (data ?? []).map((r: any) => ({ id: r.id, label: r.name }));
  }
  if (type === 'course') {
    const { data } = await supabase.from('gw_courses').select('id, title').order('title').limit(200);
    return (data ?? []).map((r: any) => ({ id: r.id, label: r.title }));
  }
  const { data } = await supabase.from('gw_tour_events').select('id, title').order('start_date', { ascending: false }).limit(50);
  return (data ?? []).map((r: any) => ({ id: r.id, label: r.title }));
}

// name,voice_part,instrument — case-insensitive header row optional
function parseCsv(csv: string): SeatingPerson[] {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  let cols = ['name', 'voice_part', 'instrument'];
  const first = lines[0].toLowerCase();
  const startIdx = /name|full[_ ]?name/.test(first) ? 1 : 0;
  if (startIdx === 1) cols = lines[0].split(',').map((c) => c.trim().toLowerCase());
  const nameIdx = cols.findIndex((c) => c === 'name' || c === 'full_name' || c === 'full name');
  const vpIdx = cols.findIndex((c) => c === 'voice_part' || c === 'voice');
  const instIdx = cols.findIndex((c) => c === 'instrument');
  const people: SeatingPerson[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim());
    const name = nameIdx >= 0 ? parts[nameIdx] : parts[0];
    if (!name) continue;
    people.push({
      user_id: `guest_${Date.now()}_${i}`,
      full_name: name,
      voice_part: vpIdx >= 0 ? parts[vpIdx] || null : null,
      avatar_url: null,
    });
  }
  return people;
}

export function RosterImportDialog({ open, onOpenChange, onImport }: RosterImportDialogProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<'ensemble' | 'course' | 'tour_event' | 'csv'>('ensemble');
  const [options, setOptions] = useState<AssociationOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [preview, setPreview] = useState<SeatingPerson[]>([]);
  const [csv, setCsv] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || tab === 'csv') return;
    setSelectedId(''); setPreview([]);
    setLoading(true);
    loadAssociations(tab)
      .then(setOptions)
      .finally(() => setLoading(false));
  }, [open, tab]);

  async function loadPreview() {
    if (!selectedId) return;
    setLoading(true);
    const type = tab === 'tour_event' ? 'tour_event' : tab;
    const { data, error } = await supabase.rpc('list_seating_chart_roster', {
      p_association_type: type,
      p_association_id: selectedId,
    });
    if (error) {
      toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
      setPreview([]);
    } else {
      setPreview((data ?? []) as SeatingPerson[]);
    }
    setLoading(false);
  }

  function applyImport() {
    const list = tab === 'csv' ? parseCsv(csv) : preview;
    if (list.length === 0) return;
    onImport(list);
    toast({ title: `Imported ${list.length} people` });
    onOpenChange(false);
    setSelectedId(''); setPreview([]); setCsv('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Import roster</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-4 text-xs">
            <TabsTrigger value="ensemble">Ensemble</TabsTrigger>
            <TabsTrigger value="course">Course</TabsTrigger>
            <TabsTrigger value="tour_event">Tour</TabsTrigger>
            <TabsTrigger value="csv">CSV</TabsTrigger>
          </TabsList>

          {(['ensemble', 'course', 'tour_event'] as const).map((k) => (
            <TabsContent key={k} value={k} className="space-y-3">
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="text-xs"><SelectValue placeholder={loading ? 'Loading…' : `Choose a ${k.replace('_', ' ')}`} /></SelectTrigger>
                <SelectContent>
                  {options.map((o) => <SelectItem key={o.id} value={o.id} className="text-xs">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" disabled={!selectedId || loading} onClick={loadPreview}>Preview roster</Button>
              {preview.length > 0 && (
                <div className="border rounded p-2 max-h-48 overflow-y-auto text-xs bg-muted/30">
                  {preview.length} people
                  <ul className="mt-1 space-y-0.5">
                    {preview.slice(0, 20).map((p) => (
                      <li key={p.user_id}>{p.full_name}{p.voice_part ? ` · ${p.voice_part}` : ''}</li>
                    ))}
                    {preview.length > 20 && <li className="text-muted-foreground">+ {preview.length - 20} more</li>}
                  </ul>
                </div>
              )}
            </TabsContent>
          ))}

          <TabsContent value="csv" className="space-y-2">
            <label className="text-xs font-medium">Paste CSV</label>
            <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={8}
              placeholder="name,voice_part,instrument
Aisha Adams,Soprano
Marcus Bell,Tenor
..." className="text-xs font-mono" />
            <p className="text-xs text-muted-foreground">Header row is optional. Column order: name, voice_part, instrument.</p>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={applyImport}
            disabled={tab === 'csv' ? !csv.trim() : preview.length === 0}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RosterImportDialog;
