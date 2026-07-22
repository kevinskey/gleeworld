// Box Office — Phase A landing page.
//
// At this stage all we render is the entitlement + Stripe Connect status.
// The "Sell tickets" experience (events, tiers, public buy, check-in)
// lights up in later phases. Showing the gate clearly now gives tenants
// a place to start their Stripe onboarding the moment the add-on is
// purchased, instead of dropping them into an empty UI.

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Ticket, CreditCard, CheckCircle2, AlertTriangle, ExternalLink, Loader2, Plus, Calendar, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useUserRole } from '@/hooks/useUserRole';
import { useTenantStripeStatus } from '@/hooks/useTenantStripeStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { listBoxOfficeEvents, createBoxOfficeEvent, slugify, type BoxOfficeEvent } from '@/lib/boxOffice/api';
import { PageTitle } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

export default function BoxOfficePage() {
  const { hasAccess, isLoading: moduleLoading } = useModuleAccess('box_office');
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { data: stripe, isLoading: stripeLoading } = useTenantStripeStatus();
  const [connecting, setConnecting] = useState(false);
  // Once Stripe is fully set up the Payments card is just a status pill —
  // collapse it by default so the page leads with Events. Declared up
  // here with the other hooks because the early-return branches below
  // would otherwise change hook count across renders (React #310).
  const [paymentsExpanded, setPaymentsExpanded] = useState(false);
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // On Stripe's return from OAuth (?stripe=connected), poll the status
  // query — the callback edge fn has already persisted the account id and
  // an initial snapshot of charges_enabled, but the account.updated webhook
  // may still be catching up if Stripe re-verifies right after linking.
  const stripeParam = searchParams.get('stripe');
  if (stripeParam === 'connected' || stripeParam === 'return') {
    queryClient.invalidateQueries({ queryKey: ['tenant_stripe_status'] });
  }

  const startConnect = async () => {
    try {
      setConnecting(true);
      const { data, error } = await supabase.functions.invoke('stripe-oauth-start', {
        body: { return_path: '/dashboard/box-office' },
      });
      if (error) throw new Error(error.message || 'failed');
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error('No onboarding URL returned');
      // Full-page redirect — Stripe takes over for the rest of the flow.
      window.location.href = data.url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not start Stripe onboarding.';
      toast.error(msg);
      setConnecting(false);
    }
  };

  if (moduleLoading || roleLoading) {
    return (
      <UniversalLayout>
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </UniversalLayout>
    );
  }

  // Box Office admin surface is admin-only. Non-admins land here via a stale
  // URL or shared link — point them at the public buy page instead so the
  // organization's tickets are still one click away.
  if (!isAdmin()) {
    return (
      <UniversalLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <Card>
            <CardHeader>
              <CardTitle>Box Office</CardTitle>
              <CardDescription>
                The Box Office admin is for tenant administrators. To browse tickets, head
                to the public Box Office.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild><Link to="/box-office">Open Box Office</Link></Button>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  if (!hasAccess) {
    return (
      <UniversalLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <Card>
            <CardHeader>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-50 text-rose-700 mb-2">
                <Ticket className="w-6 h-6" />
              </div>
              <CardTitle>Box Office</CardTitle>
              <CardDescription>
                Sell tickets to your concerts with QR check-in at the door. Ticket revenue
                lands in your own Stripe account — GleeWorld takes 0%.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This add-on isn't enabled for your tenant yet. Activate it from the Modules page.
              </p>
              <Button asChild>
                <Link to="/settings/modules">Open Modules</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  const connected = !!stripe?.stripe_account_id;
  const ready = connected && stripe?.stripe_charges_enabled;

  return (
    <UniversalLayout>
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-5 h-5 text-rose-700" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Add-on
            </span>
          </div>
          <PageTitle>Box Office</PageTitle>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Sell general-admission tickets to your concerts. Buyers pay through your own
            Stripe account. We never custody the funds and take no cut of ticket revenue.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link to="/box-office">
            View public page <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </Button>
      </header>

      {ready && !paymentsExpanded ? (
        <Card>
          <button
            type="button"
            onClick={() => setPaymentsExpanded(true)}
            className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-muted/40 rounded-lg transition-colors"
            aria-expanded={false}
            aria-label="Expand payments status"
          >
            <span className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-foreground">Payments</span>
              <span className="text-muted-foreground">— Ready to sell tickets</span>
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </Card>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-3xl sm:text-4xl">
            <CreditCard className="w-7 h-7 text-muted-foreground" />
            Payments
          </CardTitle>
          <CardDescription>
            Box Office runs on Stripe Connect. Finish onboarding to start selling.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {stripeLoading ? (
            <p className="text-sm text-muted-foreground">Loading status…</p>
          ) : ready ? (
            <div className="flex items-start gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">Ready to sell tickets</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setPaymentsExpanded(false)}
                  >
                    Hide
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Account: <code className="text-xs">{stripe?.stripe_account_id}</code>
                  {!stripe?.stripe_payouts_enabled && (
                    <span className="ml-2 text-amber-700">
                      Payouts not yet enabled — Stripe may still be verifying your account.
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : connected ? (
            <div className="flex items-start gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5 mt-0.5" />
              <div>
                <div className="font-semibold">Stripe onboarding incomplete</div>
                <div className="text-sm text-muted-foreground">
                  You started Connect setup but Stripe hasn't enabled charges yet.
                  Finish the remaining steps to start selling.
                </div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={startConnect} disabled={connecting}>
                    {connecting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                    Finish onboarding
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
                      Stripe Dashboard <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-muted-foreground">
              <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600" />
              <div>
                <div className="font-semibold text-foreground">Connect with Stripe</div>
                <div className="text-sm">
                  You'll be sent to Stripe to create a new Stripe account or sign
                  in to yours. Ticket revenue goes directly to your Stripe —
                  GleeWorld never holds the funds.
                </div>
                <Button size="sm" className="mt-2" onClick={startConnect} disabled={connecting}>
                  {connecting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                  Connect with Stripe
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      <EventsSection />
    </div>
    </UniversalLayout>
  );
}

function EventsSection() {
  const queryClient = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['box_office_events'],
    queryFn: listBoxOfficeEvents,
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-3xl sm:text-4xl">Events & ticket tiers</CardTitle>
            <CardDescription>
              Create general-admission events. Each event can have one or more price tiers
              (e.g. Student $5, General $15, Patron $50). Ticketed events also land on
              your tenant calendar.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New event
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No ticketed events yet. Create one to start building tiers.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((e) => <EventRow key={e.id} event={e} />)}
          </ul>
        )}
      </CardContent>
      <NewEventDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['box_office_events'] });
          setNewOpen(false);
        }}
      />
    </Card>
  );
}

function EventRow({ event }: { event: BoxOfficeEvent }) {
  const date = new Date(event.start_date);
  const dateLabel = date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const statusTone =
    event.box_office_status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    event.box_office_status === 'closed'    ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                              'bg-amber-50 text-amber-700 border-amber-200';
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <Link to={`/dashboard/box-office/event/${event.id}`} className="flex items-center justify-between gap-3 hover:bg-muted/40 -mx-2 px-2 py-1.5 rounded transition-colors">
        <div className="min-w-0">
          <div className="font-semibold truncate">{event.title}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
            <Calendar className="w-3.5 h-3.5" /> {dateLabel}
            {event.venue_name && <>· {event.venue_name}</>}
          </div>
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${statusTone}`}>
          {event.box_office_status}
        </span>
      </Link>
    </li>
  );
}

function NewEventDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(''); setVenue(''); setDescription(''); setStartDate(''); setCapacity(''); setSaving(false);
  };

  const submit = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!startDate) { toast.error('Start date/time is required'); return; }
    const cap = parseInt(capacity, 10);
    if (!Number.isFinite(cap) || cap < 1) { toast.error('Capacity must be a positive number'); return; }
    setSaving(true);
    try {
      await createBoxOfficeEvent({
        title: title.trim(),
        venue_name: venue.trim() || undefined,
        description: description.trim() || undefined,
        start_date: new Date(startDate).toISOString(),
        capacity: cap,
      });
      toast.success('Event created');
      reset();
      onCreated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not create event.';
      toast.error(msg);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New ticketed event</DialogTitle>
          <DialogDescription>
            Starts as a draft. You can add ticket tiers and publish from the event page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bo-title">Title</Label>
            <Input id="bo-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spring Concert 2026" autoFocus />
            {title && (
              <p className="text-[11px] text-muted-foreground">
                Public URL: <code>/concert-tickets/{slugify(title) || 'event'}</code>
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bo-venue">Venue</Label>
            <Input id="bo-venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Sisters Chapel" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bo-start">Date / time</Label>
              <Input id="bo-start" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bo-cap">Capacity</Label>
              <Input id="bo-cap" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="250" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bo-desc">Description (optional)</Label>
            <Textarea id="bo-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Doors open at 7pm. Reception following." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
            Create event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
