import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { ApprovalSystemModule } from "@/components/modules/ApprovalSystemModule";
import { useAuth } from "@/contexts/AuthContext";

export default function ApprovalSystemPage() {
  const { user } = useAuth();

  return (
    <UniversalLayout>
      <div className="container mx-auto p-6 max-w-7xl bg-gradient-to-br from-spelman-blue-light/5 to-spelman-blue-dark/5 min-h-screen">
        <ApprovalSystemModule user={user} isFullPage={true} />
      </div>
    </UniversalLayout>
  );
}