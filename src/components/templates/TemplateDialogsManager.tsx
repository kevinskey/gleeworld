
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
    console.log('Using template:', template.name);
    
    try {
      // Try to create contract directly from template
      console.log('Attempting direct contract creation...');
      const result = await createContractFromTemplate(template);
      
      if (result) {
        // Success - contract was created directly
        console.log('Contract created successfully:', result.id);
        onViewOpenChange(false);
        toast({
          title: "Contract Created",
          description: `Contract "${result.title}" created successfully from template`,
        });
        return;
      } else {
        console.log('Direct contract creation returned null, trying fallback...');
      }
    } catch (error) {
      console.error('Direct contract creation failed:', error);
    }

    // Fallback to the form-based approach if available
    if (onUseTemplate) {
      console.log('Using form-based template approach');
      onUseTemplate(template.template_content, template.name, template.header_image_url, template.contract_type);
      onViewOpenChange(false);
      toast({
        title: "Template Applied",
        description: `Template "${template.name}" has been applied to the contract form`,
      });
    } else {
      // If no form-based approach is available, show error
      console.error('No contract creation method available');
      toast({
        title: "Error",
        description: "Unable to create contract from template. Please try again or contact support.",
        variant: "destructive",
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
