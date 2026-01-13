import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  User, Music, GraduationCap, Star, ArrowLeft, Mail, Phone, 
  Calendar, ClipboardList, Target, Heart, Briefcase, Plane,
  MessageSquare, TrendingUp, Award, CheckCircle, XCircle, Clock,
  DollarSign, Users, IdCard, Activity, FileText, BookOpen,
  Eye, Download, Headphones, MousePointer, Globe, Laptop,
  Smartphone, Tablet, FileCheck, PenTool, BarChart3
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { MemberCheckoutStatus } from "./MemberCheckoutStatus";
import { ExitInterviewSummaryCard } from "@/components/surveys/ExitInterviewSummaryCard";

interface ExitInterview {
  id: string;
  semester: string;
  intent_to_continue: boolean;
  intent_to_continue_notes: string | null;
  interested_in_exec_board: boolean;
  exec_board_position_interest: string | null;
  exec_board_work_done: string | null;
  interested_in_fall_tour: boolean;
  interested_in_advanced_ensemble: boolean;
  advanced_ensemble_notes: string | null;
  interested_in_private_lessons: boolean;
  private_lessons_instrument: string | null;
  performances_participated: string[] | null;
  performances_other: string | null;
  what_worked_well: string | null;
  what_could_improve: string | null;
  suggestions_for_next_semester: string | null;
  satisfaction_overall: number | null;
  satisfaction_rehearsals: number | null;
  satisfaction_performances: number | null;
  satisfaction_community: number | null;
  satisfaction_leadership: number | null;
  satisfaction_communication: number | null;
  current_gpa: number | null;
  in_other_campus_show: boolean;
  other_campus_show_details: string | null;
  understands_leadership_program: boolean;
  can_attend_all_sessions: boolean | null;
  willing_to_submit_purpose_statement: boolean;
  willing_to_give_election_speech: boolean;
  leadership_program_notes: string | null;
  additional_comments: string | null;
  created_at: string;
}

interface MemberProfile {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  middle_name?: string | null;
  display_name?: string | null;
  email: string;
  phone: string | null;
  phone_number?: string | null;
  voice_part: string | null;
  voice_part_preference?: string | null;
  class_year: number | null;
  graduation_year?: number | null;
  avatar_url: string | null;
  headshot_url?: string | null;
  status: string | null;
  role: string | null;
  join_date: string | null;
  notes: string | null;
  bio?: string | null;
  student_number?: string | null;
  student_id?: string | null;
  dues_paid?: boolean | null;
  is_section_leader?: boolean | null;
  is_exec_board?: boolean | null;
  exec_board_role?: string | null;
  music_role?: string | null;
  can_dance?: boolean | null;
  instruments_played?: string[] | null;
  academic_year?: string | null;
  academic_major?: string | null;
  major?: string | null;
  minor?: string | null;
  gpa?: number | null;
  pronouns?: string | null;
  address?: string | null;
  home_address?: string | null;
  school_address?: string | null;
  workplace?: string | null;
  website_url?: string | null;
  social_media_links?: Record<string, string> | null;
  emergency_contact?: string | null;
  parent_guardian_contact?: string | null;
  dietary_restrictions?: string[] | null;
  allergies?: string | null;
  dress_size?: string | null;
  formal_dress_size?: string | null;
  polo_size?: string | null;
  tshirt_size?: string | null;
  shoe_size?: string | null;
  lipstick_shade?: string | null;
  pearl_status?: string | null;
  hair_color?: string | null;
  has_tattoos?: boolean | null;
  visible_piercings?: boolean | null;
  bust_measurement?: number | null;
  waist_measurement?: number | null;
  hips_measurement?: number | null;
  height_measurement?: number | null;
  chest_measurement?: number | null;
  inseam_measurement?: number | null;
  measurements_taken_date?: string | null;
  photo_consent?: boolean | null;
  media_consent?: boolean | null;
  data_consent?: boolean | null;
  media_release_signed_at?: string | null;
  is_mentor?: boolean | null;
  mentor_opt_in?: boolean | null;
  is_featured?: boolean | null;
  verified?: boolean | null;
  last_sign_in_at?: string | null;
  created_at?: string | null;
}

