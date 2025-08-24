import { UniversalLayout } from "@/components/layout/UniversalLayout";
import ComprehensiveNotificationSystem from "@/components/communication/ComprehensiveNotificationSystem";

export default function Notifications() {
  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6">
        <ComprehensiveNotificationSystem />
      </div>
    </UniversalLayout>
  );
}