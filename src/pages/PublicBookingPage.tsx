// Public booking page — the actual fix for the login wall. Every tenant's
// appointment-booking public-site block links here (see
// src/components/public-site/blocks/appointment-booking.tsx). No session is
// required: service selection and slot loading both work against the anon
// client (gw_services has an "Anyone can view active services" policy;
// get_available_time_slots is anon-granted by the public-intake migration),
// and the booking write itself goes through submitPublicIntake, which talks
// to the public-intake edge function rather than the authenticated
// book_appointment RPC path StudentBooking.tsx uses.
//
// Flow: pick a service → pick a date/time → fill in contact + account
// details → submit. The account is a side effect of booking, not a
// separate step — see BookingAccountForm's explainer copy.

import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { CalendarClock, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useServices } from '@/hooks/useServices';
import { submitPublicIntake, type PublicIntakeResult } from '@/lib/publicIntakeClient';
import { BookingServicePicker } from '@/components/publicBooking/BookingServicePicker';
import { BookingSlotPicker } from '@/components/publicBooking/BookingSlotPicker';
import {
  BookingAccountForm,
  isBookingAccountComplete,
  type BookingAccount,
} from '@/components/publicBooking/BookingAccountForm';

const EMPTY_ACCOUNT: BookingAccount = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

type Step = 'service' | 'slot' | 'details' | 'success';

// tsconfig.json here has strictNullChecks: false, under which plain
// `if (result.ok) { ...; return; }` narrowing on a discriminated union does
// NOT carry through to the rest of the function (verified against this
// repo's actual tsconfig — TS silently keeps the widened union type and
// typecheck:guard fails on `.message` / `.reason`). A user-defined type
// predicate narrows correctly even under that config, so use one instead of
// relying on `.ok` narrowing directly.
function isIntakeSuccess(
  r: PublicIntakeResult,
): r is Extract<PublicIntakeResult, { ok: true }> {
  return r.ok === true;
}

const SITE_ACCENT = 'var(--site-accent, hsl(var(--primary)))';

// submitPublicIntake never throws and has no built-in timeout — if the
// fetch itself hangs (dead connection, etc.) the promise just never
// resolves. Without this, a stuck request would leave the submit button
// disabled forever with no way out. The timeout re-enables the form; the
// real request keeps running in the background and, if it lands, still
// updates the UI via applyResult (guarded by requestIdRef so a later retry
// can't be clobbered by a stale response).
const SUBMIT_TIMEOUT_MS = 20000;

