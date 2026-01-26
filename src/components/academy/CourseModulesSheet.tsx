import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, Play, Headphones, BookMarked, MessageSquare, PenLine, 
  FileText, CheckCircle, ChevronRight, Calendar, LayoutGrid
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ModuleVideosModal } from './ModuleVideosModal';

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
  const navigate = useNavigate();
  const [modules, setModules] = useState<WeekModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<WeekModule | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchModules();
    }
  }, [open, user, courseId]);

  const fetchModules = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Check if this is MUS-240 - use specialized table
      const isMus240 = courseCode.toUpperCase().includes('MUS') && courseCode.includes('240');
      
      let modulesData: any[] = [];
      
      let resourcesMap: Record<string, ModuleResource[]> = {};
      
      if (isMus240) {
        // Use mus240_module_settings for MUS-240
        const { data, error } = await supabase
          .from('mus240_module_settings')
          .select('id, module_id, week_number, title, description, is_active, is_locked')
          .order('week_number', { ascending: true });
        
        if (error) throw error;
        modulesData = data || [];
        
        // Fetch module resources for MUS-240
        const { data: resourcesData } = await supabase
          .from('mus240_module_resources')
          .select('id, module_id, title, resource_type, url, description, duration, is_required, display_order')
          .order('display_order', { ascending: true });
        
        // Group resources by module_id
        (resourcesData || []).forEach((r: any) => {
          if (!resourcesMap[r.module_id]) resourcesMap[r.module_id] = [];
          resourcesMap[r.module_id].push(r);
        });
      } else {
        // Use gw_course_modules for other courses
        const { data, error } = await supabase
          .from('gw_course_modules')
          .select('*')
          .eq('course_id', courseId)
          .order('week_number', { ascending: true });
        
        if (error) throw error;
        modulesData = data || [];
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

      // Standard activity types
      const standardTypes: ModuleActivity['type'][] = ['Video', 'Reading', 'Listening', 'Discussion', 'Journal'];
      
      // Type mapping for assignments
      const typeMapping: Record<string, string[]> = {
        'Video': ['video', 'video_response'],
        'Reading': ['reading', 'reading_response', 'essay'],
        'Listening': ['listening', 'listening_response', 'audio'],
        'Discussion': ['discussion'],
        'Journal': ['journal', 'reflection']
      };

      // Process modules
      const processedModules: WeekModule[] = (modulesData || []).map(mod => {
        // Map activities with completion status
        const activities: ModuleActivity[] = standardTypes.map(type => {
          // Find matching assignment
          const matchingTypes = typeMapping[type] || [];
          const assignment = (assignmentsData || []).find((a: any) => {
            const isDiscussion = a.category === 'discussion' || a.assignment_type === 'discussion';
            if (isDiscussion && type === 'Discussion') return true;
            const lowerTitle = (a.title || '').toLowerCase();
            const lowerType = (a.assignment_type || '').toLowerCase();
            return matchingTypes.some(t => lowerTitle.includes(t) || lowerType.includes(t));
          });

          return {
            type,
            isCompleted: assignment ? submittedAssignments.has(assignment.id) : false,
            assignmentId: assignment?.id
          };
        });

        // Get resources for this module (MUS-240)
        const moduleResources = resourcesMap[mod.module_id] || [];

        return {
          id: mod.id,
          module_id: mod.module_id,
          week_number: mod.week_number || 0,
          title: mod.title?.replace(/^Week \d+:\s*/, '') || `Week ${mod.week_number}`,
          description: mod.description,
          is_active: mod.is_active,
          activities,
          resources: moduleResources
        };
      });

      // Sort with current/active week at top
      const sortedModules = [...processedModules].sort((a, b) => {
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        return a.week_number - b.week_number;
      });

      setModules(sortedModules);
    } catch (error) {
      console.error('Error fetching modules:', error);
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

                  {/* Activity Items */}
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
