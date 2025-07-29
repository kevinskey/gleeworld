import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useProductImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadProductImage = async (file: File, productId: string): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${Date.now()}.${fileExt}`;
      
      console.log('Uploading product image:', fileName);
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive",
        });
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      console.log('Image uploaded successfully:', publicUrl);
      
      toast({
        title: "Image Uploaded",
        description: "Product image uploaded successfully",
      });

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteProductImage = async (imageUrl: string): Promise<boolean> => {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts.slice(-2).join('/'); // product-id/filename
      
      const { error } = await supabase.storage
        .from('product-images')
        .remove([fileName]);

      if (error) {
        console.error('Delete error:', error);
        toast({
          title: "Delete Failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Image Deleted",
        description: "Product image deleted successfully",
      });

      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    uploadProductImage,
    deleteProductImage,
    uploading
  };
};