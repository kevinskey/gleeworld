// Email + SMS blast modal. Reaches people by email and/or SMS in one composer.
// Supports file attachments (up to 5 files, 25MB each) for email.
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { X, Send, Loader2, Mail, Smartphone, Paperclip, FileIcon } from 'lucide-react';

type Group = 'all' | 'students' | 'admins' | 'fans';
const GROUPS: Array<{ value: Group; label: string }> = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students only' },
  { value: 'admins', label: 'Staff / Admins only' },
  { value: 'fans', label: 'Fans only' },
];

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25MB per file
const MAX_ATTACHMENTS = 5;

export function EmailBlastComposer({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [group, setGroup] = useState<Group>('students');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: counts = { emails: 0, phones: 0 } } = useQuery({
    queryKey: ['blast-count', group],
    queryFn: async () => {
      let q = supabase.from('gw_profiles').select('user_id', { count: 'exact', head: true }).not('email', 'is', null);
      let p = supabase.from('gw_profiles').select('user_id', { count: 'exact', head: true }).not('phone', 'is', null);
      if (group !== 'all') {
        const role = group === 'students' ? 'student' : group === 'admins' ? 'admin' : 'fan';
        q = q.eq('role', role);
        p = p.eq('role', role);
      }
      const [{ count: emails }, { count: phones }] = await Promise.all([q, p]);
      return { emails: emails ?? 0, phones: phones ?? 0 };
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
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve({ filename: file.name, content: base64, contentType: file.type || 'application/octet-stream' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function send() {
    if (!sendEmail && !sendSms) return toast({ title: 'Pick at least one channel', variant: 'destructive' });
    if (sendEmail && (!subject.trim() || !body.trim())) return toast({ title: 'Subject + message required for email', variant: 'destructive' });
    if (sendSms && !body.trim()) return toast({ title: 'Message required for SMS', variant: 'destructive' });
    setSending(true);
    try {
      const role = group !== 'all' ? (group === 'students' ? 'student' : group === 'admins' ? 'admin' : 'fan') : undefined;

      let emailCount = 0;
      let smsCount = 0;

      if (sendEmail) {
        let rq = supabase.from('gw_profiles').select('email').not('email', 'is', null);
        if (role) rq = rq.eq('role', role);
        const { data: recipients, error: rErr } = await rq;
        if (rErr) throw rErr;
        const emails = (recipients ?? []).map((r: any) => r.email).filter(Boolean);
        if (emails.length === 0) throw new Error('No email recipients in that group.');

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
        emailCount = emails.length;
      }

      if (sendSms) {
        let pq = supabase.from('gw_profiles').select('phone').not('phone', 'is', null);
        if (role) pq = pq.eq('role', role);
        const { data: phones, error: pErr } = await pq;
        if (pErr) throw pErr;
        const numbers = (phones ?? []).map((p: any) => p.phone).filter(Boolean);
        if (numbers.length === 0) {
          if (!sendEmail) throw new Error('No phone numbers in that group.');
        } else {
          const { data: user } = await supabase.auth.getUser();
          const { error: smsErr } = await supabase.functions.invoke('send-sms', {
            body: {
              message: body,
              recipients: numbers,
              sendToAll: false,
              senderId: user.user?.id,
            },
          });
          if (smsErr) throw smsErr;
          smsCount = numbers.length;
        }
      }

      const { data: user } = await supabase.auth.getUser();
      await supabase.from('gw_communications').insert({
        title: subject || body.slice(0, 60),
        content: body,
        sender_id: user.user?.id,
        recipient_groups: [{ id: group, name: GROUPS.find((g) => g.value === group)?.label }],
        channels: [sendEmail && 'email', sendSms && 'sms'].filter(Boolean),
        total_recipients: Math.max(emailCount, smsCount),
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      const parts = [];
      if (emailCount) parts.push(`${emailCount} email${emailCount === 1 ? '' : 's'}`);
      if (smsCount) parts.push(`${smsCount} SMS`);
      toast({ title: 'Sent', description: parts.join(' + ') });
      qc.invalidateQueries({ queryKey: ['comm-history'] });
      onClose();
    } catch (e: any) {
      toast({ title: 'Send failed', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-lg my-4 bg-white text-gray-900">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white text-gray-900 z-10 border-b rounded-t-xl">
          <CardTitle className="flex items-center gap-2 text-gray-900"><Mail className="w-5 h-5" /> Quick blast</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="text-gray-900 hover:bg-gray-100"><X className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <p className="text-xs text-muted-foreground">For reaching people by email and/or SMS — useful for people not in any chat group.</p>

          <div>
            <Label className="text-xs">Send to</Label>
            <Select value={group} onValueChange={(v) => setGroup(v as Group)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{counts.emails} email · {counts.phones} phone on file</p>
          </div>

          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
              <Mail className="w-3 h-3" /> Email
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} />
              <Smartphone className="w-3 h-3" /> SMS
            </label>
          </div>

          {sendEmail && (
            <div>
              <Label className="text-xs">Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Spring concert reminder" />
            </div>
          )}
          <div>
            <Label className="text-xs">Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi everyone…" className="min-h-[140px]" />
            {sendSms && body.length > 160 && (
              <p className="text-xs text-amber-600 mt-1">SMS is {body.length} chars — will split into {Math.ceil(body.length / 160)} segments.</p>
            )}
          </div>

          {sendEmail && (
            <div>
              <Label className="text-xs">Attachments (email only)</Label>
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
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={send} disabled={sending || (!sendEmail && !sendSms) || !body.trim()}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
