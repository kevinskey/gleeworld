import { useState } from "react";
import { useContractTemplates } from "@/hooks/useContractTemplates";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTemplateImageUpload } from "./templates/useTemplateImageUpload";
import { logActivity, ACTIVITY_TYPES, RESOURCE_TYPES } from "@/utils/activityLogger";

export const useTemplateOperations = () => {
  const { templates, loading, createTemplate, deleteTemplate, refetch } = useContractTemplates();
  const { toast } = useToast();
  const { uploadHeaderImage } = useTemplateImageUpload();
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCreateTemplate = async (template: { name: string; template_content: string; header_image: File | null; contract_type: string }) => {
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

    if (!template.contract_type?.trim()) {
      toast({
        title: "Error",
        description: "Please select a contract type",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingTemplate(true);
    
    try {
      const result = await createTemplate(template);
      
      if (result) {
        // Log activity
        await logActivity({
          actionType: ACTIVITY_TYPES.TEMPLATE_CREATED,
          resourceType: RESOURCE_TYPES.TEMPLATE,
          resourceId: result.id,
          details: {
            templateName: template.name,
            contractType: template.contract_type
          }
        });

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
    if (!template.id) {
      console.error('Template ID is missing');
      toast({
        title: "Error",
        description: "Template ID is missing",
        variant: "destructive",
      });
      return;
    }

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

    setIsUpdating(true);
    
    try {
      console.log('Starting template update process...', template.id);
      
      // Prepare update data with only fields that exist in the database
      const updateData: any = {
        name: template.name.trim(),
        template_content: template.template_content.trim(),
        updated_at: new Date().toISOString(),
      };

      console.log('Update data prepared:', updateData);

      // Handle header image upload if provided
      if (template.header_image && template.header_image instanceof File) {
        try {
          console.log('Uploading new header image...');
          const header_image_url = await uploadHeaderImage(template.header_image, template.id);
          updateData.header_image_url = header_image_url;
          console.log('Header image uploaded successfully:', header_image_url);
        } catch (imageError) {
          console.error('Error uploading header image:', imageError);
          toast({
            title: "Warning",
            description: "Template will be updated but image upload failed",
            variant: "destructive",
          });
        }
      }

      // Update the template in the database
      const { data, error } = await supabase
        .from('contract_templates')
        .update(updateData)
        .eq('id', template.id)
        .select();

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      console.log('Template updated successfully:', data);
      
      // Log activity
      try {
        await logActivity({
          actionType: ACTIVITY_TYPES.TEMPLATE_UPDATED,
          resourceType: RESOURCE_TYPES.TEMPLATE,
          resourceId: template.id,
          details: {
            templateName: template.name
          }
        });
      } catch (logError) {
        console.warn('Failed to log activity:', logError);
      }
      
      // Refresh templates list
      await refetch();
      
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
      
    } catch (error) {
      console.error('Error updating template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to update template: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyTemplate = async (template: any) => {
    const copyTemplate = {
      name: `Copy of ${template.name}`,
      template_content: template.template_content,
      header_image: null,
      contract_type: template.contract_type || 'other'
    };

    const result = await createTemplate(copyTemplate);
    if (result) {
      // Log activity
      await logActivity({
        actionType: ACTIVITY_TYPES.TEMPLATE_CREATED,
        resourceType: RESOURCE_TYPES.TEMPLATE,
        resourceId: result.id,
        details: {
          templateName: copyTemplate.name,
          contractType: copyTemplate.contract_type,
          copiedFrom: template.id
        }
      });

      toast({
        title: "Success",
        description: "Template copied successfully",
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      const templateToDelete = templates.find(t => t.id === id);
      await deleteTemplate(id);
      
      // Log activity
      if (templateToDelete) {
        await logActivity({
          actionType: ACTIVITY_TYPES.TEMPLATE_DELETED,
          resourceType: RESOURCE_TYPES.TEMPLATE,
          resourceId: id,
          details: {
            templateName: templateToDelete.name
          }
        });
      }
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
