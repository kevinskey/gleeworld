import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, Play, Headphones, BookMarked, MessageSquare, PenLine, 
  FileText, CheckCircle, LayoutGrid
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ModuleVideosModal } from './ModuleVideosModal';
import { useCourseModules } from '@/hooks/useCourseModules';
import { useUserRole } from '@/hooks/useUserRole';
import { useCourseVisibilitySettings } from '@/hooks/useCourseVisibilitySettings';
interface CourseModulesSheetProps {
  courseId: string;
  courseCode: string;
  trigger?: React.ReactNode;
}

interface ModuleResource {
  id: string;
  title: string;
  resource_type: string;
  url: string | null;
  description: string | null;
  duration: string | null;
  is_required: boolean;
}

interface ModuleActivity {
  type: 'Video' | 'Reading' | 'Listening' | 'Discussion' | 'Journal';
  isCompleted: boolean;
  assignmentId?: string;
}

interface WeekModule {
  id: string;
  module_id?: string;
  week_number: number;
  title: string;
  description?: string;
  is_active: boolean;
  activities: ModuleActivity[];
  resources?: ModuleResource[];
}

export const CourseModulesSheet: React.FC<CourseModulesSheetProps> = ({
  courseId,
  courseCode,
  trigger
}) => {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, isInstructor } = useUserRole();
  const navigate = useNavigate();
  const [modules, setModules] = useState<WeekModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<WeekModule | null>(null);

  // Staff members (admin, super admin, instructor) see all modules; students see published only
  const hasStaffAccess = isAdmin() || isSuperAdmin() || isInstructor();
  
  // Course visibility settings - controls which activity types students can see
  const { settings: visibilitySettings } = useCourseVisibilitySettings(courseId);
  
  // Use the universal hook for modules data
  const { 
    modules: courseModulesData, 
    isLoading: modulesLoading,
    refetch: refetchModules
  } = useCourseModules({ courseId, publishedOnly: !hasStaffAccess });

  useEffect(() => {
    if (open && user) {
      fetchModuleActivities();
    }
  }, [open, user, courseId, courseModulesData]);

  const fetchModuleActivities = async () => {
    if (!user || courseModulesData.length === 0) return;
    
    try {
      setLoading(true);
      
      const isMus240 = courseCode.toUpperCase().includes('MUS') && courseCode.includes('240');
      
      // Fetch resources for MUS-240
      let resourcesMap: Record<string, ModuleResource[]> = {};
      
      if (isMus240) {
        const { data: resourcesData } = await supabase
          .from('mus240_module_resources')
          .select('id, module_id, title, resource_type, url, description, duration, is_required, display_order')
          .order('display_order', { ascending: true });
        
        (resourcesData || []).forEach((r: any) => {
          if (!resourcesMap[r.module_id]) resourcesMap[r.module_id] = [];
          resourcesMap[r.module_id].push(r);
        });
      }

      // Fetch all assignments for the course
      const { data: assignmentsData } = await supabase
        .from('gw_assignments')
        .select('id, title, assignment_type, category')
        .eq('course_id', courseId);

      // Fetch student submissions
      // @ts-ignore - Avoiding deep type instantiation issue with Supabase types
      const { data: submissionsData } = await supabase
        .from('gw_assignment_submissions')
        .select('assignment_id, status')
        .eq('student_id', user.id);

      const submittedAssignments = new Set(
        (submissionsData || []).filter((s: any) => s.status === 'submitted' || s.status === 'graded')
          .map((s: any) => s.assignment_id)
      );

      // Type mapping for assignments
      const typeMapping: Record<string, string[]> = {
        'Video': ['video', 'video_response'],
        'Reading': ['reading', 'reading_response', 'essay'],
        'Listening': ['listening', 'listening_response', 'audio'],
        'Discussion': ['discussion'],
        'Journal': ['journal', 'reflection']
      };

      // Visibility filter: map activity types to visibility settings
      const visibilityFilter: Record<string, boolean> = {
        'Discussion': hasStaffAccess || visibilitySettings.show_discussions,
        'Journal': hasStaffAccess || visibilitySettings.show_journals,
        'Video': true,
        'Reading': true,
        'Listening': true,
      };

      // Process modules using data from universal hook (already sorted correctly)
      const processedModules: WeekModule[] = courseModulesData.map(mod => {
        const activities: ModuleActivity[] = [];
        
        // Get resources for this module (MUS-240 uses module_id like 'week-1')
        const moduleResources = resourcesMap[mod.module_id] || [];
        
        // Only add Video activity if this module actually has video resources
        const hasVideos = moduleResources.some(r => r.resource_type === 'video');
        if (hasVideos && visibilityFilter['Video']) {
          activities.push({ type: 'Video', isCompleted: false });
        }
        
        // Only add Reading if this module has reading resources
        const hasReadings = moduleResources.some(r => r.resource_type === 'reading');
        if (hasReadings && visibilityFilter['Reading']) {
          activities.push({ type: 'Reading', isCompleted: false });
        }
        
        // Only add Listening if this module has listening/audio resources
        const hasListening = moduleResources.some(r => r.resource_type === 'listening' || r.resource_type === 'audio');
        if (hasListening && visibilityFilter['Listening']) {
          activities.push({ type: 'Listening', isCompleted: false });
        }
        
        // Only add Discussion if there's a matching assignment AND visibility allows it
        if (visibilityFilter['Discussion']) {
          const discussionAssignment = (assignmentsData || []).find((a: any) => {
            const isDiscussion = a.category === 'discussion' || a.assignment_type === 'discussion';
            const weekMatch = (a.title || '').toLowerCase().includes(`week ${mod.week_number}`) 
              || (a.title || '').toLowerCase().includes(`w${mod.week_number}`);
            return isDiscussion && weekMatch;
          });
          if (discussionAssignment) {
            activities.push({ 
              type: 'Discussion', 
              isCompleted: submittedAssignments.has(discussionAssignment.id),
              assignmentId: discussionAssignment.id
            });
          }
        }
        
        // Only add Journal if there's a matching assignment AND visibility allows it
        if (visibilityFilter['Journal']) {
          const journalAssignment = (assignmentsData || []).find((a: any) => {
            const isJournal = a.category === 'journal' || a.assignment_type === 'journal' || a.assignment_type === 'reflection';
            const weekMatch = (a.title || '').toLowerCase().includes(`week ${mod.week_number}`);
            return isJournal && weekMatch;
          });
          if (journalAssignment) {
            activities.push({ 
              type: 'Journal', 
              isCompleted: submittedAssignments.has(journalAssignment.id),
              assignmentId: journalAssignment.id
            });
          }
        }

        return {
          id: mod.id,
          module_id: mod.module_id,
          week_number: mod.week_number,
          title: mod.title?.replace(/^Week \d+:\s*/, '') || `Week ${mod.week_number}`,
          description: mod.description || undefined,
          is_active: mod.isCurrent || false,
          activities,
          resources: moduleResources
        };
      });

      setModules(processedModules);
    } catch (error) {
      console.error('Error fetching module activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video': return <Play className="h-3.5 w-3.5" />;
      case 'listening': return <Headphones className="h-3.5 w-3.5" />;
      case 'reading': return <BookMarked className="h-3.5 w-3.5" />;
      case 'discussion': return <MessageSquare className="h-3.5 w-3.5" />;
      case 'journal': return <PenLine className="h-3.5 w-3.5" />;
      default: return <FileText className="h-3.5 w-3.5" />;
    }
  };

  const handleActivityClick = (activity: ModuleActivity, module: WeekModule) => {
    const coursePath = courseCode.toLowerCase().replace(' ', '-');
    const isMus240 = courseCode.toUpperCase().includes('MUS') && courseCode.includes('240');
    
    // For Video activity in MUS-240, show the module videos modal if videos exist
    if (activity.type === 'Video' && isMus240) {
      const videos = (module.resources || []).filter(r => r.resource_type === 'video');
      console.log('[CourseModulesSheet] Video click - module:', module.module_id, 'videos found:', videos.length, videos);
      if (videos.length > 0) {
        setSelectedModule(module);
        setVideoModalOpen(true);
        setOpen(false);
        return;
      }
      // No videos assigned to this module - show a helpful message instead of going to all resources
      console.log('[CourseModulesSheet] No videos for module, showing toast');
      setOpen(false);
      return;
    }
    
    if (activity.assignmentId) {
      if (activity.type === 'Discussion') {
        // Navigate to discussions tab - the module's discussion will be auto-selected
        navigate(`/academy/${coursePath}?tab=discussions`, { replace: true });
      } else {
        navigate(`/grading/student/assignment/${activity.assignmentId}`);
      }
    } else {
      // Navigate to relevant tab for non-video activities
      const tabMapping: Record<string, string> = {
        'Reading': 'resources',
        'Listening': 'audio',
        'Discussion': 'discussions',
        'Journal': 'journal'
      };
      const tab = tabMapping[activity.type] || 'resources';
      navigate(`/academy/${coursePath}?tab=${tab}`, { replace: true });
    }
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            className="flex items-center gap-2 h-auto py-1 px-2 hover:bg-white/10 text-white"
          >
            <div className="h-8 w-8 rounded-md bg-primary/30 flex items-center justify-center flex-shrink-0">
              <LayoutGrid className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-medium">Modules</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <SheetHeader className="p-4 border-b bg-primary text-primary-foreground">
          <SheetTitle className="flex items-center gap-2 text-primary-foreground">
            <BookOpen className="h-5 w-5" />
            Course Modules
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : modules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mb-3 opacity-50" />
              <p>No modules available</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {modules.map((module) => (
                <div 
                  key={module.id}
                  className={cn(
                    "rounded-lg border p-4 transition-colors",
                    module.is_active 
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                      : "border-border bg-card"
                  )}
                >
                  {/* Module Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={module.is_active ? "default" : "outline"}
                          className="text-xs"
                        >
                          Week {module.week_number}
                        </Badge>
                        {module.is_active && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                            Current
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm">{module.title}</h3>
                      {module.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {module.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Activity Items - only shown when real data exists */}
                  {module.activities.length > 0 ? (
                    <div className="space-y-2">
                      {module.activities.map((activity) => (
                        <div
                          key={activity.type}
                          onClick={() => handleActivityClick(activity, module)}
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-colors",
                            activity.isCompleted 
                              ? "bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800" 
                              : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                          )}
                        >
                          <div className={cn(
                            "h-7 w-7 rounded-md flex items-center justify-center",
                            activity.isCompleted 
                              ? "bg-green-100 text-green-600" 
                              : "bg-primary/10 text-primary"
                          )}>
                            {getActivityIcon(activity.type)}
                          </div>
                          <span className="flex-1 font-medium text-sm">{activity.type}</span>
                          {activity.isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="text-xs text-muted-foreground">Start</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-1">
                      No activities assigned yet
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>

      {/* Video Modal for module-specific videos */}
      {selectedModule && (
        <ModuleVideosModal
          open={videoModalOpen}
          onOpenChange={setVideoModalOpen}
          videos={(selectedModule.resources || []).filter(r => r.resource_type === 'video')}
          weekNumber={selectedModule.week_number}
          moduleTitle={selectedModule.title}
        />
      )}
    </Sheet>
  );
};
