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
  week_number: number;
  is_active: boolean;
  is_locked: boolean;
  is_published: boolean;
  semester: string;
  start_date: string;
  end_date: string;
}

const MODULE_TITLES: Record<string, string> = {
  'week-1': 'Week 1: Introduction to African American Music',
  'week-2': 'Week 2: Spirituals and the Enslaved Experience',
  'week-3': 'Week 3: Blues: From Delta to Urban',
  'week-4': 'Week 4: Ragtime and Birth of Jazz',
  'week-5': 'Week 5: Jubilee Quartet, Swing and WWII',
  'week-6': 'Week 6: Jazz Continued and the Birth of Gospel',
  'week-7': 'Week 7: Civil Rights Music, Funk and Midterm Exam',
  'week-8': 'Week 8: Gospel Music Project: The State of Gospel (Part 1)',
  'week-9': 'Week 9: Gospel Music Project: The State of Gospel (Part 2)',
  'week-10': 'Week 10: Disco and Detroit Techno',
  'week-11': 'Week 11: R&B and Soul',
  'week-12': 'Week 12: Hip-Hop (Part 1)',
  'week-13': 'Week 13: Hip-Hop (Part 2)',
  'week-14': 'Week 14: Fourth Turning Music',
  'week-15': 'Week 15: Finals Review',
  'week-16': 'Week 16: Final Exam (Monday 8am)',
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
      
      // Get current date for determining active week
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Sort: current week first, then descending by week number (most recent first)
      const sorted = (data || []).sort((a, b) => {
        const weekA = a.week_number || parseInt(a.module_id.replace('week-', '')) || 0;
        const weekB = b.week_number || parseInt(b.module_id.replace('week-', '')) || 0;
        
        // Check if either is the current week
        const isCurrentA = a.start_date && a.end_date && 
          today >= new Date(a.start_date) && today <= new Date(a.end_date);
        const isCurrentB = b.start_date && b.end_date && 
          today >= new Date(b.start_date) && today <= new Date(b.end_date);
        
        if (isCurrentA && !isCurrentB) return -1;
        if (!isCurrentA && isCurrentB) return 1;
        return weekB - weekA; // Descending order
      });
      
      setModules(sorted);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to load module settings');
    } finally {
      setLoading(false);
    }
  };

  // Toggle visibility (is_published) - controls whether students can see the module
  const togglePublished = async (moduleId: string, currentValue: boolean) => {
    const updated = modules.map(m => 
      m.module_id === moduleId ? { ...m, is_published: !currentValue } : m
    );
    setModules(updated);

    try {
      const { error } = await supabase
        .from('mus240_module_settings')
        .update({ is_published: !currentValue, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('module_id', moduleId);

      if (error) throw error;
      toast.success(`Module ${!currentValue ? 'visible to students' : 'hidden from students'}`);
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

  const publishAll = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('mus240_module_settings')
        .update({ is_published: true, is_locked: false, updated_by: user?.id })
        .neq('module_id', '');

      if (error) throw error;
      toast.success('All modules visible to students');
      fetchModules();
    } catch (error) {
      toast.error('Failed to publish all modules');
    } finally {
      setSaving(false);
    }
  };

  const unpublishAll = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('mus240_module_settings')
        .update({ is_published: false, updated_by: user?.id })
        .neq('module_id', '');

      if (error) throw error;
      toast.success('All modules hidden from students');
      fetchModules();
    } catch (error) {
      toast.error('Failed to hide all modules');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading modules...</div>;
  }

  // Calculate current week based on today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const getCurrentWeek = (mod: ModuleSetting) => {
    if (!mod.start_date || !mod.end_date) return false;
    const start = new Date(mod.start_date);
    const end = new Date(mod.end_date);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return today >= start && today <= end;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={publishAll} disabled={saving}>
          <Eye className="h-4 w-4 mr-2" />
          Show All to Students
        </Button>
        <Button variant="outline" size="sm" onClick={unpublishAll} disabled={saving}>
          <EyeOff className="h-4 w-4 mr-2" />
          Hide All from Students
        </Button>
      </div>

      <div className="grid gap-2">
        {modules.map((module) => {
          const isCurrentWeek = getCurrentWeek(module);
          return (
            <Card key={module.id} className={`${!module.is_published ? 'opacity-60 border-dashed' : ''} ${isCurrentWeek ? 'ring-2 ring-primary border-primary' : ''}`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm sm:text-base truncate">
                      {MODULE_TITLES[module.module_id] || module.module_id}
                    </h4>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {isCurrentWeek && (
                        <Badge variant="default" className="text-xs bg-green-600">Current Week</Badge>
                      )}
                      {module.is_published ? (
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                          <Eye className="h-3 w-3 mr-1" />
                          Visible
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Hidden
                        </Badge>
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
                      <span className="text-xs text-muted-foreground">Visible</span>
                      <Switch
                        checked={module.is_published}
                        onCheckedChange={() => togglePublished(module.module_id, module.is_published)}
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
          );
        })}
      </div>
    </div>
  );
};
