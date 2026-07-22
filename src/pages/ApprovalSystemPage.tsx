import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ApprovalSystemModule } from "@/components/modules/ApprovalSystemModule";
import { useAuth } from "@/contexts/AuthContext";

export default function ApprovalSystemPage() {
  const { user } = useAuth();

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="container mx-auto p-6 max-w-7xl bg-gradient-to-br from-brand-blue-light/5 to-brand-blue-dark/5 min-h-screen">
        <ApprovalSystemModule user={user} isFullPage={true} />
      </div>
    </DashboardShell>
    </UniversalLayout>
  );
}