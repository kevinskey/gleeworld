
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Download, Eye, Plus } from "lucide-react";
import { useW9Forms } from "@/hooks/useW9Forms";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { W9PreviewDialog } from "@/components/W9PreviewDialog";

export const UserW9FormsList = () => {
  const { w9Forms, loading, error, downloadW9Form } = useW9Forms();
  const navigate = useNavigate();
  const [previewForm, setPreviewForm] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

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

  if (loading) {
    return (
      <Card className="glass-card border-spelman-400/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spelman-400"></div>
            <span className="ml-2 text-white">Loading W9 forms...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card border-spelman-400/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-300 mb-4">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!w9Forms || w9Forms.length === 0) {
    return (
      <Card className="glass-card border-spelman-400/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-spelman-400/50 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No W9 Forms</h3>
            <p className="text-white/70 mb-4">You haven't submitted any W9 forms yet.</p>
            <Button 
              onClick={() => navigate('/w9-form')}
              className="glass-button text-white font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create W9 Form
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button 
            onClick={() => navigate('/w9-form')}
            className="glass-button text-white font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            New W9 Form
          </Button>
        </div>

        {w9Forms.map((form) => (
          <Card key={form.id} className="glass-card border-spelman-400/20">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    W9 Tax Form
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Submitted on {new Date(form.submitted_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {form.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {new Date(form.created_at).toLocaleDateString()}</span>
                  </div>
                  <p>Form ID: {form.id.slice(0, 8)}...</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(form)}
                    className="glass border-spelman-400/30 text-spelman-300 hover:bg-spelman-500/20"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(form)}
                    className="glass border-spelman-400/30 text-spelman-300 hover:bg-spelman-500/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
    </>
  );
};
