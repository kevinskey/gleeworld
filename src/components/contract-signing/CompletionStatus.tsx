
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

interface CompletionStatusProps {
  contract: Contract;
}

export const CompletionStatus = ({ contract }: CompletionStatusProps) => {
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  useEffect(() => {
    if (contract?.status === 'completed' && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (contract?.status === 'completed' && redirectCountdown === 0) {
      window.location.href = 'https://gleeworld.org';
    }
  }, [contract?.status, redirectCountdown]);

  if (contract?.status !== 'completed') {
    return null;
  }

  return (
    <div className="text-center py-8">
      <Card className="max-w-md mx-auto bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                Contract Signed Successfully!
              </h3>
              <p className="text-green-700 mb-4">
                Your signed contract has been generated and stored securely.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-green-600">
                  Redirecting to gleeworld.org in {redirectCountdown} seconds...
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = 'https://gleeworld.org'}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  Go Now
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
