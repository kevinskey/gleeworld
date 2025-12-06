import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { ExecBoardInterviewForm } from "@/components/executive/ExecBoardInterviewForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ExecBoardExitInterview = () => {
  const navigate = useNavigate();

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/executive-board-workshop')}
          className="mb-4 gap-2 hover:bg-primary/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workshop
        </Button>
        
        <ExecBoardInterviewForm />
      </div>
    </UniversalLayout>
  );
};

export default ExecBoardExitInterview;
