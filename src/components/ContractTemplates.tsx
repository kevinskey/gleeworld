
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useTemplateOperations } from "@/hooks/useTemplateOperations";
import { TemplatesEmptyState } from "./templates/TemplatesEmptyState";
import { TemplatesGrid } from "./templates/TemplatesGrid";
import { TemplateDialogsManager } from "./templates/TemplateDialogsManager";
import { GleeClubTemplateInitializer } from "./contract-templates/GleeClubTemplateInitializer";

interface ContractTemplatesProps {
  onUseTemplate?: (templateContent: string, templateName: string, headerImageUrl?: string, contractType?: string) => void;
  onContractCreated?: () => void;
}

export const ContractTemplates = ({ onUseTemplate, onContractCreated }: ContractTemplatesProps) => {
  const {
    templates,
    loading,
    isCreatingTemplate,
    isUpdating,
    handleCreateTemplate,
    handleUpdateTemplate,
    handleCopyTemplate,
    handleDeleteTemplate,
  } = useTemplateOperations();

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const handleEditTemplate = (template: any) => {
    setSelectedTemplate(template);
    setIsEditOpen(true);
  };

  const handleUseTemplateWrapper = (templateContent: string, templateName: string, headerImageUrl?: string, contractType?: string) => {
    console.log('Template use triggered:', { templateName, templateContent });
    if (onUseTemplate) {
      // Parent component provided a callback (e.g., tour manager, contract creation)
      onUseTemplate(templateContent, templateName, headerImageUrl, contractType);
    } else {
      // No parent callback - we're in a standalone context (like dashboard)
      // Navigate to a contract creation flow or show helpful guidance
      console.log('🔄 No parent callback - redirecting to contract creation');
      
      // For now, provide user feedback about what to do
      alert(`Template "${templateName}" is ready to use!\n\nTo create a contract with this template:\n1. Go to Tour Manager → Contracts\n2. Click "Create New Contract"\n3. Select this template\n\nOr use this template directly in any contract creation workflow.`);
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
          <h2 className="text-2xl font-bold text-foreground">Contract Templates</h2>
          <p className="text-muted-foreground">Create and manage reusable contract templates with custom headers</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <GleeClubTemplateInitializer />
      
      {templates.length === 0 ? (
        <TemplatesEmptyState onCreateTemplate={() => setIsCreateOpen(true)} />
      ) : (
        <TemplatesGrid
          templates={templates}
          onView={(template) => {
            setSelectedTemplate(template);
            setIsViewOpen(true);
          }}
          onEdit={handleEditTemplate}
          onCopy={handleCopyTemplate}
          onDelete={handleDeleteTemplate}
          onUseTemplate={handleUseTemplateWrapper}
        />
      )}

      <TemplateDialogsManager
        selectedTemplate={selectedTemplate}
        isCreateOpen={isCreateOpen}
        isEditOpen={isEditOpen}
        isViewOpen={isViewOpen}
        isCreatingTemplate={isCreatingTemplate}
        isUpdating={isUpdating}
        onCreateOpenChange={setIsCreateOpen}
        onEditOpenChange={setIsEditOpen}
        onViewOpenChange={setIsViewOpen}
        onCreateTemplate={handleCreateTemplate}
        onUpdateTemplate={handleUpdateTemplate}
        onUseTemplate={handleUseTemplateWrapper}
      />
    </div>
  );
};
