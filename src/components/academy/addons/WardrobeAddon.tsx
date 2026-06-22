// Wardrobe add-on (per-course, unified).
//
// Architecture after the Phase 24 unification:
//   • Inventory + measurements live workspace-wide (same garments are
//     shared across all classes, and a student's measurements don't
//     change per class).
//   • Checkouts, orders, and announcements gained a nullable course_id —
//     this addon filters them to the current course so each class sees
//     just the garments it has issued / ordered / announced.
//   • The full WardrobeManagementHub is embedded so the addon has the
//     same controls as the workspace module. The course-scoped summary
//     up top tells the instructor which rows actually belong to this
//     class.

import { lazy, Suspense, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shirt, Loader2, ShoppingBag, Truck, Megaphone,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const WardrobeManagementHub = lazy(() =>
  import('@/components/wardrobe/WardrobeManagementHub').then(m => ({ default: m.WardrobeManagementHub }))
);

interface Props { courseId: string; canEdit: boolean; }

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function WardrobeAddon({ courseId, canEdit }: Props) {
  // Pull just the rows this course owns (checkouts, orders, announcements).
  // RLS already gates by tenant; we add course_id filter on top.
  const { data: checkouts = [] } = useQuery({
    queryKey: ['course-wardrobe-checkouts', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_wardrobe_checkouts')
        .select('id, status, due_date, size, color, checked_out_at')
        .eq('course_id', courseId)
        .order('checked_out_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['course-wardrobe-orders', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_wardrobe_orders')
        .select('id, item_description, estimated_cost, expected_delivery_date, actual_delivery_date, notes')
        .eq('course_id', courseId)
        .order('expected_delivery_date', { ascending: true, nullsFirst: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['course-wardrobe-announcements', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_wardrobe_announcements')
        .select('id, title, message, is_urgent, sent_at, scheduled_send_date')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const counts = useMemo(() => ({
    activeCheckouts: checkouts.filter((c: any) => c.status === 'checked_out' || !c.status).length,
    returnedCheckouts: checkouts.filter((c: any) => c.status === 'returned' || c.status === 'checked_in').length,
    openOrders: orders.filter((o: any) => !o.actual_delivery_date).length,
    deliveredOrders: orders.filter((o: any) => o.actual_delivery_date).length,
    urgentAnnouncements: announcements.filter((a: any) => a.is_urgent).length,
  }), [checkouts, orders, announcements]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 inline-flex items-center justify-center">
          <Shirt className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold">Wardrobe</h2>
          <p className="text-xs text-muted-foreground">
            Inventory + measurements stay shared across classes. Checkouts, orders, and
            announcements below are scoped to this course.
          </p>
        </div>
      </div>

      {/* Course-scoped rollups */}
      <div className="grid sm:grid-cols-3 gap-3">
        <StatTile
          icon={Shirt}
          tone="bg-pink-50 text-pink-700 border-pink-200"
          label="Checkouts for this class"
          primary={counts.activeCheckouts}
          secondary={counts.returnedCheckouts > 0 ? `${counts.returnedCheckouts} returned` : 'No returns logged'}
        />
        <StatTile
          icon={Truck}
          tone="bg-amber-50 text-amber-700 border-amber-200"
          label="Open orders"
          primary={counts.openOrders}
          secondary={counts.deliveredOrders > 0 ? `${counts.deliveredOrders} delivered` : 'No deliveries yet'}
        />
        <StatTile
          icon={Megaphone}
          tone="bg-sky-50 text-sky-700 border-sky-200"
          label="Announcements"
          primary={announcements.length}
          secondary={counts.urgentAnnouncements > 0 ? `${counts.urgentAnnouncements} urgent` : 'None urgent'}
        />
      </div>

      {/* Course-scoped checkout list (compact) */}
      {checkouts.length > 0 && (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Checkouts for this course</h3>
              <Badge variant="outline" className="text-xs">{checkouts.length}</Badge>
            </div>
            <ul className="divide-y">
              {checkouts.slice(0, 5).map((c: any) => {
                const due = c.due_date ? parseISO(c.due_date) : null;
                const out = c.checked_out_at ? parseISO(c.checked_out_at) : null;
                return (
                  <li key={c.id} className="py-2 flex items-center gap-2 text-sm">
                    <div className="flex-1 min-w-0 truncate">
                      {c.size || '—'}{c.color ? ` · ${c.color}` : ''}
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {out ? `Out ${format(out, 'MMM d')}` : ''}
                      {due && ` · due ${format(due, 'MMM d')}`}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {c.status || 'checked_out'}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* The full workspace hub — same controls as workspace settings. */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="text-xs">Workspace tool</Badge>
          <span>Full wardrobe management — inventory, measurements, checkouts, orders.</span>
        </div>
        <div className="rounded-2xl bg-card overflow-hidden" style={SOFT_CARD_STYLE}>
          <Suspense fallback={<div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>}>
            <WardrobeManagementHub />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon, tone, label, primary, secondary,
}: {
  icon: React.ElementType;
  tone: string;
  label: string;
  primary: number;
  secondary: string;
}) {
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs uppercase tracking-wide font-semibold">{label}</span>
      </div>
      <div className="text-2xl font-bold leading-none">{primary}</div>
      <div className="text-xs mt-1 opacity-80">{secondary}</div>
    </div>
  );
}
