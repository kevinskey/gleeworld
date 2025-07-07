
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Search, Filter, Download, Eye, RefreshCw, Mail, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";
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

import { BatchW9ConversionDialog } from "./BatchW9ConversionDialog";

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
      
      console.log('W9Management: Fetching W9 forms...');
      
      // First get all W9 forms
      const { data: formsData, error: formsError } = await supabase
        .from('w9_forms')
        .select('*')
        .order('submitted_at', { ascending: false });

      console.log('W9Management: Forms query result:', { data: formsData, error: formsError });

      if (formsError) {
        console.error('W9Management: Error fetching W9 forms:', formsError);
        throw formsError;
      }

      // Then get user profiles for forms that have user_id
      const userIds = formsData?.filter(form => form.user_id).map(form => form.user_id) || [];
      let profilesData: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        console.log('W9Management: Profiles query result:', { data: profiles, error: profilesError });

        if (profilesError) {
          console.error('W9Management: Error fetching profiles:', profilesError);
          // Don't throw here, just log the error and continue without user data
        } else {
          profilesData = profiles || [];
        }
      }

      // Combine the data
      const transformedData = (formsData || []).map((form: any) => {
        const userProfile = profilesData.find(profile => profile.id === form.user_id);
        return {
          ...form,
          user_email: userProfile?.email || 'Unknown',
          user_name: userProfile?.full_name || 'Unknown User'
        };
      });

      console.log('W9Management: Transformed data:', transformedData);
      setW9Forms(transformedData);
    } catch (error) {
      console.error('W9Management: Error in fetchW9Forms:', error);
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
      a.download = `w9-form-${form.user_name || 'unknown'}-${form.submitted_at.split('T')[0]}.pdf`;
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

  const handleDeleteW9Form = async (formId: string) => {
    if (!window.confirm('Are you sure you want to delete this W9 form? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('w9_forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;

      setW9Forms(prev => prev.filter(form => form.id !== formId));
      
      toast({
        title: "Success",
        description: "W9 form deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting W9 form:', error);
      toast({
        title: "Error",
        description: "Failed to delete W9 form",
        variant: "destructive",
      });
    }
  };

  // Filter and sort forms
  const filteredForms = w9Forms.filter(form => {
    const matchesSearch = searchTerm === "" || 
      form.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || form.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sortedForms = [...filteredForms].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'user_name':
        aVal = a.user_name || '';
        bVal = b.user_name || '';
        break;
      case 'user_email':
        aVal = a.user_email || '';
        bVal = b.user_email || '';
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'submitted_at':
      default:
        aVal = new Date(a.submitted_at).getTime();
        bVal = new Date(b.submitted_at).getTime();
        break;
    }
    
    if (sortOrder === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });

  useEffect(() => {
    fetchW9Forms();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2">Loading W9 forms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>Error loading W9 forms: {error}</p>
            <Button onClick={fetchW9Forms} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">W9 Forms Management</h2>
          <p className="text-gray-300 text-sm">Manage and review W9 tax forms</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchW9Forms} size="sm" className="self-start sm:self-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <BatchW9ConversionDialog />
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden xs:inline">Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted_at">Date</SelectItem>
                <SelectItem value="user_name">Name</SelectItem>
                <SelectItem value="user_email">Email</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest</SelectItem>
                <SelectItem value="asc">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <CardTitle className="text-sm sm:text-base text-gray-900">
              W9 Forms ({sortedForms.length})
            </CardTitle>
            {selectedForms.size > 0 && (
              <Badge variant="outline" className="self-start sm:self-auto">
                {selectedForms.size} selected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedForms.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No W9 Forms Found</h3>
              <p className="text-gray-600 text-sm">No forms match your current filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Select All */}
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Checkbox
                  id="select-all"
                  checked={selectedForms.size === sortedForms.length && sortedForms.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(checked === true)}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All
                </label>
              </div>

              {/* Forms List */}
              {sortedForms.map((form) => (
                <div key={form.id} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedForms.has(form.id)}
                      onCheckedChange={(checked) => handleSelectForm(form.id, checked === true)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <h4 className="font-semibold text-sm sm:text-base">{form.user_name}</h4>
                        <Badge className={`${getStatusColor(form.status)} text-xs self-start`}>
                          {getStatusIcon(form.status)}
                          <span className="ml-1">{form.status}</span>
                        </Badge>
                      </div>
                      
                      <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                        <p><strong>Email:</strong> {form.user_email}</p>
                        <p><strong>Submitted:</strong> {new Date(form.submitted_at).toLocaleDateString()}</p>
                        <p className="sm:hidden"><strong>ID:</strong> {form.id.slice(0, 8)}...</p>
                        <p className="hidden sm:block"><strong>Form ID:</strong> {form.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 border-t border-gray-100">
                    <Select
                      value={form.status}
                      onValueChange={(newStatus) => updateFormStatus(form.id, newStatus)}
                    >
                      <SelectTrigger className="w-full sm:w-32 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex gap-2 sm:gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(form)}
                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden xs:inline">Preview</span>
                        <span className="xs:hidden">View</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadW9Form(form)}
                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden xs:inline">Download</span>
                        <span className="xs:hidden">Get</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteW9Form(form.id)}
                        className="flex-1 sm:flex-none text-xs sm:text-sm border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden xs:inline">Delete</span>
                        <span className="xs:hidden">Del</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
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
    </div>
  );
};
