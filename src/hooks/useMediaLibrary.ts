import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UploadResult {
  success: boolean;
  media_id?: string;
  file_url?: string;
  message?: string;
}

export const useMediaLibrary = () => {
  return useQuery({
    queryKey: ['media-library', 'service-image'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_media_library')
        .select('*')
        .eq('category', 'service-image')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useUploadImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, description = '' }: { file: File; description?: string }) => {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `services/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('service-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Add to media library
      const { data: mediaData, error: mediaError } = await supabase
        .rpc('upload_service_image', {
          p_filename: fileName,
          p_original_filename: file.name,
          p_file_path: filePath,
          p_file_size: file.size,
          p_mime_type: file.type,
          p_description: description
        });

      if (mediaError) throw mediaError;
      return mediaData as unknown as UploadResult;
    },
    onSuccess: (result: UploadResult) => {
      queryClient.invalidateQueries({ queryKey: ['media-library'] });
      if (result.success) {
        toast.success(result.message || 'Image uploaded successfully!');
      }
    },
    onError: (error) => {
      toast.error('Failed to upload image: ' + error.message);
    },
  });
};

export const useDeleteMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mediaId: string) => {
      // Get media info first
      const { data: media, error: fetchError } = await supabase
        .from('gw_media_library')
        .select('file_path')
        .eq('id', mediaId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('service-images')
        .remove([media.file_path]);

      if (storageError) throw storageError;

      // Delete from media library
      const { error: deleteError } = await supabase
        .from('gw_media_library')
        .delete()
        .eq('id', mediaId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-library'] });
      toast.success('Image deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete image: ' + error.message);
    },
  });
};