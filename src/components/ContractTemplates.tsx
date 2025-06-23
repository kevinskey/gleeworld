
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Eye, FileText, Trash2, Copy, Loader2, Upload, Image } from "lucide-react";
import { useContractTemplates } from "@/hooks/useContractTemplates";
import { useToast } from "@/hooks/use-toast";

export const ContractTemplates = () => {
  const { templates, loading, createTemplate, deleteTemplate } = useContractTemplates();
  const { toast } = useToast();
  
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    template_content: "",
    header_image: null as File | null,
  });

  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewTemplate({ ...newTemplate, header_image: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditingTemplate({ ...editingTemplate, header_image: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.template_content) {
      toast({
        title: "Error",
        description: "Please fill in both template name and content",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    const result = await createTemplate(newTemplate);
    
    if (result) {
      setNewTemplate({ name: "", template_content: "", header_image: null });
      setImagePreview(null);
      setIsCreateOpen(false);
    }
    setIsCreating(false);
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate({
      ...template,
      header_image: null // Reset file input
    });
    setImagePreview(template.header_image_url);
    setIsEditOpen(true);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate.name || !editingTemplate.template_content) {
      return;
    }

    setIsUpdating(true);
    // Note: This would require an updateTemplate function in the hook
    // For now, we'll show a toast that this feature is coming soon
    toast({
      title: "Coming Soon",
      description: "Template editing functionality is being developed",
    });
    setIsUpdating(false);
    setIsEditOpen(false);
  };

  const handleCopyTemplate = async (template: any) => {
    const copyTemplate = {
      name: `${template.name} (Copy)`,
      template_content: template.template_content,
      header_image: null
    };

    const result = await createTemplate(copyTemplate);
    if (result) {
      toast({
        title: "Success",
        description: "Template copied successfully",
      });
    }
  };

  const handleUseTemplate = (template: any) => {
    // This would typically navigate to a contract creation page with the template
    toast({
      title: "Coming Soon",
      description: "Template usage functionality is being developed",
    });
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      await deleteTemplate(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading templates...</span>
      </div>
    );
  }

  const CreateTemplateDialog = () => (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Template</DialogTitle>
        <DialogDescription>
          Create a reusable contract template with optional header image
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="template-name">Template Name</Label>
          <Input
            id="template-name"
            value={newTemplate.name}
            onChange={(e) => {
              console.log('Template name changed:', e.target.value);
              setNewTemplate({...newTemplate, name: e.target.value});
            }}
            placeholder="Enter template name (e.g., Service Agreement Template)"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="header-image">Header Image (Optional)</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <input
              id="header-image"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('header-image')?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {newTemplate.header_image ? 'Change Image' : 'Upload Header Image'}
            </Button>
            
            {imagePreview && (
              <div className="mt-4">
                <img 
                  src={imagePreview} 
                  alt="Header preview" 
                  className="max-h-32 mx-auto rounded border"
                />
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Recommended: Company logo or letterhead (PNG, JPG, max 2MB)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-content">Template Content</Label>
          <Textarea
            id="template-content"
            value={newTemplate.template_content}
            onChange={(e) => setNewTemplate({...newTemplate, template_content: e.target.value})}
            placeholder="Enter your contract template here..."
            rows={12}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => {
          setIsCreateOpen(false);
          setImagePreview(null);
          setNewTemplate({ name: "", template_content: "", header_image: null });
        }}>
          Cancel
        </Button>
        <Button onClick={handleCreateTemplate} disabled={isCreating || !newTemplate.name.trim()}>
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Template'
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  const EditTemplateDialog = () => (
    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Update the template name, content, and header image
          </DialogDescription>
        </DialogHeader>
        {editingTemplate && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-template-name">Template Name</Label>
              <Input
                id="edit-template-name"
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                placeholder="Service Agreement Template"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-header-image">Header Image (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  id="edit-header-image"
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('edit-header-image')?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {editingTemplate.header_image ? 'Change Image' : 'Upload New Header Image'}
                </Button>
                
                {imagePreview && (
                  <div className="mt-4">
                    <img 
                      src={imagePreview} 
                      alt="Header preview" 
                      className="max-h-32 mx-auto rounded border"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-template-content">Template Content</Label>
              <Textarea
                id="edit-template-content"
                value={editingTemplate.template_content}
                onChange={(e) => setEditingTemplate({...editingTemplate, template_content: e.target.value})}
                placeholder="Enter your contract template here..."
                rows={12}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setIsEditOpen(false);
            setImagePreview(null);
            setEditingTemplate(null);
          }}>
            Cancel
          </Button>
          <Button onClick={handleUpdateTemplate} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contract Templates</h2>
          <p className="text-gray-600">Create and manage reusable contract templates with custom headers</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <CreateTemplateDialog />
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-500 mb-4">Create your first contract template to get started</p>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Template
                </Button>
              </DialogTrigger>
              <CreateTemplateDialog />
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {template.header_image_url && (
                        <Image className="h-4 w-4 text-blue-600" />
                      )}
                      {template.name}
                    </CardTitle>
                    <CardDescription>
                      Created: {new Date(template.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {template.header_image_url && (
                    <div className="mb-2">
                      <img 
                        src={template.header_image_url} 
                        alt="Template header" 
                        className="h-20 w-full object-contain border rounded bg-gray-50"
                        onError={(e) => {
                          console.log('Image failed to load:', template.header_image_url);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', template.header_image_url);
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-500">
                    <p>Last modified: {new Date(template.updated_at).toLocaleDateString()}</p>
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsViewOpen(true);
                      }}
                      title="View template"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                      title="Edit template"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCopyTemplate(template)}
                      title="Copy template"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                      title="Delete template"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
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

      {/* Edit Template Dialog */}
      <EditTemplateDialog />

      {/* View Template Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Created: {selectedTemplate && new Date(selectedTemplate.created_at).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              {selectedTemplate.header_image_url && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <Label className="font-medium">Header Image:</Label>
                  <img 
                    src={selectedTemplate.header_image_url} 
                    alt="Template header" 
                    className="mt-2 max-h-40 mx-auto rounded border"
                    onError={(e) => {
                      console.log('Header image failed to load in view dialog:', selectedTemplate.header_image_url);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div>
                <Label className="font-medium">Template Content:</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedTemplate.template_content}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            <Button onClick={() => handleUseTemplate(selectedTemplate)}>Use Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
