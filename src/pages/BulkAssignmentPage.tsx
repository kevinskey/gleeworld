import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExecuteBulkAssignment } from "@/components/admin/ExecuteBulkAssignment";

const BulkAssignmentPage = () => {
  return (
    <UniversalLayout>
      <PageHeader 
        title="Executive Board Setup"
        description="Assign roles and reset passwords for executive board members"
      />
      <div className="container mx-auto px-4 py-6">
        <ExecuteBulkAssignment />
      </div>
    </UniversalLayout>
  );
};

export default BulkAssignmentPage;