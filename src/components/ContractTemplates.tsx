import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Loader2 } from "lucide-react";
import { useContractTemplates } from "@/hooks/useContractTemplates";
import { useContractFromTemplate } from "@/hooks/useContractFromTemplate";
import { useToast } from "@/hooks/use-toast";
import { TemplateCard } from "./templates/TemplateCard";
import { CreateTemplateDialog } from "./templates/CreateTemplateDialog";
import { ViewTemplateDialog } from "./templates/ViewTemplateDialog";
import { EditTemplateDialog } from "./templates/EditTemplateDialog";

interface ContractTemplatesProps {
  onUseTemplate?: (templateContent: string, templateName: string) => void;
  onContractCreated?: () => void;
}

export const ContractTemplates = ({ onUseTemplate, onContractCreated }: ContractTemplatesProps) => {
  const { templates, loading, createTemplate, deleteTemplate } = useContractTemplates();
  const { createContractFromTemplate, isCreating } = useContractFromTemplate();
  const { toast } = useToast();
  
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCreateTemplate = async (template: { name: string; template_content: string; header_image: File | null }) => {
    if (!template.name?.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive",
      });
      return;
    }

    if (!template.template_content?.trim()) {
      toast({
        title: "Error",
        description: "Please enter template content",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingTemplate(true);
    
    try {
      const result = await createTemplate(template);
      
      if (result) {
        toast({
          title: "Success",
          description: "Template created successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create template. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in handleCreateTemplate:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the template",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  const handleEditTemplate = (template: any) => {
    setSelectedTemplate(template);
    setIsEditOpen(true);
  };

  const handleUpdateTemplate = async (template: any) => {
    if (!template.name || !template.template_content) {
      return;
    }

    setIsUpdating(true);
    toast({
      title: "Coming Soon",
      description: "Template editing functionality is being developed",
    });
    setIsUpdating(false);
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

  const handleUseTemplate = async (template: any) => {
    if (onUseTemplate) {
      onUseTemplate(template.template_content, template.name);
      toast({
        title: "Template Applied",
        description: `Template "${template.name}" has been applied to the upload form`,
      });
    } else {
      const result = await createContractFromTemplate(template);
      if (result && onContractCreated) {
        onContractCreated();
      }
    }
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contract Templates</h2>
          <p className="text-gray-600">Create and manage reusable contract templates with custom headers</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-500 mb-4">Create your first contract template to get started</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isCreating={isCreating}
              onUse={handleUseTemplate}
              onView={() => {
                setSelectedTemplate(template);
                setIsViewOpen(true);
              }}
              onEdit={handleEditTemplate}
              onCopy={handleCopyTemplate}
              onDelete={handleDeleteTemplate}
            />
          ))}
        </div>
      )}

      <CreateTemplateDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreate={handleCreateTemplate}
        isCreating={isCreatingTemplate}
      />

      <EditTemplateDialog
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        template={selectedTemplate}
        onUpdate={handleUpdateTemplate}
        isUpdating={isUpdating}
      />

      <ViewTemplateDialog
        isOpen={isViewOpen}
        onOpenChange={setIsViewOpen}
        template={selectedTemplate}
        onUseTemplate={handleUseTemplate}
      />
    </div>
  );
};
