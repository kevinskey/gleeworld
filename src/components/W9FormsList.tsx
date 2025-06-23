
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Plus } from "lucide-react";
import { useW9Forms } from "@/hooks/useW9Forms";
import { useNavigate } from "react-router-dom";

export const W9FormsList = () => {
  const { forms, loading, error, downloadForm } = useW9Forms();
  const navigate = useNavigate();

  const handleDownload = async (storagePath: string) => {
    try {
      await downloadForm(storagePath);
    } catch (error) {
      console.error('Error downloading form:', error);
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(form.storage_path)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
