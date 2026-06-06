// /admin/rehearsal-plans — list saved rehearsal plans + simple builder.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, Plus, Trash2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RehearsalPlans() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState('60');
  const [body, setBody] = useState('');

  const { data: plans = [] } = useQuery({
    queryKey: ['rehearsal-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_rehearsal_plans')
        .select('*')
        .order('rehearsal_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title,
        rehearsal_date: date || null,
        duration_minutes: duration ? parseInt(duration) : null,
        body,
        source: 'manual',
      };
      if (editing) {
        const { error } = await supabase.from('gw_rehearsal_plans').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        payload.created_by = (await supabase.auth.getUser()).data.user?.id;
        const { error } = await supabase.from('gw_rehearsal_plans').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setEditing(null); setTitle(''); setDate(''); setDuration('60'); setBody('');
      qc.invalidateQueries({ queryKey: ['rehearsal-plans'] });
      toast({ title: 'Saved' });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gw_rehearsal_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rehearsal-plans'] }),
  });

  function startEdit(p: any) {
    setEditing(p);
    setTitle(p.title);
    setDate(p.rehearsal_date || '');
    setDuration(String(p.duration_minutes || 60));
    setBody(p.body);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" /> Rehearsal Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Save and reuse plans across the year.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/ai-rehearsal')}>
          <Sparkles className="w-4 h-4 mr-2" /> Generate with AI
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>{editing ? 'Edit plan' : 'New plan'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spring concert week — Tuesday" />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Duration (min)</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="max-w-[120px]" />
          </div>
          <div>
            <Label className="text-xs">Plan</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[250px] font-mono text-sm" placeholder="0:00 — Warm-ups..." />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => save.mutate()} disabled={!title.trim() || !body.trim() || save.isPending}>
              <Plus className="w-4 h-4 mr-2" />{editing ? 'Update' : 'Save plan'}
            </Button>
            {editing && (
              <Button variant="ghost" onClick={() => { setEditing(null); setTitle(''); setDate(''); setBody(''); }}>Cancel</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Saved plans</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {plans.length === 0 && <p className="text-sm text-muted-foreground">No plans yet.</p>}
          {plans.map((p: any) => (
            <div key={p.id} className="border rounded p-3 flex items-center justify-between">
              <button className="text-left flex-1" onClick={() => startEdit(p)}>
                <div className="font-semibold">{p.title}</div>
                <div className="text-xs text-muted-foreground">
                  {p.rehearsal_date && new Date(p.rehearsal_date).toLocaleDateString()}
                  {p.duration_minutes && ` · ${p.duration_minutes}min`}
                  {p.source === 'ai' && ' · AI-generated'}
                </div>
              </button>
              <Button variant="ghost" size="sm" onClick={() => del.mutate(p.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
