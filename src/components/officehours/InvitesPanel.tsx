// Studio Hours → Invites
//
// Turns a list of names and emails into one token'd booking link per person,
// then emails each of them their own link with live times as tap-to-reserve
// buttons. Invitees never need a GleeWorld account.
//
// One invite = one person = one booking. Links are personal on purpose: a
// single shared link would let anyone who received a forward book a slot, and
// there would be no way to tell who took what.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, Send, Link as LinkIcon, Check, Users, Mail, CalendarCheck,
  RotateCw, Ban,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useServices } from '@/hooks/useServices';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const SOFT_CARD = 'border-0 rounded-2xl';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

interface ParsedRecipient {
  name: string;
  email: string;
}

// Accepts the shapes people actually paste out of a spreadsheet or mail client:
//   Jane Smith <jane@school.org>
//   jane@school.org, Jane Smith
//   jane@school.org
function parseRecipients(raw: string): { valid: ParsedRecipient[]; invalid: string[] } {
  const valid: ParsedRecipient[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const line of raw.split(/[\n;]/).map((l) => l.trim()).filter(Boolean)) {
    let name = '';
    let email = '';

    const angle = line.match(/^(.*?)<([^>]+)>$/);
    if (angle) {
      name = angle[1].trim().replace(/^["']|["']$/g, '');
      email = angle[2].trim();
    } else if (line.includes(',')) {
      const parts = line.split(',').map((p) => p.trim());
      const emailPart = parts.find((p) => p.includes('@'));
      email = emailPart || '';
      name = parts.filter((p) => p !== emailPart).join(' ').trim();
    } else {
      email = line;
    }

    email = email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { invalid.push(line); continue; }
    if (seen.has(email)) continue;
    seen.add(email);

    if (!name) {
      // "kevin.johnson@school.org" → "Kevin Johnson" — better than a bare
      // handle in the greeting, and the host can still edit it after.
      name = email.split('@')[0].replace(/[._-]+/g, ' ')
        .split(' ').filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ');
    }
    valid.push({ name, email });
  }

  return { valid, invalid };
}

export default function InvitesPanel() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const { data: services = [] } = useServices();

  const [serviceId, setServiceId] = useState('');
  const [campaign, setCampaign] = useState('');
  const [subject, setSubject] = useState('');
  const [intro, setIntro] = useState('');
  const [recipientsRaw, setRecipientsRaw] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const parsed = useMemo(() => parseRecipients(recipientsRaw), [recipientsRaw]);
  const service = services.find((s) => s.id === serviceId);

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['booking-invites', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_booking_invites')
        .select('*, gw_services(name)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gleeworld.org';

  const sendInvites = useMutation({
    mutationFn: async () => {
      if (!serviceId) throw new Error('Pick which meeting type they are booking.');
      if (!parsed.valid.length) throw new Error('Add at least one valid email address.');
      if (windowStart && windowEnd && windowEnd < windowStart) {
        throw new Error('The end of the date range is before its start.');
      }

      // Create first, send second. If the send fails the links still exist and
      // can be resent from the list below — nobody has to retype the roster.
      const created: string[] = [];
      for (const r of parsed.valid) {
        const { data, error } = await supabase.rpc('create_booking_invite', {
          p_service_id: serviceId,
          p_invitee_name: r.name,
          p_invitee_email: r.email,
          p_campaign: campaign || null,
          p_message: intro || null,
          p_expires_in_days: 30,
          p_window_start: windowStart || null,
          p_window_end: windowEnd || null,
        });
        if (error) throw error;
        if (!(data as any)?.success) throw new Error((data as any)?.error || 'Could not create invite');
        created.push((data as any).invite_id);
      }

      const { data: sendResult, error: sendError } = await supabase.functions.invoke(
        'send-booking-invite',
        {
          body: {
            inviteIds: created,
            siteUrl,
            subject: subject || undefined,
            intro,
            senderName: profile?.full_name || 'GleeWorld',
            replyTo: profile?.email,
            senderId: user?.id,
          },
        },
      );
      if (sendError) throw sendError;
      return sendResult as { sent: number; failed: number };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['booking-invites', user?.id] });
      setRecipientsRaw('');
      setWindowStart('');
      setWindowEnd('');
      if (res?.failed) {
        toast.warning(`Sent ${res.sent}. ${res.failed} could not be delivered — see the list below.`);
      } else {
        toast.success(`Invitations sent to ${res?.sent ?? parsed.valid.length} ${res?.sent === 1 ? 'person' : 'people'}.`);
      }
    },
    onError: (e: any) => toast.error(e.message || 'Could not send invitations.'),
  });

  const resend = useMutation({
    mutationFn: async (inviteId: string) => {
      const { data, error } = await supabase.functions.invoke('send-booking-invite', {
        body: {
          inviteIds: [inviteId],
          siteUrl,
          senderName: profile?.full_name || 'GleeWorld',
          replyTo: profile?.email,
          senderId: user?.id,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-invites', user?.id] });
      toast.success('Reminder sent with current times.');
    },
    onError: (e: any) => toast.error(e.message || 'Could not resend.'),
  });

  const revoke = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('gw_booking_invites')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-invites', user?.id] });
      toast.success('Link deactivated.');
    },
  });

  const copyLink = async (token: string, id: string) => {
    await navigator.clipboard.writeText(`${siteUrl}/rsvp/${token}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const booked = invites.filter((i: any) => i.booked_at).length;
  const pending = invites.filter((i: any) => !i.booked_at && !i.revoked_at).length;

  return (
    <div className="space-y-4">
      {/* Compose */}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5 space-y-4">
          <div>
            <h2 className="font-semibold">Invite people to book</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Everyone gets their own link with your open times as tap-to-reserve
              buttons. No account needed on their end, and times disappear as they
              get claimed.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Meeting type</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger><SelectValue placeholder="Choose a service" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.duration_minutes} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Label (for your own tracking)</Label>
              <Input value={campaign} onChange={(e) => setCampaign(e.target.value)}
                     placeholder="Children Go Where I Send Thee" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Subject line</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)}
                   placeholder={service ? `Let's find a time — ${service.name}` : 'Let\'s find a time'} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Only offer times in this range (optional)</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <Input type="date" value={windowStart} onChange={(e) => setWindowStart(e.target.value)}
                     className="w-40" />
              <span className="text-sm text-muted-foreground">to</span>
              <Input type="date" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)}
                     className="w-40" />
              {(windowStart || windowEnd) && (
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs"
                        onClick={() => { setWindowStart(''); setWindowEnd(''); }}>
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to offer your next open times. Use a range for someone who
              asked for a particular month, or who is away until a certain date.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Your note</Label>
            <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={4}
                      placeholder={'Thank you so much for agreeing to talk with me about "Children Go Where I Send Thee." Grab whichever time works best and I\'ll send the Zoom link.'} />
            <p className="text-xs text-muted-foreground">
              Appears above the time buttons in the email and again on their booking page.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Who are you inviting?</Label>
            <Textarea
              value={recipientsRaw}
              onChange={(e) => setRecipientsRaw(e.target.value)}
              rows={5}
              className="font-mono text-xs"
              placeholder={'One per line:\nJane Smith <jsmith@district.k12.ga.us>\nrmartinez@school.org, Rosa Martinez\ndchen@academy.edu'}
            />
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {parsed.valid.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Users className="w-3 h-3" /> {parsed.valid.length} recipient{parsed.valid.length === 1 ? '' : 's'}
                </Badge>
              )}
              {parsed.invalid.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  {parsed.invalid.length} line{parsed.invalid.length === 1 ? '' : 's'} I couldn't read
                </Badge>
              )}
            </div>
            {parsed.invalid.length > 0 && (
              <p className="text-xs text-amber-700">
                Skipping: {parsed.invalid.slice(0, 3).join(', ')}
                {parsed.invalid.length > 3 ? '…' : ''}
              </p>
            )}
          </div>

          {service && !service.is_active && (
            <p className="text-xs text-amber-700">
              This service is switched off, so its times won't show. Turn it on under Services first.
            </p>
          )}

          <Button
            onClick={() => sendInvites.mutate()}
            disabled={sendInvites.isPending || !parsed.valid.length || !serviceId}
            className="w-full sm:w-auto"
          >
            {sendInvites.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
              : <><Send className="w-4 h-4 mr-2" /> Send {parsed.valid.length || ''} invitation{parsed.valid.length === 1 ? '' : 's'}</>}
          </Button>
        </CardContent>
      </Card>

      {/* Sent list */}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Invitations</h2>
            <div className="flex gap-2 text-xs">
              <Badge variant="secondary" className="gap-1">
                <CalendarCheck className="w-3 h-3" /> {booked} booked
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Mail className="w-3 h-3" /> {pending} waiting
              </Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
          ) : invites.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No invitations yet.
            </p>
          ) : (
            <div className="divide-y">
              {invites.map((inv: any) => {
                const state = inv.booked_at ? 'booked'
                  : inv.revoked_at ? 'revoked'
                  : new Date(inv.expires_at) < new Date() ? 'expired'
                  : 'waiting';
                return (
                  <div key={inv.id} className="py-3 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{inv.invitee_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{inv.invitee_email}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge
                          variant={state === 'booked' ? 'default' : state === 'waiting' ? 'outline' : 'secondary'}
                          className="text-[10px]"
                        >
                          {state === 'booked' ? 'Booked' : state === 'waiting' ? 'Waiting' : state === 'expired' ? 'Expired' : 'Revoked'}
                        </Badge>
                        {inv.campaign && (
                          <span className="text-[11px] text-muted-foreground">{inv.campaign}</span>
                        )}
                        {(inv.window_start || inv.window_end) && (
                          <span className="text-[11px] text-muted-foreground">
                            {inv.window_start ? format(parseISO(inv.window_start), 'MMM d') : 'now'}
                            {' – '}
                            {inv.window_end ? format(parseISO(inv.window_end), 'MMM d') : 'open'}
                          </span>
                        )}
                        {inv.last_sent_at && (
                          <span className="text-[11px] text-muted-foreground">
                            sent {format(parseISO(inv.last_sent_at), 'MMM d')}
                            {inv.send_count > 1 ? ` ·  ${inv.send_count}×` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-8 px-2"
                              onClick={() => copyLink(inv.token, inv.id)} title="Copy link">
                        {copiedId === inv.id
                          ? <Check className="w-3.5 h-3.5 text-emerald-600" />
                          : <LinkIcon className="w-3.5 h-3.5" />}
                      </Button>
                      {state === 'waiting' && (
                        <>
                          <Button size="sm" variant="ghost" className="h-8 px-2"
                                  disabled={resend.isPending}
                                  onClick={() => resend.mutate(inv.id)} title="Resend with current times">
                            <RotateCw className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive"
                                  onClick={() => revoke.mutate(inv.id)} title="Deactivate link">
                            <Ban className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
