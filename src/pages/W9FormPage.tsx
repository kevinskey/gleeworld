
import { W9Form } from "@/components/W9Form";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const W9FormPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: "W9 Form Submitted",
      description: "Your W9 form has been submitted successfully. You can now proceed with contract signing.",
    });
    
    // Navigate back to the previous page or to contracts list
    const contractId = new URLSearchParams(window.location.search).get('return');
    if (contractId) {
      navigate(`/contract-signing/${contractId}`);
    } else {
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
