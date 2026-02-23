import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, ClipboardList, CheckCircle, XCircle, Clock, 
  FileText, AlertCircle, Play, ChevronDown, ChevronRight, BookOpen, Headphones,
  MessageSquare, PenLine, BookMarked, ExternalLink, ArrowRight,
  Lightbulb, Target, ListChecks, Pause, Music, History,
  GraduationCap, UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';
import { getCourseByCode } from '@/config/academyCourses';
import { getCourseTemplateConfig } from '@/config/courseTemplateConfig';
import { CourseTopicSlider } from './CourseTopicSlider';
import { ModuleVideosModal } from './ModuleVideosModal';
import { ModuleReadingsModal } from './ModuleReadingsModal';
import { useCoursePlaylist } from '@/hooks/useCoursePlaylist';
import { useCourseGrade } from '@/hooks/useCourseGrade';
import { toast } from 'sonner';

interface ModuleVideo {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
  duration: string | null;
  is_required: boolean;
}

interface ModuleReading {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
  is_required: boolean;
}

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  points: number;
  status?: 'pending' | 'submitted' | 'graded' | 'overdue';
  course_id: string;
  description?: string;
  is_discussion?: boolean;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_date: string;
  location?: string;
  event_type?: string;
  is_assignment?: boolean;
  is_discussion?: boolean;
  assignment_status?: 'pending' | 'submitted' | 'graded' | 'overdue';
  points?: number;
}

interface CurrentModule {
  id: string;
  title: string;
  week_number: number;
  content_types: { type: string; assignment?: Assignment; isCompleted: boolean }[];
  assignments: Assignment[];
  discussionId?: string;
}

interface TeachingFirstHomeProps {
  courseId: string;
  isAdmin?: boolean;
}

