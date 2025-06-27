
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
import { Shield, Users, Settings, FileText, Activity, Receipt, Home, Calculator } from "lucide-react";
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
    <div className="min-h-screen bg-gray-50">
      {/* New Admin Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-6 w-6" />
                Contract Manager
              </h1>
              <p className="text-sm text-gray-500">Welcome back, {userProfile?.display_name || user?.email}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handleUploadContract}
                className="bg-blue-600 hover:bg-blue-700"
              >
                New Contract
              </Button>
              
              <Button 
                onClick={signOut} 
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Sign Out
              </Button>
            </div>
          </div>

          {/* Admin Navigation Tabs */}
          {isAdmin && (
            <div className="border-t">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-7 h-12 bg-transparent rounded-none border-none">
                  <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                    <Home className="h-4 w-4" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                    <Users className="h-4 w-4" />
                    Users
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                    <FileText className="h-4 w-4" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                    <Activity className="h-4 w-4" />
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="receipts" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                    <Receipt className="h-4 w-4" />
                    Receipts
                  </TabsTrigger>
                  <TabsTrigger value="accounting" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                    <Calculator className="h-4 w-4" />
                    Accounting
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                    <Settings className="h-4 w-4" />
                    Settings
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsContent value="dashboard" className="space-y-8">
              {/* Dashboard Content */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
                <p className="text-lg text-gray-600">Manage contracts, templates, and user accounts.</p>
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
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
              <p className="text-lg text-gray-600">View your contracts and complete required forms.</p>
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

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    {templateData ? `Create Contract from Template: ${templateData.name}` : 'Upload New Contract'}
                  </h3>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowUpload(false);
                      setTemplateData(null);
                    }}
                    className="ml-4"
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
