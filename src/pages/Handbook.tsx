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
    <UniversalLayout maxWidth="2xl">
      <HandbookModule />
    </UniversalLayout>
  );
};

export default Handbook;