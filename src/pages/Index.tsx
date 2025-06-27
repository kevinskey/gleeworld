
import { useState, useCallback } from "react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ContractsList } from "@/components/ContractsList";
import { ContractViewer } from "@/components/ContractViewer";
import { StatsCards } from "@/components/StatsCards";
import { ContractTemplatesCollapsible } from "@/components/ContractTemplatesCollapsible";
import { W9FormsListCollapsible } from "@/components/W9FormsListCollapsible";
import { AccountingCardCollapsible } from "@/components/AccountingCardCollapsible";
import { AdminPanel } from "@/components/AdminPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useContracts } from "@/hooks/useContracts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Settings, FileText, Activity, Receipt, Home, Calculator, Sparkles } from "lucide-react";
import type { Contract } from "@/hooks/useContracts";

const Index = () => {
  const { user, signOut } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { contracts, loading, error, forceRefresh, deleteContract } = useContracts();
  const [showUpload, setShowUpload] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showContractViewer, setShowContractViewer] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [templateData, setTemplateData] = useState<{
    content: string;
    name: string;
    headerImageUrl?: string;
    contractType?: string;
  } | null>(null);

  const handleContractCreated = useCallback(() => {
    console.log('Contract created, refreshing and closing upload modal');
    forceRefresh();
    setShowUpload(false);
    setTemplateData(null);
  }, [forceRefresh]);

  const handleViewContract = (contract: Contract) => {
    console.log('Viewing contract:', contract);
    setSelectedContract(contract);
    setShowContractViewer(true);
  };

  const handleDeleteContract = async (contractId: string) => {
    await deleteContract(contractId);
  };

  const handleUploadContract = () => {
    setTemplateData(null);
    setShowUpload(true);
  };

  const handleUseTemplate = (templateContent: string, templateName: string, headerImageUrl?: string, contractType?: string) => {
    console.log('Using template in Index:', { templateName, templateContent });
    setTemplateData({
      content: templateContent,
      name: templateName,
      headerImageUrl,
      contractType
    });
    setShowUpload(true);
  };

  const completedContracts = contracts.filter(c => c.status === 'completed');
  const pendingContracts = contracts.filter(c => c.status !== 'completed');
  const isAdmin = userProfile?.role === 'super-admin' || userProfile?.role === 'admin';

  return (
    <div className="min-h-screen">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-spelman-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-spelman-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Glass Header */}
      <header className="glass-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
                <Shield className="h-6 w-6 text-spelman-400" />
                Contract Manager
                <Sparkles className="h-4 w-4 text-spelman-300 animate-pulse" />
              </h1>
              <p className="text-sm text-white/70">Welcome back, {userProfile?.display_name || user?.email}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handleUploadContract}
                className="glass-button text-white font-medium"
              >
                New Contract
              </Button>
              
              <Button 
                onClick={signOut} 
                variant="outline"
                className="glass border-red-400/30 text-red-300 hover:bg-red-500/20 hover:border-red-400/50"
              >
                Sign Out
              </Button>
            </div>
          </div>

          {/* Admin Navigation Tabs with Glass Effect */}
          {isAdmin && (
            <div className="border-t border-white/10">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-7 h-12 bg-transparent rounded-none border-none">
                  <TabsTrigger value="dashboard" className="flex items-center gap-2 text-white/70 hover:text-white data-[state=active]:bg-spelman-700/50 data-[state=active]:text-white data-[state=active]:backdrop-blur-sm">
                    <Home className="h-4 w-4" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-2 text-white/70 hover:text-white data-[state=active]:bg-spelman-700/50 data-[state=active]:text-white data-[state=active]:backdrop-blur-sm">
                    <Users className="h-4 w-4" />
                    Users
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="flex items-center gap-2 text-white/70 hover:text-white data-[state=active]:bg-spelman-700/50 data-[state=active]:text-white data-[state=active]:backdrop-blur-sm">
                    <FileText className="h-4 w-4" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-2 text-white/70 hover:text-white data-[state=active]:bg-spelman-700/50 data-[state=active]:text-white data-[state=active]:backdrop-blur-sm">
                    <Activity className="h-4 w-4" />
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="receipts" className="flex items-center gap-2 text-white/70 hover:text-white data-[state=active]:bg-spelman-700/50 data-[state=active]:text-white data-[state=active]:backdrop-blur-sm">
                    <Receipt className="h-4 w-4" />
                    Receipts
                  </TabsTrigger>
                  <TabsTrigger value="accounting" className="flex items-center gap-2 text-white/70 hover:text-white data-[state=active]:bg-spelman-700/50 data-[state=active]:text-white data-[state=active]:backdrop-blur-sm">
                    <Calculator className="h-4 w-4" />
                    Accounting
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center gap-2 text-white/70 hover:text-white data-[state=active]:bg-spelman-700/50 data-[state=active]:text-white data-[state=active]:backdrop-blur-sm">
                    <Settings className="h-4 w-4" />
                    Settings
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
        </div>
      </header>
      
      {/* Main Content with Glass Cards */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {isAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsContent value="dashboard" className="space-y-8">
              {/* Dashboard Content */}
              <div className="mb-8 glass-card p-6">
                <h2 className="text-3xl font-bold text-gradient mb-2">Dashboard</h2>
                <p className="text-lg text-white/70">Manage contracts, templates, and user accounts.</p>
              </div>

              {/* Stats Overview */}
              <StatsCards 
                totalContracts={contracts.length}
                completedCount={completedContracts.length}
                pendingCount={pendingContracts.length}
              />

              {/* Contracts Section */}
              <ContractsList 
                contracts={contracts}
                loading={loading}
                error={error}
                onViewContract={handleViewContract}
                onDeleteContract={handleDeleteContract}
                onUploadContract={handleUploadContract}
                onRetry={forceRefresh}
              />

              {/* W9 Forms */}
              <W9FormsListCollapsible />
            </TabsContent>

            <TabsContent value="templates" className="space-y-8">
              <div className="grid grid-cols-1 gap-8">
                <ContractTemplatesCollapsible 
                  onUseTemplate={handleUseTemplate}
                  onContractCreated={handleContractCreated}
                />
              </div>
            </TabsContent>

            {/* Admin Panel Integration */}
            <TabsContent value="users" className="space-y-6">
              <AdminPanel activeTab="users" />
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <AdminPanel activeTab="activity" />
            </TabsContent>

            <TabsContent value="receipts" className="space-y-6">
              <AdminPanel activeTab="receipts" />
            </TabsContent>

            <TabsContent value="accounting" className="space-y-6">
              <AdminPanel activeTab="accounting" />
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <AdminPanel activeTab="settings" />
            </TabsContent>
          </Tabs>
        ) : (
          // Non-Admin View
          <div className="space-y-8">
            <div className="mb-8 glass-card p-6">
              <h2 className="text-3xl font-bold text-gradient mb-2">Dashboard</h2>
              <p className="text-lg text-white/70">View your contracts and complete required forms.</p>
            </div>

            {/* Stats Overview */}
            <StatsCards 
              totalContracts={contracts.length}
              completedCount={completedContracts.length}
              pendingCount={pendingContracts.length}
            />

            {/* Contracts Section */}
            <ContractsList 
              contracts={contracts}
              loading={loading}
              error={error}
              onViewContract={handleViewContract}
              onDeleteContract={handleDeleteContract}
              onUploadContract={handleUploadContract}
              onRetry={forceRefresh}
            />

            {/* W9 Forms for Non-Admin */}
            <W9FormsListCollapsible />
          </div>
        )}

        {/* Upload Modal with Glass Effect */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {templateData ? `Create Contract from Template: ${templateData.name}` : 'Upload New Contract'}
                  </h3>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowUpload(false);
                      setTemplateData(null);
                    }}
                    className="ml-4 glass border-white/20 text-white/80 hover:bg-white/10"
                  >
                    Close
                  </Button>
                </div>
                <DocumentUpload 
                  onContractCreated={handleContractCreated}
                  templateContent={templateData?.content}
                  templateName={templateData?.name}
                  headerImageUrl={templateData?.headerImageUrl}
                  contractType={templateData?.contractType}
                />
              </div>
            </div>
          </div>
        )}

        {/* Contract Viewer Modal */}
        <ContractViewer
          contract={selectedContract}
          open={showContractViewer}
          onOpenChange={setShowContractViewer}
        />
      </main>
    </div>
  );
};

export default Index;
