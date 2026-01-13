import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Vote, Users, UserPlus, BookOpen, 
  ClipboardCheck, Star, Award, Calendar, CheckCircle2,
  Crown, Gavel, FileText, DollarSign, MapPin, Megaphone,
  Package, Music, Loader2, Send, User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useExecutiveBoardMembers } from '@/hooks/useExecutiveBoardMembers';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

interface ElectionsModuleProps {
  courseId: string;
}

interface ShadowingApplication {
  id: string;
  user_id: string;
  primary_position: string;
  alternate_position: string | null;
  statement_of_intent: string;
  status: 'pending' | 'approved' | 'denied' | 'certified';
  academic_year: string;
  created_at: string;
  source?: 'application' | 'exit_interview';
  gpa?: number | null;
  profile?: {
    full_name: string;
    headshot_url: string | null;
  } | null;
}

interface ExitInterviewCandidate {
  user_id: string;
  interested_in_exec_board: boolean;
  exec_board_position_interest: string | null;
  current_gpa: number | null;
  understands_leadership_program: boolean;
  can_attend_all_sessions: boolean;
  created_at: string;
}

const EXEC_POSITIONS = [
  { value: 'president', label: 'President', icon: Crown },
  { value: 'vice_president', label: 'Vice President', icon: Gavel },
  { value: 'secretary', label: 'Secretary', icon: FileText },
  { value: 'treasurer', label: 'Treasurer', icon: DollarSign },
  { value: 'tour_manager', label: 'Tour Manager', icon: MapPin },
  { value: 'road_manager', label: 'Road Manager', icon: MapPin },
  { value: 'pr_coordinator', label: 'PR Coordinator', icon: Megaphone },
  { value: 'merchandise_manager', label: 'Merchandise Manager', icon: Package },
  { value: 'student_conductor', label: 'Student Conductor', icon: Music },
];

const POSITION_ICONS: Record<string, React.ElementType> = {
  'president': Crown,
  'vice_president': Gavel,
  'vice president': Gavel,
  'secretary': FileText,
  'treasurer': DollarSign,
  'tour_manager': MapPin,
  'tour manager': MapPin,
  'road_manager': MapPin,
  'road manager': MapPin,
  'pr_coordinator': Megaphone,
  'pr coordinator': Megaphone,
  'merchandise_manager': Package,
  'merchandise manager': Package,
  'student_conductor': Music,
  'student conductor': Music,
};

const SHADOWING_CONTENT = {
  purpose: `The Executive Board Shadowing Program ensures continuity, professionalism, and institutional stability in the leadership of the Spelman College Glee Club. Leadership is earned through service, training, and evaluation.`,
  whoMayParticipate: `Any active member of the Glee Club in good standing may apply to shadow an Executive Board position during the Spring semester for the following academic year.`,
  whatShadowingIs: `Shadowing is a working apprenticeship. A shadow assists the current officer, completes assigned tasks, and is evaluated on professionalism, reliability, and competence. Shadowing does not guarantee election or appointment.`,
  structure: [
    'An Officer of Record',
    'One or more Shadows',
    'Defined responsibilities, tasks, and evaluation criteria'
  ],
  application: `Students apply during the Spring semester by selecting a primary and alternate position, submitting a statement of intent, confirming availability, and agreeing to professional conduct standards. Final approval rests with the Director.`,
  evaluation: `Shadows are evaluated by their assigned officer using a standardized rubric measuring reliability, professionalism, skill, leadership, and growth.`,
  certification: [
    'Complete all required tasks',
    'Receive a satisfactory evaluation',
    'Be approved by the Director'
  ],
  elections: `Only certified candidates may appear on election ballots. This protects the integrity and continuity of the Spelman College Glee Club.`
};

