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
import { toast } from 'sonner';
import { Loader2, CheckCircle, Music, ArrowLeft } from 'lucide-react';

const FALL_2025_PERFORMANCES = [
  'Founder\'s Day Convocation',
  'Homecoming Concert',
  'Fall Choral Concert',
  'Community Outreach Performance',
  'Holiday Concert',
  'Special Campus Events',
];

const MemberExitInterview = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingInterview, setExistingInterview] = useState<any>(null);

  // Form state
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

  useEffect(() => {
    if (!user) {
      navigate('/auth?redirect=/member-exit-interview');
      return;
    }
    checkExistingInterview();
  }, [user, navigate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);

    try {
      const interviewData = {
        user_id: user.id,
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
        updated_at: new Date().toISOString(),
      };

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
              {/* Performances Participated */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Which performances did you participate in this semester?
                </Label>
                <div className="grid grid-cols-1 gap-3">
                  {FALL_2025_PERFORMANCES.map((performance) => (
                    <div key={performance} className="flex items-center space-x-2">
                      <Checkbox
                        id={performance}
                        checked={performancesParticipated.includes(performance)}
                        onCheckedChange={() => handlePerformanceToggle(performance)}
                      />
                      <Label htmlFor={performance} className="font-normal cursor-pointer">
                        {performance}
                      </Label>
                    </div>
                  ))}
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

              {/* Exec Board Work */}
              <div className="space-y-2">
                <Label htmlFor="execBoardWork" className="text-base font-semibold">
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

              {/* Intent to Continue */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
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

              {/* Fall Tour Interest */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
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

              {/* Advanced Ensemble Interest */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
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

              {/* Other Campus Shows */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
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

              {/* Private Lessons Interest */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
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

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : existingInterview ? (
                  'Update Interview'
                ) : (
                  'Submit Interview'
                )}
              </Button>

              {existingInterview && (
                <p className="text-sm text-center text-muted-foreground">
                  You previously submitted this interview. Your changes will update your existing response.
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
