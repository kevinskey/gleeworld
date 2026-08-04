// Fundraising Store — dashboard destination under the Money section
// of the sidebar. The card itself lives in
// components/finance/FundraisingStoreSection; this page just gives it
// the DashboardShell + page chrome.

import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { FundraisingStoreSection, fundraisingStoreAvailable } from '@/components/finance/FundraisingStoreSection';

export default function FundraisingPage() {
  // On the platform tenant the section renders nothing, so the page would be a
  // heading promising a storefront above an empty box. Say why instead.
  const available = fundraisingStoreAvailable();

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <DashboardPageShell
          title="Fundraising Store"
          subtitle={
            available
              ? 'Branded apparel powered by T-Shirt Brothers. TSB fulfills orders; you keep 15% of every sale.'
              : 'Fundraising storefronts belong to an individual choir or ensemble.'
          }
        >
          <div className="max-w-2xl">
            {available ? (
              <FundraisingStoreSection />
            ) : (
              <div className="border border-border rounded-lg bg-card p-4 text-sm text-muted-foreground">
                This is the platform workspace, not an ensemble, so it does not have
                its own storefront. Open the dashboard for a specific choir to set up
                or manage that group&apos;s Fundraising Store.
              </div>
            )}
          </div>
        </DashboardPageShell>
      </DashboardShell>
    </UniversalLayout>
  );
}
