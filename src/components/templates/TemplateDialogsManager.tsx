
import { CreateTemplateDialog } from "./CreateTemplateDialog";
import { EditTemplateDialog } from "./EditTemplateDialog";
import { ViewTemplateDialog } from "./ViewTemplateDialog";
import type { ContractTemplate } from "@/hooks/useContractTemplates";
import { useToast } from "@/hooks/use-toast";
import { useContractFromTemplate } from "@/hooks/useContractFromTemplate";

interface TemplateDialogsManagerProps {
  selectedTemplate: ContractTemplate | null;
  isCreateOpen: boolean;
  isEditOpen: boolean;
  isViewOpen: boolean;
  isCreatingTemplate: boolean;
  isUpdating: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onEditOpenChange: (open: boolean) => void;
  onViewOpenChange: (open: boolean) => void;
  onCreateTemplate: (template: { name: string; template_content: string; header_image: File | null; contract_type: string }) => Promise<void>;
  onUpdateTemplate: (template: any) => Promise<void>;
  onUseTemplate?: (templateContent: string, templateName: string, headerImageUrl?: string, contractType?: string) => void;
}

export const TemplateDialogsManager = ({
  selectedTemplate,
  isCreateOpen,
  isEditOpen,
  isViewOpen,
  isCreatingTemplate,
  isUpdating,
  onCreateOpenChange,
  onEditOpenChange,
  onViewOpenChange,
  onCreateTemplate,
  onUpdateTemplate,
  onUseTemplate
}: TemplateDialogsManagerProps) => {
  const { toast } = useToast();
  const { createContractFromTemplate, isCreating } = useContractFromTemplate(() => {
    onViewOpenChange(false);
  });

  const handleUseTemplate = async (template: ContractTemplate) => {
    console.log('Using template via direct contract creation:', template);
    
    try {
      // Try to create contract directly from template
      const result = await createContractFromTemplate(template);
      
      if (result) {
        // Success - contract was created directly
        console.log('Contract created directly from template');
        return;
      }
    } catch (error) {
      console.error('Direct contract creation failed, falling back to form:', error);
    }

    // Fallback to the form-based approach
    if (onUseTemplate) {
      console.log('Falling back to form-based template usage');
      onUseTemplate(template.template_content, template.name, template.header_image_url, template.contract_type);
      onViewOpenChange(false);
      toast({
        title: "Template Applied",
        description: `Template "${template.name}" has been applied to the upload form`,
      });
    }
  };

  return (
    <>
      <CreateTemplateDialog
        isOpen={isCreateOpen}
        onOpenChange={onCreateOpenChange}
        onCreate={onCreateTemplate}
        isCreating={isCreatingTemplate}
      />

      <EditTemplateDialog
        isOpen={isEditOpen}
        onOpenChange={onEditOpenChange}
        template={selectedTemplate}
        onUpdate={onUpdateTemplate}
        isUpdating={isUpdating}
      />

      <ViewTemplateDialog
        isOpen={isViewOpen}
        onOpenChange={onViewOpenChange}
        template={selectedTemplate}
        onUseTemplate={handleUseTemplate}
        isCreating={isCreating}
      />
    </>
  );
};
