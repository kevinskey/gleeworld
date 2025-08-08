import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { SendContractDialog } from "@/components/SendContractDialog";
import { BulkActions } from "@/components/contracts/BulkActions";
import { ContractItem } from "@/components/contracts/ContractItem";
import { AdminSignatureModal } from "@/components/contracts/AdminSignatureModal";
import { EmptyState } from "@/components/contracts/EmptyState";
import { ContractFilters } from "@/components/contracts/ContractFilters";
import { EditContractTitleDialog } from "@/components/contracts/EditContractTitleDialog";
import { useContractSendHistory } from "@/hooks/useContractSendHistory";
import { useAdminSigning } from "@/hooks/useAdminSigning";
import { useLastRecipient } from "@/hooks/useLastRecipient";
import { useContractFiltering } from "@/hooks/useContractFiltering";
import type { Contract } from "@/hooks/useContracts";

interface ContractsListProps {
  contracts: Contract[];
  loading: boolean;
  error?: string | null;
  onViewContract: (contract: Contract) => void;
  onDeleteContract: (contractId: string) => void;
  onUploadContract: () => void;
  onRetry?: () => void;
  onContractUpdated?: (contract: Contract) => void;
}

export const ContractsList = ({ 
  contracts, 
  loading, 
  error,
  onViewContract, 
  onDeleteContract, 
  onUploadContract,
  onRetry,
  onContractUpdated
}: ContractsListProps) => {
  const { toast } = useToast();
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [sendDialogContract, setSendDialogContract] = useState<Contract | null>(null);
  const [isResendMode, setIsResendMode] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Default to collapsed
  const [editTitleDialogOpen, setEditTitleDialogOpen] = useState(false);
  const [selectedEditContract, setSelectedEditContract] = useState<Contract | null>(null);
  
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

  const {
    filteredAndSortedContracts,
    sortBy,
    sortOrder,
    filterByTemplate,
    filterByType,
    filterByDate,
    availableTemplates,
    availableTypes,
    handleSortChange,
    handleFilterChange
  } = useContractFiltering(contracts);

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
      setSelectedContracts(new Set(filteredAndSortedContracts.map(contract => contract.id)));
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
    console.log('Current lastRecipient before opening:', lastRecipient);
    console.log('lastRecipientLoading:', lastRecipientLoading);
    
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

  const handleEditTitle = (contract: Contract) => {
    setSelectedEditContract(contract);
    setEditTitleDialogOpen(true);
  };

  const handleContractUpdated = (updatedContract: Contract) => {
    onContractUpdated?.(updatedContract);
  };

  console.log('ContractsList render - lastRecipient:', lastRecipient, 'loading:', lastRecipientLoading);

  return (
    <>
      <Card className="w-full">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <div className="text-left">
                  <CardTitle className="flex items-center gap-2">
                    Recent Contracts
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </CardTitle>
                  <CardDescription>Manage your contract signing workflow ({filteredAndSortedContracts.length} of {contracts.length} contracts)</CardDescription>
                </div>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          
          <CollapsibleContent>
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
                  <ContractFilters
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    filterByTemplate={filterByTemplate}
                    filterByType={filterByType}
                    filterByDate={filterByDate}
                    onSortChange={handleSortChange}
                    onFilterChange={handleFilterChange}
                    availableTemplates={availableTemplates}
                    availableTypes={availableTypes}
                  />

                  <BulkActions
                    contracts={filteredAndSortedContracts}
                    selectedContracts={selectedContracts}
                    onSelectAll={handleSelectAll}
                    onDeleteSelected={handleDeleteSelected}
                  />

                  {filteredAndSortedContracts.map((contract) => {
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
                        onEditTitle={handleEditTitle}
                      />
                    );
                  })}

                  {filteredAndSortedContracts.length === 0 && contracts.length > 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No contracts match your current filters</p>
                      <Button variant="outline" onClick={() => handleFilterChange({ template: '', type: '', date: '' })}>
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Send Contract Dialog */}
      {sendDialogContract && (
        <SendContractDialog
          contract={sendDialogContract}
          isOpen={!!sendDialogContract}
          onClose={handleSendDialogClose}
          onSent={handleContractSent}
          initialRecipientEmail={isResendMode && lastRecipient && !lastRecipientLoading ? lastRecipient.recipientEmail : ""}
          initialRecipientName={isResendMode && lastRecipient && !lastRecipientLoading ? lastRecipient.recipientName : ""}
          isResend={isResendMode}
          lastRecipientLoading={lastRecipientLoading}
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

      {/* Edit Contract Title Dialog */}
      <EditContractTitleDialog
        open={editTitleDialogOpen}
        onOpenChange={setEditTitleDialogOpen}
        contract={selectedEditContract}
        onContractUpdated={handleContractUpdated}
      />
    </>
  );
};
