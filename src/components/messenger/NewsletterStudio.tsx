// Mass-email-marketing style newsletter window: campaign list with status
// filters, and an editor with side-by-side live email preview.
import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  X, Send, Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save, Clock, Newspaper,
  ChevronLeft, Copy, Eye, Pencil, CheckCircle2, FileEdit, Users, LayoutTemplate,
  Upload, ArrowLeft,
} from 'lucide-react';
import { roleForGroup } from '@/lib/messengerGroups';

type Group = 'all' | 'students' | 'admins' | 'fans' | 'parents';
const GROUPS: Array<{ value: Group; label: string }> = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students only' },
  { value: 'admins', label: 'Staff / Admins only' },
  { value: 'fans', label: 'Fans only' },
  { value: 'parents', label: 'Parents only' },
];

type StatusFilter = 'all' | 'draft' | 'scheduled' | 'sent' | 'template';

interface Section {
  heading: string;
  body: string;
  image_url?: string;
}

// Built-in starting points so users never face a blank page.
const LAYOUTS: Array<{ name: string; intro: string; sections: Section[]; footer: string }> = [
  {
    name: 'Monthly update',
    intro: 'Dear friends,\n\nHere’s what’s been happening with us this month.',
    sections: [
      { heading: 'Highlights', body: '' },
      { heading: 'Upcoming events', body: '' },
      { heading: 'Member spotlight', body: '' },
    ],
    footer: 'With gratitude,\n[Your name]\n[Title] · [Email]',
  },
  {
    name: 'Event announcement',
    intro: 'You’re invited!',
    sections: [
      { heading: 'Event details', body: '📅 Date: \n🕒 Time: \n📍 Location: \n🎟️ Tickets: ' },
      { heading: 'About the program', body: '' },
    ],
    footer: 'We hope to see you there!\n[Your name] · [Email]',
  },
  {
    name: 'Concert recap',
    intro: 'Thank you to everyone who joined us!',
    sections: [
      { heading: 'The performance', body: '' },
      { heading: 'Photo highlights', body: '' },
      { heading: 'What’s next', body: '' },
    ],
    footer: 'With appreciation,\n[Your name]\n[Title] · [Email]',
  },
  {
    name: 'Fundraising appeal',
    intro: 'Dear supporters,\n\nYour generosity makes our music possible.',
    sections: [
      { heading: 'Why we’re asking', body: '' },
      { heading: 'How to give', body: 'Give online: \nMail a check: \nQuestions? Contact: ' },
    ],
    footer: 'Thank you for your support.\n[Your name] · [Email]',
  },
];

const BLOCK_PRESETS: Array<{ name: string; section: Section }> = [
  { name: 'Text', section: { heading: '', body: '' } },
  { name: 'Announcement', section: { heading: 'Announcement', body: '' } },
  { name: 'Event details', section: { heading: 'Event details', body: '📅 Date: \n🕒 Time: \n📍 Location: ' } },
  { name: 'Spotlight', section: { heading: 'Member spotlight', body: '' } },
  { name: 'Image + caption', section: { heading: '', body: '', image_url: '' } },
];

const HEADER_PRESETS: Array<{ name: string; intro: string }> = [
  { name: 'Warm greeting', intro: 'Dear friends,\n\nWe hope this finds you well.' },
  { name: 'Big news', intro: 'We have exciting news to share!' },
  { name: 'Invitation', intro: 'You’re invited to join us for a special event.' },
];

const FOOTER_PRESETS: Array<{ name: string; footer: string }> = [
  { name: 'Signature', footer: 'Warmly,\n[Your name]\n[Title]' },
  { name: 'Contact info', footer: '[Organization name]\n[Email] · [Phone]\n[Website]' },
  { name: 'Full footer', footer: 'Warmly,\n[Your name], [Title]\n\n[Organization name]\n[Email] · [Phone] · [Website]\n\nYou’re receiving this because you’re part of our community.' },
];

interface Campaign {
  id: string;
  title: string;
  subject: string | null;
  status: string;
  target_audience: string | null;
  scheduled_date: string | null;
  sent_date: string | null;
  recipient_count: number | null;
  created_at: string;
}

