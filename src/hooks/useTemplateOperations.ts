
import { useState } from "react";
import { useContractTemplates } from "@/hooks/useContractTemplates";
import { useToast } from "@/hooks/use-toast";

export const useTemplateOperations = () => {
  const { templates, loading, createTemplate, deleteTemplate } = useContractTemplates();
  const { toast } = useToast();
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

  const handleDeleteTemplate = async (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      await deleteTemplate(id);
    }
  };

  return {
    templates,
    loading,
    isCreatingTemplate,
    isUpdating,
    handleCreateTemplate,
    handleUpdateTemplate,
    handleCopyTemplate,
    handleDeleteTemplate,
  };
};
