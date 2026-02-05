import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { useCourseModules } from '@/hooks/useCourseModules';

interface UniversalModuleManagerProps {
  courseId: string;
  courseName?: string;
}

export const UniversalModuleManager: React.FC<UniversalModuleManagerProps> = ({ 
  courseId,
  courseName = 'Course'
}) => {
  const { 
    modules, 
    currentWeekNumber,
    isLoading, 
    error,
    refetch,
    togglePublished,
    toggleLocked 
  } = useCourseModules({ courseId, publishedOnly: false });
  
  const [saving, setSaving] = useState(false);

  const handleTogglePublished = async (moduleId: string, currentValue: boolean) => {
    try {
      await togglePublished(moduleId, !currentValue);
      toast.success(`Module ${!currentValue ? 'visible to students' : 'hidden from students'}`);
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Failed to update module');
      refetch();
    }
  };

  const handleToggleLocked = async (moduleId: string, currentValue: boolean) => {
    try {
      await toggleLocked(moduleId, !currentValue);
      toast.success(`Module ${!currentValue ? 'locked' : 'unlocked'}`);
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Failed to update module');
      refetch();
    }
  };

  const publishAll = async () => {
    setSaving(true);
    try {
      for (const mod of modules) {
        if (!mod.is_published) {
          await togglePublished(mod.id, true);
        }
      }
      toast.success('All modules visible to students');
      refetch();
    } catch (error) {
      toast.error('Failed to publish all modules');
    } finally {
      setSaving(false);
    }
  };

  const unpublishAll = async () => {
    setSaving(true);
    try {
      for (const mod of modules) {
        if (mod.is_published) {
          await togglePublished(mod.id, false);
        }
      }
      toast.success('All modules hidden from students');
      refetch();
    } catch (error) {
      toast.error('Failed to hide all modules');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading modules...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-destructive">Error: {error}</div>;
  }

  if (modules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No modules found for this course.
      </div>
    );
  }

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
        <Badge variant="outline" className="ml-auto">
          <CalendarDays className="h-3 w-3 mr-1" />
          Current: Week {currentWeekNumber}
        </Badge>
      </div>

      <div className="grid gap-2">
        {modules.map((module) => (
          <Card 
            key={module.id} 
            className={`
              ${!module.is_published ? 'opacity-60 border-dashed' : ''} 
              ${module.isCurrent ? 'ring-2 ring-primary border-primary' : ''}
            `}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm sm:text-base truncate">
                    Week {module.week_number}: {module.title}
                  </h4>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {module.isCurrent && (
                      <Badge variant="default" className="text-xs bg-green-600">Current Week</Badge>
                    )}
                    {module.dateRange && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {module.dateRange}
                      </Badge>
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
                      onCheckedChange={() => handleTogglePublished(module.id, module.is_published)}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">Locked</span>
                    <Switch
                      checked={module.is_locked}
                      onCheckedChange={() => handleToggleLocked(module.id, module.is_locked)}
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

// Legacy export for backwards compatibility with MUS-240
export const ModuleToggleManager: React.FC = () => {
  const MUS_240_COURSE_ID = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';
  return <UniversalModuleManager courseId={MUS_240_COURSE_ID} courseName="MUS 240" />;
};
