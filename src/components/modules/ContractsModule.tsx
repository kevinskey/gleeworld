import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCheck, User, Calendar, DollarSign, Clock, Plus, FileText, Upload } from "lucide-react";
import { ModuleProps } from "@/types/unified-modules";
import { useContracts } from "@/hooks/useContracts";
import { ContractTypeSelectionDialog } from "@/components/dialogs/ContractTypeSelectionDialog";
import { ContractTemplates } from "@/components/ContractTemplates";
import { DocumentUpload } from "@/components/DocumentUpload";
import { useState } from "react";

export const ContractsModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const { contracts, loading } = useContracts();
  const [showContractTypeDialog, setShowContractTypeDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const handleContractTypeSelect = (type: string) => {
    console.log("Selected contract type:", type);
    // TODO: Implement contract creation logic for each type
  };

  const handleContractCreated = () => {
    console.log("Contract created");
    // Refresh contracts or update state as needed
  };

  const handleUseTemplate = (templateContent: string, templateName: string, headerImageUrl?: string, contractType?: string) => {
    console.log("Using template:", { templateName, contractType });
    // TODO: Implement template usage logic
  };

  const totalValue = contracts.length;
  const signedValue = contracts.filter(c => c.status === 'completed').length;

  if (loading) {
    return <div className="p-6">Loading contracts...</div>;
  }

  if (isFullPage) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Contracts Management</h1>
            <p className="text-muted-foreground">Create, manage, and track performance contracts</p>
          </div>
          <Button onClick={() => setShowContractTypeDialog(true)} className="pr-6">
            <FileCheck className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{contracts.length}</div>
                  <div className="text-sm text-muted-foreground">Total Contracts</div>
                </div>
                <FileCheck className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                 <div>
                   <div className="text-2xl font-bold">{contracts.filter(c => c.status === 'draft').length}</div>
                   <div className="text-sm text-muted-foreground">Draft Contracts</div>
                 </div>
                 <DollarSign className="h-8 w-8 text-green-500" />
               </div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="p-4">
               <div className="flex items-center justify-between">
                 <div>
                   <div className="text-2xl font-bold">{signedValue}</div>
                   <div className="text-sm text-muted-foreground">Completed</div>
                 </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{contracts.filter(c => c.status === 'pending').length}</div>
                  <div className="text-sm text-muted-foreground">Pending Review</div>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="upload">Upload Document</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contract Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contracts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No contracts found. Create your first contract to get started.
                    </div>
                  ) : (
                    contracts.map((contract) => (
                      <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <FileCheck className="h-5 w-5 text-blue-500" />
                          <div>
                            <div className="font-medium">{contract.title}</div>
                            <div className="text-sm text-muted-foreground">
                              Created on {new Date(contract.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={
                            contract.status === 'signed' ? 'default' : 
                            contract.status === 'pending' ? 'secondary' : 
                            contract.status === 'published' ? 'outline' : 'destructive'
                          }>
                            {contract.status}
                          </Badge>
                          <Button variant="ghost" size="sm">View</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <ContractTemplates 
              onUseTemplate={handleUseTemplate}
              onContractCreated={handleContractCreated}
            />
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Contract Document
                </CardTitle>
                <CardDescription>
                  Upload a PDF or Word document to create a new contract
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentUpload onContractCreated={handleContractCreated} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Contract
                </CardTitle>
                <CardDescription>
                  Start with a blank contract or choose from predefined types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: "tour", label: "SCGC Tour Contract", description: "For performances and tours outside of Atlanta", icon: FileCheck },
                    { id: "in-town", label: "SCGC In-Town Contract", description: "For local performances in Atlanta area", icon: Calendar },
                    { id: "stipend", label: "Singer Stipend Contract", description: "For individual singer compensation agreements", icon: DollarSign },
                    { id: "nda", label: "SCGC NDA Agreement", description: "Non-disclosure agreement for sensitive materials", icon: User },
                    { id: "custom", label: "Custom Contract", description: "Create a custom contract from scratch", icon: FileText },
                  ].map((type) => {
                    const Icon = type.icon;
                    return (
                      <Card 
                        key={type.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleContractTypeSelect(type.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Icon className="h-6 w-6 text-primary mt-1" />
                            <div className="flex-1">
                              <h3 className="font-medium mb-1">{type.label}</h3>
                              <p className="text-sm text-muted-foreground">
                                {type.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ContractTypeSelectionDialog
          open={showContractTypeDialog}
          onOpenChange={setShowContractTypeDialog}
          onSelectType={handleContractTypeSelect}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Contracts
        </CardTitle>
        <CardDescription>Create and manage contracts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm">{contracts.length} total contracts</div>
          <div className="text-sm">{contracts.filter(c => c.status === 'completed').length} completed</div>
          <div className="text-sm">{contracts.filter(c => c.status === 'pending').length} pending review</div>
        </div>
      </CardContent>
    </Card>
  );
};