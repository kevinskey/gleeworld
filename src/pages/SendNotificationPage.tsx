import { CommunicationHub } from "@/components/communication/CommunicationHub";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const SendNotificationPage = () => {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <CommunicationHub />
    </DashboardShell>
    </UniversalLayout>
  );
};

export default SendNotificationPage;