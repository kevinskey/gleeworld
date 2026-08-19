// Instructor "workshop" — Calendly-style setup surface.
// Two panels: Services (services + per-service availability bundled together)
// and Bookings. Each service carries its own weekly schedule, so different
// services can have different bookable windows. Bookings push to both sides'
// Google primary calendars (best-effort) via google-push-appointment.

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Plus, Trash2, Pencil, Loader2, Check, X, Clock, Link as LinkIcon,
  CheckCircle2, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useServices, useCreateService, useUpdateService, useDeleteService, type Service } from '@/hooks/useServices';
import { toast } from 'sonner';
import { ConfirmDeleteButton } from '@/components/shared/ConfirmDeleteButton';

const InvitesPanel = lazy(() => import('@/components/officehours/InvitesPanel'));
import { format, parseISO, isFuture, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

const SOFT_CARD = 'border-0 rounded-2xl';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type AvailabilityRow = { day_of_week: number; start_time: string; end_time: string; is_active: boolean };

export default function InstructorWorkshop() {
  const [tab, setTab] = useState<'services' | 'invites' | 'bookings'>('services');

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="invites">Invites</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-5">
          <ServicesPanel />
        </TabsContent>
        <TabsContent value="invites" className="mt-5">
          <Suspense fallback={<div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>}>
            <InvitesPanel />
          </Suspense>
        </TabsContent>
        <TabsContent value="bookings" className="mt-5 space-y-4">
          <BookingsPanel />
          <GoogleConnectionBar />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Google connection bar ─────────────────────────────────────────────────

function GoogleConnectionBar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: conn, isLoading } = useQuery({
    queryKey: ['google-connection', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_google_connections')
        .select('google_email, last_synced_at, last_error')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
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

  const disconnect = async () => {
    try {
      await supabase.functions.invoke('google-disconnect');
      queryClient.invalidateQueries({ queryKey: ['google-connection'] });
      toast.success('Disconnected.');
    } catch (e: any) {
      toast.error(e?.message || 'Failed.');
    }
  };

  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-4 flex items-center gap-3 flex-wrap">
        <div className={cn(
          'w-9 h-9 rounded-xl inline-flex items-center justify-center',
          conn ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
        )}>
          {conn ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">
            {isLoading ? 'Checking…' : conn ? 'Google Calendar connected' : 'Connect Google Calendar'}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {conn
              ? <>Syncing as <span className="font-medium text-foreground">{conn.google_email}</span>. New bookings push to your calendar automatically.</>
              : 'Hook up your Google so confirmed bookings appear on your calendar.'}
          </div>
        </div>
        {conn ? (
          <Button size="sm" variant="outline" onClick={disconnect}>Disconnect</Button>
        ) : (
          <Button size="sm" onClick={connect}>
            <LinkIcon className="w-4 h-4 mr-1.5" />Connect
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Services panel (with embedded per-service availability) ───────────────

function ServicesPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: services = [], isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const [editing, setEditing] = useState<Service | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const blankService = (): Service => ({
    id: '',
    name: '',
    description: '',
    duration_minutes: 30,
    capacity_min: 1,
    capacity_max: 1,
    price_amount: 0,
    price_display: 'Free',
    location: 'In person',
    category: 'general',
    is_active: true,
    requires_approval: false,
    booking_buffer_minutes: 0,
    advance_booking_days: 30,
    created_by: user?.id,
    created_at: '',
    updated_at: '',
  } as Service);

  const openNew = () => { setEditing(blankService()); setDialogOpen(true); };
  const openEdit = (s: Service) => { setEditing({ ...s }); setDialogOpen(true); };

  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Your services</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each service has its own bookable days and times — students only see the
              slots you've opened up.
            </p>
          </div>
          <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1.5" />New service</Button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
        ) : services.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No services yet. Add your first one to start accepting bookings.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {services.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                onEdit={() => openEdit(s)}
                onDelete={() => deleteService.mutate(s.id)}
              />
            ))}
          </div>
        )}
      </CardContent>

      {editing && (
        <ServiceEditorDialog
          open={dialogOpen}
          onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}
          service={editing}
          onChange={(s) => setEditing(s)}
          onSave={async (svc, avail) => {
            if (!svc.name.trim()) { toast.error('Name is required.'); return; }
            try {
              let savedId = svc.id;
              if (svc.id) {
                await updateService.mutateAsync(svc);
              } else {
                const { id, created_at, updated_at, ...payload } = svc as any;
                const created: any = await createService.mutateAsync(payload);
                savedId = created?.id;
              }
              if (savedId) {
                const daysOpen = await replaceAvailability(savedId, avail);
                // The card reads its own availability query — without this it
                // keeps showing "No availability set" until a full reload,
                // which reads as a failed save.
                queryClient.invalidateQueries({ queryKey: ['service-availability', savedId] });
                if (!daysOpen) {
                  toast.warning('Service saved, but no days are switched on — nobody can book it yet.');
                }
              }
              setDialogOpen(false);
              setEditing(null);
            } catch (e: any) {
              // Availability failures used to be swallowed here, so a rejected
              // write was indistinguishable from a successful one.
              toast.error(e?.message || 'Could not save this service.');
            }
          }}
          saving={createService.isPending || updateService.isPending}
        />
      )}
    </Card>
  );
}

