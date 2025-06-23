
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
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

  const uploadHeaderImage = async (file: File, templateId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${templateId}/header.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('template-headers')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('template-headers')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const createTemplate = async (template: {
    name: string;
    template_content: string;
    header_image?: File | null;
  }) => {
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .insert([{
          name: template.name,
          template_content: template.template_content,
          created_by: null,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;

      let header_image_url = null;
      
      // Upload header image if provided
      if (template.header_image) {
        try {
          header_image_url = await uploadHeaderImage(template.header_image, data.id);
          
          // Update the template with the image URL
          const { error: updateError } = await supabase
            .from('contract_templates')
            .update({ header_image_url })
            .eq('id', data.id);

          if (updateError) throw updateError;
        } catch (imageError) {
          console.error('Error uploading header image:', imageError);
          toast({
            title: "Warning",
            description: "Template created but header image upload failed",
            variant: "destructive",
          });
        }
      }

      const updatedTemplate = { ...data, header_image_url };
      setTemplates(prev => [updatedTemplate, ...prev]);
      
      toast({
        title: "Success",
        description: "Template created successfully",
      });
      return updatedTemplate;
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contract_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setTemplates(prev => prev.filter(template => template.id !== id));
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
