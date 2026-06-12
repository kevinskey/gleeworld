// Conventional email window: compose pane + sent history list.
// Email-only (SMS lives in the Quick blast composer).
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  X, Send, Loader2, Mail, Paperclip, FileIcon, PenSquare, Inbox, ChevronLeft,
} from 'lucide-react';

type Group = 'all' | 'students' | 'admins' | 'fans' | 'custom';
const GROUPS: Array<{ value: Group; label: string }> = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students only' },
  { value: 'admins', label: 'Staff / Admins only' },
  { value: 'fans', label: 'Fans only' },
  { value: 'custom', label: 'Specific people…' },
];

interface Person {
  user_id: string;
  full_name: string;
  email: string | null;
}

interface SentEmail {
  id: string;
  title: string;
  content: string;
  sent_at: string | null;
  created_at: string;
  total_recipients: number | null;
  recipient_groups: any;
  status: string;
}

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

export function EmailClient({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<'compose' | 'history'>('compose');
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);

  // Compose state
  const [group, setGroup] = useState<Group>('students');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [personSearch, setPersonSearch] = useState('');
  const [selectedPeople, setSelectedPeople] = useState<Person[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: people = [] } = useQuery({
    queryKey: ['email-people'],
    enabled: group === 'custom',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_profiles_directory')
        .select('user_id, full_name, first_name, last_name, email')
        .eq('status', 'active')
        .not('user_id', 'is', null)
        .not('email', 'is', null)
        .order('full_name');
      if (error) throw error;
      return (data ?? []).map((p: any): Person => ({
        user_id: p.user_id,
        full_name: p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Unknown',
        email: p.email,
      }));
    },
  });

  const searchResults = personSearch.trim()
    ? people.filter((p) =>
        !selectedPeople.find((s) => s.user_id === p.user_id) &&
        (p.full_name.toLowerCase().includes(personSearch.toLowerCase()) ||
          (p.email ?? '').toLowerCase().includes(personSearch.toLowerCase())))
        .slice(0, 8)
    : [];

  const { data: groupCount = 0 } = useQuery({
    queryKey: ['email-count', group],
    enabled: group !== 'custom',
    queryFn: async () => {
      let q = supabase.from('gw_profiles_directory').select('user_id', { count: 'exact', head: true }).not('email', 'is', null);
      if (group !== 'all') {
        const role = group === 'students' ? 'student' : group === 'admins' ? 'admin' : 'fan';
        q = q.eq('role', role);
      }
      const { count } = await q;
      return count ?? 0;
    },
  });

  const recipientCount = group === 'custom' ? selectedPeople.length : groupCount;

  const { data: history = [], isLoading: historyLoading } = useQuery<SentEmail[]>({
    queryKey: ['email-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_communications')
        .select('id, title, content, sent_at, created_at, total_recipients, recipient_groups, status')
        .contains('channels', ['email'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as SentEmail[];
    },
  });

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const oversized = files.find((f) => f.size > MAX_ATTACHMENT_SIZE);
    if (oversized) {
      toast({ title: 'File too big', description: `${oversized.name} is over 25MB.`, variant: 'destructive' });
      return;
    }
    setAttachments((prev) => {
      const combined = [...prev, ...files];
      if (combined.length > MAX_ATTACHMENTS) {
        toast({ title: 'Too many files', description: `Max ${MAX_ATTACHMENTS} attachments per send.`, variant: 'destructive' });
      }
      return combined.slice(0, MAX_ATTACHMENTS);
    });
    if (fileRef.current) fileRef.current.value = '';
  }

  async function fileToBase64(file: File): Promise<{ filename: string; content: string; contentType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve({ filename: file.name, content: base64, contentType: file.type || 'application/octet-stream' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function send() {
    if (!subject.trim() || !body.trim()) {
      return toast({ title: 'Subject and message required', variant: 'destructive' });
    }
    if (group === 'custom' && selectedPeople.length === 0) {
      return toast({ title: 'Pick at least one recipient', variant: 'destructive' });
    }
    setSending(true);
    try {
      let emails: string[];
      if (group === 'custom') {
        emails = selectedPeople.map((p) => p.email).filter(Boolean) as string[];
      } else {
        let rq = supabase.from('gw_profiles_directory').select('email').not('email', 'is', null);
        if (group !== 'all') {
          const role = group === 'students' ? 'student' : group === 'admins' ? 'admin' : 'fan';
          rq = rq.eq('role', role);
        }
        const { data: recipients, error: rErr } = await rq;
        if (rErr) throw rErr;
        emails = (recipients ?? []).map((r: any) => r.email).filter(Boolean);
      }
      if (emails.length === 0) throw new Error('No email recipients found.');

      const attachmentPayload = attachments.length > 0
        ? await Promise.all(attachments.map(fileToBase64))
        : undefined;

      const { error: sErr } = await supabase.functions.invoke('gw-send-email', {
        body: {
          to: emails,
          subject,
          text: body,
          html: `<div style="font-family:sans-serif;max-width:600px;white-space:pre-wrap;">${escapeHtml(body)}</div>`,
          attachments: attachmentPayload,
        },
      });
      if (sErr) throw sErr;

      const { data: user } = await supabase.auth.getUser();
      await supabase.from('gw_communications').insert({
        title: subject,
        content: body,
        sender_id: user.user?.id,
        recipient_groups: group === 'custom'
          ? selectedPeople.map((p) => ({ id: p.user_id, name: p.full_name }))
          : [{ id: group, name: GROUPS.find((g) => g.value === group)?.label }],
        channels: ['email'],
        total_recipients: emails.length,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      toast({ title: 'Email sent', description: `${emails.length} recipient${emails.length === 1 ? '' : 's'}` });
      qc.invalidateQueries({ queryKey: ['email-history'] });
      qc.invalidateQueries({ queryKey: ['comm-history'] });
      setSubject(''); setBody(''); setAttachments([]); setSelectedPeople([]);
      setView('history');
    } catch (e: any) {
      toast({ title: 'Send failed', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  function recipientLabel(e: SentEmail) {
    const groupsArr = Array.isArray(e.recipient_groups) ? e.recipient_groups : [];
    if (groupsArr.length === 1) return groupsArr[0]?.name || 'Recipients';
    if (groupsArr.length > 1) return `${groupsArr.length} recipients`;
    return 'Recipients';
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-4xl h-full sm:h-[85vh] bg-white text-gray-900 rounded-none sm:rounded-xl shadow-xl flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-0 sm:pb-0">
        {/* Title bar */}
        <div className="border-b px-4 py-3 flex items-center justify-between bg-white">
          <h2 className="font-semibold flex items-center gap-2"><Mail className="w-5 h-5" /> Email</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="text-gray-900 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          {/* Sidebar — top tab bar on phones, left rail on larger screens */}
          <aside className="md:w-44 border-b md:border-b-0 md:border-r bg-gray-50 shrink-0">
            <div className="p-2 flex md:flex-col gap-1">
              <Button
                className="flex-1 md:flex-none md:w-full justify-center md:justify-start"
                variant={view === 'compose' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setView('compose'); setSelectedEmail(null); }}
              >
                <PenSquare className="w-4 h-4 mr-2" /> Compose
              </Button>
              <Button
                className="flex-1 md:flex-none md:w-full justify-center md:justify-start"
                variant={view === 'history' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('history')}
              >
                <Inbox className="w-4 h-4 mr-2" /> Sent ({history.length})
              </Button>
            </div>
          </aside>

          {/* Main pane */}
          <main className="flex-1 min-w-0 flex flex-col">
            {view === 'compose' ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div>
                  <Label className="text-xs">To</Label>
                  <Select value={group} onValueChange={(v) => setGroup(v as Group)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">{recipientCount} recipient{recipientCount === 1 ? '' : 's'}</p>
                </div>

                {group === 'custom' && (
                  <div>
                    {selectedPeople.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {selectedPeople.map((p) => (
                          <span key={p.user_id} className="inline-flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 text-xs">
                            {p.full_name}
                            <button type="button" onClick={() => setSelectedPeople((prev) => prev.filter((s) => s.user_id !== p.user_id))} aria-label={`Remove ${p.full_name}`}>
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <Input
                      value={personSearch}
                      onChange={(e) => setPersonSearch(e.target.value)}
                      placeholder="Search by name or email…"
                    />
                    {searchResults.length > 0 && (
                      <div className="border rounded-md mt-1 max-h-48 overflow-y-auto divide-y">
                        {searchResults.map((p) => (
                          <button
                            key={p.user_id}
                            type="button"
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted flex items-center justify-between"
                            onClick={() => { setSelectedPeople((prev) => [...prev, p]); setPersonSearch(''); }}
                          >
                            <span className="truncate">{p.full_name}</span>
                            <span className="text-xs text-muted-foreground truncate ml-2">{p.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-xs">Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Spring concert reminder" />
                </div>

                <div>
                  <Label className="text-xs">Message</Label>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi everyone…" className="min-h-[220px]" />
                </div>

                <div>
                  <Label className="text-xs">Attachments</Label>
                  <div className="space-y-1">
                    {attachments.map((f, i) => (
                      <div key={i} className="text-xs flex items-center justify-between bg-muted/40 rounded px-2 py-1">
                        <span className="flex items-center gap-1 truncate"><FileIcon className="w-3 h-3" /> {f.name} <span className="text-muted-foreground">({Math.round(f.size / 1024)}KB)</span></span>
                        <Button variant="ghost" size="sm" onClick={() => setAttachments((p) => p.filter((_, idx) => idx !== i))}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={attachments.length >= MAX_ATTACHMENTS}>
                      <Paperclip className="w-3 h-3 mr-1" /> Attach file
                    </Button>
                    <input ref={fileRef} type="file" multiple className="hidden" onChange={pickFiles} />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button onClick={send} disabled={sending || !subject.trim() || !body.trim()}>
                    {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Send
                  </Button>
                </div>
              </div>
            ) : selectedEmail ? (
              <div className="flex-1 overflow-y-auto">
                <div className="border-b px-4 py-3 flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{selectedEmail.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      To {recipientLabel(selectedEmail)}
                      {selectedEmail.total_recipients ? ` · ${selectedEmail.total_recipients} recipient${selectedEmail.total_recipients === 1 ? '' : 's'}` : ''}
                      {' · '}
                      {new Date(selectedEmail.sent_at || selectedEmail.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
                <div className="p-4 text-sm whitespace-pre-wrap">{selectedEmail.content}</div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y">
                {historyLoading && (
                  <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                )}
                {!historyLoading && history.length === 0 && (
                  <p className="p-8 text-center text-sm text-muted-foreground">No emails sent yet.</p>
                )}
                {history.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedEmail(e)}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-sm truncate">{e.title || '(no subject)'}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {new Date(e.sent_at || e.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      To {recipientLabel(e)}{e.total_recipients ? ` (${e.total_recipients})` : ''} — {e.content}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
