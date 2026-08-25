// Giving — peer-to-peer fundraising campaigns, under the Money section of
// the sidebar. Distinct from "Merch Store" (/dashboard/fundraising), which is
// the branded-apparel storefront: different revenue motion, different money
// path, so they are deliberately two entries rather than one page.

import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { GivingAdmin } from '@/components/giving/GivingAdmin';

export default function GivingPage() {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <DashboardPageShell
          title="Giving"
          subtitle="Peer-to-peer fundraising pages for your singers. 0% platform fee — every donation settles directly in your own Stripe account."
        >
          <GivingAdmin />
        </DashboardPageShell>
      </DashboardShell>
    </UniversalLayout>
  );
}
