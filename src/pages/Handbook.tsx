import { HandbookModule } from "@/components/handbook/HandbookModule";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { UniversalLayout } from "@/components/layout/UniversalLayout";

const Handbook = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <UniversalLayout maxWidth="full" containerized={false}>
      <div className="mx-5">
        <HandbookModule />
      </div>
    </UniversalLayout>
  );
};

export default Handbook;