export default function PublicBookingPage() {
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('service');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [account, setAccount] = useState<BookingAccount>(EMPTY_ACCOUNT);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<'created' | 'existing'>('created');
  const requestIdRef = useRef(0);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  function goToSlotStep(id: string) {
    setServiceId(id);
    setDate('');
    setSlot('');
    setSubmitError(null);
    setStep('slot');
  }

  function applyResult(result: PublicIntakeResult) {
    if (isIntakeSuccess(result)) {
      setSubmitError(null);
      // Runtime response isn't shape-validated on the way in — treat
      // anything other than the literal 'existing' as the "created" case
      // rather than rendering an undefined status.
      setAccountStatus(result.accountStatus === 'existing' ? 'existing' : 'created');
      setStep('success');
      return;
    }
    const message = typeof result.message === 'string' && result.message.trim()
      ? result.message
      : 'Something went wrong on our end. Please try again.';
    setSubmitError(message);
    if (result.reason === 'unavailable') {
      // The slot was taken between load and submit. Send the visitor back
      // to slot selection and force a fresh fetch — the old list is known
      // stale at this point.
      setSlot('');
      setStep('slot');
      queryClient.invalidateQueries({ queryKey: ['time-slots', serviceId, date] });
    }
  }

  async function handleSubmit() {
    if (!serviceId || !date || !slot || submitting) return;
    if (!isBookingAccountComplete(account)) return;

    const myRequestId = ++requestIdRef.current;
    setSubmitting(true);
    setSubmitError(null);

    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      if (requestIdRef.current === myRequestId) {
        setSubmitting(false);
        setSubmitError(
          "This is taking longer than expected. If the first attempt goes through you'll " +
          'still get a confirmation email — otherwise, feel free to try again.',
        );
      }
    }, SUBMIT_TIMEOUT_MS);

    const result = await submitPublicIntake({
      kind: 'appointment',
      account: {
        email: account.email,
        password: account.password,
        firstName: account.firstName,
        lastName: account.lastName,
        phone: account.phone,
      },
      payload: {
        serviceId,
        appointmentDate: date,
        startTime: slot,
        notes: notes.trim() || null,
      },
    });

    window.clearTimeout(timeoutId);
    // A newer submission superseded this one after the timeout already
    // reset the form — don't let a late response overwrite it.
    if (requestIdRef.current !== myRequestId) return;
    if (!timedOut) setSubmitting(false);

    applyResult(result);
  }

  return (
    <UniversalLayout>
      <div className="max-w-3xl mx-auto w-full px-4 py-10 space-y-6">
        <div className="text-center space-y-2">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full mx-auto"
            style={{
              background: `color-mix(in oklab, ${SITE_ACCENT} 12%, transparent)`,
              color: SITE_ACCENT,
            }}
          >
            <CalendarClock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Book an appointment</h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Pick a service and a time that works. Booking takes about a minute.
          </p>
        </div>

        {step === 'service' && (
          <Card className="border-0 rounded-2xl shadow-sm">
            <CardContent className="p-5 space-y-3">
              {servicesLoading ? (
                <div className="py-10 text-center">
                  <Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" />
                </div>
              ) : (
                <BookingServicePicker services={services} selectedId={serviceId} onSelect={goToSlotStep} />
              )}
            </CardContent>
          </Card>
        )}

        {step === 'slot' && selectedService && (
          <Card className="border-0 rounded-2xl shadow-sm">
            <CardContent className="p-5 space-y-4">
              <button
                type="button"
                onClick={() => { setSubmitError(null); setStep('service'); }}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Back to services
              </button>
              <div>
                <div className="text-base font-bold text-foreground">{selectedService.name}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedService.duration_minutes} min • {selectedService.price_display || 'Free'}
                </div>
              </div>

              {submitError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {submitError}
                </p>
              )}

              <BookingSlotPicker
                serviceId={selectedService.id}
                date={date}
                onDateChange={setDate}
                selectedSlot={slot}
                onSelect={setSlot}
              />

              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  disabled={!date || !slot}
                  onClick={() => { setSubmitError(null); setStep('details'); }}
                  className="h-10 px-5 font-semibold"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'details' && selectedService && (
          <Card className="border-0 rounded-2xl shadow-sm">
            <CardContent className="p-5 space-y-5">
              <button
                type="button"
                onClick={() => { setSubmitError(null); setStep('slot'); }}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Back to times
              </button>

              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
                <span className="font-semibold">{selectedService.name}</span>
                {date && <> • {format(parseISO(date), 'EEE, MMM d')}</>}
                {slot && <> at {format(parseISO(`2000-01-01T${slot.slice(0, 5)}:00`), 'h:mm a')}</>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="booking-notes" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Anything we should know? (optional)
                </Label>
                <Textarea
                  id="booking-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What you'd like to work on, materials to bring…"
                  rows={3}
                  disabled={submitting}
                />
              </div>

              <BookingAccountForm value={account} onChange={setAccount} disabled={submitting} />

              {submitError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {submitError}
                </p>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !isBookingAccountComplete(account)}
                  className="h-10 px-5 font-semibold"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {submitting ? 'Booking…' : 'Confirm booking'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card className="border-0 rounded-2xl shadow-sm">
            <CardContent className="p-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
              <h2 className="text-xl font-bold text-foreground">You're booked!</h2>
              {accountStatus === 'existing' ? (
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Your appointment is confirmed. We found an existing account for that email
                  address — <Link to="/auth" className="underline font-medium text-foreground">sign in</Link>{' '}
                  to see or reschedule it.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Your appointment is confirmed and your account is ready. A confirmation email
                  is on its way.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </UniversalLayout>
  );
}
