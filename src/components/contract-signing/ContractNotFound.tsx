
import { AlertTriangle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const ContractNotFound = () => {
  console.log('ContractNotFound: Component rendered');
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          </div>
          <CardTitle className="text-xl">Contract Not Found</CardTitle>
          <CardDescription>
            The contract you're looking for could not be found or may have expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-gray-600 mb-6">
            Please check the link or contact the sender for a new invitation.
          </p>
          <Button 
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Homepage
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
