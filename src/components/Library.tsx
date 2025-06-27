import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileText, Calendar, User, Eye, Download, Trash2, Edit } from "lucide-react";
import { useContracts } from "@/hooks/useContracts";
import { useContractTemplates } from "@/hooks/useContractTemplates";
import { useW9Forms } from "@/hooks/useW9Forms";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { W9PreviewDialog } from "./W9PreviewDialog";
import { ContractViewer } from "./ContractViewer";
import { ViewTemplateDialog } from "./templates/ViewTemplateDialog";

interface LibraryItem {
  id: string;
  title: string;
  type: 'contract' | 'template' | 'w9';
  status?: string;
  contract_type?: string;
  created_at: string;
  created_by?: string;
  user_id?: string;
  storage_path?: string;
  content?: string;
  updated_at?: string;
}

export const Library = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [previewForm, setPreviewForm] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [contractViewerOpen, setContractViewerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateViewerOpen, setTemplateViewerOpen] = useState(false);
  const navigate = useNavigate();
  
  const { contracts, loading: contractsLoading } = useContracts();
  const { templates, loading: templatesLoading } = useContractTemplates();
  const { w9Forms, loading: w9Loading, downloadW9Form, deleteW9Form } = useW9Forms();

  console.log('Library component - W9 forms data:', {
    w9Forms,
    count: w9Forms?.length || 0,
    loading: w9Loading
  });

  // Combine all documents into a single array
  const allItems: LibraryItem[] = useMemo(() => {
    const contractItems = contracts.map(contract => ({
      id: contract.id,
      title: contract.title,
      type: 'contract' as const,
      status: contract.status,
      created_at: contract.created_at,
      created_by: contract.created_by,
      content: contract.content,
      updated_at: contract.updated_at,
    }));

    const templateItems = templates.map(template => ({
      id: template.id,
      title: template.name,
      type: 'template' as const,
      contract_type: template.contract_type,
      created_at: template.created_at,
      created_by: template.created_by,
    }));

    const w9Items = w9Forms.map(form => ({
      id: form.id,
      title: `W9 Form - ${new Date(form.created_at).toLocaleDateString()}`,
      type: 'w9' as const,
      status: form.status,
      created_at: form.created_at,
      user_id: form.user_id,
      storage_path: form.storage_path,
    }));

    console.log('Library - All items before sorting:', {
      contracts: contractItems.length,
      templates: templateItems.length,
      w9Forms: w9Items.length,
      total: [...contractItems, ...templateItems, ...w9Items].length
    });

    return [...contractItems, ...templateItems, ...w9Items].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [contracts, templates, w9Forms]);

  // Filter items based on search term and type
  const filteredItems = useMemo(() => {
    const filtered = allItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.contract_type?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = selectedType === "all" || item.type === selectedType;
      
      return matchesSearch && matchesType;
    });

    console.log('Library - Filtered items:', {
      searchTerm,
      selectedType,
      filteredCount: filtered.length,
      totalCount: allItems.length,
      w9Count: filtered.filter(item => item.type === 'w9').length
    });

    return filtered;
  }, [allItems, searchTerm, selectedType]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'contract':
        return 'bg-blue-500/20 text-blue-400';
      case 'template':
        return 'bg-green-500/20 text-green-400';
      case 'w9':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'draft':
        return 'bg-gray-500/20 text-gray-400';
      case 'submitted':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-blue-500/20 text-blue-400';
    }
  };

  const handlePreviewW9 = (item: LibraryItem) => {
    const w9Form = w9Forms.find(form => form.id === item.id);
    if (w9Form) {
      setPreviewForm(w9Form);
      setShowPreview(true);
    }
  };

  const handlePreviewContract = (item: LibraryItem) => {
    const contract = contracts.find(c => c.id === item.id);
    if (contract) {
      setSelectedContract(contract);
      setContractViewerOpen(true);
    }
  };

  const handlePreviewTemplate = (item: LibraryItem) => {
    const template = templates.find(t => t.id === item.id);
    if (template) {
      console.log('Previewing template:', template.name);
      setSelectedTemplate(template);
      setTemplateViewerOpen(true);
    }
  };

  const handleDownloadW9 = async (item: LibraryItem) => {
    const w9Form = w9Forms.find(form => form.id === item.id);
    if (w9Form) {
      console.log('Downloading W9 form:', w9Form.id);
      await downloadW9Form(w9Form);
    }
  };

  const handleDeleteW9 = async (item: LibraryItem) => {
    console.log('Deleting W9 form:', item.id);
    await deleteW9Form(item.id);
  };

  const handleViewItem = (item: LibraryItem) => {
    console.log('Viewing item:', item.type, item.id);
    if (item.type === 'w9') {
      handlePreviewW9(item);
    } else if (item.type === 'contract') {
      handlePreviewContract(item);
    } else if (item.type === 'template') {
      handlePreviewTemplate(item);
    } else {
      console.log('View action for', item.type, 'not implemented yet');
    }
  };

  const handleEditItem = (item: LibraryItem) => {
    console.log('Editing item:', item.type, item.id);
    if (item.type === 'contract') {
      // Navigate to contract creation page with edit mode
      navigate(`/?edit-contract=${item.id}`);
    } else if (item.type === 'template') {
      // Navigate to templates page with edit mode
      navigate(`/?edit-template=${item.id}`);
    } else if (item.type === 'w9') {
      // Navigate to W9 form page to create a new one (W9s can't be edited once submitted)
      navigate('/w9-form');
    }
  };

  const loading = contractsLoading || templatesLoading || w9Loading;

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gradient mb-2">Document Library</h2>
            <p className="text-lg text-white/70">Search and manage all your contracts, templates, and W9 forms.</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{filteredItems.length}</p>
            <p className="text-sm text-white/70">Documents</p>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              placeholder="Search by title, status, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedType === "all" ? "default" : "outline"}
              onClick={() => setSelectedType("all")}
              className={selectedType === "all" ? "bg-spelman-500" : "border-white/20 text-white/70 hover:bg-white/10"}
            >
              All ({allItems.length})
            </Button>
            <Button
              variant={selectedType === "contract" ? "default" : "outline"}
              onClick={() => setSelectedType("contract")}
              className={selectedType === "contract" ? "bg-spelman-500" : "border-white/20 text-white/70 hover:bg-white/10"}
            >
              Contracts ({allItems.filter(item => item.type === 'contract').length})
            </Button>
            <Button
              variant={selectedType === "template" ? "default" : "outline"}
              onClick={() => setSelectedType("template")}
              className={selectedType === "template" ? "bg-spelman-500" : "border-white/20 text-white/70 hover:bg-white/10"}
            >
              Templates ({allItems.filter(item => item.type === 'template').length})
            </Button>
            <Button
              variant={selectedType === "w9" ? "default" : "outline"}
              onClick={() => setSelectedType("w9")}
              className={selectedType === "w9" ? "bg-spelman-500" : "border-white/20 text-white/70 hover:bg-white/10"}
            >
              W9 Forms ({allItems.filter(item => item.type === 'w9').length})
            </Button>
          </div>
        </div>

        {/* Debug Information */}
        {selectedType === "w9" && (
          <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
            <p className="text-sm text-white/70">
              Debug: W9 Forms loaded: {w9Forms.length}, Loading: {w9Loading ? 'Yes' : 'No'}
            </p>
          </div>
        )}

        {/* Documents Table */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spelman-400 mx-auto mb-4"></div>
            <p className="text-white/70">Loading documents...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/70 mb-2">No documents found</p>
            <p className="text-white/50 text-sm">
              {selectedType === "all" 
                ? "Try adjusting your search terms or filters" 
                : `No ${selectedType} documents match your search`}
            </p>
            {selectedType === "w9" && (
              <Button 
                onClick={() => navigate('/w9-form')} 
                className="mt-4 bg-spelman-500 hover:bg-spelman-600"
              >
                Create New W9 Form
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-white/20 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/20 hover:bg-white/5">
                  <TableHead className="text-white/80">Document</TableHead>
                  <TableHead className="text-white/80">Type</TableHead>
                  <TableHead className="text-white/80">Status</TableHead>
                  <TableHead className="text-white/80">Created</TableHead>
                  <TableHead className="text-white/80">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={`${item.type}-${item.id}`} className="border-white/20 hover:bg-white/5">
                    <TableCell className="text-white">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-spelman-400" />
                        <span className="font-medium">{item.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getTypeColor(item.type)} border-0`}>
                        {item.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.status && (
                        <Badge className={`${getStatusColor(item.status)} border-0`}>
                          {item.status}
                        </Badge>
                      )}
                      {item.contract_type && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-0 ml-2">
                          {item.contract_type}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-white/70">
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewItem(item)}
                          className="text-white/70 hover:text-white hover:bg-white/10"
                          title={item.type === 'w9' ? "Preview W9" : item.type === 'contract' ? "Preview Contract" : "View/Download"}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                          className="text-white/70 hover:text-white hover:bg-white/10"
                          title={item.type === 'w9' ? "Create New W9" : `Edit ${item.type}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {item.type === 'w9' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadW9(item)}
                              className="text-white/70 hover:text-white hover:bg-white/10"
                              title="Download W9"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteW9(item)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              title="Delete W9"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        {item.type !== 'w9' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadW9(item)}
                            className="text-white/70 hover:text-white hover:bg-white/10"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <W9PreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        form={previewForm}
        onDownload={() => {
          if (previewForm) {
            handleDownloadW9({ id: previewForm.id, type: 'w9' } as LibraryItem);
          }
        }}
      />

      <ContractViewer 
        contract={selectedContract}
        open={contractViewerOpen}
        onOpenChange={setContractViewerOpen}
      />

      <ViewTemplateDialog
        isOpen={templateViewerOpen}
        onOpenChange={setTemplateViewerOpen}
        template={selectedTemplate}
        onUseTemplate={(template) => {
          console.log('Using template from library:', template.name);
          setTemplateViewerOpen(false);
          // Navigate to main page or show success message
          navigate('/');
        }}
      />
    </div>
  );
};
