// Student booking surface — Calendly-style flow.
// 1) pick a service (card grid) → 2) pick a date → 3) pick a time
// 4) confirm details → book. On book, push to the student's Google
// calendar (best-effort) if they've connected one.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  Clock, MapPin, CalendarDays, Check, Loader2, ChevronLeft, Link as LinkIcon,
  CheckCircle2, AlertCircle,
} from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useServices, type Service } from '@/hooks/useServices';
import { useAvailableTimeSlots } from '@/hooks/useAppointments';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SOFT_CARD = 'border-0 rounded-2xl';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function StudentBooking() {
  const { data: services = [], isLoading } = useServices();
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  if (isLoading) {
    return <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>;
  }

  if (!services.length) {
    return (
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Your instructor hasn't published any bookable services yet. Check back soon.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!selectedService ? (
        <ServicePicker services={services} onPick={setSelectedService} />
      ) : (
        <BookFlow service={selectedService} onBack={() => setSelectedService(null)} />
      )}
      <GoogleConnectionRow />
    </div>
  );
}

// ── Google connection row (optional convenience) ──────────────────────────

function GoogleConnectionRow() {
  const { user } = useAuth();
  const { data: conn } = useQuery({
    queryKey: ['google-connection', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_google_connections')
        .select('google_email')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
  });

  const connect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-oauth-start', {
        body: { redirect_to: window.location.href },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message || 'Failed to start Google sign-in.');
    }
  };

  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-4 flex items-center gap-3 flex-wrap">
        <div className={cn(
          'w-9 h-9 rounded-xl inline-flex items-center justify-center',
          conn ? 'bg-emerald-50 text-emerald-600' : 'bg-muted text-muted-foreground',
        )}>
          {conn ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">
            {conn ? 'Bookings will sync to your Google Calendar' : 'Connect Google to get bookings on your calendar'}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {conn
              ? <>Synced to <span className="font-medium text-foreground">{conn.google_email}</span>.</>
              : 'Optional — you can still book without connecting.'}
          </div>
        </div>
        {!conn && (
          <Button size="sm" variant="outline" onClick={connect}>
            <LinkIcon className="w-4 h-4 mr-1.5" />Connect
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Service picker ────────────────────────────────────────────────────────

function ServicePicker({ services, onPick }: { services: Service[]; onPick: (s: Service) => void }) {
  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-5 space-y-3">
        <h2 className="font-semibold">Available services</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => onPick(s)}
              className="text-left border rounded-xl p-4 hover:border-primary hover:bg-primary/5 transition"
            >
              <div className="text-sm font-semibold">{s.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration_minutes} min</span>
                <span>•</span>
                <span>{s.price_display || 'Free'}</span>
                {s.location && <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location}</span>
                </>}
              </div>
              {s.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{s.description}</p>}
              {s.requires_approval && (
                <Badge variant="outline" className="text-xs h-4 mt-2">Requires approval</Badge>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Booking flow ──────────────────────────────────────────────────────────

function BookFlow({ service, onBack }: { service: Service; onBack: () => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: timeSlots, isLoading: slotsLoading } = useAvailableTimeSlots(
    service.id,
    selectedDateStr,
    service.duration_minutes,
  );

  async function book() {
    if (!selectedDateStr || !selectedTime || !topic.trim() || !phone.trim()) {
      toast.error('Fill out every field before booking.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('book_appointment', {
        p_service_id: service.id,
        p_appointment_date: selectedDateStr,
        p_start_time: selectedTime,
        p_customer_name: profile?.full_name || user?.email || 'Student',
        p_customer_email: user?.email || '',
        p_customer_phone: phone,
        p_attendee_count: 1,
        p_special_requests: `Topic: ${topic}${notes ? `\n\nNotes: ${notes}` : ''}`,
      });
      if (error) throw error;
      const result = data as { success: boolean; message?: string; appointment_id?: string; error?: string };
      if (!result.success) {
        toast.error(result.error || 'Booking failed.');
      } else {
        toast.success(result.message || 'Booked!');
        // Best-effort push to Google for both student and instructor sides.
        try { await supabase.functions.invoke('google-push-appointment', { body: { appointment_id: result.appointment_id, op: 'create' } }); }
        catch { /* non-blocking */ }
        // Best-effort SMS to both sides.
        try { await supabase.functions.invoke('appointment-sms-notify', { body: { appointment_id: result.appointment_id, event: 'created' } }); }
        catch { /* non-blocking */ }
        // Reset and go back to the service list so they can book another if needed.
        setSelectedDate(undefined); setSelectedDateStr(''); setSelectedTime('');
        setTopic(''); setNotes(''); setPhone('');
        onBack();
      }
    } catch (e: any) {
      toast.error(e?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5">
          <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to services
          </button>
          <div className="mt-2">
            <div className="text-base font-bold">{service.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{service.duration_minutes} min</span>
              <span>•</span>
              <span>{service.price_display || 'Free'}</span>
              {service.location && <>
                <span>•</span>
                <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{service.location}</span>
              </>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5 space-y-4">
          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pick a date</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-72 justify-start gap-2 h-11">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Choose a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0 w-auto">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (!d) return;
                    setSelectedDate(d);
                    setSelectedDateStr(format(d, 'yyyy-MM-dd'));
                    setSelectedTime('');
                    setDatePickerOpen(false);
                  }}
                  disabled={(d) => isPast(d) && format(d, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Times */}
          {selectedDateStr && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available times</Label>
              {slotsLoading ? (
                <div className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin inline-block text-muted-foreground" /></div>
              ) : !timeSlots || timeSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Nothing free for this service on{' '}
                  {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'that day'}. Try another date.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {timeSlots.map((slot: any) => {
                    const time = slot.start_time || slot;
                    const active = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          'rounded-lg px-3 py-2.5 text-sm font-semibold transition border',
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border bg-card hover:bg-muted/40',
                        )}
                      >
                        {format(parseISO(`2000-01-01T${time.slice(0, 5)}:00`), 'h:mm a')}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Details */}
          {selectedTime && (
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t">
              <div className="space-y-1.5">
                <Label htmlFor="topic" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  What's it about? <span className="text-rose-600">*</span>
                </Label>
                <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)}
                       placeholder="Audition prep, Theory III question…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Phone (for reminders) <span className="text-rose-600">*</span>
                </Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                       placeholder="(404) 555-0123" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Anything else? (optional)
                </Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
                          placeholder="Pieces, prep, materials to bring…" rows={3} />
              </div>
            </div>
          )}

          {/* Confirm */}
          <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              {selectedDate && selectedTime ? (
                <>
                  <span className="font-semibold text-foreground">{service.name}</span>{' • '}
                  {format(selectedDate, 'EEE MMM d')}{' '}at{' '}
                  {format(parseISO(`2000-01-01T${selectedTime.slice(0, 5)}:00`), 'h:mm a')}
                </>
              ) : (
                <>Pick a date and time to continue.</>
              )}
            </div>
            <Button
              onClick={book}
              disabled={submitting || !selectedTime || !topic.trim() || !phone.trim()}
              className="h-10 px-5 font-semibold"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Book it
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
