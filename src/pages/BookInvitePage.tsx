// Public, token-gated booking page — /rsvp/:token
//
// This is the surface an invited teacher lands on from their email. No account,
// no login: the token in the URL is the credential. Availability is polled live
// (and on window focus) so a grid left open in a tab does not go stale while
// other invitees are picking times.
//
// The email's per-slot buttons deep-link here with ?d=YYYY-MM-DD&t=HH:MM, which
// preselects that slot and drops the invitee straight onto the confirm step.
// They still press Confirm — a link that booked on GET would fire every time a
// mail scanner prefetched it, and half the invitees would arrive to find
// themselves already booked into a slot nobody chose.

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, CalendarDays, Clock, MapPin, CheckCircle2, AlertCircle,
  RefreshCw, ArrowLeft, CalendarPlus,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const POLL_MS = 20000;

type InviteStatus = 'open' | 'booked' | 'expired' | 'revoked' | 'not_found';

interface InviteContext {
  status: InviteStatus;
  invitee_name?: string;
  invitee_email?: string;
  message?: string;
  expires_at?: string;
  service?: {
    id: string;
    name: string;
    description?: string;
    duration_minutes: number;
    location?: string;
    instructor?: string;
  };
  appointment?: {
    appointment_date: string;
    duration_minutes: number;
    status: string;
  };
}

interface Slot {
  slot_date: string;
  start_time: string;
  end_time: string;
  available: boolean;
}

const prettyTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
};

const prettyDay = (d: string) => {
  const date = parseISO(d);
  if (isToday(date)) return `Today · ${format(date, 'EEE, MMM d')}`;
  if (isTomorrow(date)) return `Tomorrow · ${format(date, 'EEE, MMM d')}`;
  return format(date, 'EEEE, MMMM d');
};

