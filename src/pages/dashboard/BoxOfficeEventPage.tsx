// Box Office event detail — edit the event, manage ticket tiers, publish.
//
// Publish gate: requires the tenant to have stripe_charges_enabled = true
// AND at least one tier with quantity_total > 0. Sum of tier quantities
// must also be <= event.max_attendees (the spec's overcapacity rule).
//
// Tier writes go straight to PostgREST via supabase-js; RLS keeps writes
// scoped to the caller's tenant.

import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Ticket, Calendar, CheckCircle2, AlertTriangle,
  Plus, Trash2, Loader2, Eye, EyeOff, Globe, ExternalLink, ScanLine, Gift,
  TrendingUp, DollarSign, ScanFace,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import {
  getBoxOfficeEvent, listTicketTiers, updateBoxOfficeEvent, deleteBoxOfficeEvent,
  createTier, updateTier, deleteTier, slugify,
  type BoxOfficeEvent, type TicketTier,
} from '@/lib/boxOffice/api';

function useTenantStripeReady() {
  const tenantSlug = typeof window !== 'undefined'
    ? (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant ?? null
    : null;
  return useQuery({
    queryKey: ['tenant_stripe_status', tenantSlug],
    enabled: !!tenantSlug,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tenants')
        .select('stripe_charges_enabled')
        .eq('slug', tenantSlug!)
        .maybeSingle();
      return (data?.stripe_charges_enabled as boolean | undefined) ?? false;
    },
    staleTime: 30_000,
  });
}

export default function BoxOfficeEventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { data: event, isLoading } = useQuery({
    queryKey: ['box_office_event', id],
    enabled: !!id,
    queryFn: () => getBoxOfficeEvent(id!),
  });
  const { data: tiers = [] } = useQuery({
    queryKey: ['box_office_tiers', id],
    enabled: !!id,
    queryFn: () => listTicketTiers(id!),
  });
  const { data: chargesEnabled } = useTenantStripeReady();
  // Comp count is order rows with status='comp' for this event. Cheap query;
  // refetched whenever the surrounding event/tier queries refresh.
  const { data: compCount = 0 } = useQuery({
    queryKey: ['box_office_comp_count', id],
    enabled: !!id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('gw_ticket_orders')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', id!)
        .eq('status', 'comp');
      if (error) return 0;
      return count ?? 0;
    },
  });

  if (isLoading || roleLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin()) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Box Office</CardTitle>
            <CardDescription>
              Only tenant administrators can manage events. Browse tickets on the public Box Office.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link to="/box-office">Open Box Office</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-sm text-muted-foreground mb-3">Event not found.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard/box-office"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Box Office</Link>
        </Button>
      </div>
    );
  }

  const totalTickets = tiers.reduce((s, t) => s + (t.quantity_total ?? 0), 0);
  const totalSold = tiers.reduce((s, t) => s + (t.quantity_sold ?? 0), 0);
  const overCapacity = !!event.max_attendees && totalTickets > event.max_attendees;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['box_office_event', id] });
    queryClient.invalidateQueries({ queryKey: ['box_office_tiers', id] });
    queryClient.invalidateQueries({ queryKey: ['box_office_events'] });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard/box-office"><ArrowLeft className="w-4 h-4 mr-1.5" /> Box Office</Link>
        </Button>
        <div className="flex items-center gap-2">
          {event.box_office_status === 'published' && (
            <>
              <Button asChild size="sm" variant="outline">
                <Link to={`/dashboard/box-office/event/${event.id}/checkin`}>
                  <ScanLine className="w-4 h-4 mr-1.5" /> Scan
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to={`/dashboard/box-office/event/${event.id}/willcall`}>
                  <ScanLine className="w-4 h-4 mr-1.5" /> Will-call
                </Link>
              </Button>
            </>
          )}
          <StatusPill status={event.box_office_status} />
        </div>
      </div>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-rose-700">
          <Ticket className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
            Box Office event
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
        <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4" />
          {new Date(event.start_date).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
          {event.venue_name && <span>· {event.venue_name}</span>}
        </div>
      </header>

      <PublishCard
        event={event}
        chargesEnabled={!!chargesEnabled}
        tiers={tiers}
        totalTickets={totalTickets}
        overCapacity={overCapacity}
        onChanged={invalidate}
        onDeleted={() => navigate('/dashboard/box-office')}
      />

      <EventDetailsCard event={event} onChanged={invalidate} />

      <TiersCard
        event={event}
        tiers={tiers}
        totalTickets={totalTickets}
        totalSold={totalSold}
        compCount={compCount}
        overCapacity={overCapacity}
        onChanged={invalidate}
      />

      <RequestsQueueCard event={event} tiers={tiers} onChanged={invalidate} />

      <OrdersCard eventId={event.id} onChanged={invalidate} />

      <SummaryCard eventId={event.id} />
    </div>
  );
}

