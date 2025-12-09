import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Music, ArrowLeft, Star, Award, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PerformanceEvent {
  id: string;
  title: string;
  start_date: string;
  location: string | null;
}

const EXEC_BOARD_POSITIONS = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Chaplain',
  'Historian',
  'Parliamentarian',
  'Social Chair',
  'Tour Manager',
  'Wardrobe Coordinator',
  'Music Librarian',
  'Section Leader',
];

const LEADERSHIP_PROGRAM_REQUIREMENTS = [
  'Minimum GPA of 2.5',
  'Good standing attendance record',
  'Submit an opening purpose statement',
  'Attend all 6 leadership program sessions (no excused absences)',
  'Deliver an election speech at the final session',
];

// Star Rating Component
const StarRating = ({ 
  value, 
  onChange, 
  label 
}: { 
  value: number | null; 
  onChange: (value: number) => void; 
  label: string;
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                (hovered !== null ? star <= hovered : star <= (value || 0))
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              )}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {value ? `${value}/5` : 'Not rated'}
        </span>
      </div>
    </div>
  );
};

const MemberExitInterview = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isDraft, setIsDraft] = useState(true);
  const [existingInterview, setExistingInterview] = useState<any>(null);
  const [performanceEvents, setPerformanceEvents] = useState<PerformanceEvent[]>([]);

  // Original form state
  const [performancesParticipated, setPerformancesParticipated] = useState<string[]>([]);
  const [performancesOther, setPerformancesOther] = useState('');
  const [execBoardWorkDone, setExecBoardWorkDone] = useState('');
  const [intentToContinue, setIntentToContinue] = useState<boolean | null>(null);
  const [intentToContinueNotes, setIntentToContinueNotes] = useState('');
  const [interestedInFallTour, setInterestedInFallTour] = useState<boolean | null>(null);
  const [interestedInAdvancedEnsemble, setInterestedInAdvancedEnsemble] = useState<boolean | null>(null);
  const [advancedEnsembleNotes, setAdvancedEnsembleNotes] = useState('');
  const [inOtherCampusShow, setInOtherCampusShow] = useState<boolean | null>(null);
  const [otherCampusShowDetails, setOtherCampusShowDetails] = useState('');
  const [interestedInPrivateLessons, setInterestedInPrivateLessons] = useState<boolean | null>(null);
  const [privateLessonsInstrument, setPrivateLessonsInstrument] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');

  // Satisfaction survey state
  const [satisfactionOverall, setSatisfactionOverall] = useState<number | null>(null);
  const [satisfactionRehearsals, setSatisfactionRehearsals] = useState<number | null>(null);
  const [satisfactionPerformances, setSatisfactionPerformances] = useState<number | null>(null);
  const [satisfactionLeadership, setSatisfactionLeadership] = useState<number | null>(null);
  const [satisfactionCommunication, setSatisfactionCommunication] = useState<number | null>(null);
  const [satisfactionCommunity, setSatisfactionCommunity] = useState<number | null>(null);
  const [whatWorkedWell, setWhatWorkedWell] = useState('');
  const [whatCouldImprove, setWhatCouldImprove] = useState('');
  const [suggestionsForNextSemester, setSuggestionsForNextSemester] = useState('');

  // Executive Board Candidacy state
  const [interestedInExecBoard, setInterestedInExecBoard] = useState<boolean | null>(null);
  const [execBoardPositionInterest, setExecBoardPositionInterest] = useState('');
  const [understandsLeadershipProgram, setUnderstandsLeadershipProgram] = useState(false);
  const [currentGpa, setCurrentGpa] = useState('');
  const [willingToSubmitPurposeStatement, setWillingToSubmitPurposeStatement] = useState<boolean | null>(null);
  const [canAttendAllSessions, setCanAttendAllSessions] = useState<boolean | null>(null);
  const [willingToGiveElectionSpeech, setWillingToGiveElectionSpeech] = useState<boolean | null>(null);
  const [leadershipProgramNotes, setLeadershipProgramNotes] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth?redirect=/member-exit-interview');
      return;
    }
    fetchPerformances();
    checkExistingInterview();
  }, [user, navigate]);

  const fetchPerformances = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_date, location')
        .eq('event_type', 'performance')
        .gte('start_date', '2025-08-01')
        .lte('start_date', '2025-12-31')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setPerformanceEvents(data || []);
    } catch (error) {
      console.error('Error fetching performances:', error);
    }
  };

  const checkExistingInterview = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('member_exit_interviews')
        .select('*')
        .eq('user_id', user.id)
        .eq('semester', 'Fall 2025')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingInterview(data);
        setIsDraft(data.is_draft !== false); // Default to draft if not explicitly false
        // Populate form with existing data
        setPerformancesParticipated(data.performances_participated || []);
        setPerformancesOther(data.performances_other || '');
        setExecBoardWorkDone(data.exec_board_work_done || '');
        setIntentToContinue(data.intent_to_continue);
        setIntentToContinueNotes(data.intent_to_continue_notes || '');
        setInterestedInFallTour(data.interested_in_fall_tour);
        setInterestedInAdvancedEnsemble(data.interested_in_advanced_ensemble);
        setAdvancedEnsembleNotes(data.advanced_ensemble_notes || '');
        setInOtherCampusShow(data.in_other_campus_show);
        setOtherCampusShowDetails(data.other_campus_show_details || '');
        setInterestedInPrivateLessons(data.interested_in_private_lessons);
        setPrivateLessonsInstrument(data.private_lessons_instrument || '');
        setAdditionalComments(data.additional_comments || '');
        
        // Satisfaction data
        setSatisfactionOverall(data.satisfaction_overall);
        setSatisfactionRehearsals(data.satisfaction_rehearsals);
        setSatisfactionPerformances(data.satisfaction_performances);
        setSatisfactionLeadership(data.satisfaction_leadership);
        setSatisfactionCommunication(data.satisfaction_communication);
        setSatisfactionCommunity(data.satisfaction_community);
        setWhatWorkedWell(data.what_worked_well || '');
        setWhatCouldImprove(data.what_could_improve || '');
        setSuggestionsForNextSemester(data.suggestions_for_next_semester || '');
        
        // Exec board candidacy data
        setInterestedInExecBoard(data.interested_in_exec_board);
        setExecBoardPositionInterest(data.exec_board_position_interest || '');
        setUnderstandsLeadershipProgram(data.understands_leadership_program || false);
        setCurrentGpa(data.current_gpa?.toString() || '');
        setWillingToSubmitPurposeStatement(data.willing_to_submit_purpose_statement);
        setCanAttendAllSessions(data.can_attend_all_sessions);
        setWillingToGiveElectionSpeech(data.willing_to_give_election_speech);
        setLeadershipProgramNotes(data.leadership_program_notes || '');
      }
    } catch (error) {
      console.error('Error checking existing interview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePerformanceToggle = (performance: string) => {
    setPerformancesParticipated(prev =>
      prev.includes(performance)
        ? prev.filter(p => p !== performance)
        : [...prev, performance]
    );
  };

  const getInterviewData = (isDraftSave: boolean) => ({
    user_id: user!.id,
    semester: 'Fall 2025',
    performances_participated: performancesParticipated,
    performances_other: performancesOther || null,
    exec_board_work_done: execBoardWorkDone || null,
    intent_to_continue: intentToContinue,
    intent_to_continue_notes: intentToContinueNotes || null,
    interested_in_fall_tour: interestedInFallTour,
    interested_in_advanced_ensemble: interestedInAdvancedEnsemble,
    advanced_ensemble_notes: advancedEnsembleNotes || null,
    in_other_campus_show: inOtherCampusShow,
    other_campus_show_details: otherCampusShowDetails || null,
    interested_in_private_lessons: interestedInPrivateLessons,
    private_lessons_instrument: privateLessonsInstrument || null,
    additional_comments: additionalComments || null,
    // Satisfaction fields
    satisfaction_overall: satisfactionOverall,
    satisfaction_rehearsals: satisfactionRehearsals,
    satisfaction_performances: satisfactionPerformances,
    satisfaction_leadership: satisfactionLeadership,
    satisfaction_communication: satisfactionCommunication,
    satisfaction_community: satisfactionCommunity,
    what_worked_well: whatWorkedWell || null,
    what_could_improve: whatCouldImprove || null,
    suggestions_for_next_semester: suggestionsForNextSemester || null,
    // Exec board candidacy fields
    interested_in_exec_board: interestedInExecBoard,
    exec_board_position_interest: execBoardPositionInterest || null,
    understands_leadership_program: understandsLeadershipProgram,
    current_gpa: currentGpa ? parseFloat(currentGpa) : null,
    willing_to_submit_purpose_statement: willingToSubmitPurposeStatement,
    can_attend_all_sessions: canAttendAllSessions,
    willing_to_give_election_speech: willingToGiveElectionSpeech,
    leadership_program_notes: leadershipProgramNotes || null,
    updated_at: new Date().toISOString(),
    is_draft: isDraftSave,
  });

  const handleSaveDraft = async () => {
    if (!user) return;

    setSavingDraft(true);

    try {
      const interviewData = getInterviewData(true);

      if (existingInterview) {
        const { error } = await supabase
          .from('member_exit_interviews')
          .update(interviewData)
          .eq('id', existingInterview.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('member_exit_interviews')
          .insert(interviewData)
          .select()
          .single();

        if (error) throw error;
        setExistingInterview(data);
      }

      setIsDraft(true);
      toast.success('Draft saved! You can continue later.');
    } catch (error: any) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);

    try {
      const interviewData = getInterviewData(false);

      if (existingInterview) {
        const { error } = await supabase
          .from('member_exit_interviews')
          .update(interviewData)
          .eq('id', existingInterview.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('member_exit_interviews')
          .insert(interviewData);

        if (error) throw error;
      }

      setSubmitted(true);
      toast.success('Exit interview submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting interview:', error);
      toast.error('Failed to submit interview. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please sign in to complete your exit interview.
            </p>
            <Button 
              className="w-full mt-4" 
              onClick={() => navigate('/auth?redirect=/member-exit-interview')}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-6">
              Your Fall 2025 exit interview has been submitted successfully.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Music className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              Fall 2025 Member Exit Interview
            </CardTitle>
            <CardDescription>
              Spelman College Glee Club End-of-Semester Survey
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* SECTION 1: Performances */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Music className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Performances & Activities</h3>
                </div>
                
                <div className="space-y-4">
                  <Label className="text-base font-medium">
                    Which performances did you participate in this semester?
                  </Label>
                  <div className="grid grid-cols-1 gap-3">
                    {performanceEvents.length > 0 ? (
                      performanceEvents.map((event) => {
                        const displayLabel = `${event.title}${event.start_date ? ` - ${format(new Date(event.start_date), 'MMM d, yyyy')}` : ''}`;
                        return (
                          <div key={event.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={event.id}
                              checked={performancesParticipated.includes(event.title)}
                              onCheckedChange={() => handlePerformanceToggle(event.title)}
                            />
                            <Label htmlFor={event.id} className="font-normal cursor-pointer">
                              {displayLabel}
                            </Label>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">Loading performances...</p>
                    )}
                  </div>
                  <div className="mt-2">
                    <Label htmlFor="performancesOther" className="text-sm text-muted-foreground">
                      Other performances (please specify):
                    </Label>
                    <Input
                      id="performancesOther"
                      value={performancesOther}
                      onChange={(e) => setPerformancesOther(e.target.value)}
                      placeholder="List any other performances..."
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="execBoardWork" className="text-base font-medium">
                    Executive Board Work Done (if any)
                  </Label>
                  <Textarea
                    id="execBoardWork"
                    value={execBoardWorkDone}
                    onChange={(e) => setExecBoardWorkDone(e.target.value)}
                    placeholder="Describe any executive board responsibilities or work you completed this semester..."
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              {/* SECTION 2: Satisfaction Survey */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <h3 className="text-lg font-semibold">Satisfaction Survey</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Please rate your experience this semester (1 = Poor, 5 = Excellent)
                </p>

                <div className="grid gap-4">
                  <StarRating
                    value={satisfactionOverall}
                    onChange={setSatisfactionOverall}
                    label="Overall Glee Club Experience"
                  />
                  <StarRating
                    value={satisfactionRehearsals}
                    onChange={setSatisfactionRehearsals}
                    label="Quality of Rehearsals"
                  />
                  <StarRating
                    value={satisfactionPerformances}
                    onChange={setSatisfactionPerformances}
                    label="Performance Opportunities"
                  />
                  <StarRating
                    value={satisfactionLeadership}
                    onChange={setSatisfactionLeadership}
                    label="Leadership & Direction"
                  />
                  <StarRating
                    value={satisfactionCommunication}
                    onChange={setSatisfactionCommunication}
                    label="Communication & Organization"
                  />
                  <StarRating
                    value={satisfactionCommunity}
                    onChange={setSatisfactionCommunity}
                    label="Sense of Community & Belonging"
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatWorkedWell" className="text-base font-medium">
                      What worked well this semester?
                    </Label>
                    <Textarea
                      id="whatWorkedWell"
                      value={whatWorkedWell}
                      onChange={(e) => setWhatWorkedWell(e.target.value)}
                      placeholder="Share what you enjoyed or found valuable..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatCouldImprove" className="text-base font-medium">
                      What could be improved?
                    </Label>
                    <Textarea
                      id="whatCouldImprove"
                      value={whatCouldImprove}
                      onChange={(e) => setWhatCouldImprove(e.target.value)}
                      placeholder="Share constructive feedback for improvement..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="suggestions" className="text-base font-medium">
                      Suggestions for next semester
                    </Label>
                    <Textarea
                      id="suggestions"
                      value={suggestionsForNextSemester}
                      onChange={(e) => setSuggestionsForNextSemester(e.target.value)}
                      placeholder="Any ideas or suggestions for Spring 2026..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* SECTION 3: Future Plans */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Future Plans</h3>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Do you intend to continue with the Glee Club in Spring 2026?
                  </Label>
                  <RadioGroup
                    value={intentToContinue === null ? '' : intentToContinue ? 'yes' : 'no'}
                    onValueChange={(value) => setIntentToContinue(value === 'yes')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="continue-yes" />
                      <Label htmlFor="continue-yes" className="font-normal cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="continue-no" />
                      <Label htmlFor="continue-no" className="font-normal cursor-pointer">No</Label>
                    </div>
                  </RadioGroup>
                  <Input
                    value={intentToContinueNotes}
                    onChange={(e) => setIntentToContinueNotes(e.target.value)}
                    placeholder="Any additional notes about your decision..."
                    className="mt-2"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Would you like to tour with the Glee Club during Fall Break 2025?
                  </Label>
                  <RadioGroup
                    value={interestedInFallTour === null ? '' : interestedInFallTour ? 'yes' : 'no'}
                    onValueChange={(value) => setInterestedInFallTour(value === 'yes')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="tour-yes" />
                      <Label htmlFor="tour-yes" className="font-normal cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="tour-no" />
                      <Label htmlFor="tour-no" className="font-normal cursor-pointer">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Would you like to be considered for the Advanced Singing Ensemble for Tour '26?
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Practice schedule will be determined after membership is confirmed.
                  </p>
                  <RadioGroup
                    value={interestedInAdvancedEnsemble === null ? '' : interestedInAdvancedEnsemble ? 'yes' : 'no'}
                    onValueChange={(value) => setInterestedInAdvancedEnsemble(value === 'yes')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="ensemble-yes" />
                      <Label htmlFor="ensemble-yes" className="font-normal cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="ensemble-no" />
                      <Label htmlFor="ensemble-no" className="font-normal cursor-pointer">No</Label>
                    </div>
                  </RadioGroup>
                  <Input
                    value={advancedEnsembleNotes}
                    onChange={(e) => setAdvancedEnsembleNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    className="mt-2"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Are you currently in another show on campus?
                  </Label>
                  <RadioGroup
                    value={inOtherCampusShow === null ? '' : inOtherCampusShow ? 'yes' : 'no'}
                    onValueChange={(value) => setInOtherCampusShow(value === 'yes')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="show-yes" />
                      <Label htmlFor="show-yes" className="font-normal cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="show-no" />
                      <Label htmlFor="show-no" className="font-normal cursor-pointer">No</Label>
                    </div>
                  </RadioGroup>
                  {inOtherCampusShow && (
                    <Input
                      value={otherCampusShowDetails}
                      onChange={(e) => setOtherCampusShowDetails(e.target.value)}
                      placeholder="Please specify the show name and your role..."
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Would you like to take private voice/instrument lessons in Spring 2026?
                  </Label>
                  <RadioGroup
                    value={interestedInPrivateLessons === null ? '' : interestedInPrivateLessons ? 'yes' : 'no'}
                    onValueChange={(value) => setInterestedInPrivateLessons(value === 'yes')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="lessons-yes" />
                      <Label htmlFor="lessons-yes" className="font-normal cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="lessons-no" />
                      <Label htmlFor="lessons-no" className="font-normal cursor-pointer">No</Label>
                    </div>
                  </RadioGroup>
                  {interestedInPrivateLessons && (
                    <Input
                      value={privateLessonsInstrument}
                      onChange={(e) => setPrivateLessonsInstrument(e.target.value)}
                      placeholder="Voice or specify instrument..."
                      className="mt-2"
                    />
                  )}
                </div>
              </div>

              <Separator />

              {/* SECTION 4: Executive Board Candidacy */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  <h3 className="text-lg font-semibold">Executive Board Candidacy - Fall 2026</h3>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Are you interested in running for an Executive Board position for Fall 2026?
                  </Label>
                  <RadioGroup
                    value={interestedInExecBoard === null ? '' : interestedInExecBoard ? 'yes' : 'no'}
                    onValueChange={(value) => setInterestedInExecBoard(value === 'yes')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="exec-yes" />
                      <Label htmlFor="exec-yes" className="font-normal cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="exec-no" />
                      <Label htmlFor="exec-no" className="font-normal cursor-pointer">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                {interestedInExecBoard && (
                  <div className="space-y-6 p-4 bg-muted/50 rounded-lg border">
                    <div className="space-y-3">
                      <Label className="text-base font-medium">
                        Which position(s) are you interested in?
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {EXEC_BOARD_POSITIONS.map((position) => (
                          <div key={position} className="flex items-center space-x-2">
                            <Checkbox
                              id={`pos-${position}`}
                              checked={execBoardPositionInterest.includes(position)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setExecBoardPositionInterest(prev => 
                                    prev ? `${prev}, ${position}` : position
                                  );
                                } else {
                                  setExecBoardPositionInterest(prev =>
                                    prev.split(', ').filter(p => p !== position).join(', ')
                                  );
                                }
                              }}
                            />
                            <Label htmlFor={`pos-${position}`} className="font-normal cursor-pointer text-sm">
                              {position}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Leadership Program Requirements */}
                    <Card className="border-amber-200 bg-amber-50/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          Leadership Program Requirements
                        </CardTitle>
                        <CardDescription>
                          To be eligible for election, you must complete the 6-session Leadership Program in Spring 2026
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {LEADERSHIP_PROGRAM_REQUIREMENTS.map((req, index) => (
                            <li key={index}>{req}</li>
                          ))}
                        </ul>
                        
                        <div className="flex items-center space-x-2 pt-2">
                          <Checkbox
                            id="understands-program"
                            checked={understandsLeadershipProgram}
                            onCheckedChange={(checked) => setUnderstandsLeadershipProgram(!!checked)}
                          />
                          <Label htmlFor="understands-program" className="text-sm font-medium cursor-pointer">
                            I understand and acknowledge these requirements
                          </Label>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-2">
                      <Label htmlFor="currentGpa" className="text-base font-medium">
                        Current GPA
                      </Label>
                      <Input
                        id="currentGpa"
                        type="number"
                        step="0.01"
                        min="0"
                        max="4"
                        value={currentGpa}
                        onChange={(e) => setCurrentGpa(e.target.value)}
                        placeholder="e.g., 3.25"
                        className="w-32"
                      />
                      <p className="text-sm text-muted-foreground">Minimum 2.5 GPA required</p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-medium">
                        Are you willing to submit an opening purpose statement?
                      </Label>
                      <RadioGroup
                        value={willingToSubmitPurposeStatement === null ? '' : willingToSubmitPurposeStatement ? 'yes' : 'no'}
                        onValueChange={(value) => setWillingToSubmitPurposeStatement(value === 'yes')}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="purpose-yes" />
                          <Label htmlFor="purpose-yes" className="font-normal cursor-pointer">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="purpose-no" />
                          <Label htmlFor="purpose-no" className="font-normal cursor-pointer">No</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-medium">
                        Can you commit to attending all 6 leadership sessions without excuse?
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Missing any session will disqualify you from running for office
                      </p>
                      <RadioGroup
                        value={canAttendAllSessions === null ? '' : canAttendAllSessions ? 'yes' : 'no'}
                        onValueChange={(value) => setCanAttendAllSessions(value === 'yes')}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="sessions-yes" />
                          <Label htmlFor="sessions-yes" className="font-normal cursor-pointer">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="sessions-no" />
                          <Label htmlFor="sessions-no" className="font-normal cursor-pointer">No</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-medium">
                        Are you willing to deliver an election speech at the final session?
                      </Label>
                      <RadioGroup
                        value={willingToGiveElectionSpeech === null ? '' : willingToGiveElectionSpeech ? 'yes' : 'no'}
                        onValueChange={(value) => setWillingToGiveElectionSpeech(value === 'yes')}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="speech-yes" />
                          <Label htmlFor="speech-yes" className="font-normal cursor-pointer">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="speech-no" />
                          <Label htmlFor="speech-no" className="font-normal cursor-pointer">No</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="leadershipNotes" className="text-base font-medium">
                        Additional notes about your candidacy
                      </Label>
                      <Textarea
                        id="leadershipNotes"
                        value={leadershipProgramNotes}
                        onChange={(e) => setLeadershipProgramNotes(e.target.value)}
                        placeholder="Any questions, concerns, or additional information..."
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Additional Comments */}
              <div className="space-y-2">
                <Label htmlFor="additionalComments" className="text-base font-semibold">
                  Additional Comments
                </Label>
                <Textarea
                  id="additionalComments"
                  value={additionalComments}
                  onChange={(e) => setAdditionalComments(e.target.value)}
                  placeholder="Any other feedback, suggestions, or comments..."
                  rows={4}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleSaveDraft}
                  disabled={savingDraft || submitting}
                >
                  {savingDraft ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Draft'
                  )}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting || savingDraft}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : existingInterview && !isDraft ? (
                    'Update Interview'
                  ) : (
                    'Submit Interview'
                  )}
                </Button>
              </div>

              {existingInterview && (
                <p className="text-sm text-center text-muted-foreground">
                  {isDraft 
                    ? 'You have a saved draft. Complete and submit when ready.'
                    : 'You previously submitted this interview. Your changes will update your existing response.'
                  }
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MemberExitInterview;
