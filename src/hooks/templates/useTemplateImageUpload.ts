
import { supabase } from "@/integrations/supabase/client";

export const useTemplateImageUpload = () => {
  const uploadHeaderImage = async (file: File, templateId: string) => {
    try {
      console.log('Uploading header image:', file.name, 'for template:', templateId);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${templateId}/header.${fileExt}`;
      
      // First, check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      console.log('Authenticated user:', user.id);
      
      const { error: uploadError } = await supabase.storage
        .from('template-headers')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('template-headers')
        .getPublicUrl(fileName);

      console.log('Image uploaded successfully, public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  return { uploadHeaderImage };
};
