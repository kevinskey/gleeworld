import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContractsList } from '@/components/ContractsList';
import { UserContractsList } from '@/components/user-dashboard/UserContractsList';
import { ContractViewer } from '@/components/ContractViewer';
import { DocumentUpload } from '@/components/DocumentUpload';
import { ContractTemplates } from '@/components/ContractTemplates';
import { TourContractTemplate } from './TourContractTemplate';
import { useContracts } from '@/hooks/useContracts';
import { FileText, Plus, Route } from 'lucide-react';
import type { Contract } from '@/hooks/useContracts';

interface ContractManagerProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
  initialContractData?: {
    host_name?: string;
    host_location?: string;
    host_signatory_name?: string;
    host_signatory_title?: string;
    host_department?: string;
    venue_name?: string;
    venue_address?: string;
    venue_contact?: string;
    venue_email?: string;
    venue_phone?: string;
    honorarium_amount?: number;
    deposit_amount?: number;
    start_date?: string;
    title?: string;
    location?: string;
  };
}

export const ContractManager = ({ user, initialContractData }: ContractManagerProps) => {
  const { contracts, loading, error, deleteContract, refetch } = useContracts();
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [contractViewerOpen, setContractViewerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialContractData ? 'tour-template' : 'all');

  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setContractViewerOpen(true);
  };

  const handleUploadContract = () => {
    // This would typically open a file upload dialog or modal
    console.log('Upload contract functionality');
  };

  const handleContractUpdated = (updatedContract: Contract) => {
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold">Tour Contracts</h3>
          <p className="text-xs text-muted-foreground">
            Manage contracts for performers, venues, and vendors
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap gap-1 bg-muted/50 p-1 h-auto">
          <TabsTrigger value="all" className="text-xs px-3 py-1.5">All Contracts</TabsTrigger>
          <TabsTrigger value="user" className="text-xs px-3 py-1.5">My Contracts</TabsTrigger>
          <TabsTrigger value="tour-template" className="flex items-center gap-1.5 text-xs px-3 py-1.5">
            <Route className="h-3.5 w-3.5" />
            <span>Tour Template</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs px-3 py-1.5">Templates</TabsTrigger>
          <TabsTrigger value="create" className="text-xs px-3 py-1.5">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <ContractsList
            contracts={contracts}
            loading={loading}
            error={error}
            onViewContract={handleViewContract}
            onDeleteContract={deleteContract}
            onUploadContract={handleUploadContract}
            onRetry={refetch}
            onContractUpdated={handleContractUpdated}
          />
        </TabsContent>

        <TabsContent value="tour-template" className="space-y-6">
          <TourContractTemplate initialData={initialContractData} />
        </TabsContent>

        <TabsContent value="user" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                My Contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserContractsList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <ContractTemplates 
            onContractCreated={refetch}
          />
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Contract
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentUpload />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ContractViewer 
        contract={selectedContract}
        open={contractViewerOpen}
        onOpenChange={setContractViewerOpen}
      />
    </div>
  );
};