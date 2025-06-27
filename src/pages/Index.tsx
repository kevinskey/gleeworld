
import { useState } from "react";
import { Header } from "@/components/Header";
import { StatsCards } from "@/components/StatsCards";
import { ContractsList } from "@/components/ContractsList";
import { DocumentUpload } from "@/components/DocumentUpload";
import { W9FormsListCollapsible } from "@/components/W9FormsListCollapsible";
import { AdminPanelCollapsible } from "@/components/AdminPanelCollapsible";
import { AccountingCardCollapsible } from "@/components/AccountingCardCollapsible";
import { ContractTemplates } from "@/components/ContractTemplates";
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

  const handleDeleteContract = async (contractId: string) => {
    await deleteContract(contractId);
  };

  const handleUploadContract = () => {
    // This would typically open a file upload dialog or navigate to upload page
    console.log('Upload contract clicked');
  };

  const renderContent = () => {
    switch (activeTab) {
      case "templates":
        return (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-3xl font-bold text-gradient mb-2">Contract Templates</h2>
              <p className="text-lg text-white/70">Create and manage reusable contract templates.</p>
            </div>
            <ContractTemplates />
          </div>
        );
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
                <DocumentUpload />
                <W9FormsListCollapsible />
              </div>
              <div className="space-y-6">
                <ContractsList 
                  contracts={contracts}
                  loading={loading}
                  error={error}
                  onViewContract={handleViewContract}
                  onDeleteContract={handleDeleteContract}
                  onUploadContract={handleUploadContract}
                  onRetry={refetch}
                />
                <AdminPanelCollapsible />
                <AccountingCardCollapsible />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-spelman-900 via-spelman-800 to-spelman-700">
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
