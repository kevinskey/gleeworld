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
  ChevronLeft, ChevronRight, Copy, Eye, Pencil, CheckCircle2, FileEdit, Users, LayoutTemplate,
  Upload, ArrowLeft, Mail, PenLine, LayoutList,
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

// Structured event payload. When a Section carries this, the Design
// step renders proper date/time/URL inputs (instead of a free-text
// textarea where users end up typing "10182026" and the email sends
// it out literal) and the email HTML gets a nicely formatted event
// card built from the fields on save.
interface EventInfo {
  date?: string;      // YYYY-MM-DD (from <input type="date">)
  time?: string;      // HH:mm (from <input type="time">)
  location?: string;
  tickets?: string;   // URL or plain text
}

interface Section {
  heading: string;
  body: string;
  image_url?: string;
  event?: EventInfo;
}

// Renders YYYY-MM-DD as "Sunday, October 18, 2026" so the email
// doesn't show the raw ISO shape. Falls back to the input on parse
// failure — a stray "TBD" or "date TBA" should surface as-is, not
// disappear.
function formatEventDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// 24h "19:30" → "7:30 PM" for the reader. Same fallback rule as the
// date formatter — anything not HH:mm passes through untouched.
function formatEventTime(t: string | undefined): string {
  if (!t) return '';
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return t;
  const h = Number(m[1]); const mm = m[2];
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${period}`;
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
      { heading: 'Event details', body: '', event: {} },
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
  { name: 'Event details', section: { heading: 'Event details', body: '', event: {} } },
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
  // Mailchimp-style 4-step flow: To → Content → Design → Review. A
  // returning edit jumps straight to Design (that's the thing the user
  // opened the campaign to change); a brand-new campaign starts at To
  // once the template picker has been dismissed.
  type Step = 'to' | 'content' | 'design' | 'review';
  const [step, setStep] = useState<Step>(newsletterId ? 'design' : 'to');
  const [sentTest, setSentTest] = useState(false);

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
    const hasContent = (s: Section) =>
      s.heading.trim() || s.body.trim() || s.image_url ||
      (s.event && (s.event.date || s.event.time || s.event.location || s.event.tickets));
    const cleanSections = sections.filter(hasContent);
    const sectionHtml = cleanSections.map((s) => {
      // Event payload → labeled rows (date/time/location/tickets)
      // instead of an unformatted body dump. Only the fields that are
      // set render, and the ticket URL becomes a proper link.
      const ev = s.event;
      const eventRows: string[] = [];
      if (ev?.date) eventRows.push(`<div style="margin:2px 0;"><span style="color:#666;">📅 </span>${escapeHtml(formatEventDate(ev.date))}</div>`);
      if (ev?.time) eventRows.push(`<div style="margin:2px 0;"><span style="color:#666;">🕒 </span>${escapeHtml(formatEventTime(ev.time))}</div>`);
      if (ev?.location) eventRows.push(`<div style="margin:2px 0;"><span style="color:#666;">📍 </span>${escapeHtml(ev.location)}</div>`);
      if (ev?.tickets) {
        const isUrl = /^https?:\/\//i.test(ev.tickets);
        eventRows.push(
          `<div style="margin:2px 0;"><span style="color:#666;">🎟️ </span>${isUrl
            ? `<a href="${escapeHtml(ev.tickets)}" style="color:#2563eb;text-decoration:underline;">Tickets</a>`
            : escapeHtml(ev.tickets)}</div>`,
        );
      }
      const eventHtml = eventRows.length
        ? `<div style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#333;">${eventRows.join('')}</div>`
        : '';
      return `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td>
          ${s.image_url ? `<img src="${escapeHtml(s.image_url)}" style="width:100%;max-width:600px;border-radius:8px;margin-bottom:12px;" />` : ''}
          ${s.heading ? `<h2 style="font-family:sans-serif;font-size:20px;margin:0 0 8px 0;color:#1a1a1a;">${escapeHtml(s.heading)}</h2>` : ''}
          ${eventHtml}
          ${s.body ? `<div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#333;white-space:pre-wrap;${eventHtml ? 'margin-top:8px;' : ''}">${escapeHtml(s.body)}</div>` : ''}
        </td></tr>
      </table>
    `;
    }).join('');
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
      const ev = s.event;
      if (ev) {
        if (ev.date) parts.push(`Date: ${formatEventDate(ev.date)}`);
        if (ev.time) parts.push(`Time: ${formatEventTime(ev.time)}`);
        if (ev.location) parts.push(`Location: ${ev.location}`);
        if (ev.tickets) parts.push(`Tickets: ${ev.tickets}`);
      }
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

  // First-10 recipient preview for the To step ("who am I actually
  // reaching?") — a Mailchimp affordance that turns an abstract group
  // count into concrete names. Faces on the list = user confidence.
  const { data: recipientPreview = [] } = useQuery({
    queryKey: ['newsletter-recipient-preview', group],
    queryFn: async () => {
      let q = supabase.from('gw_profiles_directory').select('full_name, email').not('email', 'is', null).limit(10);
      const role = roleForGroup(group);
      if (role) q = q.eq('role', role);
      const { data } = await q;
      return (data ?? []) as Array<{ full_name: string | null; email: string | null }>;
    },
  });

  async function sendTestToSelf() {
    if (!subject.trim()) {
      toast({ title: 'Add a subject line first', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const to = user.user?.email;
      if (!to) throw new Error('No email on your account.');
      const { error } = await supabase.functions.invoke('gw-send-email', {
        body: { to: [to], subject: `[TEST] ${subject}`, html: buildHtml(), text: buildText() },
      });
      if (error) throw error;
      setSentTest(true);
      toast({ title: 'Test sent', description: `Delivered to ${to}` });
    } catch (e: any) {
      toast({ title: 'Test failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  // Per-step completion. Drives the check-marks on the indicator and
  // whether the Next / Send buttons at the bottom are enabled.
  const hasTitle = title.trim().length > 0;
  const hasSubject = subject.trim().length > 0;
  const hasSomeContent = intro.trim().length > 0 || sections.some((s) => s.heading.trim() || s.body.trim());
  const stepValid: Record<Step, boolean> = {
    to: true, // group has a default
    content: hasTitle && hasSubject,
    design: hasSomeContent,
    review: hasTitle && hasSubject && hasSomeContent,
  };
  const stepOrder: Step[] = ['to', 'content', 'design', 'review'];
  const stepIdx = stepOrder.indexOf(step);
  const goNext = () => setStep(stepOrder[Math.min(stepIdx + 1, stepOrder.length - 1)]);
  const goBack = () => setStep(stepOrder[Math.max(stepIdx - 1, 0)]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Template picker is now a first-time-only overlay on top of the To
  // step. Existing campaigns skip it entirely. "Start blank" or a pick
  // dismisses it; there's no reason to come back once you've moved on.
  const showPicker = showTemplatePicker && !newsletterId && step === 'to';

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      {/* Header: back + campaign name + save-draft + save-as-template.
          Send/schedule live on the final Review step now — one place
          per action instead of five buttons the user has to guess at. */}
      <div className="border-b px-4 py-3 flex items-center gap-2 sm:gap-3 flex-wrap bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Campaigns
        </Button>
        <div className="flex-1 min-w-[180px] max-w-xl">
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (!subject) setSubject(e.target.value); }}
            placeholder="Campaign name (for your reference)"
            className="h-9 font-medium"
          />
        </div>
        <Button variant="outline" size="sm" onClick={saveAsTemplate} disabled={busy || !title.trim()} title="Save this design as a reusable template">
          <LayoutTemplate className="w-3.5 h-3.5 mr-1" /> Save as template
        </Button>
        <Button variant="outline" size="sm" onClick={() => save('draft')} disabled={busy || !title.trim()}>
          <Save className="w-3.5 h-3.5 mr-1" /> Save draft
        </Button>
      </div>

      {/* Step indicator — four numbered pills. Click any completed
          step to jump back; a step you haven't validated yet stays
          disabled so you can't skip the recipient count and end up on
          Review with no audience selected. */}
      <div className="border-b bg-gray-50 px-4 py-3">
        <ol className="flex items-center gap-1 sm:gap-2 max-w-3xl mx-auto">
          {stepOrder.map((s, i) => {
            const meta: Record<Step, { label: string; icon: React.ReactNode }> = {
              to:      { label: 'To',       icon: <Users className="w-3.5 h-3.5" /> },
              content: { label: 'Content',  icon: <Mail className="w-3.5 h-3.5" /> },
              design:  { label: 'Design',   icon: <LayoutList className="w-3.5 h-3.5" /> },
              review:  { label: 'Review',   icon: <Send className="w-3.5 h-3.5" /> },
            };
            const done = stepValid[s] && stepOrder.indexOf(step) > i;
            const active = step === s;
            const canJump = i === 0 || stepOrder.slice(0, i).every((prev) => stepValid[prev]);
            return (
              <li key={s} className="flex-1 flex items-center gap-1 sm:gap-2 min-w-0">
                <button
                  type="button"
                  disabled={!canJump}
                  onClick={() => canJump && setStep(s)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors min-w-0 ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : done
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : canJump
                          ? 'bg-white border text-gray-700 hover:bg-gray-100'
                          : 'bg-gray-100 border border-dashed text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 ${
                    active ? 'bg-primary-foreground/20' : done ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{meta[s].label}</span>
                </button>
                {i < stepOrder.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0 hidden sm:block" />}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Step body */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
        {step === 'to' && (
          <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
            {showPicker && (
              <div className="border rounded-xl p-4 bg-purple-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-purple-700" /> Start from a template
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setShowTemplatePicker(false)}>Skip</Button>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Built-in layouts</p>
                  <div className="flex flex-wrap gap-2">
                    {LAYOUTS.map((l) => (
                      <Button key={l.name} variant="outline" size="sm" onClick={() => applyLayout(l)}>{l.name}</Button>
                    ))}
                  </div>
                </div>
                {templates.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Your saved templates</p>
                    <div className="flex flex-wrap gap-2">
                      {templates.map((t) => (
                        <Button key={t.id} variant="outline" size="sm" onClick={() => applyTemplate(t.id)}>{t.title}</Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="bg-white border rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Who's it going to?</h3>
                <p className="text-sm text-muted-foreground">Pick the audience — you can preview exactly who's on the list below.</p>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Audience</Label>
                <Select value={group} onValueChange={(v) => setGroup(v as Group)}>
                  <SelectTrigger className="h-11 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-900 font-semibold">
                    {audienceCount} recipient{audienceCount === 1 ? '' : 's'} with email
                  </span>
                  {audienceCount === 0 && (
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      No emails — check the audience filter
                    </span>
                  )}
                </div>
              </div>
              {recipientPreview.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    See who this includes (first {recipientPreview.length}
                    {audienceCount > recipientPreview.length ? ` of ${audienceCount}` : ''})
                  </summary>
                  <ul className="mt-2 divide-y border rounded-lg">
                    {recipientPreview.map((r, idx) => (
                      <li key={idx} className="px-3 py-2 text-sm flex items-center gap-3">
                        <span className="font-medium text-gray-900 truncate flex-1">{r.full_name || '(no name)'}</span>
                        <span className="text-muted-foreground truncate">{r.email}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        )}

        {step === 'content' && (
          <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
            <div className="bg-white border rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">What's it about?</h3>
                <p className="text-sm text-muted-foreground">The subject line is the first thing your audience sees in their inbox — keep it under 50 characters.</p>
              </div>
              <div>
                <Label htmlFor="ns-subject" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject line</Label>
                <Input
                  id="ns-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Spring update from the choir"
                  className="h-11 mt-1 text-base"
                />
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className={`${subject.length > 60 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                    {subject.length} character{subject.length === 1 ? '' : 's'}
                    {subject.length > 60 && ' — may truncate in some inboxes'}
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="ns-title" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Internal name</Label>
                <Input
                  id="ns-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Spring 2026 update"
                  className="h-10 mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Not sent to recipients — just how you'll find this campaign later.</p>
              </div>
            </div>
          </div>
        )}

        {step === 'design' && (
          <div className="flex flex-col lg:flex-row min-h-0 h-full">
            {/* Design editor */}
            <div className={`flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-4 ${mobilePane === 'preview' ? 'hidden lg:block' : ''} lg:max-w-[55%] lg:border-r bg-gray-50`}>
              <div className="lg:hidden flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setMobilePane('preview')}>
                  <Eye className="w-3.5 h-3.5 mr-1" /> See preview
                </Button>
              </div>
              <div className="bg-white border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Header image</Label>
                  <span className="text-xs text-muted-foreground">Optional</span>
                </div>
                <ImageField value={headerImage} onChange={setHeaderImage} />
              </div>
              <div className="bg-white border rounded-xl p-4 space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intro</Label>
                <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Dear friends…" className="min-h-[80px]" />
                {!intro && (
                  <div className="flex flex-wrap gap-1">
                    {HEADER_PRESETS.map((h) => (
                      <button
                        key={h.name}
                        type="button"
                        onClick={() => setIntro(h.intro)}
                        className="text-xs px-2 py-0.5 rounded-full border bg-muted/40 hover:bg-muted text-muted-foreground"
                      >
                        {h.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-gray-900">Content blocks</Label>
                  <span className="text-xs text-muted-foreground">{sections.length} block{sections.length === 1 ? '' : 's'}</span>
                </div>
                {sections.map((s, i) => (
                  <div key={i} className="bg-white border rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium">Block {i + 1}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => moveSection(i, -1)} disabled={i === 0}><ArrowUp className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1}><ArrowDown className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => removeSection(i)} disabled={sections.length === 1}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                    <Input value={s.heading} onChange={(e) => updateSection(i, { heading: e.target.value })} placeholder="Heading" />
                    {s.event && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg bg-muted/40 border border-dashed">
                        <div className="space-y-1">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">📅 Date</Label>
                          <Input
                            type="date"
                            value={s.event.date ?? ''}
                            onChange={(e) => updateSection(i, { event: { ...s.event, date: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">🕒 Time</Label>
                          <Input
                            type="time"
                            value={s.event.time ?? ''}
                            onChange={(e) => updateSection(i, { event: { ...s.event, time: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">📍 Location</Label>
                          <Input
                            value={s.event.location ?? ''}
                            onChange={(e) => updateSection(i, { event: { ...s.event, location: e.target.value } })}
                            placeholder="Main Hall · 123 Choir St."
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">🎟️ Tickets</Label>
                          <Input
                            type="url"
                            value={s.event.tickets ?? ''}
                            onChange={(e) => updateSection(i, { event: { ...s.event, tickets: e.target.value } })}
                            placeholder="https://... or 'Free' / 'RSVP required'"
                          />
                        </div>
                      </div>
                    )}
                    <Textarea
                      value={s.body}
                      onChange={(e) => updateSection(i, { body: e.target.value })}
                      placeholder={s.event ? 'Additional notes (optional)…' : 'Body…'}
                      className="min-h-[100px]"
                    />
                    <ImageField value={s.image_url || ''} onChange={(url) => updateSection(i, { image_url: url })} placeholder="Image (optional) — URL or upload" />
                  </div>
                ))}
                <div className="bg-white border border-dashed rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Add a block</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BLOCK_PRESETS.map((b) => (
                      <Button key={b.name} variant="outline" size="sm" onClick={() => addSection(b.section)}>
                        <Plus className="w-3 h-3 mr-1" /> {b.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white border rounded-xl p-4 space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Footer</Label>
                <Textarea value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Dr. Smith · Director · choir@school.edu" />
                {!footer && (
                  <div className="flex flex-wrap gap-1">
                    {FOOTER_PRESETS.map((f) => (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => setFooter(f.footer)}
                        className="text-xs px-2 py-0.5 rounded-full border bg-muted/40 hover:bg-muted text-muted-foreground"
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Sticky preview */}
            <div className={`flex-1 min-w-0 bg-gray-100 flex flex-col ${mobilePane === 'edit' ? 'hidden lg:flex' : 'flex'}`}>
              <div className="px-4 py-2 border-b bg-white text-xs text-muted-foreground flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 truncate">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="truncate">Preview</span>
                </span>
                <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobilePane('edit')}>
                  <PenLine className="w-3.5 h-3.5 mr-1" /> Back to edit
                </Button>
              </div>
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={previewHtml}
                className="flex-1 w-full border-0"
              />
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
            <div className="bg-white border rounded-xl p-5 space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Ready to send?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="border rounded-lg p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">To</div>
                  <div className="font-medium text-gray-900">{GROUPS.find((g) => g.value === group)?.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{audienceCount} recipient{audienceCount === 1 ? '' : 's'}</div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Subject</div>
                  <div className="font-medium text-gray-900 truncate">{subject || '(no subject)'}</div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Design</div>
                  <div className="font-medium text-gray-900">{sections.length} block{sections.length === 1 ? '' : 's'}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{headerImage ? 'Header image · ' : ''}{intro ? 'Intro · ' : ''}{footer ? 'Footer' : ''}</div>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <iframe title="Final preview" sandbox="" srcDoc={previewHtml} className="w-full h-[480px] border-0" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={sendTestToSelf} disabled={busy || !hasSubject}>
                  {sentTest ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Mail className="w-3.5 h-3.5 mr-1" />}
                  {sentTest ? 'Test sent' : 'Send test to me'}
                </Button>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <Label htmlFor="ns-schedule" className="text-xs text-muted-foreground">Or schedule:</Label>
                  <Input
                    id="ns-schedule"
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="h-9 w-[200px]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="border-t px-4 py-3 bg-white flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goBack} disabled={stepIdx === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1" />
        {step === 'review' ? (
          <>
            {scheduleDate && (
              <Button variant="outline" size="sm" onClick={() => save('scheduled')} disabled={busy || !stepValid.review}>
                <Clock className="w-4 h-4 mr-1" /> Schedule send
              </Button>
            )}
            <Button size="sm" onClick={() => save('sent')} disabled={busy || !stepValid.review || audienceCount === 0}>
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Send now
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={goNext} disabled={!stepValid[step]}>
            Next: {stepOrder[stepIdx + 1] === 'content' ? 'Content' : stepOrder[stepIdx + 1] === 'design' ? 'Design' : 'Review'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
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
