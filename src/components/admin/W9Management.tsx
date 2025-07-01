
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Search, Filter, Download, Eye, RefreshCw, Mail, CheckCircle, XCircle, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { W9PreviewDialog } from "@/components/W9PreviewDialog";

interface W9FormAdmin {
  id: string;
  user_id: string | null;
  form_data: any;
  status: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  storage_path: string;
  user_email?: string;
  user_name?: string;
}

export const W9Management = () => {
  const [w9Forms, setW9Forms] = useState<W9FormAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForms, setSelectedForms] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("submitted_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [previewForm, setPreviewForm] = useState<W9FormAdmin | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const fetchW9Forms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all W9 forms with user information
      let query = supabase
        .from('w9_forms')
        .select(`
          *,
          profiles!left(email, full_name)
        `)
        .order('submitted_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching W9 forms:', error);
        throw error;
      }

      // Transform data to include user information
      const transformedData = (data || []).map((form: any) => ({
        ...form,
        user_email: form.profiles?.email || 'Unknown',
        user_name: form.profiles?.full_name || 'Unknown User'
      }));

      setW9Forms(transformedData);
    } catch (error) {
      console.error('Error fetching W9 forms:', error);
      setError('Failed to load W9 forms');
      toast({
        title: "Error",
        description: "Failed to load W9 forms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectForm = (formId: string, checked: boolean) => {
    setSelectedForms(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(formId);
      } else {
        newSet.delete(formId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedForms(new Set(filteredForms.map(f => f.id)));
    } else {
      setSelectedForms(new Set());
    }
  };

  const updateFormStatus = async (formId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('w9_forms')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', formId);

      if (error) throw error;

      setW9Forms(prev => prev.map(form => 
        form.id === formId ? { ...form, status: newStatus } : form
      ));

      toast({
        title: "Success",
        description: `W9 form status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating W9 form status:', error);
      toast({
        title: "Error",
        description: "Failed to update W9 form status",
        variant: "destructive",
      });
    }
  };

  const downloadW9Form = async (form: W9FormAdmin) => {
    try {
      if (!form.storage_path) {
        toast({
          title: "Error",
          description: "No file path found for this form",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.storage
        .from('w9-forms')
        .download(form.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `w9-form-${form.user_name || 'unknown'}-${form.submitted_at.split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "W9 form downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading W9 form:', error);
      toast({
        title: "Error",
        description: "Failed to download W9 form",
        variant: "destructive",
      });
    }
  };

  const handlePreview = (form: W9FormAdmin) => {
    setPreviewForm(form);
    setShowPreview(true);
  };

  // Filter and sort forms
  const filteredForms = w9Forms.filter(form => {
    const matchesSearch = 
      (form.user_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (form.user_email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      form.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || form.status === statusFilter;
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
    { value: "submitted", label: "Submitted" },
    { value: "under_review", label: "Under Review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "requires_revision", label: "Requires Revision" }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-3 w-3" />;
      case 'rejected': return <XCircle className="h-3 w-3" />;
      case 'under_review': return <Clock className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'requires_revision': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchW9Forms();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            W9 Forms Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading W9 forms...</span>
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
            W9 Forms Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchW9Forms} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                W9 Forms Management
              </CardTitle>
              <CardDescription>
                Manage all W9 tax forms in the system ({filteredForms.length} of {w9Forms.length} forms)
              </CardDescription>
            </div>
            <Button onClick={fetchW9Forms} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or ID..."
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
                <SelectItem value="submitted_at-desc">Newest First</SelectItem>
                <SelectItem value="submitted_at-asc">Oldest First</SelectItem>
                <SelectItem value="user_name-asc">Name A-Z</SelectItem>
                <SelectItem value="user_name-desc">Name Z-A</SelectItem>
                <SelectItem value="status-asc">Status A-Z</SelectItem>
                <SelectItem value="updated_at-desc">Recently Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedForms.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-800">
                {selectedForms.size} form(s) selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedForms(new Set())}>
                  Clear Selection
                </Button>
                <Button size="sm" onClick={() => {
                  selectedForms.forEach(id => updateFormStatus(id, 'approved'));
                  setSelectedForms(new Set());
                }}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Selected
                </Button>
              </div>
            </div>
          )}

          {/* Forms List */}
          <div className="space-y-2">
            {/* Select All Header */}
            <div className="flex items-center gap-3 p-3 border-b">
              <Checkbox
                checked={selectedForms.size === filteredForms.length && filteredForms.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">Select All</span>
            </div>

            {filteredForms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || statusFilter !== "all" ? (
                  <>
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No W9 forms match your current filters</p>
                    <Button 
                      variant="outline" 
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
                    <p>No W9 forms found</p>
                  </>
                )}
              </div>
            ) : (
              filteredForms.map((form) => (
                <div
                  key={form.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:shadow-md transition-all duration-200 gap-3 bg-white"
                >
                  <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
                    <Checkbox
                      checked={selectedForms.has(form.id)}
                      onCheckedChange={(checked) => handleSelectForm(form.id, checked as boolean)}
                      className="mt-1 sm:mt-0"
                    />
                    <FileText className="h-5 w-5 text-brand-500 flex-shrink-0 mt-1 sm:mt-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {form.user_name} ({form.user_email})
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>Submitted: {new Date(form.submitted_at).toLocaleDateString()}</span>
                        {form.updated_at !== form.submitted_at && (
                          <span>• Updated: {new Date(form.updated_at).toLocaleDateString()}</span>
                        )}
                        <span>• ID: {form.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Badge className={`${getStatusColor(form.status)} text-xs flex items-center gap-1`}>
                        {getStatusIcon(form.status)}
                        {form.status.replace('_', ' ')}
                      </Badge>
                      
                      <Select
                        value={form.status}
                        onValueChange={(newStatus) => updateFormStatus(form.id, newStatus)}
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="requires_revision">Requires Revision</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(form)}
                        className="h-8 w-8 p-0"
                        title="Preview Form"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadW9Form(form)}
                        className="h-8 w-8 p-0"
                        title="Download Form"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <W9PreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        form={previewForm}
        onDownload={() => {
          if (previewForm) {
            downloadW9Form(previewForm);
          }
        }}
      />
    </>
  );
};
