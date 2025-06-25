
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { SendContractDialog } from "@/components/SendContractDialog";
import { BulkActions } from "@/components/contracts/BulkActions";
import { ContractItem } from "@/components/contracts/ContractItem";
import { AdminSignatureModal } from "@/components/contracts/AdminSignatureModal";
import { EmptyState } from "@/components/contracts/EmptyState";
import { useContractSendHistory } from "@/hooks/useContractSendHistory";
import { useAdminSigning } from "@/hooks/useAdminSigning";
import { useLastRecipient } from "@/hooks/useLastRecipient";
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
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [sendDialogContract, setSendDialogContract] = useState<Contract | null>(null);
  const [isResendMode, setIsResendMode] = useState(false);
  
  const { contractSendHistory, reloadSendHistory } = useContractSendHistory(contracts);
  const { lastRecipient, loading: lastRecipientLoading } = useLastRecipient(
    sendDialogContract?.id || null
  );
  const {
    signingContract,
    adminSignature,
    showSignatureModal,
    contractToSign,
    handleAdminSign,
    handleCompleteAdminSigning,
    closeSignatureModal,
    setAdminSignature
  } = useAdminSigning();

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

  const handleOpenSendDialog = (contract: Contract, isResend: boolean = false) => {
    console.log('Opening send dialog for contract:', contract.id, 'isResend:', isResend);
    setSendDialogContract(contract);
    setIsResendMode(isResend);
  };

  const handleSendDialogClose = () => {
    setSendDialogContract(null);
    setIsResendMode(false);
  };

  const handleContractSent = () => {
    reloadSendHistory();
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Recent Contracts</CardTitle>
          <CardDescription>Manage your contract signing workflow</CardDescription>
        </CardHeader>
        <CardContent>
          {error && !loading ? (
            <EmptyState 
              type="error" 
              error={error} 
              onUploadContract={onUploadContract}
              onRetry={onRetry}
            />
          ) : loading ? (
            <EmptyState type="loading" onUploadContract={onUploadContract} />
          ) : contracts.length === 0 ? (
            <EmptyState type="empty" onUploadContract={onUploadContract} />
          ) : (
            <div className="space-y-4">
              <BulkActions
                contracts={contracts}
                selectedContracts={selectedContracts}
                onSelectAll={handleSelectAll}
                onDeleteSelected={handleDeleteSelected}
              />

              {contracts.map((contract) => {
                const sendCount = contractSendHistory[contract.id] || 0;
                
                return (
                  <ContractItem
                    key={contract.id}
                    contract={contract}
                    isSelected={selectedContracts.has(contract.id)}
                    sendCount={sendCount}
                    onSelect={handleSelectContract}
                    onView={onViewContract}
                    onDelete={handleDeleteContract}
                    onAdminSign={handleAdminSign}
                    onSend={(contract) => handleOpenSendDialog(contract, false)}
                    onResend={(contract) => handleOpenSendDialog(contract, true)}
                  />
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
          initialRecipientEmail={isResendMode && lastRecipient ? lastRecipient.recipientEmail : ""}
          initialRecipientName={isResendMode && lastRecipient ? lastRecipient.recipientName : ""}
          isResend={isResendMode}
        />
      )}

      {/* Admin Signature Modal */}
      <AdminSignatureModal
        isOpen={showSignatureModal}
        contract={contractToSign}
        adminSignature={adminSignature}
        isSigningContract={signingContract === contractToSign?.id}
        onSignatureChange={setAdminSignature}
        onClose={closeSignatureModal}
        onComplete={handleCompleteAdminSigning}
      />
    </>
  );
};
