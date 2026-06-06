// /admin/students/:id — single page with 5 tabs covering all per-student data:
// Overview, Notes, Uniform, Instruments, Permission slips.
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Trash2, Pin, Loader2 } from 'lucide-react';

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ['student-profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, phone, voice_part, role')
        .eq('user_id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: intake } = useQuery({
    queryKey: ['student-intake', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_student_intake')
        .select('emergency_contact_name, emergency_contact_phone, dress_size, shoe_size, height_feet, height_inches, notes')
        .eq('user_id', id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  if (!id) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/students')}>
        <ArrowLeft className="w-4 h-4 mr-2" /> All students
      </Button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{profile?.full_name || profile?.email || 'Student'}</h1>
        <p className="text-sm text-muted-foreground">
          {[profile?.email, profile?.voice_part, profile?.phone].filter(Boolean).join(' · ')}
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="uniform">Uniform</TabsTrigger>
          <TabsTrigger value="instruments">Instruments</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Parent / emergency contact</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <Row label="Contact name" value={intake?.emergency_contact_name} />
              <Row label="Contact phone" value={intake?.emergency_contact_phone} />
              {!intake?.emergency_contact_name && !intake?.emergency_contact_phone && (
                <p className="text-muted-foreground">No contact on file. Student can add via intake form.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <NotesTab studentId={id} />
        </TabsContent>

        <TabsContent value="uniform" className="mt-4">
          <UniformTab intake={intake} />
        </TabsContent>

        <TabsContent value="instruments" className="mt-4">
          <InstrumentsTab studentId={id} />
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <PermissionsTab studentId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between border-b last:border-0 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  );
}

function NotesTab({ studentId }: { studentId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [body, setBody] = useState('');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['student-notes', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_student_notes')
        .select('*')
        .eq('student_user_id', studentId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addNote = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from('gw_student_notes').insert({
        student_user_id: studentId,
        body: text,
        author_user_id: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody('');
      qc.invalidateQueries({ queryKey: ['student-notes', studentId] });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from('gw_student_notes').update({ is_pinned: pinned }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-notes', studentId] }),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gw_student_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-notes', studentId] }),
  });

  return (
    <Card>
      <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Quick note about this student…" />
        <Button onClick={() => addNote.mutate(body)} disabled={!body.trim() || addNote.isPending}>
          {addNote.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save note
        </Button>
        <div className="space-y-2 pt-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {notes.map((n: any) => (
            <div key={n.id} className="border rounded p-3 text-sm">
              <div className="whitespace-pre-wrap">{n.body}</div>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{new Date(n.created_at).toLocaleString()}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => togglePin.mutate({ id: n.id, pinned: !n.is_pinned })}>
                    <Pin className={`w-3 h-3 ${n.is_pinned ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteNote.mutate(n.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UniformTab({ intake }: { intake: any }) {
  return (
    <Card>
      <CardHeader><CardTitle>Uniform measurements</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-2">
        <Row label="Dress size" value={intake?.dress_size} />
        <Row label="Shoe size" value={intake?.shoe_size} />
        <Row label="Height" value={intake?.height_feet ? `${intake.height_feet}'${intake?.height_inches ?? 0}"` : null} />
        {!intake && <p className="text-muted-foreground pt-2">Student hasn't filled out the intake form yet.</p>}
      </CardContent>
    </Card>
  );
}

function InstrumentsTab({ studentId }: { studentId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [dueBack, setDueBack] = useState('');

  const { data: checkouts = [] } = useQuery({
    queryKey: ['student-instruments', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_instrument_checkouts')
        .select('*, gw_instruments(name, serial_number)')
        .eq('student_user_id', studentId)
        .order('checked_out_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const checkout = useMutation({
    mutationFn: async () => {
      const { data: inst, error: e1 } = await supabase
        .from('gw_instruments').insert({ name }).select('id').single();
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('gw_instrument_checkouts').insert({
        instrument_id: inst.id,
        student_user_id: studentId,
        due_back_at: dueBack || null,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      setName(''); setDueBack('');
      qc.invalidateQueries({ queryKey: ['student-instruments', studentId] });
    },
    onError: (e: any) => toast({ title: 'Checkout failed', description: e.message, variant: 'destructive' }),
  });

  const markReturned = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gw_instrument_checkouts')
        .update({ returned_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-instruments', studentId] }),
  });

  return (
    <Card>
      <CardHeader><CardTitle>Instrument checkouts</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <div>
            <Label className="text-xs">Instrument name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Trumpet #12" />
          </div>
          <div>
            <Label className="text-xs">Due back</Label>
            <Input type="date" value={dueBack} onChange={(e) => setDueBack(e.target.value)} />
          </div>
          <Button onClick={() => checkout.mutate()} disabled={!name.trim() || checkout.isPending}>
            Check out
          </Button>
        </div>
        <div className="space-y-2">
          {checkouts.map((c: any) => (
            <div key={c.id} className="border rounded p-3 text-sm flex items-center justify-between">
              <div>
                <div className="font-semibold">{c.gw_instruments?.name}</div>
                <div className="text-xs text-muted-foreground">
                  Out {new Date(c.checked_out_at).toLocaleDateString()}
                  {c.due_back_at && ` · due ${new Date(c.due_back_at).toLocaleDateString()}`}
                  {c.returned_at && ` · returned ${new Date(c.returned_at).toLocaleDateString()}`}
                </div>
              </div>
              {!c.returned_at && (
                <Button variant="outline" size="sm" onClick={() => markReturned.mutate(c.id)}>Mark returned</Button>
              )}
            </div>
          ))}
          {checkouts.length === 0 && <p className="text-sm text-muted-foreground">No checkouts.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PermissionsTab({ studentId }: { studentId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');

  const { data: slips = [] } = useQuery({
    queryKey: ['student-slips', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_permission_slips')
        .select('*')
        .eq('student_user_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('gw_permission_slips').insert({
        student_user_id: studentId, title, event_date: eventDate || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle(''); setEventDate('');
      qc.invalidateQueries({ queryKey: ['student-slips', studentId] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === 'signed') {
        update.signed_at = new Date().toISOString();
      }
      const { error } = await supabase.from('gw_permission_slips').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-slips', studentId] }),
  });

  return (
    <Card>
      <CardHeader><CardTitle>Permission slips</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spring tour" />
          </div>
          <div>
            <Label className="text-xs">Event date</Label>
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <Button onClick={() => create.mutate()} disabled={!title.trim() || create.isPending}>Add slip</Button>
        </div>
        <div className="space-y-2">
          {slips.map((s: any) => (
            <div key={s.id} className="border rounded p-3 text-sm flex items-center justify-between">
              <div>
                <div className="font-semibold">{s.title}</div>
                <div className="text-xs text-muted-foreground">
                  {s.event_date && new Date(s.event_date).toLocaleDateString()} · {s.status}
                </div>
              </div>
              {s.status === 'pending' && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: s.id, status: 'signed' })}>Mark signed</Button>
                </div>
              )}
            </div>
          ))}
          {slips.length === 0 && <p className="text-sm text-muted-foreground">No slips.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
