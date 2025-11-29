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
  thumbnail_url?: string;
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
      console.log('usePRImages: Starting fetchImages...');
      setLoading(true);

      // 1) Get basic image data
      const { data: imageData, error: imageError } = await supabase
        .from('pr_images')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (imageError) {
        console.error('usePRImages: Query error:', imageError);
        throw imageError;
      }

      const imagesRaw = imageData || [];
      console.log('usePRImages: Raw image count:', imagesRaw.length);

      const imageIds = imagesRaw.map((img: any) => img.id);

      // 2) Fetch all tags (for mapping + keep tags list fresh in UI)
      const { data: allTags, error: tagsError } = await supabase
        .from('pr_image_tags')
        .select('*')
        .order('name');
      if (tagsError) console.warn('usePRImages: Could not refresh tag list:', tagsError);
      if (allTags) setTags(allTags);

      const tagById = new Map((allTags || []).map(t => [t.id, t]));

      // 3) Fetch tag associations in batch
      let associationsByImage: Record<string, string[]> = {};
      if (imageIds.length > 0) {
        const { data: associations, error: assocError } = await supabase
          .from('pr_image_tag_associations')
          .select('image_id, tag_id')
          .in('image_id', imageIds);
        if (assocError) {
          console.warn('usePRImages: Associations fetch error:', assocError);
        } else {
          associationsByImage = (associations || []).reduce((acc: Record<string, string[]>, a: any) => {
            if (!acc[a.image_id]) acc[a.image_id] = [];
            acc[a.image_id].push(a.tag_id);
            return acc;
          }, {});
        }
      }

      // 4) Enrich with photographer/uploader and map tags
      const processedImages = await Promise.all(imagesRaw.map(async (image: any) => {
        let photographer = null;
        let uploader = null;

        if (image.photographer_id) {
          const { data: photographerData } = await supabase
            .from('gw_profiles')
            .select('full_name, first_name, last_name')
            .eq('user_id', image.photographer_id)
            .single();
          if (photographerData) {
            photographer = {
              full_name: photographerData.full_name || `${photographerData.first_name || ''} ${photographerData.last_name || ''}`.trim() || 'Unknown Photographer'
            };
          }
        }

        if (image.uploaded_by) {
          const { data: uploaderData } = await supabase
            .from('gw_profiles')
            .select('full_name, first_name, last_name')
            .eq('user_id', image.uploaded_by)
            .single();
          if (uploaderData) {
            uploader = {
              full_name: uploaderData.full_name || `${uploaderData.first_name || ''} ${uploaderData.last_name || ''}`.trim() || 'Unknown User'
            };
          }
        }

        const tagIdsForImage = associationsByImage[image.id] || [];
        const tagsForImage = tagIdsForImage
          .map((tid: string) => tagById.get(tid))
          .filter(Boolean);

        return {
          ...image,
          tags: tagsForImage,
          photographer,
          uploader,
        } as PRImage;
      }));

      console.log('usePRImages: Processed images with tags count:', processedImages.map(i => ({ id: i.id, tags: i.tags?.map(t => t?.name) })));
      setImages(processedImages);
    } catch (error: any) {
      console.error('Error fetching PR images:', error);
      toast({
        title: 'Error',
        description: 'Failed to load PR images',
        variant: 'destructive',
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
      console.log('usePRImages: Starting upload for file:', file.name, file.size, file.type);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      console.log('usePRImages: Generated file path:', filePath);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('pr-images')
        .upload(filePath, file);

      console.log('usePRImages: Storage upload result:', { uploadError });
      if (uploadError) {
        console.error('usePRImages: Storage upload error:', uploadError);
        throw uploadError;
      }

      // Upload thumbnail if it exists (for videos)
      let thumbnailUrl = null;
      const thumbnailBlob = (file as any).thumbnailBlob;
      if (thumbnailBlob) {
        const thumbnailFileName = `thumbnails/${Date.now()}-thumb.jpg`;
        const { error: thumbError } = await supabase.storage
          .from('pr-images')
          .upload(thumbnailFileName, thumbnailBlob);
        
        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from('pr-images')
            .getPublicUrl(thumbnailFileName);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('usePRImages: Current user:', user?.id);
      if (!user) throw new Error('User not authenticated');

      // Save to database
      console.log('usePRImages: Inserting to database with metadata:', metadata);
      const { data, error } = await supabase
        .from('pr_images')
        .insert({
          filename: fileName,
          original_filename: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          thumbnail_url: thumbnailUrl,
          uploaded_by: user.id,
          caption: metadata.caption,
          taken_at: metadata.taken_at,
          event_id: metadata.event_id,
          photographer_id: metadata.photographer_id || user.id,
        })
        .select()
        .single();

      console.log('usePRImages: Database insert result:', { data, error });
      if (error) {
        console.error('usePRImages: Database insert error:', error);
        throw error;
      }

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
        description: `${file.type.startsWith('video/') ? 'Video' : 'Image'} "${file.name}" uploaded successfully`,
      });

      console.log('usePRImages: Image uploaded successfully:', data);
      console.log('usePRImages: Refreshing images list...');
      fetchImages(); // Refresh the images list
      return data;
    } catch (error) {
      console.error('usePRImages: Upload error details:', error);
      console.error('usePRImages: Error message:', error.message);
      console.error('usePRImages: Error stack:', error.stack);
      toast({
        title: "Error",
        description: `Failed to upload: ${error.message}`,
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
    console.log('getImageUrl:', { filePath, publicUrl: data.publicUrl });
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