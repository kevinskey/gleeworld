// Multi-section newsletter composer. Save draft / schedule / send-now.
// Sections are simple {heading, body, image_url} blocks the user can add+reorder.
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  X, Send, Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save, Clock, Newspaper,
} from 'lucide-react';

type Group = 'all' | 'students' | 'admins' | 'fans';
const GROUPS: Array<{ value: Group; label: string }> = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students only' },
  { value: 'admins', label: 'Staff / Admins only' },
  { value: 'fans', label: 'Fans only' },
];

interface Section {
  heading: string;
  body: string;
  image_url?: string;
}

export function NewsletterComposer({ newsletterId, onClose }: { newsletterId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(!!newsletterId);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [headerImage, setHeaderImage] = useState('');
  const [intro, setIntro] = useState('');
  const [sections, setSections] = useState<Section[]>([{ heading: '', body: '' }]);
  const [footer, setFooter] = useState('');
  const [group, setGroup] = useState<Group>('students');
  const [scheduleDate, setScheduleDate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!newsletterId) return;
    (async () => {
      const { data } = await supabase.from('gw_newsletters').select('*').eq('id', newsletterId).maybeSingle();
      if (data) {
        setTitle(data.title || '');
        setSubject(data.subject || data.title || '');
        setHeaderImage(data.header_image_url || '');
        setIntro(data.intro || '');
        setSections(Array.isArray(data.sections) && data.sections.length ? data.sections : [{ heading: '', body: '' }]);
        setFooter(data.footer || '');
        setGroup((data.target_audience as Group) || 'students');
        setScheduleDate(data.scheduled_date ? new Date(data.scheduled_date).toISOString().slice(0, 16) : '');
      }
      setLoading(false);
    })();
  }, [newsletterId]);

  function updateSection(i: number, patch: Partial<Section>) {
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addSection() { setSections((p) => [...p, { heading: '', body: '' }]); }
  function removeSection(i: number) { setSections((p) => p.filter((_, idx) => idx !== i)); }
  function moveSection(i: number, dir: -1 | 1) {
    setSections((p) => {
      const next = [...p];
      const j = i + dir;
      if (j < 0 || j >= next.length) return next;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function buildHtml(): string {
    const cleanSections = sections.filter((s) => s.heading.trim() || s.body.trim());
    const sectionHtml = cleanSections.map((s) => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td>
          ${s.image_url ? `<img src="${escapeHtml(s.image_url)}" style="width:100%;max-width:600px;border-radius:8px;margin-bottom:12px;" />` : ''}
          ${s.heading ? `<h2 style="font-family:sans-serif;font-size:20px;margin:0 0 8px 0;color:#1a1a1a;">${escapeHtml(s.heading)}</h2>` : ''}
          ${s.body ? `<div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#333;white-space:pre-wrap;">${escapeHtml(s.body)}</div>` : ''}
        </td></tr>
      </table>
    `).join('');
    return `
      <div style="max-width:600px;margin:0 auto;padding:24px;background:#fff;">
        ${headerImage ? `<img src="${escapeHtml(headerImage)}" style="width:100%;border-radius:8px;margin-bottom:24px;" />` : ''}
        ${title ? `<h1 style="font-family:sans-serif;font-size:28px;margin:0 0 16px 0;color:#1a1a1a;">${escapeHtml(title)}</h1>` : ''}
        ${intro ? `<div style="font-family:sans-serif;font-size:16px;line-height:1.6;color:#444;margin-bottom:24px;white-space:pre-wrap;">${escapeHtml(intro)}</div>` : ''}
        ${sectionHtml}
        ${footer ? `<hr style="border:none;border-top:1px solid #ddd;margin:24px 0;" /><div style="font-family:sans-serif;font-size:13px;color:#888;white-space:pre-wrap;">${escapeHtml(footer)}</div>` : ''}
      </div>
    `;
  }

  function buildText(): string {
    const parts: string[] = [];
    if (title) parts.push(title);
    if (intro) parts.push(intro);
    for (const s of sections) {
      if (s.heading) parts.push(`\n## ${s.heading}`);
      if (s.body) parts.push(s.body);
    }
    if (footer) parts.push(`\n---\n${footer}`);
    return parts.join('\n\n');
  }

  async function save(status: 'draft' | 'scheduled' | 'sent') {
    if (!title.trim() || !subject.trim()) {
      toast({ title: 'Title and subject required', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const text = buildText();
      const payload: any = {
        title,
        subject,
        header_image_url: headerImage || null,
        intro: intro || null,
        sections,
        footer: footer || null,
        target_audience: group,
        content: text,
        status,
        scheduled_date: status === 'scheduled' ? new Date(scheduleDate).toISOString() : null,
      };

      let id = newsletterId;
      if (id) {
        const { error } = await supabase.from('gw_newsletters').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data: user } = await supabase.auth.getUser();
        payload.created_by = user.user?.id;
        const { data, error } = await supabase.from('gw_newsletters').insert(payload).select('id').single();
        if (error) throw error;
        id = data.id;
      }

      if (status === 'sent') {
        await sendNow(id!);
      } else {
        toast({ title: status === 'scheduled' ? 'Scheduled' : 'Saved as draft' });
      }
      qc.invalidateQueries({ queryKey: ['newsletters'] });
      onClose();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function sendNow(id: string) {
    let rq = supabase.from('gw_profiles').select('email').not('email', 'is', null);
    if (group !== 'all') rq = rq.eq('role', group === 'students' ? 'student' : group === 'admins' ? 'admin' : 'fan');
    const { data: recipients, error: rErr } = await rq;
    if (rErr) throw rErr;
    const emails = (recipients ?? []).map((r: any) => r.email).filter(Boolean);
    if (emails.length === 0) throw new Error('No recipients in that group.');

    const { error: sErr } = await supabase.functions.invoke('gw-send-email', {
      body: { to: emails, subject, html: buildHtml(), text: buildText() },
    });
    if (sErr) throw sErr;

    await supabase.from('gw_newsletters').update({
      status: 'sent',
      sent_date: new Date().toISOString(),
      recipient_count: emails.length,
    }).eq('id', id);

    toast({ title: 'Newsletter sent', description: `To ${emails.length} recipient${emails.length === 1 ? '' : 's'}.` });
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-4 bg-white text-gray-900">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white text-gray-900 z-10 border-b rounded-t-xl">
          <CardTitle className="flex items-center gap-2 text-gray-900"><Newspaper className="w-5 h-5" /> {newsletterId ? 'Edit newsletter' : 'New newsletter'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="text-gray-900 hover:bg-gray-100"><X className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Title (internal)</Label>
              <Input value={title} onChange={(e) => { setTitle(e.target.value); if (!subject) setSubject(e.target.value); }} placeholder="May 2026 Newsletter" />
            </div>
            <div>
              <Label className="text-xs">Send to</Label>
              <Select value={group} onValueChange={(v) => setGroup(v as Group)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Email subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Spring update from the choir" />
          </div>
          <div>
            <Label className="text-xs">Header image URL (optional)</Label>
            <Input value={headerImage} onChange={(e) => setHeaderImage(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label className="text-xs">Intro (optional)</Label>
            <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Dear friends…" className="min-h-[80px]" />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Sections</Label>
            {sections.map((s, i) => (
              <Card key={i} className="border-dashed">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Section {i + 1}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => moveSection(i, -1)} disabled={i === 0}><ArrowUp className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1}><ArrowDown className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => removeSection(i)} disabled={sections.length === 1}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  <Input value={s.heading} onChange={(e) => updateSection(i, { heading: e.target.value })} placeholder="Section heading" />
                  <Textarea value={s.body} onChange={(e) => updateSection(i, { body: e.target.value })} placeholder="Section body…" className="min-h-[100px]" />
                  <Input value={s.image_url || ''} onChange={(e) => updateSection(i, { image_url: e.target.value })} placeholder="Image URL (optional)" />
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" size="sm" onClick={addSection}>
              <Plus className="w-3 h-3 mr-1" /> Add section
            </Button>
          </div>

          <div>
            <Label className="text-xs">Footer (optional)</Label>
            <Textarea value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Dr. Smith · Director · choir@school.edu" />
          </div>

          <div>
            <Label className="text-xs">Schedule for later (optional)</Label>
            <Input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="max-w-xs" />
          </div>

          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="outline" onClick={() => save('draft')} disabled={busy || !title.trim()}>
              <Save className="w-4 h-4 mr-2" /> Save draft
            </Button>
            {scheduleDate && (
              <Button variant="outline" onClick={() => save('scheduled')} disabled={busy || !subject.trim()}>
                <Clock className="w-4 h-4 mr-2" /> Schedule
              </Button>
            )}
            <Button onClick={() => save('sent')} disabled={busy || !subject.trim()}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function escapeHtml(s: string) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
