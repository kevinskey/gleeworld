
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Users, Settings, Plus, Eye, Send, Edit, Inbox, Loader2 } from "lucide-react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ContractTemplates } from "@/components/ContractTemplates";
import { SigningDashboard } from "@/components/SigningDashboard";
import { AdminPanel } from "@/components/AdminPanel";
import { useContracts } from "@/hooks/useContracts";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { contracts, loading } = useContracts();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "pending_recipient": return "bg-yellow-100 text-yellow-800";
      case "pending_sender": return "bg-blue-100 text-blue-800";
      case "draft": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "pending_recipient": return "Pending Recipient";
      case "pending_sender": return "Pending Your Signature";
      case "draft": return "Draft";
      default: return "Unknown";
    }
  };

  const completedCount = contracts.filter(doc => doc.status === "completed").length;
  const pendingCount = contracts.filter(doc => doc.status !== "completed").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">ContractFlow</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button size="sm" onClick={() => setActiveTab("upload")}>
                <Plus className="h-4 w-4 mr-2" />
                New Contract
              </Button>
            </div>
          </div>
        </div>
      </header>

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl font-bold">{contracts.length}</CardTitle>
                  <CardDescription className="text-blue-100">Total Contracts</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl font-bold">{completedCount}</CardTitle>
                  <CardDescription className="text-green-100">Completed</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl font-bold">{pendingCount}</CardTitle>
                  <CardDescription className="text-yellow-100">Pending</CardDescription>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Contracts</CardTitle>
                <CardDescription>Manage your contract signing workflow</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading contracts...</span>
                  </div>
                ) : contracts.length === 0 ? (
                  <div className="text-center py-12">
                    <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts yet</h3>
                    <p className="text-gray-500 mb-4">Upload your first contract to get started</p>
                    <Button onClick={() => setActiveTab("upload")}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Contract
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contracts.map((contract) => (
                      <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <FileText className="h-8 w-8 text-gray-400" />
                          <div>
                            <h3 className="font-medium text-gray-900">{contract.title}</h3>
                            <p className="text-sm text-gray-500">Status: {contract.status}</p>
                            <p className="text-xs text-gray-400">Created: {new Date(contract.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(contract.status)}>
                            {getStatusText(contract.status)}
                          </Badge>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload">
            <DocumentUpload />
          </TabsContent>

          <TabsContent value="templates">
            <ContractTemplates />
          </TabsContent>

          <TabsContent value="admin">
            <AdminPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
