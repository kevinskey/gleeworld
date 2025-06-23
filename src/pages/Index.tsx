
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Users, Edit, Loader2 } from "lucide-react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ContractTemplates } from "@/components/ContractTemplates";
import { SigningDashboard } from "@/components/SigningDashboard";
import { AdminPanel } from "@/components/AdminPanel";
import { ContractViewer } from "@/components/ContractViewer";
import { Header } from "@/components/Header";
import { StatsCards } from "@/components/StatsCards";
import { ContractsList } from "@/components/ContractsList";
import { useContracts } from "@/hooks/useContracts";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNavigate } from "react-router-dom";
import type { Contract } from "@/hooks/useContracts";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [templateContent, setTemplateContent] = useState<string>("");
  const [templateName, setTemplateName] = useState<string>("");
  const { contracts, loading, error, deleteContract, refetch } = useContracts();
  const { user, loading: authLoading, signOut } = useAuth();
  const { displayName } = useUserProfile(user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
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

  const handleUseTemplate = (content: string, name: string) => {
    setTemplateContent(content);
    setTemplateName(name);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header 
        displayName={displayName || 'User'}
        onSignOut={handleSignOut}
        onNewContract={() => {
          setTemplateContent("");
          setTemplateName("");
          setActiveTab("upload");
        }}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
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
              onContractCreated={handleContractCreated}
            />
          </TabsContent>

          <TabsContent value="templates">
            <ContractTemplates 
              onUseTemplate={handleUseTemplate} 
              onContractCreated={handleContractCreated}
            />
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