function ServiceCard({ service, onEdit, onDelete }: { service: Service; onEdit: () => void; onDelete: () => void }) {
  const { data: availRows = [] } = useQuery({
    queryKey: ['service-availability', service.id],
    enabled: !!service.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_service_availability')
        .select('day_of_week, start_time, end_time, is_active')
        .eq('service_id', service.id)
        .eq('is_active', true)
        .order('day_of_week');
      if (error) throw error;
      return data || [];
    },
  });

  const days = availRows.map((r: any) => DAYS[r.day_of_week]).join(', ');

  return (
    <div className="border rounded-xl p-4 flex items-start gap-3 hover:bg-muted/40 transition">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{service.name}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{service.duration_minutes} min</span>
          <span>•</span>
          <span>{service.price_display || 'Free'}</span>
          {service.requires_approval && <>
            <span>•</span>
            <Badge variant="outline" className="h-4 text-xs px-1.5">Approval</Badge>
          </>}
        </div>
        {service.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{service.description}</p>}
        <div className="text-sm text-muted-foreground mt-2 truncate">
          {days ? <>Open: {days}</> : <span className="text-amber-700">No availability set</span>}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <ConfirmDeleteButton
          confirmKey="deactivate-office-hours-service"
          title={`Deactivate "${service.name}"?`}
          description="Existing bookings remain; the service stops accepting new ones."
          onConfirm={onDelete}
          confirmLabel="Deactivate"
          ariaLabel="Deactivate service"
          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-rose-600 hover:text-rose-700 hover:bg-muted"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </ConfirmDeleteButton>
      </div>
    </div>
  );
}

// Replace all gw_service_availability rows for a service with the given set.
//
// Goes through set_service_availability rather than writing the rows from the
// browser: the RPC is atomic (no window where a service has lost its old hours
// and not yet gained its new ones) and it stamps tenant_id from the parent
// service, which the client has no reliable way to know.
async function replaceAvailability(serviceId: string, rows: AvailabilityRow[]) {
  const active = rows.filter((r) => r.is_active);

  const { data, error } = await supabase.rpc('set_service_availability', {
    p_service_id: serviceId,
    p_rows: active.map((r) => ({
      day_of_week: r.day_of_week,
      start_time: r.start_time,
      end_time: r.end_time,
    })),
  });

  if (error) throw error;
  if (!(data as any)?.success) {
    throw new Error((data as any)?.error || 'Could not save availability.');
  }
  return (data as any).days_open as number;
}

// ── Service editor dialog (details + weekly availability) ─────────────────

