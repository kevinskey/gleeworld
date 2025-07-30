import { HandbookModule } from "@/components/handbook/HandbookModule";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const Handbook = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <HandbookModule />
      </div>
    </div>
  );
};

export default Handbook;