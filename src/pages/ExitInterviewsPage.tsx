import { UniversalLayout } from "@/components/layout/UniversalLayout";
import ExitInterviewsModule from "@/components/modules/ExitInterviewsModule";

const ExitInterviewsPage = () => {
  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6">
        <ExitInterviewsModule />
      </div>
    </UniversalLayout>
  );
};

export default ExitInterviewsPage;
