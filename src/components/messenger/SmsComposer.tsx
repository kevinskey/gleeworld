// SMS-only composer. Text members by group, specific people, or any phone number.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { X, Send, Loader2, Smartphone } from 'lucide-react';

type Group = 'all' | 'students' | 'admins' | 'fans' | 'custom';
const GROUPS: Array<{ value: Group; label: string }> = [
  { value: 'custom', label: 'Specific people or numbers…' },
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students only' },
  { value: 'admins', label: 'Staff / Admins only' },
  { value: 'fans', label: 'Fans only' },
];

interface Person {
  user_id: string;
  full_name: string;
  phone: string | null;
}

export function SmsComposer({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [group, setGroup] = useState<Group>('custom');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [personSearch, setPersonSearch] = useState('');
  const [selectedPeople, setSelectedPeople] = useState<Person[]>([]);

  const { data: people = [] } = useQuery({
    queryKey: ['sms-people'],
    enabled: group === 'custom',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_profiles_directory')
        .select('user_id, full_name, first_name, last_name, email, phone')
        .eq('status', 'active')
        .not('phone', 'is', null)
        .not('user_id', 'is', null)
        .order('full_name');
      if (error) throw error;
      return (data ?? []).map((p: any): Person => ({
        user_id: p.user_id,
        full_name: p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Unknown',
        phone: p.phone,
      }));
    },
  });

  const adHocPhone = parsePhone(personSearch);

  const searchResults = personSearch.trim()
    ? people.filter((p) =>
        !selectedPeople.find((s) => s.user_id === p.user_id) &&
        p.full_name.toLowerCase().includes(personSearch.toLowerCase()))
        .slice(0, 8)
    : [];

  const { data: groupCount = 0 } = useQuery({
    queryKey: ['sms-count', group],
    enabled: group !== 'custom',
    queryFn: async () => {
      let p = supabase.from('gw_profiles_directory').select('user_id', { count: 'exact', head: true }).not('phone', 'is', null);
      if (group !== 'all') {
        const role = group === 'students' ? 'student' : group === 'admins' ? 'admin' : 'fan';
        p = p.eq('role', role);
      }
      const { count } = await p;
      return count ?? 0;
    },
  });

  function addAdHoc() {
    if (!adHocPhone || selectedPeople.find((s) => s.phone === adHocPhone)) return;
    setSelectedPeople((prev) => [...prev, { user_id: `phone:${adHocPhone}`, full_name: adHocPhone, phone: adHocPhone }]);
    setPersonSearch('');
  }

  async function send() {
    if (!body.trim()) return toast({ title: 'Message required', variant: 'destructive' });

    let recipients = selectedPeople;
    if (group === 'custom' && adHocPhone && !selectedPeople.find((s) => s.phone === adHocPhone)) {
      recipients = [...selectedPeople, { user_id: `phone:${adHocPhone}`, full_name: adHocPhone, phone: adHocPhone }];
      setSelectedPeople(recipients);
      setPersonSearch('');
    }
    if (group === 'custom' && recipients.length === 0) {
      return toast({ title: 'Add at least one recipient', variant: 'destructive' });
    }

    setSending(true);
    try {
      let numbers: string[];
      if (group === 'custom') {
        numbers = recipients.map((p) => p.phone).filter(Boolean) as string[];
      } else {
        let pq = supabase.from('gw_profiles_directory').select('phone').not('phone', 'is', null);
        if (group !== 'all') {
          const role = group === 'students' ? 'student' : group === 'admins' ? 'admin' : 'fan';
          pq = pq.eq('role', role);
        }
        const { data: phones, error: pErr } = await pq;
        if (pErr) throw pErr;
        numbers = (phones ?? []).map((p: any) => p.phone).filter(Boolean);
      }
      if (numbers.length === 0) throw new Error('No phone numbers among selected recipients.');

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

      await supabase.from('gw_communications').insert({
        title: body.slice(0, 60),
        content: body,
        sender_id: user.user?.id,
        recipient_groups: [{ id: group, name: GROUPS.find((g) => g.value === group)?.label }],
        channels: ['sms'],
        total_recipients: numbers.length,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      toast({ title: 'Sent', description: `${numbers.length} SMS` });
      qc.invalidateQueries({ queryKey: ['comm-history'] });
      onClose();
    } catch (e: any) {
      toast({ title: 'Send failed', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-0 sm:p-4 overflow-y-auto">
      <Card className="w-full max-w-lg min-h-full sm:min-h-0 sm:my-4 bg-white text-gray-900 rounded-none sm:rounded-xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-0 sm:pb-0">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white text-gray-900 z-10 border-b sm:rounded-t-xl">
          <CardTitle className="flex items-center gap-2 text-gray-900"><Smartphone className="w-5 h-5" /> Send a text</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="text-gray-900 hover:bg-gray-100"><X className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div>
            <Label className="text-xs">Send to</Label>
            <Select value={group} onValueChange={(v) => setGroup(v as Group)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {group !== 'custom' && (
              <p className="text-xs text-muted-foreground mt-1">{groupCount} phone numbers on file</p>
            )}
          </div>

          {group === 'custom' && (
            <div>
              <Label className="text-xs">Recipients</Label>
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
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAdHoc(); } }}
                type="tel"
                inputMode="text"
                placeholder="Type a phone number or search by name…"
              />
              {(searchResults.length > 0 || adHocPhone) && (
                <div className="border rounded-md mt-1 max-h-48 overflow-y-auto divide-y">
                  {adHocPhone && !selectedPeople.find((s) => s.phone === adHocPhone) && (
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted flex items-center justify-between"
                      onClick={addAdHoc}
                    >
                      <span>Text {adHocPhone}</span>
                      <Smartphone className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                  {searchResults.map((p) => (
                    <button
                      key={p.user_id}
                      type="button"
                      className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted flex items-center justify-between"
                      onClick={() => { setSelectedPeople((prev) => [...prev, p]); setPersonSearch(''); }}
                    >
                      <span className="truncate">{p.full_name}</span>
                      <Smartphone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs">Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your text…" className="min-h-[140px]" />
            {body.length > 160 && (
              <p className="text-xs text-amber-600 mt-1">{body.length} chars — will split into {Math.ceil(body.length / 160)} segments.</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={send} disabled={sending || !body.trim()}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send text
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function parsePhone(input: string): string | null {
  const cleaned = input.trim().replace(/[\s().-]/g, '');
  if (!/^\+?\d{10,15}$/.test(cleaned)) return null;
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
  return `+${cleaned}`;
}