export const TeachingFirstHome: React.FC<TeachingFirstHomeProps> = ({ courseId, isAdmin = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentSemester } = useMus240SemesterSafe();
  const [attendance, setAttendance] = useState<{ present: number; absent: number; late: number }>({ present: 0, absent: 0, late: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [currentModule, setCurrentModule] = useState<CurrentModule | null>(null);
  const [priorModules, setPriorModules] = useState<{ id: string; title: string; week_number: number; start_date?: string; end_date?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleVideos, setModuleVideos] = useState<ModuleVideo[]>([]);
  const [moduleReadings, setModuleReadings] = useState<ModuleReading[]>([]);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [readingsModalOpen, setReadingsModalOpen] = useState(false);
  const [listeningOpen, setListeningOpen] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const course = getCourseByCode(courseId) || { courseCode: 'MUS 240', title: 'Course' };
  const isMus240 = courseId === '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';
  
  // Grade hook for at-a-glance bar
  const { letterGrade, percentage, loading: gradeLoading } = useCourseGrade(courseId);
  
  // Playlist hook for listening dropdown
  const { tracks, tracksLoading, playlists, selectedPlaylist, selectPlaylist } = useCoursePlaylist(courseId);
  
  // Track previous week to detect changes
  const prevWeekRef = useRef<number | null>(null);
  
  // Auto-select playlist matching current module topic when module loads or week changes
  useEffect(() => {
    if (currentModule && playlists.length > 0) {
      const weekChanged = prevWeekRef.current !== currentModule.week_number;
      
      if (weekChanged || !selectedPlaylist) {
        const weekTopicMap: Record<number, string[]> = {
          1: ['introduction', 'african american', 'black folk'],
          2: ['spiritual', 'enslaved', 'negro spiritual'],
          3: ['blues', 'delta', 'urban'],
          4: ['ragtime', 'jazz'],
          5: ['jubilee', 'quartet', 'swing'],
          6: ['jazz', 'gospel'],
          7: ['civil rights', 'funk'],
          8: ['gospel'],
          9: ['gospel'],
          10: ['disco', 'techno'],
          11: ['r&b', 'soul'],
          12: ['hip-hop', 'hip hop'],
          13: ['hip-hop', 'hip hop'],
          14: ['fourth turning'],
          15: ['review'],
          16: ['final'],
        };
        
        const weekKeywords = weekTopicMap[currentModule.week_number] || [];
        const matchingPlaylist = playlists.find(p => {
          const playlistTitle = p.title.toLowerCase();
          return weekKeywords.some(keyword => playlistTitle.includes(keyword));
        });
        
        if (matchingPlaylist) {
          selectPlaylist(matchingPlaylist);
          prevWeekRef.current = currentModule.week_number;
        }
      }
    }
  }, [currentModule, playlists, selectPlaylist]);

  // Audio playback functions
  const cleanDisplayTitle = (title: string) => {
    return title
      .replace(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_/, '')
      .replace(/_[a-f0-9]{8}$/, '')
      .replace(/_/g, ' ')
      .replace(/\.[^/.]+$/, '');
  };

  const playTrack = (index: number) => {
    const track = tracks[index];
    if (!track?.track_data?.audio_url) return;
    
    if (currentTrackIndex === index && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const audio = new Audio(track.track_data.audio_url);
    audioRef.current = audio;
    setCurrentTrackIndex(index);
    
    audio.play().then(() => {
      setIsPlaying(true);
    }).catch((err) => {
      console.error('Audio playback error:', err);
      toast.error('Could not play audio');
    });
    
    audio.onended = () => {
      if (index < tracks.length - 1) {
        playTrack(index + 1);
      } else {
        setIsPlaying(false);
        setCurrentTrackIndex(null);
      }
    };
    
    audio.onpause = () => {
      if (audioRef.current === audio) {
        setIsPlaying(false);
      }
    };
  };

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user, courseId, location.key]);

  const fetchStudentData = async () => {
    if (!user) return;
    
    try {
      // Fetch attendance records
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('user_id', user.id);

      if (attendanceData) {
        setAttendance({
          present: attendanceData.filter(a => a.status === 'present').length,
          absent: attendanceData.filter(a => a.status === 'absent').length,
          late: attendanceData.filter(a => a.status === 'late').length,
        });
      }

      // Fetch assignments for this course
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('gw_course_assignments')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('due_date', { ascending: true })
        .limit(10);

      console.log('TeachingFirstHome assignments fetch:', { courseId, assignmentsData, assignmentsError });

      if (assignmentsData) {
        const now = new Date();
        const assignmentIds = assignmentsData.map((a: any) => a.id);

        const [{ data: videoSubmissions }, { data: essaySubmissions }, { data: legacySubmissions }] = await Promise.all([
          supabase
            .from('gw_assignment_submissions')
            .select('assignment_id, status')
            .eq('user_id', user.id)
            .in('assignment_id', assignmentIds),
          supabase
            .from('gw_course_submissions')
            .select('assignment_id, status')
            .eq('student_id', user.id)
            .in('assignment_id', assignmentIds),
          supabase
            .from('assignment_submissions')
            .select('assignment_id, status')
            .eq('student_id', user.id)
            .in('assignment_id', assignmentIds),
        ]);

        const submissionStatusByAssignmentId = new Map<string, string>();
        videoSubmissions?.forEach((s: any) => submissionStatusByAssignmentId.set(s.assignment_id, s.status));
        essaySubmissions?.forEach((s: any) => submissionStatusByAssignmentId.set(s.assignment_id, s.status));
        legacySubmissions?.forEach((s: any) => submissionStatusByAssignmentId.set(s.assignment_id, s.status));

        const mappedAssignments: Assignment[] = assignmentsData.map((a: any) => {
          const submissionStatus = submissionStatusByAssignmentId.get(a.id);
          const due = a.due_date ? new Date(a.due_date) : null;

          let status: Assignment['status'] = 'pending';
          if (submissionStatus) {
            status = submissionStatus === 'graded' ? 'graded' : 'submitted';
          } else if (due && due < now) {
            status = 'overdue';
          }

          return {
            id: a.id,
            title: a.title,
            due_date: a.due_date,
            points: a.points || a.max_points || 100,
            course_id: a.course_id,
            status,
            description: a.description || '',
          };
        });

        // Fetch discussions from both tables and merge
        const [{ data: promptsData }, { data: legacyDiscussionsData }] = await Promise.all([
          supabase
            .from('discussion_prompts')
            .select('id, title, prompt_text, individual_due_at, course_id')
            .eq('course_id', courseId)
            .not('individual_due_at', 'is', null)
            .order('individual_due_at', { ascending: true })
            .limit(10),
          supabase
            .from('course_discussions')
            .select('id, title, content, due_date, max_points, course_id')
            .eq('course_id', courseId)
            .not('due_date', 'is', null)
            .order('due_date', { ascending: true })
            .limit(10)
        ]);

        const promptIds = (promptsData || []).map((d: any) => d.id);
        const legacyIds = (legacyDiscussionsData || []).map((d: any) => d.id);
        const allDiscussionIds = [...new Set([...promptIds, ...legacyIds])];
        
        let repliedDiscussionIds = new Set<string>();
        if (allDiscussionIds.length > 0 && user?.id) {
          const repliesQuery = supabase.from('discussion_replies').select('discussion_id');
          const { data: repliesData } = await (repliesQuery as any).eq('created_by', user.id);
          if (repliesData) {
            repliedDiscussionIds = new Set(
              (repliesData as any[])
                .filter((r: any) => allDiscussionIds.includes(r.discussion_id))
                .map((r: any) => r.discussion_id as string)
            );
          }
        }

        const promptAssignments: Assignment[] = (promptsData || []).map((d: any) => {
          const due = new Date(d.individual_due_at);
          const hasReplied = repliedDiscussionIds.has(d.id);
          let status: Assignment['status'] = 'pending';
          if (hasReplied) {
            status = 'submitted';
          } else if (due < now) {
            status = 'overdue';
          }
          return {
            id: d.id,
            title: d.title,
            due_date: d.individual_due_at,
            points: 10,
            status,
            course_id: d.course_id,
            description: d.prompt_text,
            is_discussion: true
          };
        });

        const promptIdSet = new Set(promptIds);
        const legacyAssignments: Assignment[] = (legacyDiscussionsData || [])
          .filter((d: any) => !promptIdSet.has(d.id))
          .map((d: any) => {
            const due = new Date(d.due_date);
            const hasReplied = repliedDiscussionIds.has(d.id);
            let status: Assignment['status'] = 'pending';
            if (hasReplied) {
              status = 'submitted';
            } else if (due < now) {
              status = 'overdue';
            }
            return {
              id: d.id,
              title: d.title,
              due_date: d.due_date,
              points: d.max_points || 10,
              status,
              course_id: d.course_id,
              description: d.content,
              is_discussion: true
            };
          });

        const discussionAssignments = [...promptAssignments, ...legacyAssignments];
        const allAssignments = [...mappedAssignments, ...discussionAssignments]
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        setAssignments(allAssignments);

        // Fetch current active module
        let moduleData: any = null;
        let mus240ModuleId: string | null = null;
        
        if (isMus240) {
          const today = new Date().toISOString().split('T')[0];
          const { data: mus240Module } = await supabase
            .from('mus240_module_settings')
            .select('*')
            .lte('start_date', today)
            .gte('end_date', today)
            .order('start_date', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (mus240Module) {
            mus240ModuleId = mus240Module.id;
            const weekNum = parseInt(mus240Module.module_id.replace('week-', '')) || 1;
            moduleData = {
              id: mus240Module.id,
              title: `Week ${weekNum}: ${mus240Module.title}`,
              week_number: weekNum,
              is_active: mus240Module.is_active
            };
          } else {
            const { data: fallbackModule } = await supabase
              .from('mus240_module_settings')
              .select('*')
              .lte('start_date', today)
              .order('start_date', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (fallbackModule) {
              mus240ModuleId = fallbackModule.id;
              const weekNum = parseInt(fallbackModule.module_id.replace('week-', '')) || 1;
              moduleData = {
                id: fallbackModule.id,
                title: `Week ${weekNum}: ${fallbackModule.title}`,
                week_number: weekNum,
                is_active: fallbackModule.is_active
              };
            }
          }
          
          const { data: priorModulesData } = await supabase
            .from('mus240_module_settings')
            .select('id, module_id, title, start_date, end_date')
            .lt('end_date', today)
            .order('start_date', { ascending: false });
          
          if (priorModulesData) {
            setPriorModules(priorModulesData.map((m: any) => ({
              id: m.id,
              title: m.title,
              week_number: parseInt(m.module_id.replace('week-', '')) || 0,
              start_date: m.start_date,
              end_date: m.end_date
            })));
          }
        } else {
          const { data: genericModule } = await supabase
            .from('gw_course_modules')
            .select('*')
            .eq('course_id', courseId)
            .eq('is_active', true)
            .order('week_number', { ascending: true })
            .limit(1)
            .maybeSingle();
          moduleData = genericModule;
          
          if (genericModule) {
            const { data: priorGenericModules } = await supabase
              .from('gw_course_modules')
              .select('id, title, week_number, start_date, end_date')
              .eq('course_id', courseId)
              .eq('is_active', true)
              .lt('week_number', genericModule.week_number)
              .order('week_number', { ascending: false });
            
            if (priorGenericModules) {
              setPriorModules(priorGenericModules);
            }
          }
        }

        // Content types
        const templateConfig = getCourseTemplateConfig(courseId);
        const allContentTypes = ['Video', 'Reading', 'Listening', 'Discussion', 'Journal'];
        const standardContentTypes = allContentTypes.filter(type => {
          if (type === 'Journal' && !templateConfig.features.hasJournals) return false;
          if (type === 'Discussion' && !templateConfig.features.hasDiscussions) return false;
          return true;
        });
        
        const getAssignmentForType = (type: string): Assignment | undefined => {
          const typeMapping: Record<string, string[]> = {
            'Video': ['video', 'video_response'],
            'Reading': ['reading', 'reading_response', 'essay'],
            'Listening': ['listening', 'listening_response'],
            'Discussion': ['discussion'],
            'Journal': ['journal', 'reflection']
          };
          const matchingTypes = typeMapping[type] || [];
          const assignment = allAssignments.find(a => {
            if (a.is_discussion && type === 'Discussion') return true;
            const lowerTitle = a.title.toLowerCase();
            return matchingTypes.some(t => lowerTitle.includes(t));
          });
          return assignment;
        };

        const isTypeCompleted = (type: string): boolean => {
          const assignment = getAssignmentForType(type);
          return assignment?.status === 'submitted' || assignment?.status === 'graded';
        };

        const contentTypesWithData = standardContentTypes.map(type => ({
          type,
          assignment: getAssignmentForType(type),
          isCompleted: isTypeCompleted(type)
        }));

        let moduleDiscussionId: string | undefined;
        if (moduleData) {
          const { data: moduleDiscussion } = await supabase
            .from('course_discussions')
            .select('id')
            .eq('course_id', courseId)
            .eq('module_id', moduleData.id)
            .maybeSingle();
          if (moduleDiscussion) {
            moduleDiscussionId = moduleDiscussion.id;
          }
        }

        if (moduleData) {
          setCurrentModule({
            id: moduleData.id,
            title: moduleData.title.replace(/^Week \d+:\s*/, ''),
            week_number: moduleData.week_number || 1,
            content_types: contentTypesWithData,
            assignments: allAssignments.filter(a => a.status === 'pending' || a.status === 'overdue').sort((a, b) => Math.abs(new Date(a.due_date).getTime() - now.getTime()) - Math.abs(new Date(b.due_date).getTime() - now.getTime())).slice(0, 5),
            discussionId: moduleDiscussionId,
          });
        } else {
          setCurrentModule({
            id: '1',
            title: 'Current Week',
            week_number: 1,
            content_types: contentTypesWithData,
            assignments: allAssignments.filter(a => a.status === 'pending' || a.status === 'overdue').sort((a, b) => Math.abs(new Date(a.due_date).getTime() - now.getTime()) - Math.abs(new Date(b.due_date).getTime() - now.getTime())).slice(0, 5),
          });
        }

        // Fetch module videos and readings
        if (isMus240 && moduleData) {
          const weekModuleId = `week-${moduleData.week_number}`;
          const [{ data: videosData }, { data: readingsData }] = await Promise.all([
            supabase
              .from('mus240_module_resources')
              .select('id, module_id, title, resource_type, url, description, duration, is_required, display_order')
              .eq('module_id', weekModuleId)
              .eq('resource_type', 'video')
              .order('display_order', { ascending: true }),
            supabase
              .from('mus240_module_resources')
              .select('id, module_id, title, resource_type, url, description, is_required, display_order')
              .eq('module_id', weekModuleId)
              .eq('resource_type', 'reading')
              .order('display_order', { ascending: true })
          ]);
          
          setModuleVideos(videosData?.length ? videosData.map((r: any) => ({
            id: r.id, title: r.title, url: r.url, description: r.description, duration: r.duration, is_required: r.is_required || false
          })) : []);
          
          setModuleReadings(readingsData?.length ? readingsData.map((r: any) => ({
            id: r.id, title: r.title, url: r.url, description: r.description, is_required: r.is_required || false
          })) : []);
        }

        // Fetch upcoming events
        const { data: eventsData } = await supabase
          .from('gw_events')
          .select('id, title, start_date, location, event_type')
          .eq('course_id', courseId)
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(5);

        const currentTime = new Date();
        const assignmentEvents: UpcomingEvent[] = assignmentsData
          .filter((a: any) => a.due_date && new Date(a.due_date) >= currentTime)
          .map((a: any) => ({
            id: `assignment-${a.id}`,
            title: a.title,
            start_date: a.due_date,
            event_type: 'assignment',
            is_assignment: true,
            assignment_status: submissionStatusByAssignmentId.get(a.id) === 'graded' ? 'graded' : 
                              submissionStatusByAssignmentId.get(a.id) ? 'submitted' : 'pending',
            points: a.max_points || 100
          }));

        const allEvents: UpcomingEvent[] = [
          ...(eventsData || []).map(e => ({ ...e, is_assignment: false })),
          ...assignmentEvents
        ].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
         .slice(0, 6);

        setUpcomingEvents(allEvents);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pendingAssignments = assignments.filter(a => a.status === 'pending' || a.status === 'overdue');

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video': return <Play className="h-4 w-4" />;
      case 'listening': return <Headphones className="h-4 w-4" />;
      case 'reading': return <BookMarked className="h-4 w-4" />;
      case 'discussion': return <MessageSquare className="h-4 w-4" />;
      case 'journal': return <PenLine className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-5">

      {/* ═══ 1. AT-A-GLANCE STATS BAR ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {/* Grade */}
        <button
          onClick={() => navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=grades`)}
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all group"
        >
          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Grade</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-2xl font-bold text-foreground">{gradeLoading ? '--' : `${percentage}%`}</span>
              <span className="text-xs sm:text-sm font-semibold text-primary">{gradeLoading ? '' : letterGrade}</span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
        </button>

        {/* Attendance - Present */}
        <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-card border border-border">
          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Present</p>
            <span className="text-lg sm:text-2xl font-bold text-foreground">{attendance.present}</span>
          </div>
        </div>

        {/* Attendance - Absent */}
        <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-card border border-border">
          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
            <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Absent</p>
            <span className="text-lg sm:text-2xl font-bold text-foreground">{attendance.absent}</span>
          </div>
        </div>

        {/* Attendance - Late */}
        <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-card border border-border">
          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Late</p>
            <span className="text-lg sm:text-2xl font-bold text-foreground">{attendance.late}</span>
          </div>
        </div>
      </div>

      {/* ═══ 2. CURRENT UNIT CARD — 60/40 Split ═══ */}
      {currentModule && (
        <Card className="overflow-hidden border-border">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {/* Left 60% - Unit Info */}
            <div className="flex-[3] p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge variant="secondary" className="text-xs font-mono">
                  Week {currentModule.week_number}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {currentModule.content_types.filter(c => c.isCompleted).length}/{currentModule.content_types.length} Complete
                </Badge>
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-2 uppercase tracking-wide">
                {currentModule.title}
              </h2>

              {/* ─── Activity Progress Tracker (horizontal) ─── */}
              <div className="flex flex-wrap gap-2 mt-5">
                {currentModule.content_types.map((contentType) => {
                  const isCompleted = contentType.isCompleted;

                  const handleActivityClick = () => {
                    if (contentType.type === 'Video' && isMus240) {
                      if (moduleVideos.length > 0) { setVideoModalOpen(true); return; }
                      else { toast.info('No videos assigned for this week yet'); return; }
                    }
                    if (contentType.type === 'Reading' && isMus240) {
                      if (moduleReadings.length > 0) { setReadingsModalOpen(true); return; }
                      else { toast.info('No readings assigned for this week yet'); return; }
                    }
                    if (contentType.type === 'Listening') {
                      setListeningOpen(!listeningOpen);
                      return;
                    }
                    if (contentType.assignment) {
                      if (contentType.assignment.is_discussion) {
                        if (currentModule?.discussionId) {
                          navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=discussions&discussionId=${currentModule.discussionId}`, { replace: true });
                        } else {
                          navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=discussions`, { replace: true });
                        }
                      } else {
                        navigate(`/grading/student/assignment/${contentType.assignment.id}`);
                      }
                    } else {
                      const tabMapping: Record<string, string> = {
                        'Video': 'resources', 'Reading': 'resources', 'Listening': 'audio',
                        'Discussion': 'discussions', 'Journal': 'journal'
                      };
                      const tab = tabMapping[contentType.type] || 'resources';
                      if (contentType.type === 'Discussion' && currentModule?.discussionId) {
                        navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=discussions&discussionId=${currentModule.discussionId}`, { replace: true });
                      } else {
                        navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=${tab}`, { replace: true });
                      }
                    }
                  };

                  // Listening with popover
                  if (contentType.type === 'Listening') {
                    return (
                      <Popover key={contentType.type} open={listeningOpen} onOpenChange={setListeningOpen}>
                        <PopoverTrigger asChild>
                          <button className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                            isCompleted
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-card border-border hover:border-primary/50 hover:bg-primary/5 text-foreground'
                          }`}>
                            {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Headphones className="h-4 w-4 text-primary" />}
                            <span>{contentType.type}</span>
                            {isCompleted ? (
                              <span className="text-xs opacity-70">Done</span>
                            ) : (
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 bg-background border shadow-lg z-50" align="start" sideOffset={4}>
                          <div className="p-3 border-b bg-muted/30">
                            <div className="flex items-center gap-2">
                              <Music className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-sm">
                                {selectedPlaylist?.title || `Week ${currentModule.week_number} Audio`}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {currentModule.title} • {tracks.length} tracks
                            </p>
                          </div>
                          <ScrollArea className="max-h-[280px]">
                            {tracksLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                              </div>
                            ) : tracks.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No tracks assigned yet</p>
                              </div>
                            ) : (
                              <div className="p-1">
                                {tracks.map((track, idx) => (
                                  <button
                                    key={track.id || idx}
                                    onClick={() => playTrack(idx)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                                      idx === currentTrackIndex ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                                    }`}
                                  >
                                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                                      {idx === currentTrackIndex && isPlaying ? <Pause className="h-4 w-4 text-primary" /> : idx === currentTrackIndex ? <Play className="h-4 w-4 text-primary" /> : <span className="text-xs text-muted-foreground font-medium">{idx + 1}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium truncate ${idx === currentTrackIndex ? 'text-primary' : ''}`}>
                                        {cleanDisplayTitle(track.track_data?.title || `Track ${idx + 1}`)}
                                      </p>
                                      {track.track_data?.artist && (
                                        <p className="text-xs text-muted-foreground truncate">{track.track_data.artist}</p>
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                          {tracks.length > 0 && (
                            <div className="p-2 border-t bg-muted/20">
                              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => {
                                setListeningOpen(false);
                                navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=audio`, { replace: true });
                              }}>
                                View Full Library
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    );
                  }

                  return (
                    <button
                      key={contentType.type}
                      onClick={handleActivityClick}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                        isCompleted
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-card border-border hover:border-primary/50 hover:bg-primary/5 text-foreground'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="h-4 w-4" /> : getActivityIcon(contentType.type)}
                      <span>{contentType.type}</span>
                      {isCompleted ? (
                        <span className="text-xs opacity-70">Done</span>
                      ) : (
                        <ArrowRight className="h-3 w-3 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right 40% - Thumbnail Image */}
            <div className="flex-[2] relative min-h-[180px] md:min-h-[220px] border-t md:border-t-0 md:border-l border-border overflow-hidden bg-muted/20">
              <div className="absolute inset-0">
                <CourseTopicSlider courseCode={course.courseCode} isAdmin={isAdmin} />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ═══ 3. DUE THIS WEEK — Urgency System ═══ */}
      {currentModule && currentModule.assignments.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-3">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            Due This Week
          </h3>
          <div className="grid gap-3">
            {currentModule.assignments.map((assignment) => {
              const isOverdue = assignment.status === 'overdue';
              const isSubmitted = assignment.status === 'submitted' || assignment.status === 'graded';

              return (
                <div
                  key={assignment.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border transition-all cursor-pointer gap-2 ${
                    isOverdue
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50'
                      : isSubmitted
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                      : 'bg-card border-border hover:border-primary/40'
                  }`}
                  onClick={() => {
                    if (assignment.is_discussion) {
                      navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=discussions`, { replace: true });
                    } else {
                      navigate(`/grading/student/assignment/${assignment.id}`);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-foreground">{assignment.title}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      Due {format(new Date(assignment.due_date), 'MMM d, h:mm a')} · {assignment.points} pts
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {isOverdue && (
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700 font-semibold text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Overdue
                      </Badge>
                    )}
                    {isSubmitted && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-semibold text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {assignment.status === 'graded' ? 'Graded' : 'Submitted'}
                      </Badge>
                    )}
                    {!isSubmitted && (
                      <Button
                        size="default"
                        variant={isOverdue ? 'destructive' : 'default'}
                        className="font-semibold px-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (assignment.is_discussion) {
                            navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=discussions`, { replace: true });
                          } else {
                            navigate(`/grading/student/assignment/${assignment.id}`);
                          }
                        }}
                      >
                        {assignment.is_discussion ? 'Discuss' : 'Start'}
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ 4. UPCOMING CLASSES — Calendar Layout ═══ */}
      {upcomingEvents.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Upcoming
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingEvents.slice(0, 6).map((event) => (
              <div
                key={event.id}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                  event.is_assignment
                    ? 'bg-primary/5 border-primary/20 hover:border-primary/40 cursor-pointer'
                    : 'bg-card border-border hover:border-border/80'
                }`}
                onClick={() => {
                  if (event.is_assignment) {
                    const assignmentId = event.id.replace('assignment-', '');
                    navigate(`/grading/student/assignment/${assignmentId}`);
                  }
                }}
              >
                {/* Date Block */}
                <div className="w-12 h-12 rounded-lg bg-muted flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">
                    {format(new Date(event.start_date), 'MMM')}
                  </span>
                  <span className="text-lg font-bold text-foreground leading-none mt-0.5">
                    {format(new Date(event.start_date), 'd')}
                  </span>
                </div>
                {/* Event Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(event.start_date), 'h:mm a')}
                    {event.location && ` · ${event.location}`}
                  </p>
                  {event.is_assignment && event.points && (
                    <Badge variant="outline" className="text-[10px] mt-1.5 px-1.5 py-0 h-4">
                      {event.points} pts
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 5. PRIOR MODULES (collapsed) ═══ */}
      {priorModules.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <Collapsible>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between hover:bg-muted/30 -mx-2 px-2 py-1 rounded-md transition-colors">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    Prior Modules
                    <Badge variant="secondary" className="text-xs ml-1">{priorModules.length}</Badge>
                  </h4>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2">
                {priorModules.map((module) => (
                  <div
                    key={module.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=modules&week=${module.week_number}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        Week {module.week_number}: {module.title}
                      </p>
                      {module.end_date && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          Completed {format(new Date(module.end_date), 'MMM d')}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 ml-2">
                      <CheckCircle className="h-3 w-3 mr-1 text-emerald-500" />
                      Completed
                    </Badge>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Syllabus', icon: BookOpen, tab: 'syllabus' },
          { label: 'Grades', icon: ClipboardList, tab: 'grades' },
          { label: 'Resources', icon: FileText, tab: 'resources' },
        ].map((link) => (
          <Button
            key={link.label}
            variant="outline"
            size="sm"
            className="gap-2 text-sm"
            onClick={() => navigate(`/academy/${course.courseCode.toLowerCase().replace(' ', '-')}?tab=${link.tab}`)}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Button>
        ))}
      </div>

      {/* Module Videos Modal for MUS-240 */}
      {isMus240 && currentModule && (
        <ModuleVideosModal
          open={videoModalOpen}
          onOpenChange={setVideoModalOpen}
          videos={moduleVideos}
          weekNumber={currentModule.week_number}
          moduleTitle={currentModule.title}
        />
      )}

      {/* Module Readings Modal for MUS-240 */}
      {isMus240 && currentModule && (
        <ModuleReadingsModal
          open={readingsModalOpen}
          onOpenChange={setReadingsModalOpen}
          readings={moduleReadings}
          weekNumber={currentModule.week_number}
          moduleTitle={currentModule.title}
        />
      )}
    </div>
  );
};