interface AttendanceRecord {
  id: string;
  event_id: string;
  status: string;
  recorded_at: string;
  event_title?: string;
  event_date?: string;
}

interface ActivityLog {
  id: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  created_at: string;
}

interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  status: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  file_name: string | null;
  assignment?: {
    title: string;
    due_date: string;
  };
}

interface SheetMusicAnalytics {
  id: string;
  action_type: string;
  page_number: number | null;
  session_duration: number | null;
  device_type: string | null;
  created_at: string;
  sheet_music?: {
    title: string;
  };
}

interface ContractSignature {
  id: string;
  status: string;
  user_signed_at: string | null;
  contract?: {
    title: string;
    created_at: string;
  };
}

interface CourseEnrollment {
  id: string;
  status: string;
  enrolled_at: string;
  course?: {
    course_name: string;
    course_code: string;
  };
}

// Helper component for profile fields
const ProfileField: React.FC<{
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}> = ({ label, value, icon, fullWidth }) => {
  if (!value) return null;
  return (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
};

interface DirectorDossierViewProps {
  member: MemberProfile;
  exitInterviews: ExitInterview[];
  onBack: () => void;
}

export const DirectorDossierView: React.FC<DirectorDossierViewProps> = ({
  member,
  exitInterviews,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentSubmission[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [sheetMusicAnalytics, setSheetMusicAnalytics] = useState<SheetMusicAnalytics[]>([]);
  const [loadingSheetMusic, setLoadingSheetMusic] = useState(true);
  const [contracts, setContracts] = useState<ContractSignature[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);

  // Fetch all data in parallel
  useEffect(() => {
    const fetchAllData = async () => {
      // Attendance
      const fetchAttendance = async () => {
        try {
          const { data, error } = await supabase
            .from("attendance")
            .select(`
              id, event_id, status, recorded_at,
              events!attendance_event_id_fkey(title, start_date)
            `)
            .eq("user_id", member.user_id)
            .order("recorded_at", { ascending: false })
            .limit(100);

          if (!error && data) {
            setAttendance(data.map((a: any) => ({
              id: a.id,
              event_id: a.event_id,
              status: a.status,
              recorded_at: a.recorded_at,
              event_title: a.events?.title,
              event_date: a.events?.start_date
            })));
          }
        } catch (err) {
          console.error("Error fetching attendance:", err);
        } finally {
          setLoadingAttendance(false);
        }
      };

      // Activity Logs
      const fetchActivityLogs = async () => {
        try {
          const { data, error } = await supabase
            .from("activity_logs")
            .select("id, action_type, resource_type, resource_id, details, created_at")
            .eq("user_id", member.user_id)
            .order("created_at", { ascending: false })
            .limit(100);

          if (!error && data) {
            setActivityLogs(data);
          }
        } catch (err) {
          console.error("Error fetching activity logs:", err);
        } finally {
          setLoadingActivity(false);
        }
      };

      // Assignment Submissions
      const fetchAssignments = async () => {
        try {
          const { data, error } = await supabase
            .from("assignment_submissions")
            .select(`
              id, assignment_id, status, grade, feedback, submitted_at, file_name,
              course_assignments(title, due_date)
            `)
            .eq("student_id", member.user_id)
            .order("submitted_at", { ascending: false })
            .limit(50);

          if (!error && data) {
            setAssignments(data.map((s: any) => ({
              ...s,
              assignment: s.course_assignments ? {
                title: s.course_assignments.title,
                due_date: s.course_assignments.due_date
              } : undefined
            })));
          }
        } catch (err) {
          console.error("Error fetching assignments:", err);
        } finally {
          setLoadingAssignments(false);
        }
      };

      // Sheet Music Analytics - check if table exists
      const fetchSheetMusicAnalytics = async () => {
        try {
          // This table may not exist, so we gracefully handle errors
          const { data, error } = await supabase
            .from("audio_archive")
            .select("id, title, category, created_at, play_count")
            .limit(50);

          if (!error && data) {
            // Map to a simpler format for display
            setSheetMusicAnalytics(data.map((a: any) => ({
              id: a.id,
              action_type: 'view',
              page_number: null,
              session_duration: null,
              device_type: null,
              created_at: a.created_at,
              sheet_music: { title: a.title }
            })));
          }
        } catch (err) {
          console.error("Error fetching sheet music analytics:", err);
        } finally {
          setLoadingSheetMusic(false);
        }
      };

      // Contract Signatures
      const fetchContracts = async () => {
        try {
          const { data, error } = await supabase
            .from("contract_signatures")
            .select(`
              id, status, user_signed_at,
              contracts_v2(title, created_at)
            `)
            .eq("user_id", member.user_id)
            .order("created_at", { ascending: false })
            .limit(50);

          if (!error && data) {
            setContracts(data.map((c: any) => ({
              ...c,
              contract: c.contracts_v2 ? {
                title: c.contracts_v2.title,
                created_at: c.contracts_v2.created_at
              } : undefined
            })));
          }
        } catch (err) {
          console.error("Error fetching contracts:", err);
        } finally {
          setLoadingContracts(false);
        }
      };

      // Course Enrollments - use cohort_members as proxy
      const fetchEnrollments = async () => {
        try {
          const { data, error } = await supabase
            .from("cohort_members")
            .select(`
              id, status, joined_at, voice_part,
              cohorts(name, year)
            `)
            .eq("user_id", member.user_id)
            .order("joined_at", { ascending: false });

          if (!error && data) {
            setEnrollments(data.map((e: any) => ({
              id: e.id,
              status: e.status || 'active',
              enrolled_at: e.joined_at,
              course: e.cohorts ? {
                course_name: e.cohorts.name,
                course_code: `${e.cohorts.year}`
              } : undefined
            })));
          }
        } catch (err) {
          console.error("Error fetching enrollments:", err);
        } finally {
          setLoadingEnrollments(false);
        }
      };

      // Run all fetches in parallel
      await Promise.all([
        fetchAttendance(),
        fetchActivityLogs(),
        fetchAssignments(),
        fetchSheetMusicAnalytics(),
        fetchContracts(),
        fetchEnrollments()
      ]);
    };

    fetchAllData();
  }, [member.user_id]);

  // Calculate stats
  const attendanceStats = useMemo(() => ({
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    excused: attendance.filter(a => a.status === 'excused').length,
    late: attendance.filter(a => a.status === 'late').length,
    total: attendance.length
  }), [attendance]);

  const attendanceRate = attendanceStats.total > 0 
    ? Math.round(((attendanceStats.present + attendanceStats.excused) / attendanceStats.total) * 100) 
    : 100;

  const assignmentStats = useMemo(() => ({
    submitted: assignments.filter(a => a.status === 'submitted' || a.status === 'graded').length,
    graded: assignments.filter(a => a.status === 'graded').length,
    pending: assignments.filter(a => a.status === 'pending').length,
    avgGrade: assignments.filter(a => a.grade !== null).length > 0
      ? Math.round(assignments.filter(a => a.grade !== null).reduce((sum, a) => sum + (a.grade || 0), 0) / assignments.filter(a => a.grade !== null).length)
      : null
  }), [assignments]);

  const activityStats = useMemo(() => {
    const actionCounts: Record<string, number> = {};
    activityLogs.forEach(log => {
      actionCounts[log.action_type] = (actionCounts[log.action_type] || 0) + 1;
    });
    return {
      total: activityLogs.length,
      byAction: actionCounts,
      lastActive: activityLogs[0]?.created_at
    };
  }, [activityLogs]);

  const sheetMusicStats = useMemo(() => ({
    views: sheetMusicAnalytics.filter(a => a.action_type === 'view').length,
    downloads: sheetMusicAnalytics.filter(a => a.action_type === 'download').length,
    audioPlays: sheetMusicAnalytics.filter(a => a.action_type === 'audio_play').length,
    totalTime: sheetMusicAnalytics.reduce((sum, a) => sum + (a.session_duration || 0), 0),
    uniquePieces: new Set(sheetMusicAnalytics.map(a => a.sheet_music?.title).filter(Boolean)).size
  }), [sheetMusicAnalytics]);

  const contractStats = useMemo(() => ({
    signed: contracts.filter(c => c.status === 'user_signed' || c.status === 'completed').length,
    pending: contracts.filter(c => c.status === 'pending').length,
    total: contracts.length
  }), [contracts]);

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground text-sm">N/A</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    );
  };

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('view')) return <Eye className="h-3 w-3" />;
    if (actionType.includes('download')) return <Download className="h-3 w-3" />;
    if (actionType.includes('audio') || actionType.includes('play')) return <Headphones className="h-3 w-3" />;
    if (actionType.includes('login') || actionType.includes('logout')) return <User className="h-3 w-3" />;
    if (actionType.includes('contract') || actionType.includes('sign')) return <FileText className="h-3 w-3" />;
    return <Activity className="h-3 w-3" />;
  };

  const getDeviceIcon = (device: string | null) => {
    if (!device) return <Globe className="h-3 w-3" />;
    if (device.toLowerCase().includes('mobile')) return <Smartphone className="h-3 w-3" />;
    if (device.toLowerCase().includes('tablet')) return <Tablet className="h-3 w-3" />;
    return <Laptop className="h-3 w-3" />;
  };

  const latestInterview = exitInterviews[0];

  return (
    <div className="space-y-4">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Members
        </Button>
        <Badge variant="outline" className="text-xs">
          Director Dossier View
        </Badge>
      </div>

      {/* Profile Header Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            {member.avatar_url ? (
              <img 
                src={member.avatar_url} 
                alt={member.full_name || "Member"} 
                className="h-24 w-24 rounded-full object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                <User className="h-12 w-12 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <CardTitle className="text-2xl">{member.full_name || "Unknown Member"}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {member.voice_part && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Music className="h-3 w-3" />
                    {member.voice_part}
                  </Badge>
                )}
                {member.academic_year && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" />
                    {member.academic_year}
                  </Badge>
                )}
                {member.is_section_leader && (
                  <Badge variant="default">Section Leader</Badge>
                )}
                {member.is_exec_board && (
                  <Badge variant="default">{member.exec_board_role || "Exec Board"}</Badge>
                )}
                {member.dues_paid !== null && (
                  <Badge variant={member.dues_paid ? "default" : "destructive"} className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {member.dues_paid ? "Dues Paid" : "Dues Unpaid"}
                  </Badge>
                )}
                {member.status && (
                  <Badge variant="secondary">{member.status}</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-sm text-muted-foreground">
                {member.email && (
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {member.email}
                  </span>
                )}
                {member.phone && (
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {member.phone}
                  </span>
                )}
                {member.student_number && (
                  <span className="flex items-center gap-2">
                    <IdCard className="h-4 w-4" />
                    ID: {member.student_number}
                  </span>
                )}
                {member.join_date && (
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Joined {format(new Date(member.join_date), "MMM yyyy")}
                  </span>
                )}
                {member.music_role && (
                  <span className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    {member.music_role}
                  </span>
                )}
                {activityStats.lastActive && (
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Last active {formatDistanceToNow(new Date(activityStats.lastActive), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-green-600" />
            <span className="text-xs text-muted-foreground">Attendance</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{attendanceRate}%</p>
          <p className="text-xs text-muted-foreground">{attendanceStats.total} events</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-muted-foreground">Assignments</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{assignmentStats.submitted}</p>
          <p className="text-xs text-muted-foreground">Avg: {assignmentStats.avgGrade || 'N/A'}%</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Music className="h-4 w-4 text-purple-600" />
            <span className="text-xs text-muted-foreground">Music Library</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{sheetMusicStats.uniquePieces}</p>
          <p className="text-xs text-muted-foreground">{sheetMusicStats.views} views</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <FileCheck className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-muted-foreground">Contracts</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{contractStats.signed}/{contractStats.total}</p>
          <p className="text-xs text-muted-foreground">signed</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Activity</span>
          </div>
          <p className="text-2xl font-bold text-primary">{activityStats.total}</p>
          <p className="text-xs text-muted-foreground">actions logged</p>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
          <TabsTrigger value="coursework" className="text-xs">Coursework</TabsTrigger>
          <TabsTrigger value="music" className="text-xs">Music Library</TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs">Contracts</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">Activity Log</TabsTrigger>
          <TabsTrigger value="interviews" className="text-xs">Exit Interviews</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Checkout Status */}
            <MemberCheckoutStatus userId={member.user_id} />
            
            {/* Exit Interview Quick Summary */}
            <ExitInterviewSummaryCard userId={member.user_id} />
          </div>

          {/* Course Enrollments */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Course Enrollments
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingEnrollments ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No course enrollments</p>
              ) : (
                <div className="space-y-2">
                  {enrollments.map(enrollment => (
                    <div key={enrollment.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{enrollment.course?.course_name || 'Unknown Course'}</p>
                        <p className="text-xs text-muted-foreground">{enrollment.course?.course_code}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                          {enrollment.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(enrollment.enrolled_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Director Notes */}
          {member.notes && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Director Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm whitespace-pre-wrap">{member.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          {/* Personal Information */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ProfileField label="Full Name" value={member.full_name} />
                <ProfileField label="First Name" value={member.first_name} />
                <ProfileField label="Middle Name" value={member.middle_name} />
                <ProfileField label="Last Name" value={member.last_name} />
                <ProfileField label="Display Name" value={member.display_name} />
                <ProfileField label="Pronouns" value={member.pronouns} />
                <ProfileField label="Email" value={member.email} icon={<Mail className="h-3 w-3" />} />
                <ProfileField label="Phone" value={member.phone || member.phone_number} icon={<Phone className="h-3 w-3" />} />
                <ProfileField label="Bio" value={member.bio} fullWidth />
              </div>
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ProfileField label="Student ID" value={member.student_number || member.student_id} icon={<IdCard className="h-3 w-3" />} />
                <ProfileField label="Academic Year" value={member.academic_year} />
                <ProfileField label="Class Year" value={member.class_year?.toString()} />
                <ProfileField label="Graduation Year" value={member.graduation_year?.toString()} />
                <ProfileField label="Major" value={member.major || member.academic_major} />
                <ProfileField label="Minor" value={member.minor} />
                <ProfileField label="GPA" value={member.gpa?.toFixed(2)} />
              </div>
            </CardContent>
          </Card>

          {/* Music & Performance */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Music className="h-4 w-4" />
                Music & Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ProfileField label="Voice Part" value={member.voice_part} />
                <ProfileField label="Voice Part Preference" value={member.voice_part_preference} />
                <ProfileField label="Music Role" value={member.music_role} />
                <ProfileField label="Can Dance" value={member.can_dance === true ? 'Yes' : member.can_dance === false ? 'No' : null} />
                <ProfileField label="Instruments Played" value={member.instruments_played?.join(', ')} />
                <ProfileField label="Section Leader" value={member.is_section_leader ? 'Yes' : 'No'} />
              </div>
            </CardContent>
          </Card>

          {/* Leadership & Roles */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="h-4 w-4" />
                Leadership & Roles
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ProfileField label="Role" value={member.role} />
                <ProfileField label="Status" value={member.status} />
                <ProfileField label="Executive Board" value={member.is_exec_board ? 'Yes' : 'No'} />
                <ProfileField label="Exec Board Role" value={member.exec_board_role} />
                <ProfileField label="Is Mentor" value={member.is_mentor ? 'Yes' : member.mentor_opt_in ? 'Opted In' : null} />
                <ProfileField label="Is Featured" value={member.is_featured ? 'Yes' : null} />
                <ProfileField label="Verified" value={member.verified ? 'Yes' : 'No'} />
                <ProfileField label="Dues Paid" value={member.dues_paid === true ? 'Yes' : member.dues_paid === false ? 'No' : null} />
              </div>
            </CardContent>
          </Card>

          {/* Contact & Address */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact & Address
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfileField label="Address" value={member.address} />
                <ProfileField label="Home Address" value={member.home_address} />
                <ProfileField label="School Address" value={member.school_address} />
                <ProfileField label="Workplace" value={member.workplace} />
                <ProfileField label="Website" value={member.website_url} />
                <ProfileField label="Emergency Contact" value={member.emergency_contact} />
                <ProfileField label="Parent/Guardian Contact" value={member.parent_guardian_contact} />
              </div>
            </CardContent>
          </Card>

          {/* Health & Dietary */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Health & Dietary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ProfileField label="Dietary Restrictions" value={member.dietary_restrictions?.join(', ')} />
                <ProfileField label="Allergies" value={member.allergies} />
              </div>
            </CardContent>
          </Card>

          {/* Wardrobe & Measurements */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Wardrobe & Measurements
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ProfileField label="Dress Size" value={member.dress_size} />
                <ProfileField label="Formal Dress Size" value={member.formal_dress_size} />
                <ProfileField label="Polo Size" value={member.polo_size} />
                <ProfileField label="T-Shirt Size" value={member.tshirt_size} />
                <ProfileField label="Shoe Size" value={member.shoe_size} />
                <ProfileField label="Lipstick Shade" value={member.lipstick_shade} />
                <ProfileField label="Pearl Status" value={member.pearl_status} />
                <ProfileField label="Hair Color" value={member.hair_color} />
                <ProfileField label="Has Tattoos" value={member.has_tattoos === true ? 'Yes' : member.has_tattoos === false ? 'No' : null} />
                <ProfileField label="Visible Piercings" value={member.visible_piercings === true ? 'Yes' : member.visible_piercings === false ? 'No' : null} />
              </div>
              {(member.bust_measurement || member.waist_measurement || member.hips_measurement || member.height_measurement) && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Body Measurements</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <ProfileField label="Height" value={member.height_measurement ? `${member.height_measurement}"` : null} />
                    <ProfileField label="Bust" value={member.bust_measurement ? `${member.bust_measurement}"` : null} />
                    <ProfileField label="Chest" value={member.chest_measurement ? `${member.chest_measurement}"` : null} />
                    <ProfileField label="Waist" value={member.waist_measurement ? `${member.waist_measurement}"` : null} />
                    <ProfileField label="Hips" value={member.hips_measurement ? `${member.hips_measurement}"` : null} />
                    <ProfileField label="Inseam" value={member.inseam_measurement ? `${member.inseam_measurement}"` : null} />
                  </div>
                  {member.measurements_taken_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Measured: {format(new Date(member.measurements_taken_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consents & Dates */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Consents & Account Info
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ProfileField label="Photo Consent" value={member.photo_consent === true ? 'Yes' : member.photo_consent === false ? 'No' : null} />
                <ProfileField label="Media Consent" value={member.media_consent === true ? 'Yes' : member.media_consent === false ? 'No' : null} />
                <ProfileField label="Data Consent" value={member.data_consent === true ? 'Yes' : member.data_consent === false ? 'No' : null} />
                <ProfileField label="Media Release Signed" value={member.media_release_signed_at ? format(new Date(member.media_release_signed_at), 'MMM d, yyyy') : null} />
                <ProfileField label="Join Date" value={member.join_date ? format(new Date(member.join_date), 'MMM d, yyyy') : null} />
                <ProfileField label="Last Sign In" value={member.last_sign_in_at ? format(new Date(member.last_sign_in_at), 'MMM d, yyyy h:mm a') : null} />
                <ProfileField label="Account Created" value={member.created_at ? format(new Date(member.created_at), 'MMM d, yyyy') : null} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Attendance Record ({attendance.length} events)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingAttendance ? (
                <p className="text-sm text-muted-foreground">Loading attendance...</p>
              ) : attendance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendance records found</p>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                      <CheckCircle className="h-5 w-5 mx-auto text-green-600 mb-1" />
                      <p className="text-lg font-bold text-green-600">{attendanceStats.present}</p>
                      <p className="text-xs text-muted-foreground">Present</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                      <XCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
                      <p className="text-lg font-bold text-red-600">{attendanceStats.absent}</p>
                      <p className="text-xs text-muted-foreground">Absent</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                      <Clock className="h-5 w-5 mx-auto text-amber-600 mb-1" />
                      <p className="text-lg font-bold text-amber-600">{attendanceStats.late}</p>
                      <p className="text-xs text-muted-foreground">Late</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                      <Calendar className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                      <p className="text-lg font-bold text-blue-600">{attendanceStats.excused}</p>
                      <p className="text-xs text-muted-foreground">Excused</p>
                    </div>
                  </div>
                  <Progress value={attendanceRate} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground text-center mb-4">{attendanceRate}% attendance rate</p>
                  <ScrollArea className="h-64">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2">Event</th>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.map((record) => (
                          <tr key={record.id} className="border-t">
                            <td className="p-2">{record.event_title || "Unknown Event"}</td>
                            <td className="p-2 text-muted-foreground">
                              {record.event_date ? format(new Date(record.event_date), "MMM d, yyyy") : "-"}
                            </td>
                            <td className="p-2">
                              <Badge 
                                variant={record.status === 'present' ? 'default' : record.status === 'absent' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {record.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coursework Tab */}
        <TabsContent value="coursework" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Assignment Submissions ({assignments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingAssignments ? (
                <p className="text-sm text-muted-foreground">Loading assignments...</p>
              ) : assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignment submissions</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-blue-600">{assignmentStats.submitted}</p>
                      <p className="text-xs text-muted-foreground">Submitted</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-green-600">{assignmentStats.graded}</p>
                      <p className="text-xs text-muted-foreground">Graded</p>
                    </div>
                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-primary">{assignmentStats.avgGrade || 'N/A'}%</p>
                      <p className="text-xs text-muted-foreground">Avg Grade</p>
                    </div>
                  </div>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {assignments.map(submission => (
                        <div key={submission.id} className="flex items-center justify-between p-3 rounded border bg-card">
                          <div>
                            <p className="font-medium text-sm">{submission.assignment?.title || 'Unknown Assignment'}</p>
                            <p className="text-xs text-muted-foreground">
                              Submitted {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                            </p>
                            {submission.file_name && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <FileText className="h-3 w-3" />
                                {submission.file_name}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={submission.status === 'graded' ? 'default' : submission.status === 'submitted' ? 'secondary' : 'outline'}
                            >
                              {submission.status}
                            </Badge>
                            {submission.grade !== null && (
                              <p className="text-lg font-bold mt-1">{submission.grade}%</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Music Library Tab */}
        <TabsContent value="music" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Music className="h-4 w-4" />
                Sheet Music Usage ({sheetMusicAnalytics.length} actions)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingSheetMusic ? (
                <p className="text-sm text-muted-foreground">Loading music analytics...</p>
              ) : sheetMusicAnalytics.length === 0 ? (
                <p className="text-sm text-muted-foreground">No music library activity</p>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center">
                      <Eye className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                      <p className="text-lg font-bold text-purple-600">{sheetMusicStats.views}</p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                      <Download className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                      <p className="text-lg font-bold text-blue-600">{sheetMusicStats.downloads}</p>
                      <p className="text-xs text-muted-foreground">Downloads</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                      <Headphones className="h-5 w-5 mx-auto text-green-600 mb-1" />
                      <p className="text-lg font-bold text-green-600">{sheetMusicStats.audioPlays}</p>
                      <p className="text-xs text-muted-foreground">Audio Plays</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                      <Music className="h-5 w-5 mx-auto text-amber-600 mb-1" />
                      <p className="text-lg font-bold text-amber-600">{sheetMusicStats.uniquePieces}</p>
                      <p className="text-xs text-muted-foreground">Pieces</p>
                    </div>
                  </div>
                  <ScrollArea className="h-64">
                    <div className="space-y-1">
                      {sheetMusicAnalytics.slice(0, 50).map(action => (
                        <div key={action.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 text-sm">
                          <div className="p-1.5 rounded bg-muted">
                            {getActionIcon(action.action_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{action.sheet_music?.title || 'Unknown Piece'}</p>
                            <p className="text-xs text-muted-foreground capitalize">{action.action_type.replace(/_/g, ' ')}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {getDeviceIcon(action.device_type)}
                            {format(new Date(action.created_at), 'MMM d')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Contracts & Agreements ({contracts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingContracts ? (
                <p className="text-sm text-muted-foreground">Loading contracts...</p>
              ) : contracts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contracts assigned</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                      <CheckCircle className="h-5 w-5 mx-auto text-green-600 mb-1" />
                      <p className="text-lg font-bold text-green-600">{contractStats.signed}</p>
                      <p className="text-xs text-muted-foreground">Signed</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                      <Clock className="h-5 w-5 mx-auto text-amber-600 mb-1" />
                      <p className="text-lg font-bold text-amber-600">{contractStats.pending}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                      <FileText className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                      <p className="text-lg font-bold text-blue-600">{contractStats.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {contracts.map(contract => (
                        <div key={contract.id} className="flex items-center justify-between p-3 rounded border bg-card">
                          <div>
                            <p className="font-medium text-sm">{contract.contract?.title || 'Unknown Contract'}</p>
                            <p className="text-xs text-muted-foreground">
                              Created {contract.contract?.created_at ? format(new Date(contract.contract.created_at), 'MMM d, yyyy') : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={contract.status === 'completed' || contract.status === 'user_signed' ? 'default' : 'secondary'}
                            >
                              {contract.status.replace(/_/g, ' ')}
                            </Badge>
                            {contract.user_signed_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Signed {format(new Date(contract.user_signed_at), 'MMM d')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Website Activity ({activityLogs.length} actions)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingActivity ? (
                <p className="text-sm text-muted-foreground">Loading activity...</p>
              ) : activityLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity logged</p>
              ) : (
                <>
                  {/* Activity breakdown */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(activityStats.byAction).slice(0, 6).map(([action, count]) => (
                      <Badge key={action} variant="outline" className="text-xs">
                        {action.replace(/_/g, ' ')}: {count}
                      </Badge>
                    ))}
                  </div>
                  <ScrollArea className="h-80">
                    <div className="space-y-1">
                      {activityLogs.map(log => (
                        <div key={log.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 text-sm">
                          <div className="p-1.5 rounded bg-muted">
                            {getActionIcon(log.action_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium capitalize">{log.action_type.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-muted-foreground">{log.resource_type}</p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exit Interviews Tab */}
        <TabsContent value="interviews" className="space-y-4 mt-4">
          {exitInterviews.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No exit interviews submitted yet</p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" defaultValue={["interview-0"]} className="space-y-3">
              {exitInterviews.map((interview, index) => (
                <AccordionItem key={interview.id} value={`interview-${index}`} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 text-left">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      <div>
                        <span className="font-medium">{interview.semester} Exit Interview</span>
                        <p className="text-xs text-muted-foreground">
                          Submitted {format(new Date(interview.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-4">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-accent/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Returning</p>
                        <Badge variant={interview.intent_to_continue ? "default" : "secondary"}>
                          {interview.intent_to_continue ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="bg-accent/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Exec Interest</p>
                        <Badge variant={interview.interested_in_exec_board ? "default" : "secondary"}>
                          {interview.interested_in_exec_board ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="bg-accent/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Tour Interest</p>
                        <Badge variant={interview.interested_in_fall_tour ? "default" : "secondary"}>
                          {interview.interested_in_fall_tour ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="bg-accent/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">GPA</p>
                        <span className="font-semibold">{interview.current_gpa?.toFixed(2) || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Satisfaction Ratings */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Heart className="h-4 w-4" />
                          Satisfaction Ratings
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 py-0 pb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Overall</p>
                          {renderStars(interview.satisfaction_overall)}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Rehearsals</p>
                          {renderStars(interview.satisfaction_rehearsals)}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Performances</p>
                          {renderStars(interview.satisfaction_performances)}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Community</p>
                          {renderStars(interview.satisfaction_community)}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Leadership</p>
                          {renderStars(interview.satisfaction_leadership)}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Communication</p>
                          {renderStars(interview.satisfaction_communication)}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Qualitative Feedback */}
                    {(interview.what_worked_well || interview.what_could_improve || interview.suggestions_for_next_semester) && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Feedback
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 py-0 pb-4">
                          {interview.what_worked_well && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">What Worked Well</p>
                              <p className="text-sm">{interview.what_worked_well}</p>
                            </div>
                          )}
                          {interview.what_could_improve && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Areas for Improvement</p>
                              <p className="text-sm">{interview.what_could_improve}</p>
                            </div>
                          )}
                          {interview.suggestions_for_next_semester && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Suggestions</p>
                              <p className="text-sm">{interview.suggestions_for_next_semester}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Additional Comments */}
                    {interview.additional_comments && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm">Additional Comments</CardTitle>
                        </CardHeader>
                        <CardContent className="py-0 pb-4">
                          <p className="text-sm">{interview.additional_comments}</p>
                        </CardContent>
                      </Card>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
