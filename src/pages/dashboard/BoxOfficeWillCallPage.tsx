// Will-call list for tickets the buyer doesn't have a phone for.
//
// Same event as the QR scanner page, different mode of operation:
//   • List all paid + comp orders for the event, alphabetized by buyer name
//   • Search by name or email
//   • Click a row → confirm → mark every still-valid ticket on the
//     order as redeemed (one button-press for a family of 4)
//   • Re-clicking after partial check-in just redeems whatever's left
//   • Refunded / void orders aren't shown — they shouldn't enter the door
//
// The two check-in surfaces (QR and will-call) share the same
// gw_ticket_checkins table, so the live "X of Y redeemed" count on the
// scanner page reflects will-call check-ins too.

import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Ticket, Camera, Search, CheckCircle2, Loader2, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getBoxOfficeEvent } from '@/lib/boxOffice/api';

interface WillCallOrder {
  id: string;
  buyer_email: string;
  buyer_name: string | null;
  quantity: number;
  status: 'paid' | 'comp';
  total_tickets: number;
  redeemed_tickets: number;
}

export default function BoxOfficeWillCallPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<WillCallOrder | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: event } = useQuery({
    queryKey: ['box_office_event', eventId],
    enabled: !!eventId,
    queryFn: () => getBoxOfficeEvent(eventId!),
  });

  // Pulls every paid/comp order for this event plus its ticket-level
  // counts. The per-ticket join keeps redeemed_tickets fresh without
  // depending on the order-level status (which is paid/comp regardless).
  const { data: orders = [], isLoading } = useQuery<WillCallOrder[]>({
    queryKey: ['box_office_willcall', eventId],
    enabled: !!eventId,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data: ords, error } = await supabase
        .from('gw_ticket_orders')
        .select('id, buyer_email, buyer_name, quantity, status')
        .eq('event_id', eventId!)
        .in('status', ['paid', 'comp']);
      if (error) {
        console.warn('[willcall] orders fetch', error.message);
        return [];
      }
      const orderIds = (ords ?? []).map((o) => o.id);
      const ticketRows = orderIds.length === 0 ? [] : (await supabase
        .from('gw_tickets')
        .select('order_id, status')
        .in('order_id', orderIds)
      ).data ?? [];
      const byOrder = new Map<string, { total: number; redeemed: number }>();
      for (const t of ticketRows as Array<{ order_id: string; status: string }>) {
        const k = byOrder.get(t.order_id) ?? { total: 0, redeemed: 0 };
        k.total += 1;
        if (t.status === 'redeemed') k.redeemed += 1;
        byOrder.set(t.order_id, k);
      }
      return (ords ?? []).map((o) => {
        const cnt = byOrder.get(o.id) ?? { total: o.quantity, redeemed: 0 };
        return {
          id: o.id,
          buyer_email: o.buyer_email,
          buyer_name: o.buyer_name ?? null,
          quantity: o.quantity,
          status: o.status as 'paid' | 'comp',
          total_tickets: cnt.total,
          redeemed_tickets: cnt.redeemed,
        };
      }).sort((a, b) => {
        const an = (a.buyer_name || a.buyer_email).toLowerCase();
        const bn = (b.buyer_name || b.buyer_email).toLowerCase();
        return an.localeCompare(bn);
      });
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      (o.buyer_name ?? '').toLowerCase().includes(q) ||
      o.buyer_email.toLowerCase().includes(q)
    );
  }, [orders, query]);

  // Aggregate counters for the strip at the top.
  const totalRedeemed = orders.reduce((s, o) => s + o.redeemed_tickets, 0);
  const totalIssued   = orders.reduce((s, o) => s + o.total_tickets, 0);

  const confirmCheckin = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('box-office-checkin-order', {
        body: { order_id: picked.id },
      });
      if (error) throw new Error(error.message || 'Check-in failed');
      const result = data as { error?: string; redeemed?: number };
      if (result?.error) throw new Error(result.error);
      const n = result?.redeemed ?? 0;
      if (n === 0) toast('All tickets already redeemed', { icon: '↻' });
      else toast.success(`Checked in ${n} ticket${n === 1 ? '' : 's'}`);
      queryClient.invalidateQueries({ queryKey: ['box_office_willcall', eventId] });
      queryClient.invalidateQueries({ queryKey: ['box_office_redeemed_count', eventId] });
      setPicked(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Check-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/dashboard/box-office/event/${eventId}`}><ArrowLeft className="w-4 h-4 mr-1.5" /> Event</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/dashboard/box-office/event/${eventId}/checkin`}>
              <Camera className="w-4 h-4 mr-1.5" /> QR scanner
            </Link>
          </Button>
          <div className="text-sm text-muted-foreground tabular-nums">
            {totalRedeemed} / {totalIssued} in
          </div>
        </div>
      </div>

      <header className="space-y-0.5">
        <div className="flex items-center gap-2 text-rose-700">
          <Users className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
            Will-call
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{event?.title ?? 'Event'}</h1>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" /> Find a buyer
          </CardTitle>
          <CardDescription>
            Type any part of the name or email. Tap a row to check the whole party in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            autoFocus
            className="h-11 text-base"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground italic">
              {orders.length === 0 ? 'No orders for this event yet.' : 'No matches.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((o) => <Row key={o.id} order={o} onPick={() => setPicked(o)} />)}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!picked} onOpenChange={(v) => { if (!v) setPicked(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check in this party?</DialogTitle>
            <DialogDescription>
              {picked && (() => {
                const remaining = picked.total_tickets - picked.redeemed_tickets;
                if (remaining === 0) return `All ${picked.total_tickets} ticket${picked.total_tickets === 1 ? '' : 's'} for ${picked.buyer_name || picked.buyer_email} have already been checked in.`;
                return `Redeems ${remaining} ticket${remaining === 1 ? '' : 's'} for ${picked.buyer_name || picked.buyer_email}.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPicked(null)} disabled={busy}>Cancel</Button>
            <Button onClick={confirmCheckin} disabled={busy || !picked || picked.total_tickets - picked.redeemed_tickets === 0}>
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
              Check in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ order, onPick }: { order: WillCallOrder; onPick: () => void }) {
  const remaining = order.total_tickets - order.redeemed_tickets;
  const allIn = remaining === 0;
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
          allIn ? 'opacity-60' : 'hover:bg-muted/40'
        }`}
      >
        <div className="min-w-0">
          <div className="font-semibold flex items-center gap-2">
            {order.buyer_name || order.buyer_email}
            {order.status === 'comp' && (
              <span className="text-violet-700 text-[10px] font-semibold uppercase tracking-wider">Comp</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{order.buyer_email}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-semibold tabular-nums text-sm">
            {order.redeemed_tickets}/{order.total_tickets}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {allIn ? 'all in' : 'tickets'}
          </div>
        </div>
      </button>
    </li>
  );
}
