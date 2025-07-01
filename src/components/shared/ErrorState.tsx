
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  icon?: ReactNode;
}

export const ErrorState = ({
  title = "Something went wrong",
  message,
  onRetry,
  className = "",
  icon
}: ErrorStateProps) => {
  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="mx-auto mb-4 text-red-500">
            {icon || <AlertCircle className="h-12 w-12" />}
          </div>
          <h3 className="text-lg font-semibold mb-2 text-gray-900">{title}</h3>
          <p className="text-red-600 mb-4">{message}</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