function ServiceEditorDialog({
  open, onOpenChange, service, onChange, onSave, saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service;
  onChange: (s: Service) => void;
  onSave: (svc: Service, avail: AvailabilityRow[]) => Promise<void>;
  saving: boolean;
}) {
  const [availability, setAvailability] = useState<AvailabilityRow[]>(() => emptyAvailability());

  // Load existing availability when editing an existing service.
  useEffect(() => {
    if (!open) return;
    if (!service.id) { setAvailability(emptyAvailability()); return; }
    (async () => {
      const { data } = await supabase
        .from('gw_service_availability')
        .select('day_of_week, start_time, end_time, is_active')
        .eq('service_id', service.id)
        .order('day_of_week');
      const base = emptyAvailability();
      (data || []).forEach((r: any) => {
        base[r.day_of_week] = {
          day_of_week: r.day_of_week,
          start_time: (r.start_time || '09:00').slice(0, 5),
          end_time: (r.end_time || '17:00').slice(0, 5),
          is_active: !!r.is_active,
        };
      });
      setAvailability(base);
    })();
  }, [open, service.id]);

  const update = (i: number, patch: Partial<AvailabilityRow>) => {
    setAvailability((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service.id ? 'Edit service' : 'New service'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Details */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={service.name} onChange={(e) => onChange({ ...service, name: e.target.value })}
                     placeholder="e.g. Voice Lesson" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" value={service.duration_minutes}
                       onChange={(e) => onChange({ ...service, duration_minutes: parseInt(e.target.value) || 30 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price</Label>
                <Input value={service.price_display || ''}
                       onChange={(e) => onChange({ ...service, price_display: e.target.value })}
                       placeholder="Free or $50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Input value={service.location || ''}
                     onChange={(e) => onChange({ ...service, location: e.target.value })}
                     placeholder="In person, Zoom, etc." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea value={service.description || ''}
                        onChange={(e) => onChange({ ...service, description: e.target.value })}
                        rows={2} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <Label className="text-sm">Requires my approval</Label>
              <Switch checked={service.requires_approval}
                      onCheckedChange={(c) => onChange({ ...service, requires_approval: c })} />
            </div>
          </div>

          {/* Availability */}
          <div className="pt-3 border-t space-y-2">
            <div>
              <Label className="text-sm font-semibold">When is this bookable?</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pick the days and time windows when students can book this service.
              </p>
            </div>
            <div className="space-y-1.5">
              {availability.map((row, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border">
                  <Switch
                    checked={row.is_active}
                    onCheckedChange={(c) => update(i, { is_active: c })}
                  />
                  <div className="w-10 text-xs font-medium">{DAYS[i]}</div>
                  {row.is_active ? (
                    <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                      <Input type="time" value={row.start_time}
                             onChange={(e) => update(i, { start_time: e.target.value })}
                             className="w-24 h-8 text-xs" />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input type="time" value={row.end_time}
                             onChange={(e) => update(i, { end_time: e.target.value })}
                             className="w-24 h-8 text-xs" />
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground flex-1">Closed</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(service, availability)} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function emptyAvailability(): AvailabilityRow[] {
  return DAYS.map((_, i) => ({
    day_of_week: i,
    start_time: '09:00',
    end_time: '17:00',
    is_active: false,
  }));
}

// ── Bookings panel ────────────────────────────────────────────────────────

function BookingsPanel() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'upcoming' | 'pending' | 'past'>('upcoming');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['workshop-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_appointments')
        .select('*')
        .order('appointment_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return (rows as any[]).filter((r) => {
      const d = r.appointment_date ? parseISO(r.appointment_date) : null;
      const upcoming = d ? (isFuture(d) || isToday(d)) : false;
      if (filter === 'upcoming') return upcoming && r.status !== 'cancelled';
      if (filter === 'pending') return r.status === 'pending';
      if (filter === 'past') return !upcoming || r.status === 'completed' || r.status === 'cancelled';
      return true;
    });
  }, [rows, filter]);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status, updated_at: new Date().toISOString() };
      if (status === 'confirmed') patch.approved_at = new Date().toISOString();
      const { error } = await supabase.from('gw_appointments').update(patch).eq('id', id);
      if (error) throw error;

      if (status === 'confirmed') {
        try { await supabase.functions.invoke('google-push-appointment', { body: { appointment_id: id, op: 'create' } }); }
        catch { /* non-blocking */ }
        try { await supabase.functions.invoke('appointment-sms-notify', { body: { appointment_id: id, event: 'confirmed' } }); }
        catch { /* non-blocking */ }
      } else if (status === 'cancelled') {
        try { await supabase.functions.invoke('google-push-appointment', { body: { appointment_id: id, op: 'delete' } }); }
        catch { /* non-blocking */ }
        try { await supabase.functions.invoke('appointment-sms-notify', { body: { appointment_id: id, event: 'cancelled' } }); }
        catch { /* non-blocking */ }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-bookings'] });
      toast.success('Updated.');
    },
    onError: (e: any) => toast.error(e?.message || 'Update failed.'),
  });

  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold">Bookings</h2>
          <div className="inline-flex bg-muted rounded-lg p-0.5">
            {(['upcoming', 'pending', 'past'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md capitalize',
                  filter === f ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Nothing here yet.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const date = r.appointment_date ? parseISO(r.appointment_date) : null;
              return (
                <div key={r.id} className="border rounded-xl p-3 flex items-center gap-3">
                  <div className="w-12 text-center shrink-0 rounded-lg py-1 bg-primary/10 text-primary">
                    <div className="text-xs font-bold uppercase">{date && format(date, 'MMM')}</div>
                    <div className="text-lg font-bold leading-none">{date && format(date, 'd')}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{r.title || r.client_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.client_name && <>{r.client_name} • </>}
                      {date && format(date, 'h:mm a')}
                      {r.duration_minutes && <> • {r.duration_minutes} min</>}
                    </div>
                  </div>
                  {/* Status as a plain bordered chip with hard-coded hex
                      backgrounds so it doesn't fight the tenant theme
                      tokens (the demo tenant's gold primary was painting
                      bg-amber-50 + text-amber-700 as gold-on-gold and the
                      word "pending" was invisible). */}
                  <span
                    className="capitalize text-xs px-2 py-0.5 rounded-md border font-medium shrink-0"
                    style={
                      r.status === 'confirmed' ? { backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' } :
                      r.status === 'pending'   ? { backgroundColor: '#fffbeb', color: '#b45309', borderColor: '#fde68a' } :
                      r.status === 'cancelled' ? { backgroundColor: '#fff1f2', color: '#be123c', borderColor: '#fecdd3' } :
                      r.status === 'completed' ? { backgroundColor: '#ecfeff', color: '#0e7490', borderColor: '#a5f3fc' } :
                      undefined
                    }
                  >
                    {r.status}
                  </span>
                  {r.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setStatus.mutate({ id: r.id, status: 'confirmed' })}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => setStatus.mutate({ id: r.id, status: 'cancelled' })}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
