import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import ComprehensiveNotificationSystem from "@/components/communication/ComprehensiveNotificationSystem";

export default function Notifications() {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="container mx-auto px-4 py-6">
        <ComprehensiveNotificationSystem />
      </div>
    </DashboardShell>
    </UniversalLayout>
  );
}