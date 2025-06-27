
import { W9Form } from "@/components/W9Form";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const W9FormPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  const handleSuccess = () => {
    console.log('W9 form completed successfully');
    
    toast({
      title: "W9 Form Submitted",
      description: "Your W9 form has been submitted successfully.",
    });
    
    // If user is authenticated, navigate back to home
    // If not authenticated, show success message and stay on page
    if (user) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <W9Form onSuccess={handleSuccess} />
      </div>
    </div>
  );
};

export default W9FormPage;
