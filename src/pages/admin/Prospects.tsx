// /admin/prospects — recruitment pipeline. Manual add + status tracker.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Trash2 } from 'lucide-react';

const STATUSES = ['new', 'contacted', 'auditioned', 'enrolled', 'declined'] as const;

export default function Prospects() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: prospects = [] } = useQuery({
    queryKey: ['prospects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_prospective_students')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('gw_prospective_students').insert({
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        school: form.school || null,
        grade_level: form.grade_level || null,
        voice_part: form.voice_part || null,
        experience: form.experience || null,
        source: form.source || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({});
      qc.invalidateQueries({ queryKey: ['prospects'] });
      toast({ title: 'Prospect added' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('gw_prospective_students').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prospects'] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gw_prospective_students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prospects'] }),
  });

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  const grouped = STATUSES.map((s) => ({
    status: s,
    items: prospects.filter((p: any) => p.status === s),
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-primary" /> Prospective Students
        </h1>
        <p className="text-sm text-muted-foreground">Recruitment pipeline — track inquiries from first contact to enrollment.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Add prospect</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <F label="Full name *" k="full_name" v={form.full_name} set={set} />
          <F label="Email" k="email" v={form.email} set={set} />
          <F label="Phone" k="phone" v={form.phone} set={set} />
          <F label="School" k="school" v={form.school} set={set} />
          <F label="Grade" k="grade_level" v={form.grade_level} set={set} />
          <F label="Voice part" k="voice_part" v={form.voice_part} set={set} />
          <F label="Experience" k="experience" v={form.experience} set={set} />
          <F label="Source" k="source" v={form.source} set={set} placeholder="How did they find you?" />
          <div className="sm:col-span-2">
            <Button onClick={() => add.mutate()} disabled={!form.full_name?.trim() || add.isPending}>Add prospect</Button>
          </div>
        </CardContent>
      </Card>

      {grouped.map((g) => (
        <Card key={g.status}>
          <CardHeader><CardTitle className="capitalize">{g.status} ({g.items.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {g.items.length === 0 && <p className="text-sm text-muted-foreground">No prospects in this stage.</p>}
            {g.items.map((p: any) => (
              <div key={p.id} className="border rounded p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{p.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[p.school, p.grade_level, p.voice_part, p.email].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <Select value={p.status} onValueChange={(s) => updateStatus.mutate({ id: p.id, status: s })}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => del.mutate(p.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function F({ label, k, v, set, placeholder }: { label: string; k: string; v?: string; set: (k: string, v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={v || ''} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} />
    </div>
  );
}
