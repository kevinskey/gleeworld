import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown,
  Archive, 
  Users, 
  Edit, 
  Trash2, 
  Copy,
  Eye,
  Calendar,
  Tag,
  AlertCircle
} from "lucide-react";
import { useContractManagement, Contract } from '@/hooks/useContractManagement';
import { ContractForm } from './ContractForm';
import { ContractDetails } from './ContractDetails';
import { ContractMemberManagement } from './ContractMemberManagement';

export const ContractManagementInterface = () => {
  const {
    contracts,
    loading,
    filters,
    sort,
    setFilters,
    setSort,
    createContract,
    updateContract,
    deleteContract,
    archiveContract,
    unarchiveContract,
    duplicateContract
  } = useContractManagement();

  const [activeTab, setActiveTab] = useState("all");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const filteredContracts = contracts.filter(contract => {
    if (activeTab === 'archived') return contract.archived;
    if (activeTab === 'active') return !contract.archived && contract.status === 'active';
    if (activeTab === 'pending') return !contract.archived && contract.status === 'pending';
    if (activeTab === 'draft') return !contract.archived && contract.status === 'draft';
    return !contract.archived; // 'all' tab
  });

  const handleCreateContract = async (data: Partial<Contract>) => {
    try {
      await createContract(data);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create contract:', error);
    }
  };

  const handleUpdateContract = async (data: Partial<Contract>) => {
    if (!editingContract) return;
    try {
      await updateContract(editingContract.id, data);
      setEditingContract(null);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to update contract:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showForm) {
    return (
      <ContractForm
        contract={editingContract}
        onSubmit={editingContract ? handleUpdateContract : handleCreateContract}
        onCancel={() => {
          setShowForm(false);
          setEditingContract(null);
        }}
      />
    );
  }

  if (selectedContract && !showMembers) {
    return (
      <ContractDetails
        contract={selectedContract}
        onClose={() => setSelectedContract(null)}
        onEdit={(contract) => {
          setEditingContract(contract);
          setShowForm(true);
        }}
        onManageMembers={(contract) => {
          setSelectedContract(contract);
          setShowMembers(true);
        }}
      />
    );
  }

  if (showMembers && selectedContract) {
    return (
      <ContractMemberManagement
        contract={selectedContract}
        onClose={() => {
          setShowMembers(false);
          setSelectedContract(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contract Management</h1>
          <p className="text-muted-foreground">Create, manage, and organize contracts</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Contracts</p>
                <p className="text-2xl font-bold">{contracts.filter(c => !c.archived).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{contracts.filter(c => !c.archived && c.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{contracts.filter(c => !c.archived && c.status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Archive className="h-8 w-8 text-gray-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Archived</p>
                <p className="text-2xl font-bold">{contracts.filter(c => c.archived).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contracts..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filters.status || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value || undefined }))}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.priority || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value || undefined }))}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort.field} onValueChange={(value: any) => setSort(prev => ({ ...prev, field: value }))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at">Last Updated</SelectItem>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="due_date">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSort(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredContracts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No contracts found</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === 'archived' 
                    ? "No archived contracts available."
                    : "Get started by creating your first contract."
                  }
                </p>
                {activeTab !== 'archived' && (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Contract
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredContracts.map((contract) => (
                <Card key={contract.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-medium">{contract.title}</h3>
                          <Badge className={statusColors[contract.status]}>
                            {contract.status}
                          </Badge>
                          <Badge className={priorityColors[contract.priority]}>
                            {contract.priority}
                          </Badge>
                          {contract.tags && contract.tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                          {contract.content.substring(0, 150)}...
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Type: {contract.contract_type}</span>
                          <span>Updated: {new Date(contract.updated_at).toLocaleDateString()}</span>
                          {contract.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {new Date(contract.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedContract(contract)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingContract(contract);
                            setShowForm(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowMembers(true);
                          }}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateContract(contract.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => 
                            contract.archived 
                              ? unarchiveContract(contract.id)
                              : archiveContract(contract.id)
                          }
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteContract(contract.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};