export const ElectionsModule: React.FC<ElectionsModuleProps> = ({ courseId }) => {
  const { user } = useAuth();
  const { members: execBoardMembers, loading: loadingExecBoard } = useExecutiveBoardMembers();
  const { profile, isSuperAdmin, isAdmin } = useUserRole();
  const [activeTab, setActiveTab] = useState('shadowing');
  
  // Check if user can view shadowing info (admin, super-admin, president, vice-president, secretary)
  const canViewShadowing = () => {
    if (!profile) return false;
    if (isSuperAdmin() || isAdmin()) return true;
    
    // Check for specific exec board positions
    const allowedPositions = ['president', 'vice president', 'vice_president', 'secretary'];
    const userPosition = profile.exec_board_role?.toLowerCase() || '';
    return allowedPositions.some(pos => userPosition.includes(pos));
  };
  
  // Shadowing applications state
  const [applications, setApplications] = useState<ShadowingApplication[]>([]);
  const [exitInterviewCandidates, setExitInterviewCandidates] = useState<ShadowingApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [myApplication, setMyApplication] = useState<ShadowingApplication | null>(null);
  
  // Application form state
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [primaryPosition, setPrimaryPosition] = useState('');
  const [alternatePosition, setAlternatePosition] = useState('');
  const [statementOfIntent, setStatementOfIntent] = useState('');
  const [availabilityConfirmed, setAvailabilityConfirmed] = useState(false);
  const [conductAgreement, setConductAgreement] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  useEffect(() => {
    fetchApplications();
    fetchExitInterviewCandidates();
  }, [user]);

  const fetchApplications = async () => {
    try {
      setLoadingApplications(true);
      
      // Fetch all applications for current academic year
      const { data, error } = await supabase
        .from('gw_shadowing_applications')
        .select('*')
        .eq('academic_year', currentAcademicYear)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles for each application
      const applicationsWithProfiles = await Promise.all(
        (data || []).map(async (app) => {
          const { data: profile } = await supabase
            .from('gw_profiles')
            .select('full_name, headshot_url')
            .eq('user_id', app.user_id)
            .single();
          
          return {
            ...app,
            status: app.status as ShadowingApplication['status'],
            profile: profile || null
          };
        })
      );

      setApplications(applicationsWithProfiles);
      
      // Find user's own application
      if (user) {
        const myApp = applicationsWithProfiles.find(app => app.user_id === user.id);
        setMyApplication(myApp || null);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const fetchExitInterviewCandidates = async () => {
    try {
      // Fetch members who indicated exec board interest in exit interviews
      const { data, error } = await supabase
        .from('member_exit_interviews')
        .select('user_id, interested_in_exec_board, exec_board_position_interest, current_gpa, understands_leadership_program, can_attend_all_sessions, created_at')
        .eq('interested_in_exec_board', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles for each candidate
      const candidatesWithProfiles = await Promise.all(
        (data || []).map(async (candidate) => {
          const { data: profile } = await supabase
            .from('gw_profiles')
            .select('full_name, headshot_url')
            .eq('user_id', candidate.user_id)
            .single();

          // Parse the first position from the comma-separated list as primary
          const positions = candidate.exec_board_position_interest?.split(',').map(p => p.trim()) || [];
          const primaryPos = positions[0] || 'undecided';
          const alternatePos = positions[1] || null;
          
          return {
            id: `exit-${candidate.user_id}`,
            user_id: candidate.user_id,
            primary_position: primaryPos.toLowerCase().replace(/ /g, '_'),
            alternate_position: alternatePos?.toLowerCase().replace(/ /g, '_') || null,
            statement_of_intent: 'Expressed interest via Exit Interview',
            status: 'pending' as const,
            academic_year: currentAcademicYear,
            created_at: candidate.created_at,
            source: 'exit_interview' as const,
            gpa: candidate.current_gpa,
            profile: profile || null
          };
        })
      );

      // Filter out anyone who already has a formal application
      const formalApplicantIds = applications.map(a => a.user_id);
      const uniqueCandidates = candidatesWithProfiles.filter(
        c => !formalApplicantIds.includes(c.user_id)
      );

      setExitInterviewCandidates(uniqueCandidates);
    } catch (error) {
      console.error('Error fetching exit interview candidates:', error);
    }
  };

  const handleSubmitApplication = async () => {
    if (!user || !primaryPosition || !statementOfIntent || !availabilityConfirmed || !conductAgreement) {
      toast.error('Please complete all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('gw_shadowing_applications')
        .insert({
          user_id: user.id,
          primary_position: primaryPosition,
          alternate_position: alternatePosition || null,
          statement_of_intent: statementOfIntent,
          availability_confirmed: availabilityConfirmed,
          conduct_agreement: conductAgreement,
          academic_year: currentAcademicYear,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Shadowing application submitted successfully!');
      setShowApplyDialog(false);
      resetForm();
      fetchApplications();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setPrimaryPosition('');
    setAlternatePosition('');
    setStatementOfIntent('');
    setAvailabilityConfirmed(false);
    setConductAgreement(false);
  };

  const getPositionIcon = (position: string) => {
    const Icon = POSITION_ICONS[position.toLowerCase()] || User;
    return Icon;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'certified':
        return <Badge className="bg-green-500">Certified</Badge>;
      case 'approved':
        return <Badge className="bg-blue-500">Approved</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Vote className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Elections & Leadership</CardTitle>
              <CardDescription>
                Executive Board shadowing, voting, and onboarding process
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="shadowing" className="flex items-center gap-2 py-3">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Shadowing</span>
          </TabsTrigger>
          <TabsTrigger value="voting" className="flex items-center gap-2 py-3">
            <Vote className="h-4 w-4" />
            <span className="hidden sm:inline">Voting</span>
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="flex items-center gap-2 py-3">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Onboarding</span>
          </TabsTrigger>
        </TabsList>

        {/* Shadowing Tab */}
        <TabsContent value="shadowing" className="mt-6 space-y-6">
          {!canViewShadowing() ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Users className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Restricted Access</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    The Shadowing Program information is only available to administrators, 
                    the President, Vice President, and Secretary.
                  </p>
                  <Badge variant="secondary" className="mt-4">Leadership Access Required</Badge>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
          {/* Current Executive Board */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-primary" />
                Current Executive Board
              </CardTitle>
              <CardDescription>
                {currentAcademicYear} Leadership Team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingExecBoard ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : execBoardMembers.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No executive board members found
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {execBoardMembers.map((member) => {
                    const Icon = getPositionIcon(member.position);
                    return (
                      <div 
                        key={member.user_id}
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            <Icon className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{member.full_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {member.position.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shadowing Applicants */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Shadowing Applicants
                  </CardTitle>
                  <CardDescription>
                    Members applying to shadow exec board positions for next year
                  </CardDescription>
                </div>
                {user && !myApplication && (
                  <Button onClick={() => setShowApplyDialog(true)} className="gap-2">
                    <Send className="h-4 w-4" />
                    Apply to Shadow
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingApplications ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : applications.length === 0 && exitInterviewCandidates.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No shadowing applications yet for {currentAcademicYear}
                  </p>
                  {user && !myApplication && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setShowApplyDialog(true)}
                    >
                      Be the first to apply
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[480px]">
                  <div className="space-y-4 pr-4">
                    {/* Formal Applications */}
                    {applications.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4" />
                          Formal Applications ({applications.length})
                        </h4>
                        {applications.map((app) => {
                          const Icon = getPositionIcon(app.primary_position);
                          const isOwnApplication = user?.id === app.user_id;
                          return (
                            <div 
                              key={app.id}
                              className={`flex items-center justify-between p-4 rounded-lg border ${
                                isOwnApplication ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={app.profile?.headshot_url || ''} />
                                  <AvatarFallback>
                                    {app.profile?.full_name?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {app.profile?.full_name || 'Unknown'}
                                    {isOwnApplication && (
                                      <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Icon className="h-3 w-3" />
                                    <span className="capitalize">
                                      {app.primary_position.replace(/_/g, ' ')}
                                    </span>
                                    {app.alternate_position && (
                                      <span className="text-muted-foreground/70">
                                        (Alt: {app.alternate_position.replace(/_/g, ' ')})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {getStatusBadge(app.status)}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Exit Interview Candidates */}
                    {exitInterviewCandidates.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          From Exit Interviews ({exitInterviewCandidates.length})
                        </h4>
                        {exitInterviewCandidates.map((candidate) => {
                          const Icon = getPositionIcon(candidate.primary_position);
                          const isOwnApplication = user?.id === candidate.user_id;
                          return (
                            <div 
                              key={candidate.id}
                              className={`flex items-center justify-between p-4 rounded-lg border ${
                                isOwnApplication ? 'bg-amber-50 border-amber-200' : 'bg-amber-50/50 border-amber-100'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={candidate.profile?.headshot_url || ''} />
                                  <AvatarFallback>
                                    {candidate.profile?.full_name?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {candidate.profile?.full_name || 'Unknown'}
                                    {isOwnApplication && (
                                      <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                                    )}
                                    <Badge variant="outline" className="ml-2 text-xs bg-amber-100 border-amber-300">
                                      Exit Interview
                                    </Badge>
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Icon className="h-3 w-3" />
                                    <span className="capitalize">
                                      {candidate.primary_position.replace(/_/g, ' ')}
                                    </span>
                                    {candidate.alternate_position && (
                                      <span className="text-muted-foreground/70">
                                        (Alt: {candidate.alternate_position.replace(/_/g, ' ')})
                                      </span>
                                    )}
                                    {candidate.gpa && (
                                      <span className="text-muted-foreground/70">
                                        • GPA: {candidate.gpa.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                Interested
                              </Badge>
                            </div>
                          );
                        })}
                        <p className="text-xs text-muted-foreground italic px-2">
                          These members indicated interest via their exit interview. They should submit a formal shadowing application to proceed.
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Program Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                Shadowing Program Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4 text-sm">
                  <section>
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Purpose
                    </h3>
                    <p className="text-muted-foreground">{SHADOWING_CONTENT.purpose}</p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Who May Participate
                    </h3>
                    <p className="text-muted-foreground">{SHADOWING_CONTENT.whoMayParticipate}</p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-primary" />
                      Evaluation
                    </h3>
                    <p className="text-muted-foreground">{SHADOWING_CONTENT.evaluation}</p>
                  </section>
                  <section>
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      Certification
                    </h3>
                    <p className="text-muted-foreground mb-2">Only students who:</p>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                      {SHADOWING_CONTENT.certification.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                    <p className="text-muted-foreground mt-2">
                      may be certified to run for the corresponding Executive Board position.
                    </p>
                  </section>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>

        {/* Voting Tab */}
        <TabsContent value="voting" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Vote className="h-5 w-5 text-primary" />
                Executive Board Voting
              </CardTitle>
              <CardDescription>
                Cast your vote for certified candidates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Vote className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Voting Coming Soon</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  The voting module is currently under development. Elections will be held 
                  prior to the banquet at the close of the Spring Semester.
                </p>
                <Badge variant="secondary" className="mt-4">In Development</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5 text-primary" />
                Onboarding New Executive Board Members
              </CardTitle>
              <CardDescription>
                Transition and training for elected officers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Post-Election Onboarding Process
                </h3>
                <div className="space-y-3">
                  {[
                    { step: 1, title: 'Official Announcement', desc: 'Results announced at the Spring Banquet following election completion.' },
                    { step: 2, title: 'Transition Meeting', desc: 'Outgoing officers meet with incoming officers for knowledge transfer.' },
                    { step: 3, title: 'Documentation Handoff', desc: 'Access to position-specific files, contacts, and resources.' },
                    { step: 4, title: 'Summer Preparation', desc: 'Review handbook, prepare for Fall semester responsibilities.' },
                    { step: 5, title: 'Executive Board Retreat', desc: 'Team building and strategic planning before Fall semester begins.' },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">{step}</Badge>
                      <div>
                        <p className="font-medium">{title}</p>
                        <p className="text-muted-foreground text-sm">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Apply Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Apply for Shadowing Program
            </DialogTitle>
            <DialogDescription>
              Submit your application to shadow an Executive Board position for {currentAcademicYear}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Primary Position */}
            <div className="space-y-2">
              <Label htmlFor="primary-position">Primary Position *</Label>
              <Select value={primaryPosition} onValueChange={setPrimaryPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="Select position to shadow" />
                </SelectTrigger>
                <SelectContent>
                  {EXEC_POSITIONS.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      <div className="flex items-center gap-2">
                        <pos.icon className="h-4 w-4" />
                        {pos.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Alternate Position */}
            <div className="space-y-2">
              <Label htmlFor="alternate-position">Alternate Position (Optional)</Label>
              <Select value={alternatePosition} onValueChange={setAlternatePosition}>
                <SelectTrigger>
                  <SelectValue placeholder="Select alternate position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {EXEC_POSITIONS.filter(p => p.value !== primaryPosition).map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      <div className="flex items-center gap-2">
                        <pos.icon className="h-4 w-4" />
                        {pos.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Statement of Intent */}
            <div className="space-y-2">
              <Label htmlFor="statement">Statement of Intent *</Label>
              <Textarea
                id="statement"
                placeholder="Explain why you want to shadow this position and what you hope to learn..."
                value={statementOfIntent}
                onChange={(e) => setStatementOfIntent(e.target.value)}
                rows={4}
              />
            </div>

            {/* Confirmations */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="availability"
                  checked={availabilityConfirmed}
                  onCheckedChange={(checked) => setAvailabilityConfirmed(!!checked)}
                />
                <Label htmlFor="availability" className="text-sm leading-relaxed cursor-pointer">
                  I confirm my availability to participate in the shadowing program during the Spring semester
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="conduct"
                  checked={conductAgreement}
                  onCheckedChange={(checked) => setConductAgreement(!!checked)}
                />
                <Label htmlFor="conduct" className="text-sm leading-relaxed cursor-pointer">
                  I agree to adhere to professional conduct standards as outlined in the Glee Club Handbook
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitApplication}
              disabled={submitting || !primaryPosition || !statementOfIntent || !availabilityConfirmed || !conductAgreement}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
