import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { ConsolidatedStatsCards } from "@/components/ConsolidatedStatsCards";
import { ContractCreationCollapsible } from "@/components/ContractCreationCollapsible";
import { ContractTemplatesCollapsible } from "@/components/ContractTemplatesCollapsible";
import { RecentContractsTemplatesCollapsible } from "@/components/RecentContractsTemplatesCollapsible";
import { W9FormsListCollapsible } from "@/components/W9FormsListCollapsible";
import { ContractsSection } from "@/components/dashboard/ContractsSection";
import { ContractManagementInterface } from "@/components/contracts/ContractManagementInterface";
import { Library } from "@/components/Library";
import { FinanceManagement } from "@/components/finance/FinanceManagement";
import { ContractViewer } from "@/components/ContractViewer";
import { EditTemplateDialog } from "@/components/templates/EditTemplateDialog";
import { DocumentManager } from "@/components/shared/DocumentManager";
import { useContracts } from "@/hooks/useContracts";
import { useContractTemplates } from "@/hooks/useContractTemplates";
import { useW9Forms } from "@/hooks/useW9Forms";
import { useTemplateOperations } from "@/hooks/useTemplateOperations";
import { useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import type { Contract } from "@/hooks/useContracts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Music, BookOpen, Users, ArrowRight, GraduationCap } from "lucide-react";

const Index = () => {
  console.log('Index: Component is rendering');
  
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [contractViewerOpen, setContractViewerOpen] = useState(false);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeTab = searchParams.get('tab') || 'contracts';
  
  const { contracts, loading, error, deleteContract, refetch } = useContracts();
  const { templates } = useContractTemplates();
  const { w9Forms } = useW9Forms();
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
    if (tab === 'contracts') {
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

  // Calculate stats for ConsolidatedStatsCards
  const totalContracts = contracts.length;
  const completedCount = contracts.filter(contract => contract.status === 'completed').length;
  const pendingCount = contracts.filter(contract => contract.status === 'pending' || contract.status === 'draft').length;
  
  // Prepare recent contracts with time ago formatting
  const recentContracts = contracts
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(contract => ({
      id: contract.id,
      title: contract.title,
      status: contract.status,
      timeAgo: formatDistanceToNow(new Date(contract.created_at), { addSuffix: true })
    }));

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
    console.log('🚀 Dashboard: handleUseTemplate called with template:', templateName);
    console.log('🚀 Dashboard: Template content length:', templateContent?.length);
    console.log('🚀 Dashboard: Contract type:', contractType);
    console.log('🚀 Dashboard: About to navigate to tour manager...');
    
    // Use window.location.href for navigation
    try {
      const targetUrl = `/tour-manager?tab=contracts&template=${encodeURIComponent(templateName)}`;
      console.log('🚀 Dashboard: Target URL:', targetUrl);
      console.log('🚀 Dashboard: Current location before navigation:', window.location.href);
      
      // Force navigation
      setTimeout(() => {
        console.log('🚀 Dashboard: Executing navigation now...');
        window.location.href = targetUrl;
      }, 100);
      
    } catch (error) {
      console.error('🚨 Navigation error:', error);
    }
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
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
              <h1 className="text-xl sm:text-xl lg:text-2xl font-bold text-foreground">Document Library</h1>
            </div>
            <Library />
            <DocumentManager />
          </div>
        );
      case "finance":
        console.log('Index: Rendering FinanceManagement component');
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
              <h1 className="text-xl sm:text-xl lg:text-2xl font-bold text-foreground">Finance Management</h1>
            </div>
            <FinanceManagement />
          </div>
        );
      case "contracts":
      default:
        console.log('Index: Rendering Contract Management');
        return (
          <div className="space-y-6 p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Contract Management</h1>
                  <p className="text-muted-foreground mt-2">Create, manage, and organize contracts</p>
                </div>
              </div>
              
              <ContractManagementInterface />
            </div>
          </div>
        );
    }
  };

  console.log('Index: About to render main component');

  return (
    <UniversalLayout containerized={false}>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="container mx-auto px-4 py-8">
          {/* Class Registration Banner */}
          <div className="mb-8">
            <Link to="/student-registration">
              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border-2 border-amber-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-primary-foreground/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Music className="h-8 w-8 text-primary-foreground" />
                      </div>
                      <div className="w-16 h-16 bg-primary-foreground/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-primary-foreground" />
                      </div>
                      <div className="w-16 h-16 bg-primary-foreground/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <GraduationCap className="h-8 w-8 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="text-primary-foreground">
                      <h2 className="text-4xl font-bold mb-2 drop-shadow-lg">
                        Survey of African American Music
                      </h2>
                      <p className="text-xl text-primary-foreground/90 mb-3 drop-shadow-md">
                        Spring 2024 Class Registration Now Open
                      </p>
                      <p className="text-lg text-primary-foreground/80 drop-shadow-md">
                        Explore the rich heritage and cultural impact of African American musical traditions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button 
                      size="lg" 
                      className="bg-background text-orange-600 hover:bg-background/90 font-bold text-lg px-8 py-4 shadow-xl"
                    >
                      REGISTER NOW
                      <ArrowRight className="ml-2 h-6 w-6" />
                    </Button>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Brand Header */}
          <div className="mb-8">
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 border border-border shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-primary mb-2">
                    GleeWorld Dashboard
                  </h1>
                  <p className="text-muted-foreground">
                    Spelman College Glee Club Management Platform
                  </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">GW</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-8">
            <div className="bg-card/60 backdrop-blur-sm rounded-lg p-2 border border-border shadow-md">
              <div className="flex gap-2">
                {[
                  { id: 'contracts', label: 'Contracts', icon: '📄' },
                  { id: 'library', label: 'Library', icon: '📚' },
                  { id: 'finance', label: 'Finance', icon: '💰' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                      ${activeTab === tab.id 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      }
                    `}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-card/60 backdrop-blur-sm rounded-lg border border-border shadow-lg p-6">
            {renderContent()}
          </div>
        </div>
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
