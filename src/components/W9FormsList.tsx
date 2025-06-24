import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Plus, Trash2 } from "lucide-react";
import { useW9Forms } from "@/hooks/useW9Forms";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const W9FormsList = () => {
  const { forms, loading, error, downloadForm, deleteForm } = useW9Forms();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);

  const handleDownload = async (storagePath: string) => {
    try {
      await downloadForm(storagePath);
    } catch (error) {
      console.error('Error downloading form:', error);
    }
  };

  const handleDelete = async (formId: string) => {
    try {
      setDeletingFormId(formId);
      console.log('Starting delete for form:', formId);
      await deleteForm(formId);
      console.log('Delete completed successfully');
      
      toast({
        title: "W9 Form Deleted",
        description: "The W9 form has been permanently deleted.",
      });
    } catch (error) {
      console.error('Error deleting form:', error);
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
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">W9 Forms</h2>
          <p className="text-gray-600">Manage your tax forms</p>
        </div>
        <Button onClick={() => navigate('/w9-form')}>
          <Plus className="h-4 w-4 mr-2" />
          New W9 Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No W9 Forms</h3>
              <p className="text-gray-600 mb-4">You haven't submitted any W9 forms yet.</p>
              <Button onClick={() => navigate('/w9-form')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First W9
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {forms.map((form) => (
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
                      onClick={() => handleDownload(form.storage_path)}
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
    </div>
  );
};
