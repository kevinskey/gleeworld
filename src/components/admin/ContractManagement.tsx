import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Search, Filter, Trash2, Eye, Send, Download, RefreshCw, Edit, Plus, FileImage } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getStatusColor, getStatusText } from "@/components/contracts/contractUtils";
import { EditContractTitleDialog } from "@/components/contracts/EditContractTitleDialog";
import { ContractCreationCollapsible } from "@/components/ContractCreationCollapsible";
import { ContractTemplatesCollapsible } from "@/components/ContractTemplatesCollapsible";

export const ContractManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState("all-contracts");
  
  // State for all contract types
  const [allContracts, setAllContracts] = useState<any[]>([]);
  const [contractSignatures, setContractSignatures] = useState<any[]>([]);
  const [contractTemplates, setContractTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [contractToEdit, setContractToEdit] = useState<any>(null);
  
  // Contract creation state
  const [showContractCreation, setShowContractCreation] = useState(false);
  const [creationMode, setCreationMode] = useState<'blank' | 'template'>('blank');

  // Fetch all contracts data for admin view
  const fetchAllContractsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all contracts from contracts_v2 with creator profiles
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts_v2')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch creator profiles separately if contracts exist
      let contractsWithProfiles = contractsData || [];
      if (contractsData && contractsData.length > 0) {
        const creatorIds = [...new Set(contractsData.map(c => c.created_by).filter(Boolean))];
        if (creatorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', creatorIds);

          contractsWithProfiles = contractsData.map(contract => ({
            ...contract,
            profiles: profilesData?.find(p => p.id === contract.created_by) || null
          }));
        }
      }

      if (contractsError) throw contractsError;

      // Fetch contract signatures with contract details
      const { data: signaturesData, error: signaturesError } = await supabase
        .from('contract_signatures_v2')
        .select(`
          *,
          contracts_v2!contract_signatures_v2_contract_id_fkey (
            title,
            created_at,
            created_by
          )
        `)
        .order('created_at', { ascending: false });

      // Add creator profiles to signatures
      let signaturesWithProfiles = signaturesData || [];
      if (signaturesData && signaturesData.length > 0) {
        const creatorIds = [...new Set(signaturesData
          .map(s => s.contracts_v2?.created_by)
          .filter(Boolean))];
        
        if (creatorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', creatorIds);

          signaturesWithProfiles = signaturesData.map(signature => ({
            ...signature,
            contracts_v2: signature.contracts_v2 ? {
              ...signature.contracts_v2,
              profiles: profilesData?.find(p => p.id === signature.contracts_v2.created_by) || null
            } : null
          }));
        }
      }

      if (signaturesError) throw signaturesError;

      // Fetch contract templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('contract_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      setAllContracts(contractsWithProfiles || []);
      setContractSignatures(signaturesWithProfiles || []);
      setContractTemplates(templatesData || []);
    } catch (error) {
      console.error('Error fetching contracts data:', error);
      setError('Failed to load contracts data');
      toast({
        title: "Error",
        description: "Failed to load contracts data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllContractsData();
    }
  }, [user]);

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case "all-contracts":
        return allContracts;
      case "signatures":
        return contractSignatures;
      case "templates":
        return contractTemplates;
      default:
        return allContracts;
    }
  };

  const currentData = getCurrentData();

  const handleDeleteContract = async (contractId: string) => {
    try {
      if (activeTab === "templates") {
        const { error } = await supabase
          .from('contract_templates')
          .delete()
          .eq('id', contractId);
        
        if (error) throw error;
        setContractTemplates(prev => prev.filter(t => t.id !== contractId));
      } else {
        // Delete contract and related data
        await supabase.from('contract_signatures_v2').delete().eq('contract_id', contractId);
        await supabase.from('contract_recipients_v2').delete().eq('contract_id', contractId);
        
        const { error } = await supabase
          .from('contracts_v2')
          .delete()
          .eq('id', contractId);
        
        if (error) throw error;
        setAllContracts(prev => prev.filter(c => c.id !== contractId));
        setContractSignatures(prev => prev.filter(s => s.contract_id !== contractId));
      }
      
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const handleSelectContract = (contractId: string, checked: boolean) => {
    setSelectedContracts(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(contractId);
      } else {
        newSet.delete(contractId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContracts(new Set(filteredContracts.map(c => c.id)));
    } else {
      setSelectedContracts(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContracts.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedContracts.size} selected item(s)?`)) {
      for (const contractId of selectedContracts) {
        await handleDeleteContract(contractId);
      }
      setSelectedContracts(new Set());
      toast({
        title: "Success",
        description: `${selectedContracts.size} item(s) deleted successfully`,
      });
    }
  };

  const handleViewContract = (contract: any) => {
    // Open contract in a new window/tab for viewing
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${contract.title || contract.name || 'Contract'}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
              h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
              .contract-content { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>${contract.title || contract.name || 'Contract'}</h1>
            <div class="contract-content">${contract.content || contract.template_content || 'No content available'}</div>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
    
    toast({
      title: "Contract Opened",
      description: `Viewing: ${contract.title || contract.name || 'Contract'}`,
    });
  };

  const handleSendContract = (contract: any) => {
    // Placeholder for send contract functionality
    toast({
      title: "Send Contract",
      description: `Send functionality for "${contract.title || contract.name}" would be implemented here`,
    });
  };

  const handleDownloadContract = (contract: any) => {
    // Create a simple text download of the contract
    const element = document.createElement("a");
    const content = contract.content || contract.template_content || '';
    const title = contract.title || contract.name || 'contract';
    const file = new Blob([`${title}\n\n${content}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Download Started",
      description: `Downloading: ${title}`,
    });
  };

  const handleEditContract = (contract: any) => {
    setContractToEdit(contract);
    setEditDialogOpen(true);
  };

  const handleContractUpdated = (updatedContract: any) => {
    if (activeTab === "all-contracts") {
      setAllContracts(prev => prev.map(c => c.id === updatedContract.id ? { ...c, ...updatedContract } : c));
    }
    if (activeTab === "templates") {
      setContractTemplates(prev => prev.map(t => t.id === updatedContract.id ? { ...t, ...updatedContract } : t));
    }
    // Refresh data to ensure consistency
    fetchAllContractsData();
  };

  const handleCreateContractFromBlank = () => {
    setCreationMode('blank');
    setShowContractCreation(true);
  };

  const handleCreateContractFromTemplate = () => {
    setCreationMode('template');
    setShowContractCreation(true);
  };

  const handleContractCreated = () => {
    setShowContractCreation(false);
    fetchAllContractsData();
    toast({
      title: "Success",
      description: "Contract created successfully",
    });
  };

  const handleUseTemplate = (templateContent: string, templateName: string, headerImageUrl?: string, contractType?: string) => {
    // In the admin panel, templates should create contracts directly
    // This fallback shouldn't normally be called since the TemplateDialogsManager handles direct creation
    console.log('Admin panel template fallback called for:', templateName);
    
    // Close the template selection and show a message
    setShowContractCreation(false);
    toast({
      title: "Template Applied",
      description: `Template "${templateName}" was applied but needs recipient information. Please create a contract manually or try again.`,
      variant: "destructive",
    });
  };

  // Filter and sort current data
  const filteredContracts = currentData.filter(item => {
    const title = activeTab === "signatures" 
      ? item.contracts_v2?.title || "Untitled"
      : item.title || item.name || "Untitled";
    const content = activeTab === "signatures" 
      ? `${item.status} ${item.contracts_v2?.profiles?.full_name || ''}`
      : item.content || item.template_content || "";
    
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const aValue = a[sortBy as keyof typeof a];
    const bValue = b[sortBy as keyof typeof b];
    
    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "pending_admin_signature", label: "Pending Admin Signature" },
    { value: "pending_artist_signature", label: "Pending Artist Signature" },
    { value: "completed", label: "Completed" },
    { value: "archived", label: "Archived" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" }
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Contracts Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading all contracts data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Contracts Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchAllContractsData} variant="secondary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contract Creation Section */}
      {showContractCreation && (
        <div className="space-y-4">
          {creationMode === 'blank' ? (
            <ContractCreationCollapsible 
              onContractCreated={handleContractCreated}
            />
          ) : (
            <ContractTemplatesCollapsible
              onUseTemplate={handleUseTemplate}
              onContractCreated={handleContractCreated}
            />
          )}
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowContractCreation(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {/* Main Management Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                All Contracts Management
              </CardTitle>
              <CardDescription>
                Comprehensive management of all contracts, signatures, and templates ({filteredContracts.length} of {currentData.length} items)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateContractFromBlank} variant="default" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create from Blank
              </Button>
              <Button onClick={handleCreateContractFromTemplate} variant="outline" size="sm">
                <FileImage className="h-4 w-4 mr-2" />
                Create from Template
              </Button>
              <Button onClick={fetchAllContractsData} variant="secondary" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={activeTab === "all-contracts" ? "default" : "outline"}
              onClick={() => {
                setActiveTab("all-contracts");
                setSelectedContracts(new Set());
              }}
              size="sm"
            >
              All Contracts ({allContracts.length})
            </Button>
            <Button
              variant={activeTab === "signatures" ? "default" : "outline"}
              onClick={() => {
                setActiveTab("signatures");
                setSelectedContracts(new Set());
              }}
              size="sm"
            >
              Signatures ({contractSignatures.length})
            </Button>
            <Button
              variant={activeTab === "templates" ? "default" : "outline"}
              onClick={() => {
                setActiveTab("templates");
                setSelectedContracts(new Set());
              }}
              size="sm"
            >
              Templates ({contractTemplates.length})
            </Button>
          </div>
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contracts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field);
              setSortOrder(order as "asc" | "desc");
            }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="title-asc">Title A-Z</SelectItem>
                <SelectItem value="title-desc">Title Z-A</SelectItem>
                <SelectItem value="status-asc">Status A-Z</SelectItem>
                <SelectItem value="updated_at-desc">Recently Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedContracts.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 border border-muted-foreground/20 rounded-lg">
              <span className="text-sm font-medium text-foreground">
                {selectedContracts.size} item(s) selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setSelectedContracts(new Set())}>
                  Clear Selection
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {/* Contract List */}
          <div className="space-y-2">
            {/* Select All Header */}
            <div className="flex items-center gap-3 p-3 border-b">
              <Checkbox
                checked={selectedContracts.size === filteredContracts.length && filteredContracts.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">Select All</span>
            </div>

            {filteredContracts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || statusFilter !== "all" ? (
                  <>
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No {activeTab.replace('-', ' ')} match your current filters</p>
                    <Button 
                      variant="secondary" 
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                      }}
                      className="mt-2"
                    >
                      Clear Filters
                    </Button>
                  </>
                ) : (
                  <>
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No {activeTab.replace('-', ' ')} found</p>
                  </>
                )}
              </div>
            ) : (
              filteredContracts.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:shadow-md transition-all duration-200 gap-3 bg-white"
                >
                  <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
                    <Checkbox
                      checked={selectedContracts.has(item.id)}
                      onCheckedChange={(checked) => handleSelectContract(item.id, checked as boolean)}
                      className="mt-1 sm:mt-0"
                    />
                    <FileText className="h-5 w-5 text-brand-500 flex-shrink-0 mt-1 sm:mt-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {activeTab === "signatures" 
                          ? item.contracts_v2?.title || "Untitled Contract"
                          : item.title || item.name || "Untitled"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                        {item.updated_at !== item.created_at && (
                          <span>• Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
                        )}
                        <span>• ID: {item.id.slice(0, 8)}...</span>
                        {activeTab === "signatures" && item.contracts_v2?.profiles?.full_name && (
                          <span>• Creator: {item.contracts_v2.profiles.full_name}</span>
                        )}
                        {activeTab === "all-contracts" && item.profiles?.full_name && (
                          <span>• Creator: {item.profiles.full_name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-shrink-0">
                    <Badge className={`${getStatusColor(item.status)} text-xs`}>
                      {getStatusText(item.status)}
                    </Badge>

                    <div className="flex space-x-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          if (activeTab === "signatures") {
                            handleViewContract({ 
                              title: item.contracts_v2?.title || "Contract",
                              content: `Contract ID: ${item.contract_id}\nStatus: ${item.status}\nSigned At: ${item.artist_signed_at ? new Date(item.artist_signed_at).toLocaleString() : 'Not signed'}`
                            });
                          } else {
                            handleViewContract(item);
                          }
                        }}
                        title="View Details"
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      {(activeTab === "all-contracts" || activeTab === "templates") && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditContract(item)}
                          title="Edit Title"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {activeTab !== "signatures" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSendContract(item)}
                          title="Send Contract"
                          className="h-8 w-8 p-0"
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownloadContract(item)}
                        title="Download"
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete this ${activeTab === "templates" ? "template" : activeTab === "signatures" ? "signature record" : "contract"}?`)) {
                            handleDeleteContract(item.id);
                          }
                        }}
                        className="h-8 w-8 p-0"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Contract Dialog */}
      <EditContractTitleDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        contract={contractToEdit}
        onContractUpdated={handleContractUpdated}
      />
    </div>
  );
};