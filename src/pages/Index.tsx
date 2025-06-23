
import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, DollarSign } from "lucide-react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ContractsList } from "@/components/ContractsList";
import { AdminPanel } from "@/components/AdminPanel";
import { StatsCards } from "@/components/StatsCards";
import { ContractTemplates } from "@/components/ContractTemplates";
import { W9FormsList } from "@/components/W9FormsList";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useContracts } from "@/hooks/useContracts";

const Index = () => {
  const { user, signOut } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { contracts, loading, error, forceRefresh, deleteContract } = useContracts();
  const [showUpload, setShowUpload] = useState(false);

  const handleContractCreated = useCallback(() => {
    forceRefresh();
  }, [forceRefresh]);

  const handleViewContract = (contract: any) => {
    // Handle contract viewing
    console.log('Viewing contract:', contract);
  };

  const handleDeleteContract = async (contractId: string) => {
    await deleteContract(contractId);
  };

  const handleUploadContract = () => {
    setShowUpload(true);
  };

  const completedContracts = contracts.filter(c => c.status === 'completed');
  const pendingContracts = contracts.filter(c => c.status !== 'completed');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contract Manager</h1>
              <p className="text-sm text-gray-500">Welcome back, {userProfile?.display_name || user?.email}</p>
            </div>
            
            <div className="flex items-center space-x-4">
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
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contract Management Dashboard</h1>
          <p className="text-gray-600">
            {userProfile?.role === 'super-admin' || userProfile?.role === 'admin' 
              ? 'Manage contracts, templates, and user accounts.' 
              : 'View your contracts and complete required forms.'}
          </p>
        </div>

        <StatsCards 
          totalContracts={contracts.length}
          completedCount={completedContracts.length}
          pendingCount={pendingContracts.length}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <ContractsList 
            contracts={contracts}
            loading={loading}
            error={error}
            onViewContract={handleViewContract}
            onDeleteContract={handleDeleteContract}
            onUploadContract={handleUploadContract}
            onRetry={forceRefresh}
          />
          <W9FormsList />
        </div>

        {(userProfile?.role === 'super-admin' || userProfile?.role === 'admin') && (
          <>
            <div className="mb-8">
              <ContractTemplates />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Accounting
                  </CardTitle>
                  <CardDescription>
                    Track stipends and contract payments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    View detailed accounting information for all signed contracts with stipend amounts.
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/accounting">
                      <DollarSign className="h-4 w-4 mr-2" />
                      View Accounting
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              
              <AdminPanel />
            </div>
          </>
        )}

        {showUpload && (
          <DocumentUpload onContractCreated={handleContractCreated} />
        )}
      </main>
    </div>
  );
};

export default Index;
