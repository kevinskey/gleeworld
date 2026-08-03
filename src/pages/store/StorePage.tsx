import { DASHBOARD_PAGE_PADDING } from '@/components/dashboard/DashboardPageShell';
import { GwStoreTab } from '@/components/store/GwStoreTab';

// No DashboardPageShell here: it would print a second big "GW Sheet Music
// Store" header above the hero (which owns the title in the store model) —
// the duplicate + its padding pushed the hero below the fold (Kevin:
// "bring the big title up"). Keep the shared horizontal padding tokens so
// the store's left edge lines up with every other dashboard page.
export default function StorePage() {
  return (
    <div className={`w-full pt-1 pb-10 max-w-6xl ${DASHBOARD_PAGE_PADDING}`}>
      <GwStoreTab />
    </div>
  );
}
