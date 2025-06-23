import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, DollarSign } from "lucide-react";
import { Header } from "@/components/Header";
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
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { forceRefresh } = useContracts();

  const handleContractCreated = useCallback(() => {
    // Refresh contracts and templates after a new contract is created
    forceRefresh();
  }, [forceRefresh]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contract Management Dashboard</h1>
          <p className="text-gray-600">
            {userProfile?.role === 'super-admin' || userProfile?.role === 'admin' 
              ? 'Manage contracts, templates, and user accounts.' 
              : 'View your contracts and complete required forms.'}
          </p>
        </div>

        <StatsCards />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <ContractsList />
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

        <DocumentUpload onContractCreated={handleContractCreated} />
      </main>
    </div>
  );
};

export default Index;
