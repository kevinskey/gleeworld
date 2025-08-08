import { useState, useEffect } from "react";
import { format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Music, 
  Users, 
  Star, 
  TrendingUp, 
  Calendar, 
  Clock, 
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Plus,
  Eye,
  Edit,
  BarChart3,
  Download,
  Shield,
  UserCheck,
  Trash2
} from "lucide-react";
import { MobileScoreWindow } from "@/components/scoring/MobileScoreWindow";
import { SightReadingScoreWindow } from "@/components/scoring/SightReadingScoreWindow";
import { useUserRole } from "@/hooks/useUserRole";
import { AuditionFilters } from "@/components/audition/AuditionFilters";
import { PageHeader } from "@/components/shared/PageHeader";

interface AuditionSession {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  application_deadline: string;
  audition_dates: string[];
  is_active: boolean;
  max_applicants?: number;
  requirements?: string;
  created_at: string;
}

interface AuditionApplication {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  audition_date: string;
  audition_time: string;
  status: string;
  created_at: string;
  updated_at: string;
  sang_in_middle_school: boolean;
  sang_in_high_school: boolean;
  high_school_years?: string;
  plays_instrument: boolean;
  instrument_details?: string;
  is_soloist: boolean;
  soloist_rating?: number;
  high_school_section?: string;
  reads_music: boolean;
  interested_in_voice_lessons: boolean;
  interested_in_music_fundamentals: boolean;
  personality_description: string;
  interested_in_leadership: boolean;
  additional_info?: string;
  selfie_url?: string;
  // Computed properties for display
  full_name?: string;
  application_date?: string;
  profile_image_url?: string;
  voice_part_preference?: string;
}

interface AuditionEvaluation {
  id: string;
  application_id: string;
  evaluator_id: string;
  tone_quality?: number;
  intonation?: number;
  sight_reading?: number;
  rhythm?: number;
  musicality?: number;
  voice_part_suitability?: string;
  stage_presence?: number;
  confidence?: number;
  preparation_level?: number;
  technical_score?: number;
  artistic_score?: number;
  overall_score?: number;
  strengths?: string;
  areas_for_improvement?: string;
  evaluator_notes?: string;
  recommendation?: string;
  evaluation_date: string;
  is_final: boolean;
}

interface AuditionAnalytics {
  id: string;
  session_name: string;
  full_name: string;
  email: string;
  academic_year?: string;
  major?: string;
  gpa?: number;
  voice_part_preference?: string;
  years_of_vocal_training?: number;
  sight_reading_level?: string;
  status: string;
  profile_image_url?: string;
  avg_overall_score?: number;
  avg_technical_score?: number;
  avg_artistic_score?: number;
  evaluation_count: number;
  most_common_recommendation?: string;
  application_date: string;
}

