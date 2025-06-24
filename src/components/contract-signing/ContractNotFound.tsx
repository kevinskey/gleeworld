
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ContractNotFoundProps {
  contractId: string;
}

export const ContractNotFound = ({ contractId }: ContractNotFoundProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Contract Not Found
              </h1>
              <p className="text-gray-600 mb-4">
                The contract you're looking for doesn't exist or has been removed.
              </p>
              <div className="bg-gray-100 p-3 rounded text-sm text-gray-700 font-mono break-all">
                Contract ID: {contractId}
              </div>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/')}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Button>
              
              <p className="text-xs text-gray-500">
                If you believe this is an error, please contact support.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
