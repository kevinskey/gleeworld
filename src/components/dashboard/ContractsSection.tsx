
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Calendar } from "lucide-react";
import { useContracts } from "@/hooks/useContracts";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import type { Contract } from "@/hooks/useContracts";

interface ContractsSectionProps {
  onViewContract: (contract: Contract) => void;
}

export const ContractsSection = ({ onViewContract }: ContractsSectionProps) => {
  const { contracts, loading, error } = useContracts();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending_admin_signature': return 'bg-blue-100 text-blue-800';
      case 'pending_artist_signature': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'pending_admin_signature': return 'Pending Admin';
      case 'pending_artist_signature': return 'Pending Artist';
      case 'draft': return 'Draft';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <LoadingSpinner size="sm" text="Loading contracts..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <p className="text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Contracts
          </CardTitle>
          <CardDescription>Your latest contract activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Contracts Yet</h3>
            <p className="text-gray-600">You haven't created any contracts yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show most recent 5 contracts
  const recentContracts = contracts.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Recent Contracts
        </CardTitle>
        <CardDescription>Your latest contract activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentContracts.map((contract) => (
            <div 
              key={contract.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-gray-900 truncate">{contract.title}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Created {new Date(contract.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(contract.status)}>
                  {getStatusText(contract.status)}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewContract(contract)}
                  className="flex-shrink-0"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
