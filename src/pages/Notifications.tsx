import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { EnhancedNotificationsPanel } from "@/components/notifications/EnhancedNotificationsPanel";

export default function Notifications() {
  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <EnhancedNotificationsPanel />
      </div>
    </UniversalLayout>
  );
}