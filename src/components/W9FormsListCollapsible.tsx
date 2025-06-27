import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Plus, Trash2, ChevronDown, Eye } from "lucide-react";
import { useW9Forms } from "@/hooks/useW9Forms";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { W9PreviewDialog } from "./W9PreviewDialog";

export const W9FormsListCollapsible = () => {
  const { w9Forms, loading, error, downloadW9Form, deleteW9Form } = useW9Forms();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [previewForm, setPreviewForm] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Debug logging to see what forms we have
  useEffect(() => {
    console.log('W9FormsListCollapsible - Forms state updated:', {
      formsCount: w9Forms?.length || 0,
      forms: w9Forms,
      loading,
      error
    });
  }, [w9Forms, loading, error]);

  const handlePreview = (form: any) => {
    setPreviewForm(form);
    setShowPreview(true);
  };

  const handleDownload = async (form: any) => {
    try {
      await downloadW9Form(form);
    } catch (error) {
      console.error('Error downloading form:', error);
    }
  };

  const handleDelete = async (formId: string) => {
    try {
      setDeletingFormId(formId);
      console.log('W9FormsListCollapsible - Starting delete for form:', formId);
      await deleteW9Form(formId);
      console.log('W9FormsListCollapsible - Delete completed successfully');
      
      toast({
        title: "W9 Form Deleted",
        description: "The W9 form has been permanently deleted.",
      });
    } catch (error) {
      console.error('W9FormsListCollapsible - Error deleting form:', error);
      toast({
        title: "Error",
        description: "Failed to delete the W9 form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingFormId(null);
    }
  };

  if (loading) {
    console.log('W9FormsListCollapsible - Showing loading state');
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            W9 Forms
          </CardTitle>
          <CardDescription>Manage your tax forms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2">Loading W9 forms...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.log('W9FormsListCollapsible - Showing error state:', error);
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            W9 Forms
          </CardTitle>
          <CardDescription>Manage your tax forms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600">
            <p>Error loading W9 forms: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log('W9FormsListCollapsible - Rendering with forms:', w9Forms?.length || 0);

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <div className="text-left">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  W9 Forms
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </CardTitle>
                <CardDescription>Manage your tax forms</CardDescription>
              </div>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div></div>
              <Button onClick={() => navigate('/w9-form')}>
                <Plus className="h-4 w-4 mr-2" />
                New W9 Form
              </Button>
            </div>

            {!w9Forms || w9Forms.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No W9 Forms</h3>
                <p className="text-gray-600 mb-4">You haven't submitted any W9 forms yet.</p>
                <Button onClick={() => navigate('/w9-form')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First W9
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {w9Forms.map((form) => (
                  <Card key={form.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            W9 Form
                          </CardTitle>
                          <CardDescription>
                            Submitted on {new Date(form.submitted_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {form.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          <p>Form ID: {form.id.slice(0, 8)}...</p>
                          <p>Created: {new Date(form.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(form)}
                            title="Preview Form"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(form)}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={deletingFormId === form.id}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {deletingFormId === form.id ? 'Deleting...' : 'Delete'}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete W9 Form</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this W9 form? This action cannot be undone.
                                  The form will be permanently removed from both the database and file storage.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(form.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Form
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <W9PreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        form={previewForm}
        onDownload={() => {
          if (previewForm) {
            handleDownload(previewForm);
          }
        }}
      />
    </Card>
  );
};
