
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Eye, Send, Inbox, Loader2, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { Contract } from "@/hooks/useContracts";

interface ContractsListProps {
  contracts: Contract[];
  loading: boolean;
  error?: string | null;
  onViewContract: (contract: Contract) => void;
  onDeleteContract: (contractId: string) => void;
  onUploadContract: () => void;
  onRetry?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800";
    case "pending_admin_signature": return "bg-yellow-100 text-yellow-800";
    case "pending_recipient": return "bg-orange-100 text-orange-800";
    case "pending_sender": return "bg-red-100 text-red-800";
    case "draft": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "completed": return "Completed";
    case "pending_admin_signature": return "Pending Admin Signature";
    case "pending_recipient": return "Pending Recipient";
    case "pending_sender": return "Pending Your Signature";
    case "draft": return "Draft";
    default: return "Unknown";
  }
};

export const ContractsList = ({ 
  contracts, 
  loading, 
  error,
  onViewContract, 
  onDeleteContract, 
  onUploadContract,
  onRetry
}: ContractsListProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { displayName } = useUserProfile(user);
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [sendingContract, setSendingContract] = useState<string | null>(null);
  const selectAllCheckboxRef = useRef<HTMLButtonElement>(null);

  const handleDeleteContract = async (contractId: string) => {
    if (confirm("Are you sure you want to delete this contract?")) {
      await onDeleteContract(contractId);
      setSelectedContracts(prev => {
        const newSet = new Set(prev);
        newSet.delete(contractId);
        return newSet;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedContracts.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedContracts.size} selected contract(s)?`)) {
      for (const contractId of selectedContracts) {
        await onDeleteContract(contractId);
      }
      setSelectedContracts(new Set());
      toast({
        title: "Success",
        description: `${selectedContracts.size} contract(s) deleted successfully`,
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContracts(new Set(contracts.map(contract => contract.id)));
    } else {
      setSelectedContracts(new Set());
    }
  };

  const handleSelectContract = (contractId: string, checked: boolean) => {
    setSelectedContracts(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(contractId);
      } else {
        newSet.delete(contractId);
      }
      return newSet;
    });
  };

  const handleSendContract = async (contract: Contract) => {
    setSendingContract(contract.id);
    
    try {
      // For now, we'll just show a placeholder dialog
      // In a real implementation, you'd open a send dialog with recipient details
      const recipientEmail = prompt("Enter recipient email:");
      const recipientName = prompt("Enter recipient name:");
      
      if (!recipientEmail || !recipientName) {
        toast({
          title: "Send Cancelled",
          description: "Contract sending was cancelled",
        });
        return;
      }

      // Call the send-contract-email edge function
      const { data, error } = await supabase.functions.invoke('send-contract-email', {
        body: {
          recipientEmail,
          recipientName,
          contractTitle: contract.title,
          contractId: contract.id,
          senderName: displayName || "ContractFlow Team",
          customMessage: "",
          signatureFields: []
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Contract Sent",
        description: `"${contract.title}" has been sent to ${recipientEmail}`,
      });

      // Update contract status to pending_recipient (this would typically be done on the server)
      const { error: updateError } = await supabase
        .from('contracts_v2')
        .update({ status: 'pending_recipient' })
        .eq('id', contract.id);

      if (updateError) {
        console.error('Error updating contract status:', updateError);
      }

    } catch (error) {
      console.error('Error sending contract:', error);
      toast({
        title: "Error",
        description: "Failed to send contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingContract(null);
    }
  };

  const allSelected = contracts.length > 0 && selectedContracts.size === contracts.length;
  const someSelected = selectedContracts.size > 0 && selectedContracts.size < contracts.length;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const checkboxElement = selectAllCheckboxRef.current.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (checkboxElement) {
        checkboxElement.indeterminate = someSelected;
      }
    }
  }, [someSelected]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Recent Contracts</CardTitle>
        <CardDescription>Manage your contract signing workflow</CardDescription>
      </CardHeader>
      <CardContent>
        {error && !loading ? (
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
        ) : loading ? (
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
            {/* Bulk Actions Header */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  ref={selectAllCheckboxRef}
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedContracts.size === 0 
                    ? "Select all" 
                    : `${selectedContracts.size} selected`
                  }
                </span>
              </div>
              {selectedContracts.size > 0 && (
                <Button 
                  onClick={handleDeleteSelected}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedContracts.size})
                </Button>
              )}
            </div>

            {/* Contracts List */}
            {contracts.map((contract) => (
              <div 
                key={contract.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-4"
              >
                <div className="flex items-start sm:items-center space-x-4 min-w-0 flex-1">
                  <Checkbox 
                    checked={selectedContracts.has(contract.id)}
                    onCheckedChange={(checked) => handleSelectContract(contract.id, checked as boolean)}
                  />
                  <FileText className="h-8 w-8 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{contract.title}</h3>
                    <p className="text-sm text-gray-500">Status: {getStatusText(contract.status)}</p>
                    <p className="text-xs text-gray-400">
                      Created: {new Date(contract.created_at).toLocaleDateString()}
                      {contract.updated_at !== contract.created_at && (
                        <span className="ml-2">
                          • Updated: {new Date(contract.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
                  <Badge className={getStatusColor(contract.status)}>
                    {getStatusText(contract.status)}
                  </Badge>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewContract(contract)}
                      title="View Contract"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSendContract(contract)}
                      title="Send for Signature"
                      disabled={sendingContract === contract.id}
                    >
                      {sendingContract === contract.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteContract(contract.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete Contract"
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
