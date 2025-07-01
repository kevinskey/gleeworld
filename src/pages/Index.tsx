import { useState, useEffect } from "react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { StatsCards } from "@/components/StatsCards";
import { ContractCreationCollapsible } from "@/components/ContractCreationCollapsible";
import { ContractTemplatesCollapsible } from "@/components/ContractTemplatesCollapsible";
import { RecentContractsTemplatesCollapsible } from "@/components/RecentContractsTemplatesCollapsible";
import { W9FormsListCollapsible } from "@/components/W9FormsListCollapsible";
import { ContractsSection } from "@/components/dashboard/ContractsSection";
import { Library } from "@/components/Library";
import { FinanceManagement } from "@/components/finance/FinanceManagement";
import { ContractViewer } from "@/components/ContractViewer";
import { EditTemplateDialog } from "@/components/templates/EditTemplateDialog";
import { DocumentManager } from "@/components/shared/DocumentManager";
import { AIAssist } from "@/components/shared/AIAssist";
import { useContracts } from "@/hooks/useContracts";
import { useContractTemplates } from "@/hooks/useContractTemplates";
import { useTemplateOperations } from "@/hooks/useTemplateOperations";
import { useSearchParams } from "react-router-dom";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import type { Contract } from "@/hooks/useContracts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  console.log('Index: Component is rendering');
  
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [contractViewerOpen, setContractViewerOpen] = useState(false);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeTab = searchParams.get('tab') || 'dashboard';
  
  const { contracts, loading, error, deleteContract, refetch } = useContracts();
  const { templates } = useContractTemplates();
  const { handleUpdateTemplate, isUpdating } = useTemplateOperations();

  // Handle edit template URL parameter
  useEffect(() => {
    const editTemplateId = searchParams.get('edit-template');
    if (editTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === editTemplateId);
      if (template) {
        console.log('Opening edit dialog for template:', template.name);
        setSelectedTemplate(template);
        setEditTemplateOpen(true);
      }
    }
  }, [searchParams, templates]);

  // Clear URL parameters when closing edit dialog
  const handleEditTemplateClose = (open: boolean) => {
    setEditTemplateOpen(open);
    if (!open) {
      setSelectedTemplate(null);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('edit-template');
      setSearchParams(newSearchParams);
    }
  };

  const setActiveTab = (tab: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (tab === 'dashboard') {
      newSearchParams.delete('tab');
    } else {
      newSearchParams.set('tab', tab);
    }
    setSearchParams(newSearchParams);
  };

  console.log('Index: State initialized', { 
    activeTab, 
    contractsCount: contracts.length, 
    loading, 
    error 
  });

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
  };

  const handleNewContract = () => {
    console.log('New contract clicked');
  };

  const handleNewTemplate = () => {
    console.log('New template clicked');
    setActiveTab("library");
  };

  if (loading) {
    return (
      <UniversalLayout>
        <LoadingSpinner size="lg" text="Loading contracts..." />
      </UniversalLayout>
    );
  }

  if (error) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center py-20">
          <ErrorState 
            message={error} 
            onRetry={refetch}
          />
        </div>
      </UniversalLayout>
    );
  }

  const renderContent = () => {
    console.log('Index: Rendering content for tab:', activeTab);
    
    switch (activeTab) {
      case "library":
        console.log('Index: Rendering Library component');
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white">Document Library</h1>
              <AIAssist context="document management" />
            </div>
            <Library />
            <DocumentManager />
          </div>
        );
      case "finance":
        console.log('Index: Rendering FinanceManagement component');
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white">Finance Management</h1>
              <AIAssist context="finance and payments" />
            </div>
            <FinanceManagement />
          </div>
        );
      case "dashboard":
      default:
        console.log('Index: Rendering Dashboard content');
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <AIAssist context="contract management dashboard" />
            </div>
            
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
                <ContractsSection onViewContract={handleViewContract} />
              </div>
            </div>
          </div>
        );
    }
  };

  console.log('Index: About to render main component');

  return (
    <UniversalLayout containerized={false}>
      <div className="container mx-auto px-4 py-6">
        {renderContent()}
      </div>
      
      {/* Contract Viewer Modal */}
      <ContractViewer 
        contract={selectedContract}
        open={contractViewerOpen}
        onOpenChange={setContractViewerOpen}
      />

      {/* Edit Template Modal */}
      <EditTemplateDialog
        isOpen={editTemplateOpen}
        onOpenChange={handleEditTemplateClose}
        template={selectedTemplate}
        onUpdate={handleUpdateTemplate}
        isUpdating={isUpdating}
      />
    </UniversalLayout>
  );
};

export default Index;
