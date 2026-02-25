import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Play, LayoutGrid, ClipboardList, MessageSquare, BookOpen, ChevronRight, Calendar, ChevronLeft, ChevronDown, ChevronUp, Mic, MapPin, Settings } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useMergedProfile } from '@/hooks/useMergedProfile';
import { AcademyCourse } from '@/config/academyCourses';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CourseTopicSlider } from '@/components/academy/CourseTopicSlider';
import { AdvertisingHero } from '@/components/hero/AdvertisingHero';
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
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const isMus070 = course.courseCode === 'MUS 070';
  const isAdmin = profile?.is_admin || profile?.is_super_admin || profile?.role === 'instructor';

  // Glass styling helpers for MUS 070
  const glass = isMus070 ? 'bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl shadow-none' : '';
  const glassText = isMus070 ? 'text-white' : 'text-foreground';
  const glassMuted = isMus070 ? 'text-slate-400' : 'text-muted-foreground';
  const glassAccent = isMus070 ? 'text-sky-400' : 'text-primary';

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

  // Fetch ALL course assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['course-all-assignments', course.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_course_assignments')
        .select('*')
        .eq('course_id', course.id)
        .eq('is_published', true)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!course.id,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    staleTime: 10_000,
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
    <div 
      className={isMus070 ? 'min-h-screen relative' : 'bg-white text-foreground'}
      style={isMus070 ? {
        background: 'linear-gradient(160deg, #0a1628, #0d1f3c, #081430, #060e1f, #030812)',
      } : undefined}
    >
      {/* Deep-sea glow orbs & grain for MUS 070 */}
      {isMus070 && (
        <>
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)' }} />
          </div>
          <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
        </>
      )}

      {/* Course Title Bar */}
      <div className={`relative z-10 ${isMus070 ? 'bg-white/[0.05] backdrop-blur-xl border-b border-white/10' : 'bg-white border-b border-gray-200'}`}>
        <div className="px-3 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate(-1)}
              className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors touch-manipulation ${isMus070 ? 'hover:bg-white/10' : 'hover:bg-muted'}`}
              aria-label="Go back"
            >
              <ChevronLeft className={`h-5 w-5 ${glassMuted}`} />
            </button>
            <Badge className={`font-semibold px-2 py-0.5 text-xs shrink-0 ${isMus070 ? 'bg-sky-400/20 text-sky-400 border border-sky-400/30' : 'bg-primary text-primary-foreground'}`}>
              {course.courseCode}
            </Badge>
          </div>
          
          <span className={`font-semibold text-base text-center flex-1 truncate ${glassText}`}>
            {course.title}
          </span>
          
          <button
            onClick={() => navigate(`/grading/student/course/${course.id}`)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-colors touch-manipulation shrink-0 ${isMus070 ? 'bg-white/[0.08] hover:bg-white/[0.12]' : 'bg-primary/10 hover:bg-primary/20'}`}
            aria-label="View grade breakdown"
          >
            <span className={`text-xs font-bold ${glassText}`}>
              {gradeLoading ? '--' : `${percentage}%`}
            </span>
            <span className={`text-xs font-semibold ${glassAccent}`}>
              {gradeLoading ? '' : letterGrade}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <AdvertisingHero />

        <main className="p-4 space-y-4 pb-32">


          {/* Listen to Tracks */}
          <div className="relative">
            <Card variant="outline" className={`shadow-sm ${glass}`}>
              <CardContent className="py-3">
                <Button 
                  onClick={() => setPlaylistOpen(!playlistOpen)}
                  variant="outline"
                  className={`w-full h-10 text-sm font-semibold justify-between ${isMus070 ? 'border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]' : 'border-border hover:bg-muted/50'}`}
                >
                  <div className="flex items-center">
                    <Play className={`h-4 w-4 mr-2 ${glassAccent}`} />
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

            <MobilePlaylistDropdown
              courseId={course.id}
              isOpen={playlistOpen}
              onOpenChange={setPlaylistOpen}
            />
          </div>

          {/* Current Module Card */}
          {currentModule && (
            <Card className={isMus070 ? glass : 'border-0 shadow-sm bg-card'}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-semibold text-lg ${glassText}`}>
                      Week {currentModule.week_number} — {currentModule.title?.replace(/^Week \d+:\s*/, '')}
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/academy/${courseSlug}?tab=modules`)}
                    className={isMus070 ? 'border-white/10 text-sky-400 hover:bg-white/[0.08]' : 'text-primary border-primary hover:bg-primary/10'}
                  >
                    Open Module
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assignments (hidden for MUS 070) */}
          {!isMus070 && assignments.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-foreground">Assignments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {assignments.map((assignment) => {
                  const isPast = assignment.due_date && new Date(assignment.due_date) < new Date();
                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{assignment.title}</p>
                        <p className={`text-xs ${isPast ? 'text-muted-foreground' : 'text-primary font-medium'}`}>
                          {assignment.due_date ? formatDueDate(assignment.due_date) : 'No due date'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/academy/${courseSlug}?tab=assignments`)}
                        className="text-primary border-primary hover:bg-primary/10 ml-3 text-xs"
                      >
                        View
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions Row */}
          <div className="grid grid-cols-4 gap-3">
            {isMus070 ? (
              <>
                <QuickActionButton icon={Mic} label="Recordings" onClick={() => navigate(`/academy/${courseSlug}?tab=recordings`)} isMus070={isMus070} />
                <QuickActionButton icon={Calendar} label="Concerts" onClick={() => navigate('/music-library', { state: { from: `/academy/mus-070`, tab: 'setlists' } })} isMus070={isMus070} />
                <QuickActionButton icon={MapPin} label="Tour" onClick={() => navigate(`/academy/${courseSlug}?tab=tour`)} isMus070={isMus070} />
                <QuickActionButton icon={BookOpen} label="Resources" onClick={() => navigate(`/academy/${courseSlug}?tab=resources`)} isMus070={isMus070} />
              </>
            ) : (
              <>
                <QuickActionButton icon={LayoutGrid} label="Modules" onClick={() => navigate(`/academy/${courseSlug}?tab=modules`)} isMus070={isMus070} />
                <QuickActionButton icon={ClipboardList} label="Assignments" onClick={() => navigate(`/academy/${courseSlug}?tab=assignments`)} isMus070={isMus070} />
                <QuickActionButton icon={MessageSquare} label="Messages" onClick={() => navigate(`/academy/${courseSlug}?tab=messages`)} isMus070={isMus070} />
                <QuickActionButton icon={BookOpen} label="Resources" onClick={() => navigate(`/academy/${courseSlug}?tab=resources`)} isMus070={isMus070} />
              </>
            )}
          </div>

          {/* Announcements / Media Slider */}
          <Card className={isMus070 ? `${glass} overflow-hidden relative z-0` : 'border-0 shadow-sm overflow-hidden relative z-0'}>
            <div className="pointer-events-auto">
              <CourseTopicSlider courseCode={course.courseCode} />
            </div>
          </Card>

          {/* Class Schedule Form - Only for MUS 070 */}
          {course.courseCode === 'MUS 070' && (
            <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <Card variant="outline" className={isMus070 ? `${glass} border-2 border-red-500/50` : 'border-2 border-red-500'}>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-red-400" />
                        <CardTitle className={`text-sm font-semibold ${glassText}`}>Your Class Schedule</CardTitle>
                      </div>
                      {scheduleOpen ? (
                        <ChevronUp className={`h-4 w-4 ${glassMuted}`} />
                      ) : (
                        <ChevronDown className={`h-4 w-4 ${glassMuted}`} />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 px-1 pb-1">
                    <ClassScheduleForm semester="Spring 2026" />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Instructor Console - for admins/instructors on tablet */}
          {isAdmin && (
            <Button
              onClick={() => navigate(`/${courseSlug}/instructor/console`)}
              variant="default"
              className="w-full h-12 text-sm font-semibold"
              size="lg"
            >
              <Settings className="h-5 w-5 mr-2" />
              Instructor Control Center
            </Button>
          )}
        </main>
      </div>
    </div>
  );
};

// Quick Action Button Component
interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  isMus070?: boolean;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon: Icon, label, onClick, isMus070 = false }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all touch-manipulation min-h-[80px] ${
      isMus070 
        ? 'bg-white/[0.05] backdrop-blur-xl border border-white/10 hover:bg-white/[0.08] hover:scale-[1.02]' 
        : 'bg-card rounded-lg border border-border hover:bg-muted/50'
    }`}
  >
    <Icon className={`h-6 w-6 mb-2 ${isMus070 ? 'text-sky-400' : 'text-primary'}`} />
    <span className={`text-xs font-medium ${isMus070 ? 'text-slate-300' : 'text-foreground'}`}>{label}</span>
  </button>
);

export default MobileCourseLanding;
