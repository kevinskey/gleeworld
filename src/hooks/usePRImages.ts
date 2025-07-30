import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PRImage {
  id: string;
  filename: string;
  original_filename?: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  photographer_id?: string;
  uploaded_by: string;
  caption?: string;
  taken_at?: string;
  uploaded_at: string;
  event_id?: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  tags?: PRImageTag[];
  photographer?: {
    full_name: string;
  };
  uploader?: {
    full_name: string;
  };
}

export interface PRImageTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export const usePRImages = () => {
  const [images, setImages] = useState<PRImage[]>([]);
  const [tags, setTags] = useState<PRImageTag[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pr_images')
        .select(`
          *,
          photographer:photographer_id(full_name),
          uploader:uploaded_by(full_name),
          tags:pr_image_tag_associations(
            tag:pr_image_tags(*)
          )
        `)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const processedImages = data?.map(image => ({
        ...image,
        photographer: undefined,
        uploader: undefined,
        tags: image.tags?.map((t: any) => t.tag) || []
      })) || [];

      setImages(processedImages);
    } catch (error) {
      console.error('Error fetching PR images:', error);
      toast({
        title: "Error",
        description: "Failed to load PR images",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('pr_image_tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching PR tags:', error);
    }
  };

  const uploadImage = async (file: File, metadata: {
    caption?: string;
    taken_at?: string;
    event_id?: string;
    photographer_id?: string;
    tags?: string[];
  }) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('pr-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Save to database
      const { data, error } = await supabase
        .from('pr_images')
        .insert({
          filename: fileName,
          original_filename: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
          caption: metadata.caption,
          taken_at: metadata.taken_at,
          event_id: metadata.event_id,
          photographer_id: metadata.photographer_id || user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add tags if provided
      if (metadata.tags && metadata.tags.length > 0) {
        const tagAssociations = metadata.tags.map(tagId => ({
          image_id: data.id,
          tag_id: tagId
        }));

        const { error: tagError } = await supabase
          .from('pr_image_tag_associations')
          .insert(tagAssociations);

        if (tagError) throw tagError;
      }

      toast({
        title: "Success",
        description: `Image "${file.name}" uploaded successfully`,
      });

      console.log('usePRImages: Image uploaded successfully:', data);
      console.log('usePRImages: Refreshing images list...');
      fetchImages(); // Refresh the images list
      return data;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteImage = async (imageId: string) => {
    try {
      const image = images.find(img => img.id === imageId);
      if (!image) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('pr-images')
        .remove([image.file_path]);

      if (storageError) throw storageError;

      // Delete from database (associations will be deleted by cascade)
      const { error } = await supabase
        .from('pr_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Image deleted successfully",
      });

      fetchImages(); // Refresh the images list
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const updateImageTags = async (imageId: string, tagIds: string[]) => {
    try {
      // First, remove all existing tag associations
      await supabase
        .from('pr_image_tag_associations')
        .delete()
        .eq('image_id', imageId);

      // Then add new tag associations
      if (tagIds.length > 0) {
        const tagAssociations = tagIds.map(tagId => ({
          image_id: imageId,
          tag_id: tagId
        }));

        const { error } = await supabase
          .from('pr_image_tag_associations')
          .insert(tagAssociations);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Image tags updated successfully",
      });

      fetchImages(); // Refresh the images list
    } catch (error) {
      console.error('Error updating image tags:', error);
      toast({
        title: "Error",
        description: "Failed to update image tags",
        variant: "destructive",
      });
    }
  };

  const getImageUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('pr-images')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  useEffect(() => {
    fetchImages();
    fetchTags();
  }, []);

  return {
    images,
    tags,
    loading,
    uploadImage,
    deleteImage,
    updateImageTags,
    getImageUrl,
    refreshImages: fetchImages,
    refreshTags: fetchTags,
  };
};