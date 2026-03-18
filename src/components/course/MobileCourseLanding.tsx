import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Play, LayoutGrid, ClipboardList, MessageSquare, BookOpen, ChevronRight, Calendar, ChevronLeft, ChevronDown, ChevronUp, Mic, MapPin, Settings, FileSignature, CheckCircle2, UserCheck } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useMergedProfile } from '@/hooks/useMergedProfile';
import { AcademyCourse } from '@/config/academyCourses';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CourseTopicSlider } from '@/components/academy/CourseTopicSlider';
import { AdvertisingHero } from '@/components/hero/AdvertisingHero';
import { GleeCamCard } from '@/components/dashboard/GleeCamCard';
import { ClassScheduleForm } from '@/components/academy/ClassScheduleForm';
import { useCourseGrade } from '@/hooks/useCourseGrade';
import { MobilePlaylistDropdown } from './MobilePlaylistDropdown';
import { TourContractSigningModal } from '@/components/mus070/student/TourContractSigningModal';
import { useToast } from '@/hooks/use-toast';


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
  const [contractOpen, setContractOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const isMus070 = course.courseCode === 'MUS 070';
  const isMus240 = course.courseCode === 'MUS 240';
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

  const TOUR_CONTRACT_ID = '99ad60d3-0e94-41b2-b4f9-1b03146c62c9';

  // Check if student already signed the tour contract (MUS 070 only)
  const { data: hasSigned } = useQuery({
    queryKey: ['tour-contract-signature', user?.id, TOUR_CONTRACT_ID],
    queryFn: async () => {
      const { data } = await supabase
        .from('tour_contract_signatures')
        .select('id')
        .eq('contract_id', TOUR_CONTRACT_ID)
        .eq('user_id', user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && isMus070,
  });

  // Fetch active tour (MUS 070 only)
  const { data: activeTour } = useQuery({
    queryKey: ['student-tour-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tours')
        .select('id')
        .in('status', ['planning', 'confirmed', 'active'])
        .order('start_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: isMus070,
  });

  // Fetch active roll call session
  const { data: activeCheckin } = useQuery({
    queryKey: ['student-active-checkin', activeTour?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tour_checkins')
        .select('id, title, opened_at')
        .eq('tour_id', activeTour!.id)
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!activeTour?.id && isMus070,
  });

  // Check if user already responded to roll call
  const { data: myResponse } = useQuery({
    queryKey: ['student-checkin-response', activeCheckin?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tour_checkin_responses')
        .select('id, checked_in_at')
        .eq('checkin_id', activeCheckin!.id)
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!activeCheckin?.id && !!user?.id,
  });

  // Realtime subscription for roll call updates
  useEffect(() => {
    if (!activeTour?.id || !isMus070) return;
    const channel = supabase
      .channel('landing-rollcall-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gw_tour_checkins', filter: `tour_id=eq.${activeTour.id}` }, () => {
        qc.invalidateQueries({ queryKey: ['student-active-checkin', activeTour.id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gw_tour_checkin_responses' }, () => {
        qc.invalidateQueries({ queryKey: ['student-checkin-response'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTour?.id, isMus070, qc]);

  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('gw_tour_checkin_responses').insert({
        checkin_id: activeCheckin!.id,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-checkin-response'] });
      toast({ title: '✓ Checked In', description: 'Your presence has been recorded.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const courseSlug = course.courseCode.toLowerCase().replace(' ', '-');
  const upcomingAssignments = assignments.slice(0, isMus240 ? 3 : assignments.length);

  if (isMus240) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Go back"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <Badge variant="secondary" className="mb-2 w-fit">
                {course.courseCode}
              </Badge>
              <p className="text-lg font-semibold leading-tight">
                {course.title}
              </p>
            </div>

            <button
              onClick={() => navigate(`/grading/student/course/${course.id}`)}
              className="rounded-2xl border border-border bg-card px-3 py-2 text-right shadow-sm transition-colors hover:bg-muted/50"
              aria-label="View grade breakdown"
            >
              <div className="text-xs text-muted-foreground">Current grade</div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-foreground">
                  {gradeLoading ? '--' : `${percentage}%`}
                </span>
                <span className="text-sm font-semibold text-primary">
                  {gradeLoading ? '' : letterGrade}
                </span>
              </div>
            </button>
          </div>
        </div>

        <main className="px-4 py-4 space-y-4 pb-32">
          <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/40 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Course Landing
              </p>
            </div>
            <div className="space-y-5 p-5">
              <div className="space-y-3">
                <h1 className="text-3xl font-black leading-none tracking-tight text-foreground">
                  Black music as archive, movement, and memory.
                </h1>
                <p className="max-w-[28rem] text-sm leading-6 text-muted-foreground">
                  Enter the week’s listening, readings, and discussions for Survey of African American Music.
                </p>
              </div>

              <div className="grid grid-cols-[1.4fr_0.9fr] gap-3">
                <div className="rounded-3xl border border-border bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Current focus
                  </p>
                  <p className="mt-2 text-xl font-bold leading-tight text-foreground">
                    {currentModule
                      ? `Week ${currentModule.week_number}: ${currentModule.title?.replace(/^Week \d+:\s*/, '')}`
                      : 'Course materials are being prepared'}
                  </p>
                  <Button
                    onClick={() => navigate(`/academy/${courseSlug}?tab=modules`)}
                    className="mt-4 w-full justify-between"
                  >
                    Open module
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="rounded-3xl border border-border bg-secondary/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Semester rhythm
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-foreground">
                    Read, listen, discuss, and trace the cultural impact behind every era.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/academy/${courseSlug}?tab=syllabus`)}
                    className="mt-4 w-full"
                  >
                    View syllabus
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <QuickActionButton icon={LayoutGrid} label="Modules" onClick={() => navigate(`/academy/${courseSlug}?tab=modules`)} />
            <QuickActionButton icon={ClipboardList} label="Assignments" onClick={() => navigate(`/academy/${courseSlug}?tab=assignments`)} />
            <QuickActionButton icon={Play} label="Listening" onClick={() => setPlaylistOpen(!playlistOpen)} />
            <QuickActionButton icon={MessageSquare} label="Messages" onClick={() => navigate(`/academy/${courseSlug}?tab=messages`)} />
          </div>

          <div className="relative">
            <Card className="border border-border shadow-sm">
              <CardContent className="py-3">
                <Button
                  onClick={() => setPlaylistOpen(!playlistOpen)}
                  variant="ghost"
                  className="h-auto w-full justify-between px-0 py-0 text-left hover:bg-transparent"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Listening shelf
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      Open this week’s playlists and listening examples.
                    </p>
                  </div>
                  {playlistOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>

            <MobilePlaylistDropdown
              courseId={course.id}
              isOpen={playlistOpen}
              onOpenChange={setPlaylistOpen}
            />
          </div>

          <section className="rounded-[2rem] border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Coming up
                </p>
                <h2 className="text-lg font-bold text-foreground">Assignments & deadlines</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/academy/${courseSlug}?tab=assignments`)}
              >
                All
              </Button>
            </div>
            <div className="p-5 space-y-3">
              {upcomingAssignments.length > 0 ? upcomingAssignments.map((assignment) => {
                const isPast = assignment.due_date && new Date(assignment.due_date) < new Date();
                return (
                  <button
                    key={assignment.id}
                    onClick={() => navigate(`/academy/${courseSlug}?tab=assignments`)}
                    className="flex w-full items-center justify-between rounded-2xl border border-border bg-background p-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{assignment.title}</p>
                      <p className={`mt-1 text-xs ${isPast ? 'text-muted-foreground' : 'text-primary'}`}>
                        {assignment.due_date ? formatDueDate(assignment.due_date) : 'No due date'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              }) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  No assignments are posted yet.
                </div>
              )}
            </div>
          </section>

          <Card className="overflow-hidden rounded-[2rem] border border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/30 pb-4">
              <CardTitle className="text-lg">Course highlights</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CourseTopicSlider courseCode={course.courseCode} />
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-border bg-accent/30 shadow-sm">
            <CardContent className="flex items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Need supporting material?</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Open readings, references, and study links for the course.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate(`/academy/${courseSlug}?tab=resources`)}>
                Resources
              </Button>
            </CardContent>
          </Card>

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
    );
  }

  return (
    <div
      className={isMus070 ? 'min-h-screen relative' : 'bg-background text-foreground'}
      style={isMus070 ? {
        background: 'linear-gradient(160deg, #0a1628, #0d1f3c, #081430, #060e1f, #030812)',
      } : undefined}
    >
      {isMus070 && (
        <>
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)' }} />
          </div>
          <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
        </>
      )}

      <div className={`relative z-10 ${isMus070 ? 'bg-white/[0.05] backdrop-blur-xl border-b border-white/10' : 'bg-card border-b border-border'}`}>
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

      <div className="relative z-10">
        <AdvertisingHero />

        <main className="p-4 space-y-4 pb-32">
          {isMus070 && activeCheckin && (
            <Card className="border-primary/40 bg-primary/5 shadow-md animate-in fade-in slide-in-from-top-2">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground text-sm flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-primary" />
                      {activeCheckin.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Roll call is active — confirm your presence</p>
                  </div>
                  {myResponse ? (
                    <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 rounded-lg px-3 py-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div className="text-right">
                        <p className="text-xs font-semibold text-green-700 dark:text-green-300">Present</p>
                        <p className="text-[10px] text-green-600/70 dark:text-green-400/70">
                          {format(new Date(myResponse.checked_in_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-2 bg-primary text-primary-foreground font-bold px-6"
                      onClick={() => checkinMutation.mutate()}
                      disabled={checkinMutation.isPending}
                    >
                      <UserCheck className="h-4 w-4" />
                      I Am Here
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isMus070 && hasSigned === false && (
            <Card className={`shadow-sm ${glass} border-amber-400/50`}>
              <CardContent className="py-3">
                <Button onClick={() => setContractOpen(true)} className="w-full gap-2" variant="default">
                  <FileSignature className="h-4 w-4" />
                  Sign Tour Participation Contract
                </Button>
              </CardContent>
            </Card>
          )}

          {isMus070 && <TourContractSigningModal open={contractOpen} onOpenChange={setContractOpen} />}

          {isMus070 && (
            <Card className={`shadow-sm ${glass}`}>
              <CardContent className="py-3">
                <Button
                  onClick={() => setStipendDialogOpen(true)}
                  className="w-full gap-2 bg-white/[0.08] border border-white/10 text-sky-400 hover:bg-white/[0.14]"
                  variant="outline"
                >
                  <DollarSign className="h-4 w-4" />
                  Sign Stipend Receipt ($100)
                </Button>
              </CardContent>
            </Card>
          )}
          {isMus070 && <StipendReceiptDialog open={stipendDialogOpen} onOpenChange={setStipendDialogOpen} />}

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

          {currentModule && (
            <Card className={isMus070 ? glass : 'border-0 shadow-sm bg-card'}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
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
                <QuickActionButton icon={LayoutGrid} label="Modules" onClick={() => navigate(`/academy/${courseSlug}?tab=modules`)} />
                <QuickActionButton icon={ClipboardList} label="Assignments" onClick={() => navigate(`/academy/${courseSlug}?tab=assignments`)} />
                <QuickActionButton icon={MessageSquare} label="Messages" onClick={() => navigate(`/academy/${courseSlug}?tab=messages`)} />
                <QuickActionButton icon={BookOpen} label="Resources" onClick={() => navigate(`/academy/${courseSlug}?tab=resources`)} />
              </>
            )}
          </div>

          <GleeCamCard className={isMus070 ? glass : ''} />

          <Card className={isMus070 ? `${glass} overflow-hidden relative z-0` : 'border-0 shadow-sm overflow-hidden relative z-0'}>
            <div className="pointer-events-auto">
              <CourseTopicSlider courseCode={course.courseCode} />
            </div>
          </Card>

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
        : 'bg-card border border-border hover:bg-muted/50'
    }`}
  >
    <Icon className={`h-6 w-6 mb-2 ${isMus070 ? 'text-sky-400' : 'text-primary'}`} />
    <span className={`text-xs font-medium ${isMus070 ? 'text-slate-300' : 'text-foreground'}`}>{label}</span>
  </button>
);

export default MobileCourseLanding;