export function NewsletterStudio({ onClose, inline = false }: { onClose: () => void; inline?: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['newsletters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_newsletters')
        .select('id, title, subject, status, target_audience, scheduled_date, sent_date, recipient_count, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
  });

  const counts = useMemo(() => ({
    all: campaigns.filter((c) => c.status !== 'template').length,
    draft: campaigns.filter((c) => c.status === 'draft').length,
    scheduled: campaigns.filter((c) => c.status === 'scheduled').length,
    sent: campaigns.filter((c) => c.status === 'sent').length,
    template: campaigns.filter((c) => c.status === 'template').length,
  }), [campaigns]);

  const visible = filter === 'all'
    ? campaigns.filter((c) => c.status !== 'template')
    : campaigns.filter((c) => c.status === filter);

  async function del(id: string) {
    const { error } = await supabase.from('gw_newsletters').delete().eq('id', id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    qc.invalidateQueries({ queryKey: ['newsletters'] });
  }

  async function copyAs(id: string, status: 'draft' | 'template', titleSuffix: string) {
    const { data } = await supabase.from('gw_newsletters').select('*').eq('id', id).maybeSingle();
    if (!data) return;
    const { data: user } = await supabase.auth.getUser();
    const { data: copy, error } = await supabase.from('gw_newsletters').insert({
      title: `${data.title}${titleSuffix}`,
      subject: data.subject,
      header_image_url: data.header_image_url,
      intro: data.intro,
      sections: data.sections,
      footer: data.footer,
      target_audience: data.target_audience,
      content: data.content,
      status,
      created_by: user.user?.id,
    }).select('id').single();
    if (error) { toast({ title: 'Copy failed', description: error.message, variant: 'destructive' }); return; }
    qc.invalidateQueries({ queryKey: ['newsletters'] });
    if (status === 'draft') setEditing(copy.id);
    else toast({ title: 'Saved as template' });
  }

  return (
    <div className={inline
      ? "w-full h-full flex"
      : "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-0 sm:p-4"}>
      <div className={inline
        ? "w-full h-full bg-card text-foreground flex flex-col overflow-hidden"
        : "w-full max-w-6xl h-full sm:h-[88vh] bg-white text-gray-900 rounded-none sm:rounded-xl shadow-xl flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-0 sm:pb-0"}>
        {/* Title bar */}
        <div className="border-b px-4 py-3 flex items-center justify-between bg-white">
          <h2 className="font-semibold flex items-center gap-2"><Newspaper className="w-5 h-5" /> Newsletters</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="text-gray-900 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {editing ? (
          <CampaignEditor
            newsletterId={editing === 'new' ? undefined : editing}
            templates={campaigns.filter((c) => c.status === 'template')}
            onBack={() => setEditing(null)}
          />
        ) : (
          <div className="flex flex-col md:flex-row flex-1 min-h-0">
            {/* Sidebar — horizontal filter bar on phones, left rail on larger screens */}
            <aside className="md:w-48 border-b md:border-b-0 md:border-r bg-gray-50 flex md:flex-col shrink-0 p-2 gap-1 overflow-x-auto">
              <Button className="md:w-full justify-start shrink-0 md:mb-2" size="sm" onClick={() => setEditing('new')}>
                <Plus className="w-4 h-4 mr-2" /> Create
              </Button>
              {([
                ['all', 'All campaigns', counts.all],
                ['draft', 'Drafts', counts.draft],
                ['scheduled', 'Scheduled', counts.scheduled],
                ['sent', 'Sent', counts.sent],
                ['template', 'Templates', counts.template],
              ] as Array<[StatusFilter, string, number]>).map(([v, label, n]) => (
                <Button
                  key={v}
                  variant={filter === v ? 'secondary' : 'ghost'}
                  size="sm"
                  className="md:w-full justify-between shrink-0 gap-2"
                  onClick={() => setFilter(v)}
                >
                  <span className="truncate">{label}</span>
                  <span className="text-xs text-muted-foreground">{n}</span>
                </Button>
              ))}
            </aside>

            {/* Campaign list */}
            <main className="flex-1 min-w-0 overflow-y-auto divide-y">
              {visible.length === 0 && (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  No campaigns here yet. Hit Create to start one.
                </div>
              )}
              {visible.map((c) => (
                <div key={c.id} className="px-4 py-3 hover:bg-muted/40 flex items-center gap-3">
                  <button className="flex-1 text-left min-w-0" onClick={() => setEditing(c.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{c.title}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{c.subject || '(no subject)'}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {GROUPS.find((g) => g.value === c.target_audience)?.label || 'Students only'}
                      </span>
                      {c.status === 'sent' && c.sent_date && (
                        <span>Sent {new Date(c.sent_date).toLocaleDateString()} · {c.recipient_count ?? 0} recipients</span>
                      )}
                      {c.status === 'scheduled' && c.scheduled_date && (
                        <span>Sends {new Date(c.scheduled_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      )}
                      {(c.status === 'draft' || c.status === 'template') && (
                        <span>Edited {new Date(c.created_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </button>
                  <div className="flex gap-1 shrink-0 items-center">
                    {c.status === 'template' ? (
                      <Button variant="outline" size="sm" onClick={() => copyAs(c.id, 'draft', '')} title="Start a campaign from this template">
                        <LayoutTemplate className="w-3.5 h-3.5 mr-1" /> Use
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => copyAs(c.id, 'template', '')} title="Save as template">
                        <LayoutTemplate className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setEditing(c.id)} title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => copyAs(c.id, c.status === 'template' ? 'template' : 'draft', ' (copy)')} title="Duplicate">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => del(c.id)} title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-blue-100 text-blue-800',
    scheduled: 'bg-amber-100 text-amber-800',
    sent: 'bg-green-100 text-green-800',
    template: 'bg-purple-100 text-purple-800',
  };
  const icons: Record<string, React.ReactNode> = {
    draft: <FileEdit className="w-3 h-3" />,
    scheduled: <Clock className="w-3 h-3" />,
    sent: <CheckCircle2 className="w-3 h-3" />,
    template: <LayoutTemplate className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {icons[status]} {status}
    </span>
  );
}

function CampaignEditor({ newsletterId, templates, onBack }: { newsletterId?: string; templates: Campaign[]; onBack: () => void }) {
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
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit');
  const [savedId, setSavedId] = useState<string | undefined>(newsletterId);
  const [showTemplatePicker, setShowTemplatePicker] = useState(!newsletterId);

  function applyLayout(layout: typeof LAYOUTS[number]) {
    setIntro(layout.intro);
    setSections(layout.sections.map((s) => ({ ...s })));
    setFooter(layout.footer);
    setShowTemplatePicker(false);
  }

  async function applyTemplate(id: string) {
    const { data } = await supabase.from('gw_newsletters').select('*').eq('id', id).maybeSingle();
    if (!data) return;
    setTitle(data.title || '');
    setSubject(data.subject || data.title || '');
    setHeaderImage(data.header_image_url || '');
    setIntro(data.intro || '');
    setSections(Array.isArray(data.sections) && data.sections.length ? data.sections : [{ heading: '', body: '' }]);
    setFooter(data.footer || '');
    setGroup((data.target_audience as Group) || 'students');
    setShowTemplatePicker(false);
  }

  async function saveAsTemplate() {
    if (!title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('gw_newsletters').insert({
        title,
        subject,
        header_image_url: headerImage || null,
        intro: intro || null,
        sections,
        footer: footer || null,
        target_audience: group,
        content: buildText(),
        status: 'template',
        created_by: user.user?.id,
      });
      if (error) throw error;
      toast({ title: 'Saved as template' });
      qc.invalidateQueries({ queryKey: ['newsletters'] });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

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

  const { data: audienceCount = 0 } = useQuery({
    queryKey: ['newsletter-audience-count', group],
    queryFn: async () => {
      let q = supabase.from('gw_profiles_directory').select('user_id', { count: 'exact', head: true }).not('email', 'is', null);
      const role = roleForGroup(group);
      if (role) q = q.eq('role', role);
      const { count } = await q;
      return count ?? 0;
    },
  });

  function updateSection(i: number, patch: Partial<Section>) {
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addSection(preset?: Section) {
    setSections((p) => [...p, preset ? { ...preset } : { heading: '', body: '' }]);
  }
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

  const previewHtml = useMemo(
    () => `<!doctype html><html><body style="margin:0;background:#f4f4f5;padding:16px 0;">${buildHtml()}</body></html>`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title, headerImage, intro, sections, footer]
  );

  async function save(status: 'draft' | 'scheduled' | 'sent') {
    if (!title.trim() || !subject.trim()) {
      toast({ title: 'Title and subject required', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const payload: any = {
        title,
        subject,
        header_image_url: headerImage || null,
        intro: intro || null,
        sections,
        footer: footer || null,
        target_audience: group,
        content: buildText(),
        status,
        scheduled_date: status === 'scheduled' ? new Date(scheduleDate).toISOString() : null,
      };

      let id = savedId;
      if (id) {
        const { error } = await supabase.from('gw_newsletters').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data: user } = await supabase.auth.getUser();
        payload.created_by = user.user?.id;
        const { data, error } = await supabase.from('gw_newsletters').insert(payload).select('id').single();
        if (error) throw error;
        id = data.id;
        setSavedId(id);
      }

      if (status === 'sent') {
        await sendNow(id!);
        qc.invalidateQueries({ queryKey: ['newsletters'] });
        onBack();
      } else {
        toast({ title: status === 'scheduled' ? 'Scheduled' : 'Draft saved' });
        qc.invalidateQueries({ queryKey: ['newsletters'] });
        if (status === 'scheduled') onBack();
      }
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function sendNow(id: string) {
    let rq = supabase.from('gw_profiles_directory').select('email').not('email', 'is', null);
    const sendRole = roleForGroup(group);
    if (sendRole) rq = rq.eq('role', sendRole);
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

    toast({ title: 'Campaign sent', description: `To ${emails.length} recipient${emails.length === 1 ? '' : 's'}.` });
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Editor toolbar */}
      <div className="border-b px-3 py-2 flex items-center gap-2 flex-wrap bg-gray-50">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Campaigns
        </Button>
        <div className="flex-1 min-w-[140px]">
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (!subject) setSubject(e.target.value); }}
            placeholder="Campaign name (internal)"
            className="h-8 font-medium"
          />
        </div>
        {/* Mobile edit/preview toggle */}
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden"
          onClick={() => setMobilePane((p) => (p === 'edit' ? 'preview' : 'edit'))}
        >
          {mobilePane === 'edit' ? <><Eye className="w-3.5 h-3.5 mr-1" /> Preview</> : <><Pencil className="w-3.5 h-3.5 mr-1" /> Edit</>}
        </Button>
        <Button variant="outline" size="sm" onClick={saveAsTemplate} disabled={busy || !title.trim()} title="Save a reusable copy as a template">
          <LayoutTemplate className="w-3.5 h-3.5 mr-1" /> Template
        </Button>
        <Button variant="outline" size="sm" onClick={() => save('draft')} disabled={busy || !title.trim()}>
          <Save className="w-3.5 h-3.5 mr-1" /> Save
        </Button>
        {scheduleDate && (
          <Button variant="outline" size="sm" onClick={() => save('scheduled')} disabled={busy || !subject.trim()}>
            <Clock className="w-3.5 h-3.5 mr-1" /> Schedule
          </Button>
        )}
        <Button size="sm" onClick={() => save('sent')} disabled={busy || !subject.trim()}>
          {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
          Send
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Edit pane */}
        <div className={`flex-1 min-w-0 overflow-y-auto p-4 space-y-4 ${mobilePane === 'preview' ? 'hidden lg:block' : ''} lg:max-w-[50%] lg:border-r`}>
          {showTemplatePicker && (
            <div className="border rounded-lg p-3 bg-purple-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-purple-700" /> Pick a starting point
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowTemplatePicker(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Layouts</p>
                <div className="flex flex-wrap gap-2">
                  {LAYOUTS.map((l) => (
                    <Button key={l.name} variant="outline" size="sm" onClick={() => applyLayout(l)}>
                      {l.name}
                    </Button>
                  ))}
                </div>
              </div>
              {templates.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Your templates</p>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((t) => (
                      <Button key={t.id} variant="outline" size="sm" onClick={() => applyTemplate(t.id)}>
                        {t.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowTemplatePicker(false)}>
                Start blank
              </Button>
            </div>
          )}
          {!showTemplatePicker && !newsletterId && (
            <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" onClick={() => setShowTemplatePicker(true)}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to starting points
            </Button>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">To</Label>
              <Select value={group} onValueChange={(v) => setGroup(v as Group)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{audienceCount} recipient{audienceCount === 1 ? '' : 's'} with email</p>
            </div>
            <div>
              <Label className="text-xs">Schedule (optional)</Label>
              <Input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Subject line</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Spring update from the choir" />
          </div>

          <div>
            <Label className="text-xs">Header image (optional)</Label>
            <ImageField value={headerImage} onChange={setHeaderImage} />
          </div>

          <div>
            <Label className="text-xs">Intro (optional)</Label>
            <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Dear friends…" className="min-h-[80px]" />
            {!intro && (
              <div className="flex flex-wrap gap-1 mt-1">
                {HEADER_PRESETS.map((h) => (
                  <button
                    key={h.name}
                    type="button"
                    onClick={() => setIntro(h.intro)}
                    className="text-sm px-2 py-0.5 rounded-full border bg-muted/40 hover:bg-muted text-muted-foreground"
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Content blocks</Label>
            {sections.map((s, i) => (
              <div key={i} className="border border-dashed rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Block {i + 1}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => moveSection(i, -1)} disabled={i === 0}><ArrowUp className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1}><ArrowDown className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => removeSection(i)} disabled={sections.length === 1}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
                <Input value={s.heading} onChange={(e) => updateSection(i, { heading: e.target.value })} placeholder="Heading" />
                <Textarea value={s.body} onChange={(e) => updateSection(i, { body: e.target.value })} placeholder="Body…" className="min-h-[100px]" />
                <ImageField value={s.image_url || ''} onChange={(url) => updateSection(i, { image_url: url })} placeholder="Image (optional) — URL or upload" />
              </div>
            ))}
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-xs text-muted-foreground mr-1">Add block:</span>
              {BLOCK_PRESETS.map((b) => (
                <Button key={b.name} variant="outline" size="sm" onClick={() => addSection(b.section)}>
                  <Plus className="w-3 h-3 mr-1" /> {b.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Footer (optional)</Label>
            <Textarea value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Dr. Smith · Director · choir@school.edu" />
            {!footer && (
              <div className="flex flex-wrap gap-1 mt-1">
                {FOOTER_PRESETS.map((f) => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => setFooter(f.footer)}
                    className="text-sm px-2 py-0.5 rounded-full border bg-muted/40 hover:bg-muted text-muted-foreground"
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live preview pane */}
        <div className={`flex-1 min-w-0 bg-gray-100 flex flex-col ${mobilePane === 'edit' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="px-4 py-2 border-b bg-white text-xs text-muted-foreground flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            <span className="truncate">Preview — Subject: <span className="font-medium text-gray-900">{subject || '(no subject)'}</span></span>
          </div>
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={previewHtml}
            className="flex-1 w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}

function ImageField({ value, onChange, placeholder }: { value: string; onChange: (url: string) => void; placeholder?: string }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      // FLAT path (single component, no slash). The self-hosted storage
      // proxy reads flat and the flatten cron only rewrites paths after
      // the fact — a nested key like `newsletters/foo.jpg` returns 404
      // from getPublicUrl until the cron catches up, which is what makes
      // the preview <img> render broken the instant after upload.
      const path = `newsletter-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const { error } = await supabase.storage
        .from('messenger-attachments')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('messenger-attachments').getPublicUrl(path);
      onChange(pub.publicUrl);
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || 'Image URL or upload…'} />
        <Button variant="outline" size="sm" className="shrink-0 h-10" onClick={() => fileRef.current?.click()} disabled={uploading} title="Upload image">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" className="shrink-0 h-10" onClick={() => onChange('')} title="Remove image">
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      {value && <img src={value} alt="" className="h-16 rounded border object-cover" />}
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