function StatusPill({ status }: { status: BoxOfficeEvent['box_office_status'] }) {
  const tone =
    status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    status === 'closed'    ? 'bg-slate-100 text-slate-600 border-slate-200' :
                             'bg-amber-50 text-amber-700 border-amber-200';
  return (
    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${tone}`}>
      {status}
    </span>
  );
}

function PublishCard({
  event, chargesEnabled, tiers, totalTickets, overCapacity, onChanged, onDeleted,
}: {
  event: BoxOfficeEvent;
  chargesEnabled: boolean;
  tiers: TicketTier[];
  totalTickets: number;
  overCapacity: boolean;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canPublish = chargesEnabled && tiers.length > 0 && totalTickets > 0 && !overCapacity;
  const blockers: string[] = [];
  if (!chargesEnabled) blockers.push('Finish Stripe Connect onboarding first');
  if (tiers.length === 0) blockers.push('Add at least one ticket tier');
  if (overCapacity) blockers.push('Tier quantities exceed event capacity');

  const publicHref = event.box_office_slug ? `/concert-tickets/${event.box_office_slug}` : null;

  const setStatus = async (next: 'draft' | 'published' | 'closed') => {
    setSaving(true);
    try {
      await updateBoxOfficeEvent(event.id, { box_office_status: next });
      toast.success(next === 'published' ? 'Event published' : next === 'closed' ? 'Event closed' : 'Moved to draft');
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    setSaving(true);
    try {
      await deleteBoxOfficeEvent(event.id);
      toast.success('Event deleted');
      onDeleted();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Publishing</CardTitle>
        <CardDescription>
          A published event appears on the calendar and is sellable at its public buy page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {event.box_office_status === 'published' ? (
          <div className="flex items-start gap-2 text-emerald-700">
            <CheckCircle2 className="w-5 h-5 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold">Live</div>
              {publicHref && (
                <a
                  href={publicHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-emerald-700 underline inline-flex items-center gap-1"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {window.location.origin}{publicHref}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={saving} onClick={() => setStatus('draft')}>
                <EyeOff className="w-4 h-4 mr-1.5" /> Unpublish
              </Button>
              <Button size="sm" variant="outline" disabled={saving} onClick={() => setStatus('closed')}>
                Close sales
              </Button>
            </div>
          </div>
        ) : (
          <>
            {canPublish ? (
              <Button onClick={() => setStatus('published')} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Eye className="w-4 h-4 mr-1.5" />}
                Publish
              </Button>
            ) : (
              <div className="flex items-start gap-2 text-amber-700">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-foreground">Not ready to publish</div>
                  <ul className="list-disc list-inside text-muted-foreground mt-0.5 space-y-0.5">
                    {blockers.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                </div>
              </div>
            )}
            <div className="flex justify-end pt-2 border-t">
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)} disabled={saving}>
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete event
              </Button>
            </div>
          </>
        )}

        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this event?</DialogTitle>
              <DialogDescription>
                Removes the event from your calendar and box office. Tickets already sold
                must be refunded from Stripe before delete will succeed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => { setConfirmDelete(false); onDelete(); }}>
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function EventDetailsCard({ event, onChanged }: { event: BoxOfficeEvent; onChanged: () => void }) {
  const [title, setTitle] = useState(event.title);
  const [venue, setVenue] = useState(event.venue_name ?? '');
  const [startDate, setStartDate] = useState(toLocalInput(event.start_date));
  const [capacity, setCapacity] = useState(String(event.max_attendees ?? ''));
  const [description, setDescription] = useState(event.description ?? '');
  const [slug, setSlug] = useState(event.box_office_slug ?? '');
  // null / empty = comp requests disabled; an integer 1–20 caps per-request.
  const [requestMax, setRequestMax] = useState(
    event.box_office_request_max == null ? '' : String(event.box_office_request_max),
  );
  const [saving, setSaving] = useState(false);

  const dirty =
    title !== event.title ||
    venue !== (event.venue_name ?? '') ||
    startDate !== toLocalInput(event.start_date) ||
    capacity !== String(event.max_attendees ?? '') ||
    description !== (event.description ?? '') ||
    slug !== (event.box_office_slug ?? '') ||
    requestMax !== (event.box_office_request_max == null ? '' : String(event.box_office_request_max));

  const save = async () => {
    const cap = parseInt(capacity, 10);
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!Number.isFinite(cap) || cap < 1) { toast.error('Capacity must be a positive number'); return; }
    let nextRequestMax: number | null = null;
    if (requestMax.trim()) {
      const n = parseInt(requestMax, 10);
      if (!Number.isFinite(n) || n < 1 || n > 20) {
        toast.error('Comp-request limit must be between 1 and 20');
        return;
      }
      nextRequestMax = n;
    }
    setSaving(true);
    try {
      await updateBoxOfficeEvent(event.id, {
        title: title.trim(),
        venue_name: venue.trim() || null,
        start_date: new Date(startDate).toISOString(),
        max_attendees: cap,
        description: description.trim() || null,
        box_office_slug: (slug.trim() || slugify(title)) || null,
        box_office_request_max: nextRequestMax,
      });
      toast.success('Saved');
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Event details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="ev-title">Title</Label>
          <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-venue">Venue</Label>
          <Input id="ev-venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ev-date">Date / time</Label>
            <Input id="ev-date" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-cap">Capacity</Label>
            <Input id="ev-cap" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-slug">URL slug</Label>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground shrink-0">/concert-tickets/</span>
            <Input id="ev-slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder={slugify(title) || 'event'} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-desc">Description</Label>
          <Textarea id="ev-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1.5 pt-2 border-t">
          <Label htmlFor="ev-req-max">Comp requests — max per request</Label>
          <Input
            id="ev-req-max"
            type="number"
            min={1}
            max={20}
            value={requestMax}
            onChange={(e) => setRequestMax(e.target.value)}
            placeholder="Leave blank to disable"
          />
          <p className="text-[11px] text-muted-foreground">
            When set, signed-in members can request that many comp tickets from the public
            event page. You'll review them on this page before tickets are issued.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TiersCard({
  event, tiers, totalTickets, totalSold, compCount, overCapacity, onChanged,
}: {
  event: BoxOfficeEvent;
  tiers: TicketTier[];
  totalTickets: number;
  totalSold: number;
  compCount: number;
  overCapacity: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [compOpen, setCompOpen] = useState(false);
  const capacity = event.max_attendees ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Ticket tiers</CardTitle>
            <CardDescription>
              Each tier is a price point (Student / General / VIP). Buyers pick a tier
              + quantity on the public buy page.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setCompOpen(true)} disabled={tiers.length === 0}>
              <Gift className="w-4 h-4 mr-1.5" /> Issue comp
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> New tier
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`text-sm ${overCapacity ? 'text-destructive' : 'text-muted-foreground'}`}>
          {totalTickets} / {capacity} seats allocated across tiers · {totalSold} sold
          {compCount > 0 && <> · <span className="text-foreground/80">{compCount} comp{compCount === 1 ? '' : 's'}</span></>}
          {overCapacity && <span className="font-semibold ml-1">— exceeds capacity</span>}
        </div>
        {tiers.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No tiers yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tiers.map((t) => <TierRow key={t.id} tier={t} onChanged={onChanged} />)}
          </ul>
        )}
        <NewTierDialog
          open={open}
          onClose={() => setOpen(false)}
          eventId={event.id}
          onCreated={() => { setOpen(false); onChanged(); }}
        />
        <IssueCompDialog
          open={compOpen}
          onClose={() => setCompOpen(false)}
          eventId={event.id}
          tiers={tiers}
          onIssued={() => { setCompOpen(false); onChanged(); }}
        />
      </CardContent>
    </Card>
  );
}

function IssueCompDialog({
  open, onClose, eventId, tiers, onIssued,
}: {
  open: boolean; onClose: () => void; eventId: string; tiers: TicketTier[]; onIssued: () => void;
}) {
  const defaultTier = tiers[0]?.id ?? '';
  const [tierId, setTierId] = useState(defaultTier);
  const [holderName, setHolderName] = useState('');
  const [holderEmail, setHolderEmail] = useState('');
  const [qty, setQty] = useState('1');
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTierId(tiers[0]?.id ?? '');
    setHolderName(''); setHolderEmail(''); setQty('1'); setSendEmail(true); setSaving(false);
  };

  const submit = async () => {
    const quantity = parseInt(qty, 10);
    if (!tierId) { toast.error('Pick a tier'); return; }
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 50) {
      toast.error('Quantity must be 1–50'); return;
    }
    if (sendEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(holderEmail)) {
      toast.error('Valid email required when sending'); return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('box-office-issue-comp', {
        body: {
          event_id: eventId,
          tier_id: tierId,
          holder_name: holderName.trim(),
          holder_email: holderEmail.trim(),
          quantity,
          send_email: sendEmail,
        },
      });
      if (error) throw new Error(error.message || 'Could not issue comp');
      const result = data as { error?: string; quantity?: number; access_token?: string };
      if (result?.error) {
        if (result.error === 'over_capacity') throw new Error('Tier is at capacity');
        throw new Error(result.error);
      }
      toast.success(`Issued ${result.quantity ?? quantity} comp ticket${(result.quantity ?? quantity) === 1 ? '' : 's'}`);
      reset();
      onIssued();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not issue comp';
      toast.error(msg);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue comp tickets</DialogTitle>
          <DialogDescription>
            Free tickets — same QR + check-in path as paid. Counts against tier capacity.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="comp-tier">Tier</Label>
            <select
              id="comp-tier"
              className="w-full h-9 px-2 text-sm border rounded bg-background"
              value={tierId}
              onChange={(e) => setTierId(e.target.value)}
            >
              {tiers.map((t) => {
                const remaining = t.quantity_total - t.quantity_sold;
                return (
                  <option key={t.id} value={t.id} disabled={remaining <= 0}>
                    {t.name} · {remaining} left
                  </option>
                );
              })}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="comp-name">Recipient name</Label>
            <Input id="comp-name" value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="Maya Johnson" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="comp-email">Recipient email {sendEmail ? '' : '(optional)'}</Label>
            <Input id="comp-email" type="email" value={holderEmail} onChange={(e) => setHolderEmail(e.target.value)} placeholder="maya@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="comp-qty">Quantity</Label>
              <Input id="comp-qty" type="number" min={1} max={50} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm h-9">
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
              Email recipient
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Gift className="w-4 h-4 mr-1.5" />}
            Issue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TierRow({ tier, onChanged }: { tier: TicketTier; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const onDelete = async () => {
    if (tier.quantity_sold > 0) {
      toast.error('Cannot delete a tier with tickets already sold');
      return;
    }
    if (!confirm(`Delete tier "${tier.name}"?`)) return;
    setBusy(true);
    try {
      await deleteTier(tier.id);
      toast.success('Tier removed');
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };
  const remaining = tier.quantity_total - tier.quantity_sold;
  return (
    <li className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold">{tier.name}</div>
        <div className="text-xs text-muted-foreground">
          ${(tier.price_cents / 100).toFixed(2)} · {remaining} of {tier.quantity_total} remaining
          {tier.quantity_sold > 0 && <span className="ml-1">({tier.quantity_sold} sold)</span>}
        </div>
      </div>
      <Button size="sm" variant="ghost" onClick={onDelete} disabled={busy} className="text-destructive hover:text-destructive">
        <Trash2 className="w-4 h-4" />
      </Button>
    </li>
  );
}

function NewTierDialog({
  open, onClose, eventId, onCreated,
}: {
  open: boolean; onClose: () => void; eventId: string; onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(''); setPrice(''); setQty(''); setDescription(''); setSaving(false); };

  const submit = async () => {
    const cents = Math.round(parseFloat(price) * 100);
    const quantity = parseInt(qty, 10);
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!Number.isFinite(cents) || cents < 0) { toast.error('Price must be a positive number'); return; }
    if (!Number.isFinite(quantity) || quantity < 1) { toast.error('Quantity must be a positive number'); return; }
    setSaving(true);
    try {
      await createTier({
        event_id: eventId,
        name: name.trim(),
        description: description.trim() || undefined,
        price_cents: cents,
        quantity_total: quantity,
      });
      toast.success('Tier added');
      reset();
      onCreated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not create tier');
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New ticket tier</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tier-name">Name</Label>
            <Input id="tier-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="General Admission" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tier-price">Price (USD)</Label>
              <Input id="tier-price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="15.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tier-qty">Quantity</Label>
              <Input id="tier-qty" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="200" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tier-desc">Description (optional)</Label>
            <Textarea id="tier-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Best seats in the house" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
            Add tier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Convert an ISO timestamp into the local datetime-local input shape
// (YYYY-MM-DDTHH:mm). The input rejects the Z suffix and tz offsets.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Requests queue (Phase I) ──────────────────────────────────────────────
// Pending comp-ticket requests for this event. Admin can pick a tier and
// approve (mints comps + emails) or deny (no minting, just notifies).

interface TicketRequest {
  id: string;
  event_id: string;
  tier_id: string | null;
  requester_email: string;
  requester_name: string | null;
  quantity: number;
  message: string | null;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  created_at: string;
}

function RequestsQueueCard({
  event, tiers, onChanged,
}: {
  event: BoxOfficeEvent;
  tiers: TicketTier[];
  onChanged: () => void;
}) {
  const { data: pending = [], isLoading } = useQuery<TicketRequest[]>({
    queryKey: ['box_office_requests', event.id, 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_ticket_requests')
        .select('id, event_id, tier_id, requester_email, requester_name, quantity, message, status, created_at')
        .eq('event_id', event.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) return [];
      return (data ?? []) as TicketRequest[];
    },
    refetchInterval: 30_000,
  });

  if (event.box_office_request_max == null && pending.length === 0) {
    // Requests disabled and no historical pending — keep the card off
    // so the page doesn't sprout unused chrome.
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comp requests</CardTitle>
        <CardDescription>
          {event.box_office_request_max == null
            ? 'Currently disabled. Set a per-request cap on event details to accept requests.'
            : `Members can request up to ${event.box_office_request_max} comp ticket${event.box_office_request_max === 1 ? '' : 's'} each.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No requests waiting.</p>
        ) : (
          <ul className="divide-y divide-border">
            {pending.map((r) => (
              <RequestRow key={r.id} request={r} tiers={tiers} onChanged={onChanged} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RequestRow({
  request, tiers, onChanged,
}: {
  request: TicketRequest;
  tiers: TicketTier[];
  onChanged: () => void;
}) {
  const [tierId, setTierId] = useState(request.tier_id ?? (tiers[0]?.id ?? ''));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (decision: 'approve' | 'deny') => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('box-office-decide-request', {
        body: {
          request_id: request.id,
          decision,
          tier_id: decision === 'approve' ? tierId : undefined,
          note: note.trim() || undefined,
        },
      });
      if (error) throw new Error(error.message || 'Decision failed');
      const result = data as { error?: string };
      if (result?.error === 'over_capacity') throw new Error('Tier is at capacity — pick another');
      if (result?.error) throw new Error(result.error);
      toast.success(decision === 'approve' ? 'Approved + tickets minted' : 'Request denied');
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Decision failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="py-3 first:pt-0 last:pb-0 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">
            {request.requester_name || request.requester_email}
            <span className="text-muted-foreground font-normal ml-2">
              · {request.quantity} ticket{request.quantity === 1 ? '' : 's'}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {request.requester_email} · {new Date(request.created_at).toLocaleString()}
          </div>
          {request.message && (
            <p className="text-sm text-foreground/80 mt-1 italic">"{request.message}"</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          className="h-9 px-2 text-sm border rounded bg-background"
          value={tierId}
          onChange={(e) => setTierId(e.target.value)}
        >
          {tiers.map((t) => {
            const left = t.quantity_total - t.quantity_sold;
            return (
              <option key={t.id} value={t.id} disabled={left < request.quantity}>
                {t.name} · {left} left
              </option>
            );
          })}
        </select>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note to requester"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide('deny')}>
          Deny
        </Button>
        <Button size="sm" disabled={busy || !tierId} onClick={() => decide('approve')}>
          {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Gift className="w-4 h-4 mr-1.5" />}
          Approve & mint
        </Button>
      </div>
    </li>
  );
}

// ── Orders + refunds (Phase J) ────────────────────────────────────────────
// Paid orders surface a Refund button (calls Stripe API on the connected
// account + voids tickets). Comp orders get a Void button (no Stripe
// call). Refunded/void orders are shown for the audit trail.

interface OrderRow {
  id: string;
  event_id: string;
  buyer_email: string;
  buyer_name: string | null;
  amount_cents: number;
  currency: string;
  quantity: number;
  status: 'pending' | 'paid' | 'refunded' | 'failed' | 'comp' | 'void';
  stripe_payment_intent_id: string | null;
  created_at: string;
}

function OrdersCard({ eventId, onChanged }: { eventId: string; onChanged: () => void }) {
  const { data: orders = [], isLoading } = useQuery<OrderRow[]>({
    queryKey: ['box_office_orders', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_ticket_orders')
        .select('id, event_id, buyer_email, buyer_name, amount_cents, currency, quantity, status, stripe_payment_intent_id, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) return [];
      return (data ?? []) as OrderRow[];
    },
    refetchInterval: 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Orders</CardTitle>
        <CardDescription>
          Refunds release the seats and void the QR codes. Issuing from Stripe Dashboard
          works too — the webhook keeps us in sync.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((o) => <OrderRow key={o.id} order={o} onChanged={onChanged} />)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function OrderRow({ order, onChanged }: { order: OrderRow; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const isComp = order.status === 'comp';
  const isRefundable = order.status === 'paid' || isComp;
  const dollars = (order.amount_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const date = new Date(order.created_at).toLocaleString();

  const refund = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('box-office-refund-order', {
        body: { order_id: order.id },
      });
      if (error) throw new Error(error.message || 'Refund failed');
      const result = data as { error?: string };
      if (result?.error) throw new Error(result.error);
      toast.success(isComp ? 'Comp voided' : 'Refunded and tickets voided');
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Refund failed');
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  const tone =
    order.status === 'paid'     ? 'text-emerald-700' :
    order.status === 'comp'     ? 'text-violet-700' :
    order.status === 'refunded' ? 'text-slate-500 line-through' :
    order.status === 'void'     ? 'text-slate-500 line-through' :
    order.status === 'pending'  ? 'text-amber-700' :
    order.status === 'failed'   ? 'text-rose-700' :
                                  'text-muted-foreground';

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className={`font-semibold ${tone}`}>
            {order.buyer_name || order.buyer_email}
            <span className="font-normal ml-2">· {order.quantity} ticket{order.quantity === 1 ? '' : 's'}</span>
            {isComp && <span className="text-violet-700 text-xs font-semibold ml-2 uppercase tracking-wider">Comp</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {order.buyer_email} · {date}
            {order.amount_cents > 0 && <> · {dollars}</>}
            <span className="ml-2 uppercase tracking-wider font-semibold">· {order.status}</span>
          </div>
        </div>
        {isRefundable && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm(true)}>
            {isComp ? 'Void' : 'Refund'}
          </Button>
        )}
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isComp ? 'Void these comps?' : 'Refund this order?'}</DialogTitle>
            <DialogDescription>
              {isComp
                ? `Releases the seats and voids the ${order.quantity} comp ticket${order.quantity === 1 ? '' : 's'}. The recipient's QR will no longer scan.`
                : `Refunds ${dollars} via Stripe and voids the ${order.quantity} ticket${order.quantity === 1 ? '' : 's'}. The buyer's QR will no longer scan.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={refund} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              {isComp ? 'Void comps' : 'Refund order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

// ── Post-event summary (Phase H) ──────────────────────────────────────────
// Reads the v_box_office_event_summary view which rolls up paid + comp +
// gross revenue + check-in rate. The same view is what Program Health
// joins for ensemble-scoped concerts, so this card is showing exactly
// what other dashboards will see.

interface EventSummary {
  paid_count: number;
  comp_count: number;
  refunded_count: number;
  tickets_issued: number;
  gross_revenue_cents: number;
  checkin_count: number;
  checkin_rate_pct: number | null;
  capacity: number | null;
}

function SummaryCard({ eventId }: { eventId: string }) {
  const { data, isLoading } = useQuery<EventSummary | null>({
    queryKey: ['box_office_summary', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_box_office_event_summary')
        .select('paid_count, comp_count, refunded_count, tickets_issued, gross_revenue_cents, checkin_count, checkin_rate_pct, capacity')
        .eq('event_id', eventId)
        .maybeSingle();
      if (error) {
        console.warn('[BoxOffice] summary fetch failed', error.message);
        return null;
      }
      return data as EventSummary | null;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
          Summary
        </CardTitle>
        <CardDescription>
          Live during the show, frozen after. Same data Program Health reads for
          ensemble-scoped concerts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <SummaryGrid summary={data} />
        )}
      </CardContent>
    </Card>
  );
}

function SummaryGrid({ summary }: { summary: EventSummary }) {
  const revenueDollars = (summary.gross_revenue_cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const checkinPct = summary.checkin_rate_pct != null ? `${summary.checkin_rate_pct.toFixed(1)}%` : '—';
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Stat
        icon={<Ticket className="w-4 h-4" />}
        tone="bg-rose-50 text-rose-700"
        label="Tickets issued"
        value={summary.tickets_issued.toString()}
        sub={summary.capacity ? `of ${summary.capacity} capacity` : undefined}
      />
      <Stat
        icon={<DollarSign className="w-4 h-4" />}
        tone="bg-emerald-50 text-emerald-700"
        label="Gross revenue"
        value={revenueDollars}
        sub={`${summary.paid_count} paid`}
      />
      <Stat
        icon={<Gift className="w-4 h-4" />}
        tone="bg-violet-50 text-violet-700"
        label="Comps issued"
        value={summary.comp_count.toString()}
        sub={summary.refunded_count > 0 ? `${summary.refunded_count} refunded` : undefined}
      />
      <Stat
        icon={<ScanFace className="w-4 h-4" />}
        tone="bg-sky-50 text-sky-700"
        label="At the door"
        value={`${summary.checkin_count}`}
        sub={`${checkinPct} of issued`}
      />
    </div>
  );
}

function Stat({ icon, tone, label, value, sub }: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card/40">
      <div className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${tone} mb-2`}>
        {icon}
      </div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
      <div className="text-xl font-bold tabular-nums leading-tight mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
