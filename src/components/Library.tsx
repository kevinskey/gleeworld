
import { useAuth } from "@/contexts/AuthContext";
import { DocumentLibrary } from "./admin/DocumentLibrary";
import { W9FormsListCollapsible } from "./W9FormsListCollapsible";
import { W9CameraCapture } from "./library/W9CameraCapture";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Upload, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Library = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if user has admin privileges
  const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';

  if (isAdmin) {
    return <DocumentLibrary />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Document Library</h1>
            <p className="text-muted-foreground">Manage your documents and forms</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-600" />
              W9 Forms
            </CardTitle>
            <CardDescription>
              Create or capture W9 tax forms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={() => navigate('/w9-form')}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New W9
            </Button>
            <W9CameraCapture />
          </CardContent>
        </Card>

        <Card className="bg-card/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-brand-600" />
              Upload Documents
            </CardTitle>
            <CardDescription>
              Upload contracts and other documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand-600" />
              Admin Access
            </CardTitle>
            <CardDescription>
              Full document management requires admin privileges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" disabled>
              <Shield className="h-4 w-4 mr-2" />
              Admin Only
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Document Sections */}
      <div className="space-y-6">
        <W9FormsListCollapsible />
      </div>
    </div>
  );
};
