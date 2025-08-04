import { useState, useEffect } from "react";
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
  Download
} from "lucide-react";

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
  phone?: string;
  audition_date: string;
  audition_time: string;
  status: string;
  created_at: string;
  sang_in_middle_school?: boolean;
  sang_in_high_school?: boolean;
  plays_instrument?: boolean;
  instrument_details?: string;
  is_soloist?: boolean;
  reads_music?: boolean;
  interested_in_voice_lessons?: boolean;
  personality_description?: string;
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
  const [activeTab, setActiveTab] = useState("overview");
  const [sessions, setSessions] = useState<AuditionSession[]>([]);
  const [applications, setApplications] = useState<AuditionApplication[]>([]);
  const [evaluations, setEvaluations] = useState<AuditionEvaluation[]>([]);
  const [analytics, setAnalytics] = useState<AuditionAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<AuditionApplication | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [evaluationForm, setEvaluationForm] = useState<Partial<AuditionEvaluation>>({});

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
      
      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('audition_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Fetch applications from gw_auditions table
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
          sang_in_middle_school,
          sang_in_high_school,
          plays_instrument,
          instrument_details,
          is_soloist,
          reads_music,
          interested_in_voice_lessons,
          personality_description,
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

      // Fetch evaluations
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('audition_evaluations')
        .select('*')
        .order('evaluation_date', { ascending: false });

      if (evaluationsError) throw evaluationsError;
      setEvaluations(evaluationsData || []);

      // Fetch analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('audition_analytics')
        .select('*')
        .order('application_date', { ascending: false });

      if (analyticsError) throw analyticsError;
      setAnalytics(analyticsData || []);

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

  const filteredApplications = applications; // Remove session filtering since gw_auditions doesn't have session_id

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Auditions Management</h2>
          <p className="text-muted-foreground">Manage audition sessions, applications, and evaluations</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Sessions</SelectItem>
              {sessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="roster">Applicant Roster</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
          <TabsTrigger value="analytics">Data Center</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <TabsContent value="sessions" className="space-y-6">
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

        <TabsContent value="roster" className="space-y-6">
          <div className="grid gap-4">
            {filteredApplications.map((application) => (
              <Card key={application.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={application.profile_image_url} />
                      <AvatarFallback className="text-lg">
                        {application.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{application.full_name}</h3>
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

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3" />
                          <span>{application.email}</span>
                        </div>
                        {application.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{application.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(application.audition_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{application.audition_time}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-2">
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
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Summary</CardTitle>
              <CardDescription>Overview of all audition evaluations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {evaluations.map((evaluation) => {
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
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Voice Part Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'].map((part) => {
                    const count = analytics.filter(app => app.voice_part_preference === part).length;
                    const percentage = analytics.length > 0 ? (count / analytics.length) * 100 : 0;
                    return (
                      <div key={part} className="flex items-center justify-between">
                        <Badge className={getVoicePartColor(part)}>{part}</Badge>
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

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Academic Year Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['freshman', 'sophomore', 'junior', 'senior', 'graduate'].map((year) => {
                    const count = analytics.filter(app => app.academic_year === year).length;
                    const percentage = analytics.length > 0 ? (count / analytics.length) * 100 : 0;
                    return (
                      <div key={year} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{year}</span>
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

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Technical</span>
                    <span className="text-sm font-medium">
                      {analytics.length > 0 
                        ? (analytics.reduce((sum, app) => sum + (app.avg_technical_score || 0), 0) / analytics.filter(app => app.avg_technical_score).length).toFixed(1)
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Artistic</span>
                    <span className="text-sm font-medium">
                      {analytics.length > 0 
                        ? (analytics.reduce((sum, app) => sum + (app.avg_artistic_score || 0), 0) / analytics.filter(app => app.avg_artistic_score).length).toFixed(1)
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Overall</span>
                    <span className="text-sm font-medium">
                      {analytics.length > 0 
                        ? (analytics.reduce((sum, app) => sum + (app.avg_overall_score || 0), 0) / analytics.filter(app => app.avg_overall_score).length).toFixed(1)
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Candidate Analytics</CardTitle>
                  <CardDescription>Detailed data on all audition candidates</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.map((candidate) => (
                  <div key={candidate.id} className="border rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      <Avatar>
                        <AvatarImage src={candidate.profile_image_url} />
                        <AvatarFallback>
                          {candidate.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{candidate.full_name}</h4>
                          <Badge className={getStatusColor(candidate.status)}>
                            {candidate.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Academic Year:</span>
                            <p className="capitalize">{candidate.academic_year || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="font-medium">Major:</span>
                            <p>{candidate.major || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="font-medium">GPA:</span>
                            <p>{candidate.gpa || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="font-medium">Voice Training:</span>
                            <p>{candidate.years_of_vocal_training ? `${candidate.years_of_vocal_training} years` : 'N/A'}</p>
                          </div>
                        </div>

                        {candidate.avg_overall_score && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>Average Score</span>
                              <span>{candidate.avg_overall_score.toFixed(1)}/10</span>
                            </div>
                            <Progress value={candidate.avg_overall_score * 10} className="h-2" />
                          </div>
                        )}

                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>Evaluations: {candidate.evaluation_count}</span>
                          {candidate.most_common_recommendation && (
                            <>
                              <span>•</span>
                              <span>Recommendation: {candidate.most_common_recommendation.replace('_', ' ')}</span>
                            </>
                          )}
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