import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Eye, Send, Inbox, Loader2, Trash2, AlertCircle, PenTool, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { SendContractDialog } from "@/components/SendContractDialog";
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
  const [signingContract, setSigningContract] = useState<string | null>(null);
  const [adminSignature, setAdminSignature] = useState<string>("");
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [contractToSign, setContractToSign] = useState<Contract | null>(null);
  const [sendDialogContract, setSendDialogContract] = useState<Contract | null>(null);
  const [contractSendHistory, setContractSendHistory] = useState<Record<string, number>>({});
  const selectAllCheckboxRef = useRef<HTMLButtonElement>(null);

  // Load send history for contracts to show appropriate send/resend buttons
  useEffect(() => {
    loadContractSendHistory();
  }, [contracts]);

  const loadContractSendHistory = async () => {
    if (contracts.length === 0) return;
    
    try {
      const contractIds = contracts.map(c => c.id);
      const { data, error } = await supabase
        .from('contract_recipients_v2')
        .select('contract_id')
        .in('contract_id', contractIds);

      if (error) throw error;

      const sendCounts = data.reduce((acc, record) => {
        acc[record.contract_id] = (acc[record.contract_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setContractSendHistory(sendCounts);
    } catch (error) {
      console.error('Error loading send history:', error);
    }
  };

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

  const handleOpenSendDialog = (contract: Contract) => {
    setSendDialogContract(contract);
  };

  const handleSendDialogClose = () => {
    setSendDialogContract(null);
  };

  const handleContractSent = () => {
    // Reload send history after a contract is sent
    loadContractSendHistory();
    // You might also want to trigger a refresh of the contracts list here
  };

  const handleAdminSign = async (contract: Contract) => {
    setContractToSign(contract);
    setShowSignatureModal(true);
  };

  const handleCompleteAdminSigning = async () => {
    if (!contractToSign || !adminSignature) {
      toast({
        title: "Signature Required",
        description: "Please provide your signature before completing the contract",
        variant: "destructive",
      });
      return;
    }

    setSigningContract(contractToSign.id);
    try {
      console.log('Admin signing contract:', contractToSign.id);
      
      // Get the current contract content to extract existing embedded signatures
      const { data: contractData, error: contractError } = await supabase
        .from('contracts_v2')
        .select('content')
        .eq('id', contractToSign.id)
        .single();

      if (contractError) {
        console.error('Error fetching contract:', contractError);
        throw contractError;
      }

      // Parse existing embedded signatures
      let existingSignatures: any[] = [];
      const signatureMatch = contractData.content.match(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s);
      if (signatureMatch) {
        try {
          existingSignatures = JSON.parse(signatureMatch[1]);
        } catch (e) {
          console.error('Error parsing existing signatures:', e);
        }
      }

      // Create new admin signature
      const newAdminSignature = {
        fieldId: 3,
        signatureData: adminSignature,
        dateSigned: new Date().toLocaleDateString(),
        timestamp: new Date().toISOString(),
        ipAddress: 'unknown',
        signerType: 'admin'
      };

      // Combine existing signatures with new admin signature
      const updatedSignatures = [
        ...existingSignatures.filter((sig: any) => sig.signerType !== 'admin'),
        newAdminSignature
      ];

      // Update contract content with embedded signatures
      let updatedContent = contractData.content;
      updatedContent = updatedContent.replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/s, '');
      const signaturesSection = `\n\n[EMBEDDED_SIGNATURES]${JSON.stringify(updatedSignatures)}[/EMBEDDED_SIGNATURES]`;
      updatedContent += signaturesSection;

      const adminSignedAt = new Date().toISOString();

      // Check if there's an existing signature record, if not create one
      const { data: existingSignatureRecord } = await supabase
        .from('contract_signatures_v2')
        .select('*')
        .eq('contract_id', contractToSign.id)
        .maybeSingle();

      if (existingSignatureRecord) {
        // Update existing signature record
        const { error: updateError } = await supabase
          .from('contract_signatures_v2')
          .update({
            admin_signature_data: adminSignature,
            admin_signed_at: adminSignedAt,
            status: 'completed'
          })
          .eq('id', existingSignatureRecord.id);

        if (updateError) {
          console.error('Error updating signature record:', updateError);
          throw updateError;
        }
      } else {
        // Create new signature record
        const { error: createError } = await supabase
          .from('contract_signatures_v2')
          .insert({
            contract_id: contractToSign.id,
            admin_signature_data: adminSignature,
            admin_signed_at: adminSignedAt,
            status: 'completed',
            date_signed: new Date().toLocaleDateString()
          });

        if (createError) {
          console.error('Error creating signature record:', createError);
          throw createError;
        }
      }

      console.log('Signature record handled successfully');

      // Update contract status and content
      const { error: contractUpdateError } = await supabase
        .from('contracts_v2')
        .update({
          content: updatedContent,
          status: 'completed',
          updated_at: adminSignedAt
        })
        .eq('id', contractToSign.id);

      if (contractUpdateError) {
        console.error('Error updating contract:', contractUpdateError);
        throw contractUpdateError;
      }

      console.log('Contract updated successfully');

      toast({
        title: "Contract Completed!",
        description: `"${contractToSign.title}" has been fully signed and completed.`,
      });

      // Close modal and clear state
      setShowSignatureModal(false);
      setContractToSign(null);
      setAdminSignature("");
      
      // Force a page refresh to update the contracts list
      window.location.reload();

    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        title: "Error",
        description: "Failed to complete contract signing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSigningContract(null);
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
    <>
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
              {contracts.map((contract) => {
                const sendCount = contractSendHistory[contract.id] || 0;
                const hasBeenSent = sendCount > 0;
                
                return (
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
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>Created: {new Date(contract.created_at).toLocaleDateString()}</span>
                          {contract.updated_at !== contract.created_at && (
                            <span>• Updated: {new Date(contract.updated_at).toLocaleDateString()}</span>
                          )}
                          {hasBeenSent && (
                            <span>• Sent {sendCount} time{sendCount > 1 ? 's' : ''}</span>
                          )}
                        </div>
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
                        
                        {contract.status === 'pending_admin_signature' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAdminSign(contract)}
                            title="Admin Sign Contract"
                            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                          >
                            <PenTool className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenSendDialog(contract)}
                          title={hasBeenSent ? "Resend Contract" : "Send Contract"}
                          className={hasBeenSent ? "bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200" : ""}
                        >
                          {hasBeenSent ? (
                            <RotateCcw className="h-4 w-4" />
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Contract Dialog */}
      {sendDialogContract && (
        <SendContractDialog
          contract={sendDialogContract}
          isOpen={!!sendDialogContract}
          onClose={handleSendDialogClose}
          onSent={handleContractSent}
        />
      )}

      {/* Admin Signature Modal */}
      {showSignatureModal && contractToSign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Admin Sign: {contractToSign.title}</span>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowSignatureModal(false);
                    setContractToSign(null);
                    setAdminSignature("");
                  }}
                >
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Your Admin Signature</h3>
                <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
                  <SignatureCanvas 
                    onSignatureChange={setAdminSignature}
                    disabled={false}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSignatureModal(false);
                    setContractToSign(null);
                    setAdminSignature("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCompleteAdminSigning}
                  disabled={!adminSignature || signingContract === contractToSign.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {signingContract === contractToSign.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Completing Contract...
                    </>
                  ) : (
                    <>
                      <PenTool className="h-4 w-4 mr-2" />
                      Complete Contract
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
