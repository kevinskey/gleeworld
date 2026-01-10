import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface HandbookAppendix {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  markdown_content: string;
  version: number;
  is_published: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useHandbookAppendix = (courseId: string, slug: string) => {
  const { user } = useAuth();
  const [currentVersion, setCurrentVersion] = useState<HandbookAppendix | null>(null);
  const [allVersions, setAllVersions] = useState<HandbookAppendix[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  // Check edit permissions (exec-board/admin)
  const checkPermissions = useCallback(async () => {
    if (!user) {
      setCanEdit(false);
      return;
    }

    try {
      // Prefer app_roles (authoritative role source)
      const { data: appRoles, error: appError } = await supabase
        .from('app_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .in('role', ['admin', 'super_admin', 'executive_board']);

      if (!appError && appRoles && appRoles.length > 0) {
        setCanEdit(true);
        return;
      }

      // Fallback: executive board membership table
      const { data: execBoard, error: execError } = await supabase
        .from('gw_executive_board_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      setCanEdit(!execError && !!execBoard && execBoard.length > 0);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setCanEdit(false);
    }
  }, [user]);

  // Fetch the current published version
  const fetchCurrentVersion = useCallback(async () => {
    setLoading(true);
    try {
      // First try to get from handbook_appendices table
      const { data, error } = await supabase
        .from('handbook_appendices')
        .select('*')
        .eq('course_id', courseId)
        .eq('slug', slug)
        .eq('is_published', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentVersion(data);
    } catch (error) {
      console.error('Error fetching appendix:', error);
      toast.error('Failed to load appendix content');
    } finally {
      setLoading(false);
    }
  }, [courseId, slug]);

  // Fetch all versions (for admins)
  const fetchAllVersions = useCallback(async () => {
    if (!canEdit) return;

    try {
      const { data, error } = await supabase
        .from('handbook_appendices')
        .select('*')
        .eq('course_id', courseId)
        .eq('slug', slug)
        .order('version', { ascending: false });

      if (error) throw error;
      setAllVersions(data || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
    }
  }, [courseId, slug, canEdit]);

  // Save as draft (update existing unpublished or create new version)
  const saveDraft = useCallback(async (content: string, title?: string) => {
    if (!user || !canEdit) return false;
    setSaving(true);

    try {
      const latestVersion = allVersions[0]?.version || currentVersion?.version || 0;
      
      // Check if there's an unpublished draft
      const existingDraft = allVersions.find(v => !v.is_published);
      
      if (existingDraft) {
        // Update the existing draft
        const { error } = await supabase
          .from('handbook_appendices')
          .update({
            markdown_content: content,
            title: title || existingDraft.title,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDraft.id);

        if (error) throw error;
      } else {
        // Create a new draft version
        const { error } = await supabase
          .from('handbook_appendices')
          .insert({
            course_id: courseId,
            slug: slug,
            title: title || currentVersion?.title || 'Untitled',
            markdown_content: content,
            version: latestVersion + 1,
            is_published: false,
            updated_by: user.id
          });

        if (error) throw error;
      }

      await fetchAllVersions();
      toast.success('Draft saved');
      return true;
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, canEdit, courseId, slug, currentVersion, allVersions, fetchAllVersions]);

  // Publish a new version
  const publishNewVersion = useCallback(async (content: string, title?: string) => {
    if (!user || !canEdit) return false;
    setSaving(true);

    try {
      const latestVersion = allVersions[0]?.version || currentVersion?.version || 0;
      
      // Check if there's an unpublished draft to publish
      const existingDraft = allVersions.find(v => !v.is_published);
      
      if (existingDraft) {
        // Update and publish the existing draft
        const { error } = await supabase
          .from('handbook_appendices')
          .update({
            markdown_content: content,
            title: title || existingDraft.title,
            is_published: true,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDraft.id);

        if (error) throw error;
      } else {
        // Create and publish a new version
        const { error } = await supabase
          .from('handbook_appendices')
          .insert({
            course_id: courseId,
            slug: slug,
            title: title || currentVersion?.title || 'Untitled',
            markdown_content: content,
            version: latestVersion + 1,
            is_published: true,
            updated_by: user.id
          });

        if (error) throw error;
      }

      await fetchCurrentVersion();
      await fetchAllVersions();
      toast.success('New version published successfully');
      return true;
    } catch (error) {
      console.error('Error publishing:', error);
      toast.error('Failed to publish');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, canEdit, courseId, slug, currentVersion, allVersions, fetchCurrentVersion, fetchAllVersions]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  useEffect(() => {
    fetchCurrentVersion();
  }, [fetchCurrentVersion]);

  useEffect(() => {
    if (canEdit) {
      fetchAllVersions();
    }
  }, [canEdit, fetchAllVersions]);

  return {
    currentVersion,
    allVersions,
    loading,
    saving,
    canEdit,
    saveDraft,
    publishNewVersion,
    refetch: fetchCurrentVersion
  };
};