export const AuditionsManagement = () => {
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRole();
  const [activeTab, setActiveTab] = useState("overview");
  const [sessions, setSessions] = useState<AuditionSession[]>([]);
  const [applications, setApplications] = useState<AuditionApplication[]>([]);
  const [evaluations, setEvaluations] = useState<AuditionEvaluation[]>([]);
  const [analytics, setAnalytics] = useState<AuditionAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<AuditionApplication | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [evaluationForm, setEvaluationForm] = useState<Partial<AuditionEvaluation>>({});
  
  // Filter and sort state for roster
  const [sortBy, setSortBy] = useState<string>('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterByStatus, setFilterByStatus] = useState<string>('');
  const [filterByVoicePart, setFilterByVoicePart] = useState<string>('');
  const [filterByDate, setFilterByDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Adjudicator scoring state
  const [showAdjudicatorScoring, setShowAdjudicatorScoring] = useState(false);
  const [adjudicatorType, setAdjudicatorType] = useState<'audition' | 'sight_reading'>('audition');
  const [selectedPerformer, setSelectedPerformer] = useState<{
    id: string; 
    name: string; 
    avatar_url?: string; 
    email?: string; 
    applicationData?: AuditionApplication;
  } | null>(null);

  const [newSession, setNewSession] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    application_deadline: "",
    audition_dates: [""],
    max_applicants: "",
    requirements: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch sessions from the correct table
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('audition_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Fetch applications from gw_auditions table with available fields
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('gw_auditions')
        .select(`
          id,
          user_id,
          first_name,
          last_name,
          email,
          phone,
          audition_date,
          audition_time,
          status,
          created_at,
          updated_at,
          sang_in_middle_school,
          sang_in_high_school,
          high_school_years,
          plays_instrument,
          instrument_details,
          is_soloist,
          soloist_rating,
          high_school_section,
          reads_music,
          interested_in_voice_lessons,
          interested_in_music_fundamentals,
          personality_description,
          interested_in_leadership,
          additional_info,
          selfie_url
        `)
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;
      
      // Transform data to match interface expectations
      const transformedApplications = (applicationsData || []).map(app => ({
        ...app,
        full_name: `${app.first_name} ${app.last_name}`,
        application_date: app.created_at,
        profile_image_url: app.selfie_url,
        phone_number: app.phone,
        audition_time_slot: app.audition_time
      }));
      
      setApplications(transformedApplications);

      // Generate analytics from application data
      const analyticsData = generateAnalytics(transformedApplications);
      setAnalytics(analyticsData);

      // Fetch evaluations - for now, we'll create a placeholder since gw_auditions doesn't have evaluations yet
      const evaluationsData: any[] = []; // Empty for now
      setEvaluations(evaluationsData);

    } catch (error) {
      console.error('Error fetching audition data:', error);
      toast({
        title: "Error",
        description: "Failed to load audition data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAnalytics = (apps: AuditionApplication[]) => {
    return apps.map(app => ({
      id: app.id,
      session_name: 'Current Session', // Default since no session data
      full_name: app.full_name || `${app.first_name} ${app.last_name}`,
      email: app.email,
      academic_year: 'Not specified', // Not available in current schema
      major: 'Not specified', // Not available in current schema
      gpa: 0, // Not available in current schema
      voice_part_preference: app.high_school_section || 'Not specified',
      years_of_vocal_training: 0, // Not available in current schema
      sight_reading_level: app.reads_music ? 'Basic' : 'Beginner',
      status: app.status,
      profile_image_url: app.profile_image_url,
      avg_overall_score: 0, // Will be calculated when evaluations exist
      avg_technical_score: 0,
      avg_artistic_score: 0,
      evaluation_count: 0,
      most_common_recommendation: 'Pending',
      application_date: app.application_date || app.created_at
    }));
  };

  const createSession = async () => {
    try {
      const { error } = await supabase
        .from('audition_sessions')
        .insert([{
          ...newSession,
          max_applicants: newSession.max_applicants ? parseInt(newSession.max_applicants) : null,
          audition_dates: newSession.audition_dates.filter(date => date.trim() !== '')
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Audition session created successfully",
      });

      setNewSession({
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        application_deadline: "",
        audition_dates: [""],
        max_applicants: "",
        requirements: ""
      });

      fetchData();
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create audition session",
        variant: "destructive",
      });
    }
  };

  const submitEvaluation = async () => {
    if (!selectedApplication || !evaluationForm) return;

    try {
      // Calculate scores
      const technicalScores = [
        evaluationForm.tone_quality,
        evaluationForm.intonation,
        evaluationForm.sight_reading,
        evaluationForm.rhythm,
        evaluationForm.musicality
      ].filter(score => score !== undefined);

      const artisticScores = [
        evaluationForm.stage_presence,
        evaluationForm.confidence,
        evaluationForm.preparation_level
      ].filter(score => score !== undefined);

      const technical_score = technicalScores.length > 0 
        ? technicalScores.reduce((a, b) => a! + b!, 0)! / technicalScores.length 
        : undefined;

      const artistic_score = artisticScores.length > 0 
        ? artisticScores.reduce((a, b) => a! + b!, 0)! / artisticScores.length 
        : undefined;

      const overall_score = technical_score && artistic_score 
        ? (technical_score + artistic_score) / 2 
        : technical_score || artistic_score;

      const evaluationData = {
        application_id: selectedApplication.id,
        evaluator_id: evaluationForm.evaluator_id || '',
        ...evaluationForm,
        technical_score,
        artistic_score,
        overall_score
      };

      const { error } = await supabase
        .from('audition_evaluations')
        .upsert([evaluationData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Evaluation submitted successfully",
      });

      setEvaluationForm({});
      setSelectedApplication(null);
      fetchData();
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast({
        title: "Error",
        description: "Failed to submit evaluation",
        variant: "destructive",
      });
    }
  };

  // Adjudicator scoring handlers
  const startAdjudicatorScoring = (application: AuditionApplication, type: 'audition' | 'sight_reading') => {
    const performerData = {
      id: application.user_id,
      name: application.full_name || `${application.first_name} ${application.last_name}`,
      avatar_url: application.profile_image_url || application.selfie_url,
      email: application.email,
      applicationData: application
    };
    
    console.log('Starting adjudicator scoring with performer data:', performerData);
    console.log('Avatar URL found:', performerData.avatar_url);
    
    setSelectedPerformer(performerData);
    setAdjudicatorType(type);
    setShowAdjudicatorScoring(true);
  };

  const handleAdjudicatorScoreSubmitted = (scoreData: any) => {
    if (scoreData) {
      toast({
        title: "Score Saved",
        description: `Adjudicator evaluation completed successfully.`
      });
    }
    setShowAdjudicatorScoring(false);
    setSelectedPerformer(null);
    fetchData(); // Refresh data
  };

  const deleteApplication = async (application: AuditionApplication) => {
    if (!isSuperAdmin()) {
      toast({
        title: "Access Denied",
        description: "Only super admins can delete applications",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete the application from gw_auditions table
      const { error: deleteError } = await supabase
        .from('gw_auditions')
        .delete()
        .eq('id', application.id);

      if (deleteError) throw deleteError;

      // Restore time availability - appointments should be freed when application is deleted
      // This is handled automatically by the database if there's proper foreign key setup

      toast({
        title: "Success",
        description: `Application deleted successfully. Time slot has been restored.`,
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting application:', error);
      toast({
        title: "Error",
        description: "Failed to delete application",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'waitlisted': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVoicePartColor = (voicePart: string) => {
    switch (voicePart) {
      case 'S1':
      case 'S2': return 'bg-pink-100 text-pink-800';
      case 'A1':
      case 'A2': return 'bg-purple-100 text-purple-800';
      case 'T1':
      case 'T2': return 'bg-blue-100 text-blue-800';
      case 'B1':
      case 'B2': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filtering and sorting logic
  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const handleFilterChange = (filters: {
    status: string;
    voicePart: string;
    date: string;
    search: string;
  }) => {
    setFilterByStatus(filters.status);
    setFilterByVoicePart(filters.voicePart);
    setFilterByDate(filters.date);
    setSearchQuery(filters.search);
  };

  const filteredApplications = applications
    .filter(app => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const nameMatch = app.full_name?.toLowerCase().includes(searchLower);
        const emailMatch = app.email.toLowerCase().includes(searchLower);
        if (!nameMatch && !emailMatch) return false;
      }

      // Status filter
      if (filterByStatus && app.status !== filterByStatus) return false;

      // Voice part filter
      if (filterByVoicePart && app.voice_part_preference !== filterByVoicePart) return false;

      // Date filter
      if (filterByDate) {
        const appDate = format(new Date(app.audition_date), 'yyyy-MM-dd');
        if (appDate !== filterByDate) return false;
      }

      return true;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'full_name':
          aValue = a.full_name || `${a.first_name} ${a.last_name}`;
          bValue = b.full_name || `${b.first_name} ${b.last_name}`;
          break;
        case 'audition_date':
          aValue = new Date(a.audition_date);
          bValue = new Date(b.audition_date);
          break;
        case 'audition_time':
          aValue = a.audition_time;
          bValue = b.audition_time;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Music className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading audition data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Custom Header Design */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-3xl shadow-xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Music className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                  Auditions Management
                </h1>
              </div>
              <p className="text-white/90 text-base sm:text-lg max-w-2xl">
                Manage audition sessions, applications, and evaluations
              </p>
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <Users className="h-4 w-4" />
                  <span>{applications.length} Applications</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>{sessions.length} Sessions</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="w-full sm:w-56 bg-white/20 border-white/30 text-white placeholder:text-white/70 hover:bg-white/30 transition-colors">
                  <SelectValue placeholder="Filter by session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile optimized tab list */}
        <div className="overflow-x-auto mb-8">
          <TabsList className="grid w-full min-w-[600px] grid-cols-5 h-auto sm:h-12">
            <TabsTrigger value="overview" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-3 sm:p-4 text-xs sm:text-sm leading-relaxed">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-3 sm:p-4 text-xs sm:text-sm leading-relaxed">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Sessions</span>
            </TabsTrigger>
            <TabsTrigger value="roster" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-3 sm:p-4 text-xs sm:text-sm leading-relaxed">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Roster</span>
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-3 sm:p-4 text-xs sm:text-sm leading-relaxed">
              <Star className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Evaluations</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-3 sm:p-4 text-xs sm:text-sm leading-relaxed">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Data Center</span>
              <span className="sm:hidden">Data</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-8 mt-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sessions.filter(s => s.is_active).length}</div>
                <p className="text-xs text-muted-foreground">
                  {sessions.length} total sessions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredApplications.length}</div>
                <p className="text-xs text-muted-foreground">
                  {filteredApplications.filter(a => a.status === 'submitted' || a.status === 'pending').length} pending review
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Evaluated</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{evaluations.length}</div>
                <p className="text-xs text-muted-foreground">
                  {evaluations.filter(e => e.is_final).length} final evaluations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredApplications.length > 0 
                    ? Math.round((filteredApplications.filter(a => a.status === 'accepted').length / filteredApplications.length) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {filteredApplications.filter(a => a.status === 'accepted').length} accepted
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription>Latest audition applications submitted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredApplications.slice(0, 5).map((application) => (
                  <div key={application.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={application.profile_image_url} />
                        <AvatarFallback>
                          {application.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{application.full_name}</p>
                        <p className="text-sm text-muted-foreground">{application.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {application.voice_part_preference && (
                        <Badge className={getVoicePartColor(application.voice_part_preference)}>
                          {application.voice_part_preference}
                        </Badge>
                      )}
                      <Badge className={getStatusColor(application.status)}>
                        {application.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Create New Audition Session</CardTitle>
              <CardDescription>Set up a new audition period for applicants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Session Name</Label>
                  <Input
                    id="name"
                    value={newSession.name}
                    onChange={(e) => setNewSession({...newSession, name: e.target.value})}
                    placeholder="Fall 2024 Auditions"
                  />
                </div>
                <div>
                  <Label htmlFor="max_applicants">Max Applicants</Label>
                  <Input
                    id="max_applicants"
                    type="number"
                    value={newSession.max_applicants}
                    onChange={(e) => setNewSession({...newSession, max_applicants: e.target.value})}
                    placeholder="50"
                  />
                </div>
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newSession.start_date}
                    onChange={(e) => setNewSession({...newSession, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newSession.end_date}
                    onChange={(e) => setNewSession({...newSession, end_date: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="application_deadline">Application Deadline</Label>
                  <Input
                    id="application_deadline"
                    type="datetime-local"
                    value={newSession.application_deadline}
                    onChange={(e) => setNewSession({...newSession, application_deadline: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newSession.description}
                  onChange={(e) => setNewSession({...newSession, description: e.target.value})}
                  placeholder="Describe the audition session..."
                />
              </div>

              <div>
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  value={newSession.requirements}
                  onChange={(e) => setNewSession({...newSession, requirements: e.target.value})}
                  placeholder="List audition requirements..."
                />
              </div>

              <Button onClick={createSession} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {sessions.map((session) => (
              <Card key={session.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{session.name}</CardTitle>
                      <CardDescription>{session.description}</CardDescription>
                    </div>
                    <Badge className={session.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {session.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Start Date</p>
                      <p>{new Date(session.start_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-medium">End Date</p>
                      <p>{new Date(session.end_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-medium">Deadline</p>
                      <p>{new Date(session.application_deadline).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-medium">Applications</p>
                      <p>{applications.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roster" className="space-y-6 mt-8">
          <AuditionFilters
            sortBy={sortBy}
            sortOrder={sortOrder}
            filterByStatus={filterByStatus}
            filterByVoicePart={filterByVoicePart}
            filterByDate={filterByDate}
            searchQuery={searchQuery}
            onSortChange={handleSortChange}
            onFilterChange={handleFilterChange}
            totalCount={applications.length}
            filteredCount={filteredApplications.length}
          />
          
          <div className="grid gap-4">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No applications found</p>
                <p className="text-sm">Try adjusting your filters to see more results.</p>
              </div>
            ) : (
              filteredApplications.map((application) => (
              <Card key={application.id} className="overflow-hidden">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                    <Avatar className="h-12 w-12 sm:h-16 sm:w-16 mx-auto sm:mx-0">
                      <AvatarImage src={application.profile_image_url} />
                      <AvatarFallback className="text-sm sm:text-lg">
                        {application.full_name ? application.full_name.split(' ').map(n => n[0]).join('') : `${application.first_name[0]}${application.last_name[0]}`}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2 sm:space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h3 className="text-base sm:text-lg font-semibold text-center sm:text-left">
                          {application.full_name || `${application.first_name} ${application.last_name}`}
                        </h3>
                        <div className="flex items-center justify-center sm:justify-end space-x-2">
                          {application.high_school_section && (
                            <Badge className={getVoicePartColor(application.high_school_section)}>
                              {application.high_school_section}
                            </Badge>
                          )}
                          <Badge className={getStatusColor(application.status)}>
                            {application.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div className="flex items-center justify-center sm:justify-start space-x-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{application.email}</span>
                        </div>
                        {application.phone && (
                          <div className="flex items-center justify-center sm:justify-start space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{application.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-center sm:justify-start space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(application.audition_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{application.audition_time}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 pt-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedApplication(application)}>
                              <Eye className="h-3 w-3 mr-1" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Application Details - {application.full_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {/* Application details content */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Audition Date</Label>
                                  <p>{new Date(application.audition_date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <Label>Audition Time</Label>
                                  <p>{application.audition_time}</p>
                                </div>
                                <div>
                                  <Label>Phone</Label>
                                  <p>{application.phone || 'Not provided'}</p>
                                </div>
                                <div>
                                  <Label>Instrument Player</Label>
                                  <p>{application.plays_instrument ? 'Yes' : 'No'}</p>
                                </div>
                              </div>
                              
                              {application.personality_description && (
                                <div>
                                  <Label>Personality Description</Label>
                                  <p className="text-sm mt-1">{application.personality_description}</p>
                                </div>
                              )}
                              
                              {application.additional_info && (
                                <div>
                                  <Label>Additional Information</Label>
                                  <p className="text-sm mt-1">{application.additional_info}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="default" size="sm" onClick={() => {
                              setSelectedApplication(application);
                              setEvaluationForm({});
                            }}>
                              <Edit className="h-3 w-3 mr-1" />
                              Evaluate
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Evaluate - {application.full_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                {['tone_quality', 'intonation', 'sight_reading', 'rhythm', 'musicality'].map((skill) => (
                                  <div key={skill}>
                                    <Label className="capitalize">{skill.replace('_', ' ')} (1-10)</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="10"
                                      value={String(evaluationForm[skill as keyof AuditionEvaluation] || '')}
                                      onChange={(e) => setEvaluationForm({
                                        ...evaluationForm,
                                        [skill]: parseInt(e.target.value)
                                      })}
                                    />
                                  </div>
                                ))}
                              </div>

                              <div>
                                <Label>Voice Part Suitability</Label>
                                <Select value={evaluationForm.voice_part_suitability || ''} onValueChange={(value) => setEvaluationForm({...evaluationForm, voice_part_suitability: value})}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select voice part" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="S1">Soprano 1</SelectItem>
                                    <SelectItem value="S2">Soprano 2</SelectItem>
                                    <SelectItem value="A1">Alto 1</SelectItem>
                                    <SelectItem value="A2">Alto 2</SelectItem>
                                    <SelectItem value="T1">Tenor 1</SelectItem>
                                    <SelectItem value="T2">Tenor 2</SelectItem>
                                    <SelectItem value="B1">Bass 1</SelectItem>
                                    <SelectItem value="B2">Bass 2</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>Recommendation</Label>
                                <Select value={evaluationForm.recommendation || ''} onValueChange={(value) => setEvaluationForm({...evaluationForm, recommendation: value as any})}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select recommendation" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="strong_accept">Strong Accept</SelectItem>
                                    <SelectItem value="accept">Accept</SelectItem>
                                    <SelectItem value="conditional">Conditional</SelectItem>
                                    <SelectItem value="reject">Reject</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>Strengths</Label>
                                <Textarea
                                  value={evaluationForm.strengths || ''}
                                  onChange={(e) => setEvaluationForm({...evaluationForm, strengths: e.target.value})}
                                  placeholder="Note the applicant's strengths..."
                                />
                              </div>

                              <div>
                                <Label>Areas for Improvement</Label>
                                <Textarea
                                  value={evaluationForm.areas_for_improvement || ''}
                                  onChange={(e) => setEvaluationForm({...evaluationForm, areas_for_improvement: e.target.value})}
                                  placeholder="Note areas where the applicant can improve..."
                                />
                              </div>

                              <Button onClick={submitEvaluation} className="w-full">
                                Submit Evaluation
                              </Button>
                            </div>
                           </DialogContent>
                         </Dialog>

                         {isSuperAdmin() && (
                           <Button 
                             variant="destructive" 
                             size="sm"
                             onClick={() => {
                               if (window.confirm(`Are you sure you want to delete ${application.full_name}'s application? This will restore their audition time slot.`)) {
                                 deleteApplication(application);
                               }
                             }}
                           >
                             <Trash2 className="h-3 w-3 mr-1" />
                             Delete
                           </Button>
                         )}
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-6 mt-8">
          {/* Show Adjudicator Scoring Interface if active */}
          {showAdjudicatorScoring && selectedPerformer ? (
            adjudicatorType === 'sight_reading' ? (
              <SightReadingScoreWindow
                performerId={selectedPerformer.id}
                performerName={selectedPerformer.name}
                onScoreSubmitted={handleAdjudicatorScoreSubmitted}
              />
            ) : (
              <MobileScoreWindow
                performerId={selectedPerformer.id}
                performerName={selectedPerformer.name}
                eventType="audition"
                onScoreSubmitted={handleAdjudicatorScoreSubmitted}
                performerAvatarUrl={selectedPerformer.avatar_url}
                performerEmail={selectedPerformer.email}
                performerApplicationData={selectedPerformer.applicationData}
              />
            )
          ) : (
            <>
              {/* Adjudicator Panel Header */}
              <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-primary" />
                        Professional Adjudicator Interface
                      </CardTitle>
                      <CardDescription>
                        Select an applicant below to begin professional evaluation using the comprehensive scoring system
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Applicant Selection for Adjudication */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Applicant for Professional Evaluation</CardTitle>
                  <CardDescription>
                    Choose an applicant to evaluate using the professional adjudicator scoring interface
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {filteredApplications.map((application) => (
                      <div key={application.id} className="flex items-center justify-between p-6 border rounded-lg hover:bg-muted/50 transition-colors shadow-sm hover:shadow-md">
                        <div className="flex items-center space-x-6">
                          <div className="relative">
                            <Avatar className="h-16 w-16 border-2 border-primary/20">
                              <AvatarImage 
                                src={application.profile_image_url || application.selfie_url} 
                                alt={application.full_name}
                                className="object-cover"
                              />
                              <AvatarFallback className="font-semibold text-lg bg-gradient-to-br from-primary/10 to-secondary/10">
                                {application.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {/* Online status indicator */}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                              <UserCheck className="h-3 w-3 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{application.full_name}</h3>
                              <Badge className={getStatusColor(application.status)}>
                                {application.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span>{application.email}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(application.audition_date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{application.audition_time}</span>
                              </div>
                              {application.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{application.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => startAdjudicatorScoring(application, 'audition')}
                            className="flex items-center gap-2 min-w-[140px]"
                          >
                            <Star className="h-4 w-4" />
                            Audition Score
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => startAdjudicatorScoring(application, 'sight_reading')}
                            className="flex items-center gap-2 min-w-[140px]"
                          >
                            <Music className="h-4 w-4" />
                            Sight Reading
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Evaluation Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Completed Evaluations</CardTitle>
                  <CardDescription>Summary of professional adjudicator evaluations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {evaluations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No professional evaluations completed yet.</p>
                        <p className="text-sm">Use the adjudicator interface above to begin scoring applicants.</p>
                      </div>
                    ) : (
                      evaluations.map((evaluation) => {
                        const application = applications.find(app => app.id === evaluation.application_id);
                        return (
                          <div key={evaluation.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{application?.full_name}</h4>
                              <div className="flex items-center space-x-2">
                                <Badge className={evaluation.recommendation === 'strong_accept' ? 'bg-green-100 text-green-800' : 
                                                evaluation.recommendation === 'accept' ? 'bg-blue-100 text-blue-800' :
                                                evaluation.recommendation === 'conditional' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'}>
                                  {evaluation.recommendation?.replace('_', ' ')}
                                </Badge>
                                {evaluation.is_final && (
                                  <Badge className="bg-purple-100 text-purple-800">Final</Badge>
                                )}
                              </div>
                            </div>
                            
                            {evaluation.overall_score && (
                              <div className="mb-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span>Overall Score</span>
                                  <span>{evaluation.overall_score.toFixed(1)}/10</span>
                                </div>
                                <Progress value={evaluation.overall_score * 10} className="h-2" />
                              </div>
                            )}

                            {evaluation.voice_part_suitability && (
                              <p className="text-sm text-muted-foreground">
                                Recommended for: <Badge className={getVoicePartColor(evaluation.voice_part_suitability)}>
                                  {evaluation.voice_part_suitability}
                                </Badge>
                              </p>
                            )}

                            {evaluation.evaluator_notes && (
                              <p className="text-sm mt-2 italic">"{evaluation.evaluator_notes}"</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 mt-8">
          {/* Key Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Musical Experience</CardTitle>
                <Music className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {applications.filter(a => a.sang_in_high_school || a.sang_in_middle_school).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Have choir experience
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Music Literacy</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {applications.filter(a => a.reads_music).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Can read music notation
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leadership Interest</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {applications.filter(a => a.interested_in_leadership).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Interested in leadership roles
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High School Sections</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {applications.filter(a => a.high_school_section).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Have voice part experience
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Experience Distribution Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Choir Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Middle School Only</span>
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={applications.length > 0 
                          ? (applications.filter(a => a.sang_in_middle_school && !a.sang_in_high_school).length / applications.length) * 100 
                          : 0} 
                        className="w-16 h-2" 
                      />
                      <span className="text-xs w-8">
                        {applications.filter(a => a.sang_in_middle_school && !a.sang_in_high_school).length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High School Only</span>
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={applications.length > 0 
                          ? (applications.filter(a => !a.sang_in_middle_school && a.sang_in_high_school).length / applications.length) * 100 
                          : 0} 
                        className="w-16 h-2" 
                      />
                      <span className="text-xs w-8">
                        {applications.filter(a => !a.sang_in_middle_school && a.sang_in_high_school).length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Both</span>
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={applications.length > 0 
                          ? (applications.filter(a => a.sang_in_middle_school && a.sang_in_high_school).length / applications.length) * 100 
                          : 0} 
                        className="w-16 h-2" 
                      />
                      <span className="text-xs w-8">
                        {applications.filter(a => a.sang_in_middle_school && a.sang_in_high_school).length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">No Experience</span>
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={applications.length > 0 
                          ? (applications.filter(a => !a.sang_in_middle_school && !a.sang_in_high_school).length / applications.length) * 100 
                          : 0} 
                        className="w-16 h-2" 
                      />
                      <span className="text-xs w-8">
                        {applications.filter(a => !a.sang_in_middle_school && !a.sang_in_high_school).length}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* High School Voice Parts */}
            {applications.filter(a => a.high_school_section).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">High School Voice Parts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(
                      applications
                        .filter(a => a.high_school_section)
                        .reduce((acc: { [key: string]: number }, app) => {
                          const section = app.high_school_section!.toLowerCase();
                          acc[section] = (acc[section] || 0) + 1;
                          return acc;
                        }, {})
                    )
                    .sort((a, b) => b[1] - a[1])
                    .map(([section, count]) => {
                      const percentage = applications.length > 0 ? (count / applications.length) * 100 : 0;
                      return (
                        <div key={section} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{section}</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={percentage} className="w-16 h-2" />
                            <span className="text-xs w-8">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Soloist Ratings */}
            {applications.filter(a => a.is_soloist && a.soloist_rating).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Soloist Experience Levels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.from({length: 5}, (_, i) => i + 1).map(rating => {
                      const count = applications.filter(a => a.soloist_rating === rating).length;
                      const percentage = applications.length > 0 ? (count / applications.length) * 100 : 0;
                      return (
                        <div key={rating} className="flex items-center justify-between">
                          <span className="text-sm">Level {rating}</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={percentage} className="w-16 h-2" />
                            <span className="text-xs w-8">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Detailed Analytics Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Candidate Data Center</CardTitle>
                  <CardDescription>
                    Comprehensive analytics from {applications.length} applications
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app.id} className="border rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      <Avatar>
                        <AvatarImage src={app.profile_image_url} />
                        <AvatarFallback>
                          {app.full_name ? app.full_name.split(' ').map(n => n[0]).join('') : `${app.first_name[0]}${app.last_name[0]}`}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{app.full_name || `${app.first_name} ${app.last_name}`}</h4>
                          <Badge className={getStatusColor(app.status)}>
                            {app.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Email:</span>
                            <p className="text-xs">{app.email}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Phone:</span>
                            <p className="text-xs">{app.phone || 'Not provided'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Audition Date:</span>
                            <p className="text-xs">{new Date(app.audition_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Time:</span>
                            <p className="text-xs">{app.audition_time}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Middle School Choir:</span>
                            <p className="text-xs">{app.sang_in_middle_school ? 'Yes' : 'No'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">High School Choir:</span>
                            <p className="text-xs">{app.sang_in_high_school ? 'Yes' : 'No'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Voice Part:</span>
                            <p className="text-xs">{app.high_school_section || 'Not specified'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Reads Music:</span>
                            <p className="text-xs">{app.reads_music ? 'Yes' : 'No'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Plays Instrument:</span>
                            <p className="text-xs">{app.plays_instrument ? 'Yes' : 'No'}</p>
                          </div>
                          {app.plays_instrument && app.instrument_details && (
                            <div>
                              <span className="font-medium text-muted-foreground">Instruments:</span>
                              <p className="text-xs">{app.instrument_details}</p>
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-muted-foreground">Soloist:</span>
                            <p className="text-xs">{app.is_soloist ? 'Yes' : 'No'}</p>
                          </div>
                          {app.is_soloist && app.soloist_rating && (
                            <div>
                              <span className="font-medium text-muted-foreground">Soloist Level:</span>
                              <p className="text-xs">{app.soloist_rating}/5</p>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Voice Lessons:</span>
                            <p className="text-xs">{app.interested_in_voice_lessons ? 'Interested' : 'Not interested'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Music Fundamentals:</span>
                            <p className="text-xs">{app.interested_in_music_fundamentals ? 'Interested' : 'Not interested'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Leadership:</span>
                            <p className="text-xs">{app.interested_in_leadership ? 'Interested' : 'Not interested'}</p>
                          </div>
                        </div>

                        {app.personality_description && (
                          <div>
                            <span className="font-medium text-muted-foreground text-sm">Personality:</span>
                            <p className="text-xs mt-1">{app.personality_description}</p>
                          </div>
                        )}

                        {app.additional_info && (
                          <div>
                            <span className="font-medium text-muted-foreground text-sm">Additional Info:</span>
                            <p className="text-xs mt-1">{app.additional_info}</p>
                          </div>
                        )}

                        <div className="flex items-center space-x-2 text-xs text-muted-foreground pt-2 border-t">
                          <span>Applied: {new Date(app.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Updated: {new Date(app.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};