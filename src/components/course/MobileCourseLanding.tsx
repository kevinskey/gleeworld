import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Play, LayoutGrid, ClipboardList, MessageSquare, BookOpen, ChevronRight, Calendar, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMergedProfile } from '@/hooks/useMergedProfile';
import { AcademyCourse } from '@/config/academyCourses';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CourseTopicSlider } from '@/components/academy/CourseTopicSlider';
import { ClassScheduleForm } from '@/components/academy/ClassScheduleForm';
import { useCourseGrade } from '@/hooks/useCourseGrade';
import { MobilePlaylistDropdown } from './MobilePlaylistDropdown';

interface MobileCourseLandingProps {
  course: AcademyCourse;
}

export const MobileCourseLanding: React.FC<MobileCourseLandingProps> = ({ course }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useMergedProfile(user);
  const { letterGrade, percentage, loading: gradeLoading } = useCourseGrade(course.id);
  const [playlistOpen, setPlaylistOpen] = useState(false);

  // Fetch current module based on date
  const { data: currentModule } = useQuery({
    queryKey: ['current-module', course.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('gw_course_modules')
        .select('*')
        .eq('course_id', course.id)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('week_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!course.id,
  });

  // Fetch upcoming assignments (max 3)
  const { data: assignments = [] } = useQuery({
    queryKey: ['course-assignments-due', course.id],
    queryFn: async () => {
      const today = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('module_items')
        .select('*')
        .eq('item_type', 'assignment')
        .gte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
  });

  const formatDueDate = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24 && diffHours > 0) {
      return 'Due Tonight';
    }
    if (diffHours < 48 && diffHours > 0) {
      return 'Due Tomorrow';
    }
    return `Due ${format(due, 'MMM d')}`;
  };

  const courseSlug = course.courseCode.toLowerCase().replace(' ', '-');
  

  return (
    <div className="min-h-screen bg-background">
      {/* Course Title Bar with Back, Title, and Grade */}
      <div className="bg-card border-b border-border px-3 py-3 flex items-center justify-between gap-2">
        {/* Left: Back Button + Course Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted transition-colors touch-manipulation"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <Badge className="bg-primary text-primary-foreground font-semibold px-2 py-0.5 text-xs shrink-0">
            {course.courseCode}
          </Badge>
        </div>
        
        {/* Center: Course Title */}
        <span className="font-semibold text-foreground text-base text-center flex-1 truncate">
          {course.title}
        </span>
        
        {/* Right: Grade Box */}
        <button
          onClick={() => navigate(`/grading/student/course/${course.id}`)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors touch-manipulation shrink-0"
          aria-label="View grade breakdown"
        >
          <span className="text-xs font-bold text-foreground">
            {gradeLoading ? '--' : `${percentage}%`}
          </span>
          <span className="text-xs font-semibold text-primary">
            {gradeLoading ? '' : letterGrade}
          </span>
        </button>
      </div>

      {/* Main Content - Vertical Stack */}
      <main className="p-4 space-y-4 pb-24">
        {/* 2. Listen to Tracks - Dropdown Toggle */}
        <div className="relative">
          <Card variant="outline" className="shadow-sm">
            <CardContent className="py-3">
              <Button 
                onClick={() => setPlaylistOpen(!playlistOpen)}
                variant="outline"
                className="w-full h-10 text-sm font-semibold border-border hover:bg-muted/50 justify-between"
              >
                <div className="flex items-center">
                  <Play className="h-4 w-4 mr-2" />
                  Listen to Tracks
                </div>
                {playlistOpen ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Playlist Dropdown */}
          <MobilePlaylistDropdown
            courseId={course.id}
            isOpen={playlistOpen}
            onOpenChange={setPlaylistOpen}
          />
        </div>

        {/* 3. Current Module Card */}
        {currentModule && (
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-lg">
                    Week {currentModule.week_number} — {currentModule.title?.replace(/^Week \d+:\s*/, '')}
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => navigate(`/academy/${courseSlug}?tab=modules`)}
                  className="text-primary border-primary hover:bg-primary/10"
                >
                  Open Module
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4. Assignments Due Card */}
        {assignments.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-foreground">Assignments Due</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignments.map((assignment) => (
                <div 
                  key={assignment.id} 
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{assignment.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {assignment.due_date && formatDueDate(assignment.due_date)}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/grading/student/assignment/${assignment.id}`)}
                    className="text-primary border-primary hover:bg-primary/10 ml-3"
                  >
                    Open
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 5. Quick Actions Row - 2x2 Grid */}
        <div className="grid grid-cols-4 gap-3">
          <QuickActionButton 
            icon={LayoutGrid} 
            label="Modules" 
            onClick={() => navigate(`/academy/${courseSlug}?tab=modules`)} 
          />
          <QuickActionButton 
            icon={ClipboardList} 
            label="Assignments" 
            onClick={() => navigate(`/academy/${courseSlug}?tab=assignments`)} 
          />
          <QuickActionButton 
            icon={MessageSquare} 
            label="Messages" 
            onClick={() => navigate(`/academy/${courseSlug}?tab=messages`)} 
          />
          <QuickActionButton 
            icon={BookOpen} 
            label="Resources" 
            onClick={() => navigate(`/academy/${courseSlug}?tab=resources`)} 
          />
        </div>

        {/* 6. Announcements / Media Slider */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CourseTopicSlider 
            courseCode={course.courseCode}
          />
        </Card>

        {/* 7. Class Schedule Form - Only for MUS 070 (Glee Club) */}
        {course.courseCode === 'MUS 070' && (
          <div className="border-2 border-red-500 rounded-lg p-1">
            <ClassScheduleForm semester="Spring 2026" />
          </div>
        )}
      </main>
    </div>
  );
};

// Quick Action Button Component
interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center p-4 bg-card rounded-lg border border-border hover:bg-muted/50 transition-colors touch-manipulation min-h-[80px]"
  >
    <Icon className="h-6 w-6 text-primary mb-2" />
    <span className="text-xs font-medium text-foreground">{label}</span>
  </button>
);

export default MobileCourseLanding;
