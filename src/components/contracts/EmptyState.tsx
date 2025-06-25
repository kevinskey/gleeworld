
import { Button } from "@/components/ui/button";
import { Upload, Inbox, AlertCircle } from "lucide-react";

interface EmptyStateProps {
  type: 'empty' | 'error' | 'loading';
  error?: string;
  onUploadContract: () => void;
  onRetry?: () => void;
}

export const EmptyState = ({ type, error, onUploadContract, onRetry }: EmptyStateProps) => {
  if (type === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading contracts...</span>
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Contracts</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <div className="space-x-2">
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
          <Button onClick={onUploadContract}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Contract
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts yet</h3>
      <p className="text-gray-500 mb-4">Upload your first contract to get started</p>
      <Button onClick={onUploadContract}>
        <Upload className="h-4 w-4 mr-2" />
        Upload Contract
      </Button>
    </div>
  );
};
