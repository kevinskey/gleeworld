import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { GwStoreTab } from '@/components/store/GwStoreTab';

export default function StorePage() {
  return (
    <DashboardPageShell
      title="GW Sheet Music Store"
      subtitle="Buy sheet music directly from independent composers and publishers."
      maxWidth="6xl"
    >
      <GwStoreTab />
    </DashboardPageShell>
  );
}