export default function BookInvitePage() {
  const { token = '' } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<{ date: string; time: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmation, setConfirmation] = useState<any>(null);

  const { data: context, isLoading: contextLoading } = useQuery<InviteContext>({
    queryKey: ['invite-context', token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_invite_booking_context', { p_token: token });
      if (error) throw error;
      return data as unknown as InviteContext;
    },
  });

  const isOpen = context?.status === 'open';

  const {
    data: slots = [],
    isFetching: slotsFetching,
    dataUpdatedAt,
    refetch: refetchSlots,
  } = useQuery<Slot[]>({
    queryKey: ['invite-slots', token],
    enabled: !!token && isOpen && !confirmation,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_invite_available_slots', {
        p_token: token,
        p_days: 21,
      });
      if (error) throw error;
      return (data || []) as Slot[];
    },
  });

  // Honor the ?d= / ?t= deep link from the email once slots are known, and only
  // if that slot is genuinely still open.
  useEffect(() => {
    if (selected || !slots.length) return;
    const d = searchParams.get('d');
    const t = searchParams.get('t');
    if (!d || !t) return;
    const match = slots.find((s) => s.slot_date === d && s.start_time.slice(0, 5) === t.slice(0, 5));
    if (match) {
      setSelected({ date: match.slot_date, time: match.start_time });
    } else {
      toast.info('That time was just taken — here are the times still open.');
    }
  }, [slots, searchParams, selected]);

  // If the slot someone is staring at gets claimed mid-decision, clear it
  // rather than letting them press Confirm into a guaranteed failure.
  useEffect(() => {
    if (!selected || !slots.length) return;
    const stillOpen = slots.some(
      (s) => s.slot_date === selected.date && s.start_time === selected.time,
    );
    if (!stillOpen) {
      setSelected(null);
      toast.warning('That time was just booked by someone else. Please pick another.');
    }
  }, [slots, selected]);

  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      if (!map.has(s.slot_date)) map.set(s.slot_date, []);
      map.get(s.slot_date)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  const book = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('No time selected');
      const { data, error } = await supabase.rpc('book_appointment_with_invite', {
        p_token: token,
        p_appointment_date: selected.date,
        p_start_time: selected.time,
        p_notes: notes || null,
        p_phone: phone || null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (result) => {
      if (result?.success) {
        setConfirmation(result);
        queryClient.invalidateQueries({ queryKey: ['invite-context', token] });
        // Confirmations (email to them, SMS to both sides) are fire-and-forget.
        // The booking is already committed in the database, so a mail or Twilio
        // hiccup must not make the guest think their slot didn't take.
        supabase.functions
          .invoke('booking-invite-confirm', {
            body: { token, siteUrl: window.location.origin },
          })
          .catch((e) => console.error('confirmation dispatch failed', e));
        return;
      }
      // The losing side of a race lands here: refresh the grid so the next
      // pick is against current truth.
      if (result?.error_code === 'slot_taken') {
        setSelected(null);
        refetchSlots();
      }
      toast.error(result?.error || 'Could not book that time.');
    },
    onError: (e: any) => toast.error(e.message || 'Could not book that time.'),
  });

  if (contextLoading) {
    return (
      <Shell>
        <div className="py-20 text-center">
          <Loader2 className="w-6 h-6 animate-spin inline text-muted-foreground" />
        </div>
      </Shell>
    );
  }

  if (!context || context.status === 'not_found') {
    return <Notice icon="error" title="We couldn't find that invitation"
      body="The link may have been mistyped or truncated by an email client. Try copying the full link from your email, or reply to the message and we'll send a fresh one." />;
  }

  if (context.status === 'revoked') {
    return <Notice icon="error" title="This invitation was withdrawn"
      body="Reply to the original email and we'll get you a new link." />;
  }

  if (context.status === 'expired') {
    return <Notice icon="error" title="This invitation has expired"
      body="Reply to the original email and we'll send you a new link with current times." />;
  }

  // Either just booked in this session, or revisited after booking earlier.
  if (confirmation || context.status === 'booked') {
    return (
      <Confirmed
        context={context}
        result={confirmation}
      />
    );
  }

  const service = context.service;
  const selectedSlot = selected
    ? slots.find((s) => s.slot_date === selected.date && s.start_time === selected.time)
    : null;

  return (
    <Shell>
      <div className="space-y-5">
        <header className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Hi {context.invitee_name?.split(' ')[0] || 'there'} —
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {service?.name || 'Schedule a time'}
          </h1>
          {context.message && (
            <p className="text-[15px] leading-relaxed text-muted-foreground whitespace-pre-line">
              {context.message}
            </p>
          )}
          <div className="flex flex-wrap gap-3 pt-1 text-sm text-muted-foreground">
            {service?.duration_minutes ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {service.duration_minutes} minutes
              </span>
            ) : null}
            {service?.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> {service.location}
              </span>
            ) : null}
          </div>
        </header>

        {selectedSlot ? (
          <Card className="border-0 rounded-2xl" style={SOFT}>
            <CardContent className="p-5 space-y-4">
              <button
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" /> Pick a different time
              </button>

              <div className="rounded-xl bg-muted/50 p-4">
                <p className="font-medium">{prettyDay(selectedSlot.slot_date)}</p>
                <p className="text-2xl font-semibold tracking-tight mt-0.5">
                  {prettyTime(selectedSlot.start_time)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Eastern Time · {service?.duration_minutes} minutes
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Anything you'd like to cover? (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Questions about the piece, your ensemble size, voicing concerns…"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Mobile number (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(404) 555-0123"
                />
                <p className="text-xs text-muted-foreground">
                  We'll text you a confirmation. Leave it blank and we'll email only.
                </p>
              </div>

              <Button
                className="w-full h-11 text-base"
                onClick={() => book.mutate()}
                disabled={book.isPending}
              >
                {book.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reserving…</>
                  : <>Confirm {prettyTime(selectedSlot.start_time)}</>}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                We'll send your confirmation to {context.invitee_email}
                {phone.trim() ? ' and by text' : ''}, with the meeting link to follow.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Choose a time that works for you</p>
              <button
                onClick={() => refetchSlots()}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', slotsFetching && 'animate-spin')} />
                {slotsFetching ? 'Updating…' : 'Live availability'}
              </button>
            </div>

            {!grouped.length ? (
              <Card className="border-0 rounded-2xl" style={SOFT}>
                <CardContent className="p-8 text-center space-y-2">
                  <CalendarDays className="w-6 h-6 mx-auto text-muted-foreground" />
                  <p className="font-medium">No open times right now</p>
                  <p className="text-sm text-muted-foreground">
                    The remaining slots were just taken. Reply to the email and we'll open more.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {grouped.map(([day, daySlots]) => (
                  <Card key={day} className="border-0 rounded-2xl" style={SOFT}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <p className="font-medium">{prettyDay(day)}</p>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {daySlots.length} open
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {daySlots.map((s) => (
                          <Button
                            key={`${day}-${s.start_time}`}
                            variant="outline"
                            className="h-11 rounded-xl"
                            onClick={() => setSelected({ date: s.slot_date, time: s.start_time })}
                          >
                            {prettyTime(s.start_time)}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {dataUpdatedAt ? (
              <p className="text-xs text-center text-muted-foreground">
                Times shown in Eastern Time · updated {format(new Date(dataUpdatedAt), 'h:mm:ss a')}
              </p>
            ) : null}
          </>
        )}
      </div>
    </Shell>
  );
}

const SOFT: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">{children}</div>
    </div>
  );
}

function Notice({ icon, title, body }: { icon: 'error' | 'ok'; title: string; body: string }) {
  const Icon = icon === 'ok' ? CheckCircle2 : AlertCircle;
  return (
    <Shell>
      <Card className="border-0 rounded-2xl" style={SOFT}>
        <CardContent className="p-8 text-center space-y-3">
          <Icon className={cn('w-8 h-8 mx-auto', icon === 'ok' ? 'text-emerald-600' : 'text-amber-600')} />
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
        </CardContent>
      </Card>
    </Shell>
  );
}

// Builds a downloadable .ics so the invitee gets it on their own calendar
// without needing a Google account or an app install.
function icsHref(opts: { title: string; startISO: string; minutes: number; location?: string }) {
  const start = new Date(opts.startISO);
  const end = new Date(start.getTime() + opts.minutes * 60000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GleeWorld//Studio Hours//EN',
    'BEGIN:VEVENT',
    `DTSTAMP:${stamp(new Date(start))}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${opts.title}`,
    opts.location ? `LOCATION:${opts.location}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
}

function Confirmed({ context, result }: { context: InviteContext; result: any }) {
  const service = context.service;
  const startISO = result
    ? new Date(`${result.appointment_date}T${result.start_time}`).toISOString()
    : context.appointment?.appointment_date;
  const when = startISO ? new Date(startISO) : null;
  const minutes = result?.duration_minutes || service?.duration_minutes || 30;
  const pending = (result?.status || context.appointment?.status) === 'pending';

  return (
    <Shell>
      <Card className="border-0 rounded-2xl" style={SOFT}>
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="w-9 h-9 mx-auto text-emerald-600" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">
              {pending ? "You're on the list" : "You're all set"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {pending
                ? 'We\'ll confirm this time by email shortly.'
                : `A confirmation is on its way to ${context.invitee_email}.`}
            </p>
          </div>

          {when && (
            <div className="rounded-xl bg-muted/50 p-4 text-left">
              <p className="text-sm text-muted-foreground">{service?.name}</p>
              <p className="font-medium mt-0.5">{format(when, 'EEEE, MMMM d, yyyy')}</p>
              <p className="text-2xl font-semibold tracking-tight">
                {format(when, 'h:mm a')} <span className="text-sm font-normal text-muted-foreground">ET</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">{minutes} minutes</p>
            </div>
          )}

          {when && (
            <Button asChild variant="outline" className="rounded-xl">
              <a
                href={icsHref({
                  title: service?.name || 'Meeting',
                  startISO: when.toISOString(),
                  minutes,
                  location: service?.location || result?.location,
                })}
                download="meeting.ics"
              >
                <CalendarPlus className="w-4 h-4 mr-2" /> Add to my calendar
              </a>
            </Button>
          )}

          <p className="text-xs text-muted-foreground pt-2">
            Need to change it? Just reply to the email that brought you here.
          </p>
        </CardContent>
      </Card>
    </Shell>
  );
}
