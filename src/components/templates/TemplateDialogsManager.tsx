
import { CreateTemplateDialog } from "./CreateTemplateDialog";
import { EditTemplateDialog } from "./EditTemplateDialog";
import { ViewTemplateDialog } from "./ViewTemplateDialog";
import { RecipientSelectionDialog } from "./RecipientSelectionDialog";
import type { ContractTemplate } from "@/hooks/useContractTemplates";
import { useToast } from "@/hooks/use-toast";
import { useContractFromTemplate } from "@/hooks/useContractFromTemplate";
import { useState } from "react";

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
  const [isRecipientSelectionOpen, setIsRecipientSelectionOpen] = useState(false);
  const [selectedTemplateForRecipient, setSelectedTemplateForRecipient] = useState<ContractTemplate | null>(null);
  
  console.log('TemplateDialogsManager: Component rendering, onUseTemplate provided:', !!onUseTemplate);
  
  const { createContractFromTemplate, isCreating } = useContractFromTemplate(() => {
    console.log('TemplateDialogsManager: Contract creation callback triggered');
    setIsRecipientSelectionOpen(false);
    onViewOpenChange(false);
  });

  const handleUseTemplate = async (template: ContractTemplate) => {
    console.log('TemplateDialogsManager: Using template:', template.name);
    
    // Open recipient selection dialog
    setSelectedTemplateForRecipient(template);
    setIsRecipientSelectionOpen(true);
  };

  const handleCreateContractWithRecipient = async (template: ContractTemplate, recipient: { full_name: string; email: string; stipend_amount?: string }) => {
    console.log('TemplateDialogsManager: Creating contract with recipient:', recipient);
    console.log('TemplateDialogsManager: Template:', template.name);
    console.log('TemplateDialogsManager: About to call createContractFromTemplate...');
    
    try {
      const result = await createContractFromTemplate(template, recipient);
      console.log('TemplateDialogsManager: createContractFromTemplate returned:', result);
      
      if (result) {
        console.log('TemplateDialogsManager: Contract created successfully:', result.id);
        toast({
          title: "Contract Created",
          description: `Contract "${result.title}" created successfully for ${recipient.full_name}`,
        });
        return;
      } else {
        console.log('TemplateDialogsManager: Contract creation returned null, trying fallback...');
      }
    } catch (error) {
      console.error('TemplateDialogsManager: Contract creation failed:', error);
    }

    // Fallback to the form-based approach if available
    if (onUseTemplate) {
      console.log('TemplateDialogsManager: Using form-based template approach');
      onUseTemplate(template.template_content, template.name, template.header_image_url, template.contract_type);
      setIsRecipientSelectionOpen(false);
      onViewOpenChange(false);
      toast({
        title: "Template Applied",
        description: `Template "${template.name}" has been applied to the contract form`,
      });
    } else {
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

      <RecipientSelectionDialog
        isOpen={isRecipientSelectionOpen}
        onOpenChange={setIsRecipientSelectionOpen}
        template={selectedTemplateForRecipient}
        onCreateContract={handleCreateContractWithRecipient}
        isCreating={isCreating}
      />
    </>
  );
};
