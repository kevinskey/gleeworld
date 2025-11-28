import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Edit, Trash2, ExternalLink, Settings, Upload, Eye } from 'lucide-react';
import { useMus240ResourcesAdmin, useDeleteMus240Resource, type Mus240Resource } from '@/integrations/supabase/hooks/useMus240Resources';
import { ResourceForm } from '@/components/mus240/admin/ResourceForm';
import { MultiFileUpload } from '@/components/mus240/admin/MultiFileUpload';
import { DocumentViewer } from '@/components/mus240/DocumentViewer';
import { toast } from 'sonner';

export default function ResourcesAdmin() {
  const [selectedResource, setSelectedResource] = useState<Mus240Resource | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    resource: Mus240Resource | null;
  }>({
    isOpen: false,
    resource: null,
  });
  const { data: resources, isLoading } = useMus240ResourcesAdmin();
  const deleteMutation = useDeleteMus240Resource();

  const handleDelete = async (resource: Mus240Resource) => {
    try {
      await deleteMutation.mutateAsync(resource.id);
      toast.success('Resource deleted successfully');
    } catch (error) {
      toast.error('Failed to delete resource');
      console.error('Error deleting resource:', error);
    }
  };

  const handleEdit = (resource: Mus240Resource) => {
    setSelectedResource(resource);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedResource(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedResource(null);
  };

  const openViewer = (resource: Mus240Resource) => {
    setViewerState({ isOpen: true, resource });
  };

  const closeViewer = () => {
    setViewerState({ isOpen: false, resource: null });
  };

  const canPreview = (resource: Mus240Resource) => {
    if (!resource.is_file_upload) return false;
    
    const fileName = resource.file_name?.toLowerCase() || '';
    const mimeType = resource.mime_type || '';
    
    return (
      mimeType === 'application/pdf' ||
      fileName.endsWith('.pdf') ||
      mimeType.includes('presentation') ||
      fileName.endsWith('.ppt') ||
      fileName.endsWith('.pptx')
    );
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'reading': return 'bg-blue-100 text-blue-800';
      case 'website': return 'bg-green-100 text-green-800';
      case 'video': return 'bg-purple-100 text-purple-800';
      case 'article': return 'bg-orange-100 text-orange-800';
      case 'database': return 'bg-indigo-100 text-indigo-800';
      case 'audio': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <UniversalLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/mus-240/resources" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Resources
            </Link>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold">Manage MUS 240 Resources</h1>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="manage" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manage">Manage Resources</TabsTrigger>
            <TabsTrigger value="upload">Bulk Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Single Resource
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedResource ? 'Edit Resource' : 'Add New Resource'}
                    </DialogTitle>
                  </DialogHeader>
                  <ResourceForm
                    resource={selectedResource || undefined}
                    onSuccess={handleFormSuccess}
                    onCancel={() => setIsFormOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading resources...</p>
              </CardContent>
            </Card>
          ) : resources?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No resources found</p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Resource
                </Button>
              </CardContent>
            </Card>
          ) : (
            resources?.map((resource) => (
              <Card key={resource.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getCategoryColor(resource.category)}>
                          {resource.category}
                        </Badge>
                        {resource.is_file_upload && (
                          <Badge variant="outline" className="text-xs">
                            📁 File
                          </Badge>
                        )}
                        {!resource.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          Order: {resource.display_order}
                        </span>
                      </div>
                      <CardTitle className="text-lg">{resource.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {resource.is_file_upload && canPreview(resource) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openViewer(resource)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(resource)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{resource.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(resource)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {resource.description}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    {resource.is_file_upload ? (
                      <span className="text-sm text-muted-foreground">
                        📁 {resource.file_name} ({resource.file_size ? `${(resource.file_size / 1024 / 1024).toFixed(1)}MB` : 'Unknown size'})
                      </span>
                    ) : (
                      <a 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {resource.url}
                      </a>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(resource.created_at).toLocaleDateString()} • 
                    Updated: {new Date(resource.updated_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="upload" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Bulk File Upload
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload multiple files at once. Each file will become a separate resource.
            </p>
          </CardHeader>
          <CardContent>
            <MultiFileUpload onUploadComplete={() => {/* Resources will refresh automatically */}} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

        {/* Document Viewer Modal */}
        {viewerState.resource && (
          <DocumentViewer
            isOpen={viewerState.isOpen}
            onClose={closeViewer}
            fileUrl={viewerState.resource.url}
            fileName={viewerState.resource.file_name || 'document'}
            fileType={viewerState.resource.mime_type || ''}
            title={viewerState.resource.title}
          />
        )}
      </div>
    </UniversalLayout>
  );
}