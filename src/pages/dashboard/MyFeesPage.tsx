import { useEffect, useState } from 'react';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { useMyFees } from '@/hooks/useMyFees';
import { useTenantStripeConnect } from '@/hooks/useTenantStripeConnect';
import { StudentFeeCard } from '@/components/fees/StudentFeeCard';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard } from 'lucide-react';

interface TreasurerInfo {
  name?: string;
  email?: string;
  phone?: string;
  methods: string[];
}

export default function MyFeesPage() {
  const { unpaid, paid, totalOwed, loading } = useMyFees();
  const connect = useTenantStripeConnect();
  const [treasurer, setTreasurer] = useState<TreasurerInfo | null>(null);

  useEffect(() => {
    if (connect.loading) return;
    if (connect.enabled) return;

    (async () => {
      const { data } = await supabase
        .from('gw_tenant_fee_settings')
        .select('*')
        .maybeSingle();

      if (data) {
        setTreasurer({
          name: (data as Record<string, unknown>).treasurer_contact_name as string | undefined,
          email: (data as Record<string, unknown>).treasurer_contact_email as string | undefined,
          phone: (data as Record<string, unknown>).treasurer_contact_phone as string | undefined,
          methods: ((data as Record<string, unknown>).accepted_manual_methods as string[] | null) ?? ['cash', 'check'],
        });
      }
    })();
  }, [connect.loading, connect.enabled]);

  const isLoading = loading || connect.loading;

  return (
    <DashboardPageShell
      title="My Fees"
      icon={CreditCard}
      subtitle="Your fee balance and payment history"
    >
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-24 bg-muted rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Balance summary card */}
          <section className="rounded-2xl bg-primary/5 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">You owe</div>
              <div className="text-3xl font-bold">${totalOwed.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {unpaid.length} unpaid item{unpaid.length === 1 ? '' : 's'}
              </div>
            </div>

            {!connect.enabled && treasurer && (
              <div className="text-sm sm:text-right">
                <div className="font-semibold">Contact your treasurer</div>
                {treasurer.name && <div className="text-muted-foreground">{treasurer.name}</div>}
                {treasurer.email && (
                  <a href={`mailto:${treasurer.email}`} className="text-primary hover:underline">
                    {treasurer.email}
                  </a>
                )}
                {treasurer.phone && (
                  <div className="text-muted-foreground">{treasurer.phone}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  Accepts: {treasurer.methods.join(', ')}
                </div>
              </div>
            )}

            {!connect.enabled && !treasurer && (
              <div className="text-sm text-muted-foreground">
                Online payments are not available. Contact your organization for payment instructions.
              </div>
            )}
          </section>

          {/* Unpaid fees */}
          {unpaid.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Unpaid</h2>
              <div className="grid gap-3">
                {unpaid.map((fee) => (
                  <StudentFeeCard key={fee.id} fee={fee} canPay={connect.enabled} />
                ))}
              </div>
            </section>
          )}

          {/* Payment history */}
          {paid.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">History</h2>
              <div className="grid gap-3">
                {paid.map((fee) => (
                  <StudentFeeCard key={fee.id} fee={fee} canPay={false} />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {unpaid.length === 0 && paid.length === 0 && (
            <p className="text-muted-foreground">No fees on your account.</p>
          )}
        </div>
      )}
    </DashboardPageShell>
  );
}
