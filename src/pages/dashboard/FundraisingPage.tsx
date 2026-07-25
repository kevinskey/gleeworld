// Fundraising Store — dashboard destination under the Money section
// of the sidebar. The card itself lives in
// components/finance/FundraisingStoreSection; this page just gives it
// the DashboardShell + page chrome.

import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { FundraisingStoreSection } from '@/components/finance/FundraisingStoreSection';

export default function FundraisingPage() {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <DashboardPageShell
          title="Fundraising Store"
          subtitle="Branded apparel powered by T-Shirt Brothers. TSB fulfills orders; you keep 15% of every sale."
        >
          <div className="max-w-2xl">
            <FundraisingStoreSection />
          </div>
        </DashboardPageShell>
      </DashboardShell>
    </UniversalLayout>
  );
}
