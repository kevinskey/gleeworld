import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MediaFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  created_by: string | null;
  icon: string | null;
  color: string | null;
}

export const useMediaFolders = (parentId?: string | null) => {
  return useQuery({
    queryKey: ['media-folders', parentId],
    queryFn: async () => {
      const query = supabase
        .from('gw_media_folders')
        .select('*')
        .order('name', { ascending: true });

      if (parentId === null) {
        query.is('parent_id', null);
      } else if (parentId) {
        query.eq('parent_id', parentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MediaFolder[];
    },
  });
};

export const useAllMediaFolders = () => {
  return useQuery({
    queryKey: ['media-folders', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_media_folders')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as MediaFolder[];
    },
  });
};

export const useCreateMediaFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('gw_media_folders')
        .insert({
          name,
          parent_id: parentId || null,
          created_by: userData.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data as MediaFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      toast.success('Folder created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create folder: ' + error.message);
    },
  });
};

export const useRenameMediaFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('gw_media_folders')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MediaFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      toast.success('Folder renamed successfully');
    },
    onError: (error) => {
      toast.error('Failed to rename folder: ' + error.message);
    },
  });
};

export const useDeleteMediaFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_media_folders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      toast.success('Folder deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete folder: ' + error.message);
    },
  });
};

export const useMoveToFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileIds, folderId }: { fileIds: string[]; folderId: string | null }) => {
      const { error } = await supabase
        .from('gw_media_library')
        .update({ folder_id: folderId })
        .in('id', fileIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      queryClient.invalidateQueries({ queryKey: ['media-library'] });
      toast.success('Files moved successfully');
    },
    onError: (error) => {
      toast.error('Failed to move files: ' + error.message);
    },
  });
};
