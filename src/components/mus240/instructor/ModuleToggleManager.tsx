import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, Eye, EyeOff, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ModuleSetting {
  id: string;
  module_id: string;
  is_active: boolean;
  is_locked: boolean;
  semester: string;
}

const MODULE_TITLES: Record<string, string> = {
  'week-1': 'Week 1: Introduction to African American Music',
  'week-2': 'Week 2: Spirituals and the Enslaved Experience',
  'week-3': 'Week 3: Blues: From Delta to Urban',
  'week-4': 'Week 4: Jazz: The Birth of an American Art Form',
  'week-5': 'Week 5: The Harlem Renaissance',
  'week-6': 'Week 6: Swing Era and Big Bands',
  'week-7': 'Week 7: Bebop Revolution',
  'week-8': 'Week 8: Gospel Music',
  'week-9': 'Week 9: Rhythm & Blues',
  'week-10': 'Week 10: Soul Music',
  'week-11': 'Week 11: Funk and Disco',
  'week-12': 'Week 12: Hip-Hop Origins',
  'week-13': 'Week 13: Contemporary R&B',
  'week-14': 'Week 14: Hip-Hop Evolution',
  'week-15': 'Week 15: Current Trends',
  'week-16': 'Week 16: Final Review',
};

export const ModuleToggleManager: React.FC = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<ModuleSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_module_settings')
        .select('*')
        .order('module_id');

      if (error) throw error;
      
      // Sort by week number
      const sorted = (data || []).sort((a, b) => {
        const weekA = parseInt(a.module_id.replace('week-', ''));
        const weekB = parseInt(b.module_id.replace('week-', ''));
        return weekA - weekB;
      });
      
      setModules(sorted);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to load module settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (moduleId: string, currentValue: boolean) => {
    const updated = modules.map(m => 
      m.module_id === moduleId ? { ...m, is_active: !currentValue } : m
    );
    setModules(updated);

    try {
      const { error } = await supabase
        .from('mus240_module_settings')
        .update({ is_active: !currentValue, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('module_id', moduleId);

      if (error) throw error;
      toast.success(`Module ${!currentValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Failed to update module');
      fetchModules(); // Revert on error
    }
  };

  const toggleLocked = async (moduleId: string, currentValue: boolean) => {
    const updated = modules.map(m => 
      m.module_id === moduleId ? { ...m, is_locked: !currentValue } : m
    );
    setModules(updated);

    try {
      const { error } = await supabase
        .from('mus240_module_settings')
        .update({ is_locked: !currentValue, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('module_id', moduleId);

      if (error) throw error;
      toast.success(`Module ${!currentValue ? 'locked' : 'unlocked'}`);
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Failed to update module');
      fetchModules();
    }
  };

  const enableAll = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('mus240_module_settings')
        .update({ is_active: true, is_locked: false, updated_by: user?.id })
        .neq('module_id', '');

      if (error) throw error;
      toast.success('All modules enabled');
      fetchModules();
    } catch (error) {
      toast.error('Failed to enable all modules');
    } finally {
      setSaving(false);
    }
  };

  const disableAll = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('mus240_module_settings')
        .update({ is_active: false, updated_by: user?.id })
        .neq('module_id', '');

      if (error) throw error;
      toast.success('All modules disabled');
      fetchModules();
    } catch (error) {
      toast.error('Failed to disable all modules');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading modules...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={enableAll} disabled={saving}>
          <Eye className="h-4 w-4 mr-2" />
          Enable All
        </Button>
        <Button variant="outline" size="sm" onClick={disableAll} disabled={saving}>
          <EyeOff className="h-4 w-4 mr-2" />
          Disable All
        </Button>
      </div>

      <div className="grid gap-2">
        {modules.map((module) => (
          <Card key={module.id} className={`${!module.is_active ? 'opacity-60' : ''}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm sm:text-base truncate">
                    {MODULE_TITLES[module.module_id] || module.module_id}
                  </h4>
                  <div className="flex gap-2 mt-1">
                    {module.is_active ? (
                      <Badge variant="default" className="text-xs">Visible</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Hidden</Badge>
                    )}
                    {module.is_locked && (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">Active</span>
                    <Switch
                      checked={module.is_active}
                      onCheckedChange={() => toggleActive(module.module_id, module.is_active)}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">Locked</span>
                    <Switch
                      checked={module.is_locked}
                      onCheckedChange={() => toggleLocked(module.module_id, module.is_locked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
