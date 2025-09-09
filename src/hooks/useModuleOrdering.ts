import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ModuleOrdering {
  id: string;
  user_id: string;
  category: string;
  module_key: string;
  sort_order: number;
  is_pinned?: boolean;
}

export const useModuleOrdering = (userId: string) => {
  const [moduleOrdering, setModuleOrdering] = useState<ModuleOrdering[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchModuleOrdering = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_module_ordering')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching module ordering:', error);
        return;
      }

      setModuleOrdering(data || []);
    } catch (error) {
      console.error('Error fetching module ordering:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModulePin = async (
    category: string,
    moduleKey: string
  ) => {
    if (!userId) return;

    try {
      const existing = moduleOrdering.find(
        item => item.category === category && item.module_key === moduleKey
      );

      const { error } = await supabase
        .from('gw_module_ordering')
        .upsert({
          user_id: userId,
          category,
          module_key: moduleKey,
          sort_order: existing?.sort_order ?? 999,
          is_pinned: !existing?.is_pinned
        }, {
          onConflict: 'user_id, category, module_key'
        });

      if (error) {
        console.error('Error toggling module pin:', error);
        toast.error('Failed to pin/unpin module');
        return;
      }

      // Update local state
      setModuleOrdering(prev => {
        const existingIndex = prev.findIndex(
          item => item.category === category && item.module_key === moduleKey
        );
        
        if (existingIndex >= 0) {
          return prev.map((item, index) => 
            index === existingIndex 
              ? { ...item, is_pinned: !item.is_pinned }
              : item
          );
        } else {
          return [...prev, {
            id: crypto.randomUUID(),
            user_id: userId,
            category,
            module_key: moduleKey,
            sort_order: 999,
            is_pinned: true
          }];
        }
      });

      toast.success(`Module ${existing?.is_pinned ? 'unpinned' : 'pinned'}`);
    } catch (error) {
      console.error('Error toggling module pin:', error);
      toast.error('Failed to pin/unpin module');
    }
  };

  const updateModuleOrder = async (
    category: string, 
    moduleKey: string, 
    newOrder: number
  ) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('gw_module_ordering')
        .upsert({
          user_id: userId,
          category,
          module_key: moduleKey,
          sort_order: newOrder
        }, {
          onConflict: 'user_id, category, module_key'
        });

      if (error) {
        console.error('Error updating module order:', error);
        toast.error('Failed to update module order');
        return;
      }

      // Update local state
      setModuleOrdering(prev => {
        const existing = prev.find(
          item => item.category === category && item.module_key === moduleKey
        );
        
        if (existing) {
          return prev.map(item => 
            item.id === existing.id 
              ? { ...item, sort_order: newOrder }
              : item
          );
        } else {
          return [...prev, {
            id: crypto.randomUUID(),
            user_id: userId,
            category,
            module_key: moduleKey,
            sort_order: newOrder
          }];
        }
      });
    } catch (error) {
      console.error('Error updating module order:', error);
      toast.error('Failed to update module order');
    }
  };

  const getModuleOrder = (category: string, moduleKey: string): number => {
    const ordering = moduleOrdering.find(
      item => item.category === category && item.module_key === moduleKey
    );
    return ordering?.sort_order ?? 999; // Default high value for unordered items
  };

  const isModulePinned = (category: string, moduleKey: string): boolean => {
    const ordering = moduleOrdering.find(
      item => item.category === category && item.module_key === moduleKey
    );
    return ordering?.is_pinned ?? false;
  };

  const saveCategoryOrder = async (category: string, orderedModuleKeys: string[]) => {
    if (!userId) return;

    try {
      const updates = orderedModuleKeys.map((moduleKey, index) => ({
        user_id: userId,
        category,
        module_key: moduleKey,
        sort_order: index
      }));

      const { error } = await supabase
        .from('gw_module_ordering')
        .upsert(updates, {
          onConflict: 'user_id, category, module_key'
        });

      if (error) {
        console.error('Error saving category order:', error);
        toast.error('Failed to save module order');
        return;
      }

      // Update local state
      setModuleOrdering(prev => {
        // Remove existing entries for this category
        const filtered = prev.filter(
          item => !(item.category === category && orderedModuleKeys.includes(item.module_key))
        );
        
        // Add new entries
        const newEntries = updates.map(update => ({
          id: crypto.randomUUID(),
          ...update
        }));
        
        return [...filtered, ...newEntries];
      });

      toast.success('Module order saved');
    } catch (error) {
      console.error('Error saving category order:', error);
      toast.error('Failed to save module order');
    }
  };

  useEffect(() => {
    fetchModuleOrdering();
  }, [userId]);

  return {
    moduleOrdering,
    loading,
    fetchModuleOrdering,
    updateModuleOrder,
    getModuleOrder,
    saveCategoryOrder,
    toggleModulePin,
    isModulePinned
  };
};