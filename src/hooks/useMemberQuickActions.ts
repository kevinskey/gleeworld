import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QuickAction {
  id: string;
  module_id: string;
  display_order: number;
  is_visible: boolean;
}

export const useMemberQuickActions = (userId: string | undefined, userRole: string) => {
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);

  // All authenticated users can use quick actions (not just members)
  const canUseQuickActions = !!userId;

  // Load quick actions for all users
  const loadQuickActions = useCallback(async () => {
    if (!userId || !canUseQuickActions) {
      setQuickActions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gw_member_quick_actions')
        .select('*')
        .eq('user_id', userId)
        .order('display_order');

      if (error) throw error;

      // If no quick actions exist, create defaults
      if (!data || data.length === 0) {
        await initializeDefaultQuickActions();
        return; // loadQuickActions will be called again
      }

      setQuickActions(data || []);
    } catch (error) {
      console.error('Error loading quick actions:', error);
      toast.error('Failed to load quick actions');
    } finally {
      setLoading(false);
    }
  }, [userId, canUseQuickActions]);

  // Initialize default quick actions for new users
  const initializeDefaultQuickActions = async () => {
    if (!userId || !canUseQuickActions) return;

    const defaultModules = ['music-library', 'glee-academy', 'calendar'];
    
    try {
      const quickActionsToInsert = defaultModules.map((moduleId, index) => ({
        user_id: userId,
        module_id: moduleId,
        display_order: index,
        is_visible: true
      }));

      const { error } = await supabase
        .from('gw_member_quick_actions')
        .insert(quickActionsToInsert);

      if (error) throw error;

      toast.success('Default quick actions initialized');
      await loadQuickActions();
    } catch (error: any) {
      console.error('Error initializing quick actions:', error);
      toast.error('Failed to initialize quick actions');
    }
  };

  useEffect(() => {
    loadQuickActions();
  }, [loadQuickActions]);

  // Add a module to quick actions
  const addQuickAction = async (moduleId: string) => {
    if (!userId || !canUseQuickActions) {
      toast.error('Unable to customize quick actions');
      return false;
    }

    try {
      // Check if module already exists
      const exists = quickActions.some(qa => qa.module_id === moduleId);
      if (exists) {
        toast.info('Module already in quick actions');
        return false;
      }

      const maxOrder = quickActions.length > 0 
        ? Math.max(...quickActions.map(qa => qa.display_order))
        : -1;

      const { error } = await supabase
        .from('gw_member_quick_actions')
        .insert({
          user_id: userId,
          module_id: moduleId,
          display_order: maxOrder + 1,
          is_visible: true
        });

      if (error) throw error;

      toast.success('Added to quick actions');
      await loadQuickActions();
      return true;
    } catch (error: any) {
      console.error('Error adding quick action:', error);
      toast.error('Failed to add quick action');
      return false;
    }
  };

  // Remove a module from quick actions
  const removeQuickAction = async (moduleId: string) => {
    if (!userId || !canUseQuickActions) {
      toast.error('Unable to customize quick actions');
      return false;
    }

    try {
      const { error } = await supabase
        .from('gw_member_quick_actions')
        .delete()
        .eq('user_id', userId)
        .eq('module_id', moduleId);

      if (error) throw error;

      toast.success('Removed from quick actions');
      await loadQuickActions();
      return true;
    } catch (error: any) {
      console.error('Error removing quick action:', error);
      toast.error('Failed to remove quick action');
      return false;
    }
  };

  // Toggle visibility of a quick action
  const toggleVisibility = async (moduleId: string) => {
    if (!userId || !canUseQuickActions) return;

    try {
      const action = quickActions.find(qa => qa.module_id === moduleId);
      if (!action) return;

      const { error } = await supabase
        .from('gw_member_quick_actions')
        .update({ is_visible: !action.is_visible })
        .eq('user_id', userId)
        .eq('module_id', moduleId);

      if (error) throw error;

      await loadQuickActions();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  // Reorder quick actions
  const reorderQuickActions = async (moduleIds: string[]) => {
    if (!userId || !canUseQuickActions) return;

    try {
      const updates = moduleIds.map((moduleId, index) => ({
        user_id: userId,
        module_id: moduleId,
        display_order: index
      }));

      for (const update of updates) {
        await supabase
          .from('gw_member_quick_actions')
          .update({ display_order: update.display_order })
          .eq('user_id', userId)
          .eq('module_id', update.module_id);
      }

      await loadQuickActions();
    } catch (error) {
      console.error('Error reordering quick actions:', error);
      toast.error('Failed to reorder quick actions');
    }
  };

  const isInQuickActions = (moduleId: string) => {
    return quickActions.some(qa => qa.module_id === moduleId && qa.is_visible);
  };

  const getVisibleQuickActions = () => {
    return quickActions.filter(qa => qa.is_visible);
  };

  return {
    quickActions,
    loading,
    canUseQuickActions,
    addQuickAction,
    removeQuickAction,
    toggleVisibility,
    reorderQuickActions,
    isInQuickActions,
    getVisibleQuickActions,
    refreshQuickActions: loadQuickActions
  };
};
