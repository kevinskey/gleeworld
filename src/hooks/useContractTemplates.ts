
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTemplateImageUpload } from "./templates/useTemplateImageUpload";

export interface ContractTemplate {
  id: string;
  name: string;
  template_content: string;
  header_image_url?: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  is_active: boolean;
}

export const useContractTemplates = () => {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { uploadHeaderImage } = useTemplateImageUpload();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      console.log('Fetching templates...');
      
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching templates:', error);
        throw error;
      }
      
      console.log('Templates fetched successfully:', data?.length || 0);
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (template: {
    name: string;
    template_content: string;
    header_image?: File | null;
  }) => {
    try {
      console.log('Starting template creation process...');
      
      // Check authentication first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        toast({
          title: "Error",
          description: "You must be logged in to create templates",
          variant: "destructive",
        });
        return null;
      }
      
      console.log('User authenticated:', user.id);

      // Create the template with the authenticated user's ID
      const { data, error } = await supabase
        .from('contract_templates')
        .insert([{
          name: template.name,
          template_content: template.template_content,
          created_by: user.id,
          is_active: true,
        }])
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      console.log('Template created in database:', data);
      let updatedTemplate = { ...data };
      
      // Upload header image if provided
      if (template.header_image) {
        try {
          console.log('Starting image upload...');
          const header_image_url = await uploadHeaderImage(template.header_image, data.id);
          
          // Update the template with the image URL
          const { error: updateError } = await supabase
            .from('contract_templates')
            .update({ header_image_url })
            .eq('id', data.id);

          if (updateError) {
            console.error('Error updating template with image URL:', updateError);
            throw updateError;
          }
          
          console.log('Template updated with image URL');
          updatedTemplate = { ...updatedTemplate, header_image_url };
        } catch (imageError) {
          console.error('Error uploading header image:', imageError);
          toast({
            title: "Warning",
            description: "Template created but header image upload failed",
            variant: "destructive",
          });
        }
      }

      setTemplates(prev => [updatedTemplate, ...prev]);
      
      console.log('Template creation completed successfully');
      return updatedTemplate;
    } catch (error) {
      console.error('Error creating template:', error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to create template";
      if (error instanceof Error) {
        if (error.message.includes('auth')) {
          errorMessage = "Authentication error. Please try logging out and back in.";
        } else if (error.message.includes('permission')) {
          errorMessage = "Permission denied. Please check your account permissions.";
        } else if (error.message.includes('network')) {
          errorMessage = "Network error. Please check your connection.";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      console.log('Deleting template:', id);
      
      const { error } = await supabase
        .from('contract_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deleting template:', error);
        throw error;
      }

      setTemplates(prev => prev.filter(template => template.id !== id));
      console.log('Template deleted successfully');
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    createTemplate,
    deleteTemplate,
    refetch: fetchTemplates,
  };
};
