
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Eye, Send, Inbox, Loader2, Trash2 } from "lucide-react";
import type { Contract } from "@/hooks/useContracts";

interface ContractsListProps {
  contracts: Contract[];
  loading: boolean;
  onViewContract: (contract: Contract) => void;
  onDeleteContract: (contractId: string) => void;
  onUploadContract: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800";
    case "pending_recipient": return "bg-yellow-100 text-yellow-800";
    case "pending_sender": return "bg-blue-100 text-blue-800";
    case "draft": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "completed": return "Completed";
    case "pending_recipient": return "Pending Recipient";
    case "pending_sender": return "Pending Your Signature";
    case "draft": return "Draft";
    default: return "Unknown";
  }
};

export const ContractsList = ({ 
  contracts, 
  loading, 
  onViewContract, 
  onDeleteContract, 
  onUploadContract 
}: ContractsListProps) => {
  const handleDeleteContract = async (contractId: string) => {
    if (confirm("Are you sure you want to delete this contract?")) {
      await onDeleteContract(contractId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Contracts</CardTitle>
        <CardDescription>Manage your contract signing workflow</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading contracts...</span>
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts yet</h3>
            <p className="text-gray-500 mb-4">Upload your first contract to get started</p>
            <Button onClick={onUploadContract}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Contract
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                  <div>
                    <h3 className="font-medium text-gray-900">{contract.title}</h3>
                    <p className="text-sm text-gray-500">Status: {contract.status}</p>
                    <p className="text-xs text-gray-400">Created: {new Date(contract.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={getStatusColor(contract.status)}>
                    {getStatusText(contract.status)}
                  </Badge>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewContract(contract)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteContract(contract.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
