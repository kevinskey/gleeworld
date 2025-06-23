
import { CreateTemplateDialog } from "./CreateTemplateDialog";
import { EditTemplateDialog } from "./EditTemplateDialog";
import { ViewTemplateDialog } from "./ViewTemplateDialog";
import type { ContractTemplate } from "@/hooks/useContractTemplates";
import { useToast } from "@/hooks/use-toast";

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

  const handleUseTemplate = async (template: ContractTemplate) => {
    console.log('Using template:', template);
    if (onUseTemplate) {
      // Don't pass template.id as template_id since we're not creating from template, just using content
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
      />
    </>
  );
};
