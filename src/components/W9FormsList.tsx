
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useW9Forms } from "@/hooks/useW9Forms";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Loader2, Plus } from "lucide-react";
import { W9Form } from "./W9Form";

export const W9FormsList = () => {
  const [showForm, setShowForm] = useState(false);
  const { forms, loading, error, refetch, downloadForm } = useW9Forms();
  const { toast } = useToast();

  const handleDownload = async (storagePath: string) => {
    try {
      await downloadForm(storagePath);
      toast({
        title: "Download Started",
        description: "Your W9 form is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the W9 form. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    refetch();
  };

  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Fill Out W9 Form</h2>
          <Button variant="outline" onClick={() => setShowForm(false)}>
            Back to List
          </Button>
        </div>
        <W9Form onSuccess={handleFormSuccess} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">W9 Tax Forms</h2>
          <p className="text-gray-600">Manage your tax identification forms</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New W9 Form
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button variant="outline" onClick={refetch} className="mt-2">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No W9 Forms Yet</h3>
            <p className="text-gray-600 mb-4">
              You haven't submitted any W9 forms yet. Click the button above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      W9 Form
                    </CardTitle>
                    <CardDescription>
                      Submitted on {new Date(form.submitted_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={form.status === 'submitted' ? 'default' : 'secondary'}>
                      {form.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(form.storage_path)}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span>
                    <p className="text-gray-600">{form.form_data?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Classification:</span>
                    <p className="text-gray-600">{form.form_data?.federalTaxClassification || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Business Name:</span>
                    <p className="text-gray-600">{form.form_data?.businessName || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium">TIN:</span>
                    <p className="text-gray-600">
                      {form.form_data?.taxpayerIdNumber ? '***-**-****' : 'N/A'}
                    </p>
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
