
import { useState } from "react";
import { Header } from "@/components/Header";
import { StatsCards } from "@/components/StatsCards";
import { ContractCreationCollapsible } from "@/components/ContractCreationCollapsible";
import { ContractTemplatesCollapsible } from "@/components/ContractTemplatesCollapsible";
import { RecentContractsTemplatesCollapsible } from "@/components/RecentContractsTemplatesCollapsible";
import { W9FormsListCollapsible } from "@/components/W9FormsListCollapsible";
import { AccountingCardCollapsible } from "@/components/AccountingCardCollapsible";
import { Library } from "@/components/Library";
import { ReceiptsManagement } from "@/components/admin/ReceiptsManagement";
import { ContractViewer } from "@/components/ContractViewer";
import { useContracts } from "@/hooks/useContracts";
import type { Contract } from "@/hooks/useContracts";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [contractViewerOpen, setContractViewerOpen] = useState(false);
  const { contracts, loading, error, deleteContract, refetch } = useContracts();

  // Calculate stats for StatsCards
  const totalContracts = contracts.length;
  const completedCount = contracts.filter(contract => contract.status === 'completed').length;
  const pendingCount = contracts.filter(contract => contract.status === 'pending' || contract.status === 'draft').length;

  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setContractViewerOpen(true);
  };

  const handleViewContractById = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      handleViewContract(contract);
    }
  };

  const handleUseTemplate = (templateContent: string, templateName: string, headerImageUrl?: string, contractType?: string) => {
    console.log('Template selected for use:', templateName);
    // This would typically populate a contract creation form or navigate to a contract creation page
    // For now, we'll just log it
  };

  const handleNewContract = () => {
    console.log('New contract clicked');
    // This would typically navigate to contract creation or open a creation dialog
  };

  const handleNewTemplate = () => {
    console.log('New template clicked');
    setActiveTab("library");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "library":
        return <Library />;
      case "receipts":
        return <ReceiptsManagement />;
      case "dashboard":
      default:
        return (
          <div className="space-y-6">
            <StatsCards 
              totalContracts={totalContracts}
              completedCount={completedCount}
              pendingCount={pendingCount}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <ContractCreationCollapsible onContractCreated={refetch} />
                <ContractTemplatesCollapsible 
                  onUseTemplate={handleUseTemplate}
                  onContractCreated={refetch}
                />
                <RecentContractsTemplatesCollapsible
                  onNewContract={handleNewContract}
                  onNewTemplate={handleNewTemplate}
                  onViewContract={handleViewContractById}
                />
                <W9FormsListCollapsible />
              </div>
              <div className="space-y-6">
                <AccountingCardCollapsible />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="container mx-auto px-4 py-6">
        {renderContent()}
      </div>
      
      {/* Contract Viewer Modal */}
      <ContractViewer 
        contract={selectedContract}
        open={contractViewerOpen}
        onOpenChange={setContractViewerOpen}
      />
    </div>
  );
};

export default Index;
