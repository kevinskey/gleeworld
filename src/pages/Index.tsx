
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Users, Edit, Loader2, Receipt } from "lucide-react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ContractTemplates } from "@/components/ContractTemplates";
import { SigningDashboard } from "@/components/SigningDashboard";
import { AdminPanel } from "@/components/AdminPanel";
import { ContractViewer } from "@/components/ContractViewer";
import { Header } from "@/components/Header";
import { StatsCards } from "@/components/StatsCards";
import { ContractsList } from "@/components/ContractsList";
import { W9FormsList } from "@/components/W9FormsList";
import { useContracts } from "@/hooks/useContracts";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNavigate } from "react-router-dom";
import type { Contract } from "@/hooks/useContracts";

const Index = () => {
  // Always call all hooks at the top level - never conditionally
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [templateContent, setTemplateContent] = useState<string>("");
  const [templateName, setTemplateName] = useState<string>("");
  const [templateHeaderImageUrl, setTemplateHeaderImageUrl] = useState<string>("");
  const [templateContractType, setTemplateContractType] = useState<string>("");
  
  const { user, loading: authLoading, signOut } = useAuth();
  const { displayName } = useUserProfile(user);
  const { contracts, loading, error, deleteContract, refetch, forceRefresh } = useContracts();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Single effect to handle page visibility changes (only refresh when returning to page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeTab === "dashboard") {
        console.log('Page became visible, refreshing contracts...');
        forceRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab, forceRefresh]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#55bbee' }}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return null;
  }

  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setIsViewerOpen(true);
  };

  const handleUseTemplate = (content: string, name: string, headerImageUrl?: string, contractType?: string) => {
    setTemplateContent(content);
    setTemplateName(name);
    setTemplateHeaderImageUrl(headerImageUrl || "");
    setTemplateContractType(contractType || "");
    setActiveTab("upload");
  };

  const handleContractCreated = () => {
    // Refresh contracts and switch to dashboard
    refetch();
    setActiveTab("dashboard");
  };

  const completedCount = contracts.filter(doc => doc.status === "completed").length;
  const pendingCount = contracts.filter(doc => doc.status !== "completed").length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#55bbee' }}>
      <Header 
        displayName={displayName || 'User'}
        onSignOut={handleSignOut}
        onNewContract={() => {
          setTemplateContent("");
          setTemplateName("");
          setTemplateHeaderImageUrl("");
          setTemplateContractType("");
          setActiveTab("upload");
        }}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-[500px]">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center space-x-2">
              <Edit className="h-4 w-4" />
              <span>Templates</span>
            </TabsTrigger>
            <TabsTrigger value="w9-forms" className="flex items-center space-x-2">
              <Receipt className="h-4 w-4" />
              <span>W9 Forms</span>
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Admin</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <StatsCards 
              totalContracts={contracts.length}
              completedCount={completedCount}
              pendingCount={pendingCount}
            />

            <ContractsList 
              contracts={contracts}
              loading={loading}
              error={error}
              onViewContract={handleViewContract}
              onDeleteContract={deleteContract}
              onUploadContract={() => setActiveTab("upload")}
              onRetry={refetch}
            />
          </TabsContent>

          <TabsContent value="upload">
            <DocumentUpload 
              templateContent={templateContent}
              templateName={templateName}
              headerImageUrl={templateHeaderImageUrl}
              contractType={templateContractType}
              onContractCreated={handleContractCreated}
            />
          </TabsContent>

          <TabsContent value="templates">
            <ContractTemplates 
              onUseTemplate={handleUseTemplate} 
              onContractCreated={handleContractCreated}
            />
          </TabsContent>

          <TabsContent value="w9-forms">
            <W9FormsList />
          </TabsContent>

          <TabsContent value="admin">
            <AdminPanel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Contract Viewer Dialog */}
      <ContractViewer 
        contract={selectedContract}
        open={isViewerOpen}
        onOpenChange={setIsViewerOpen}
      />
    </div>
  );
};

export default Index;
