import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  Brain,
  Save,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const StudentMidtermGrading = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [manualFeedback, setManualFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const [termsScore, setTermsScore] = useState<string>('');
  const [listeningScore, setListeningScore] = useState<string>('');
  const [essayScore, setEssayScore] = useState<string>('');
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  const parsedScores = () => ({
    terms: clamp(Number(termsScore || 0), 0, 40),
    listening: clamp(Number(listeningScore || 0), 0, 30),
    essay: clamp(Number(essayScore || 0), 0, 20),
  });
  const totalManual = () => {
    const p = parsedScores();
    return p.terms + p.listening + p.essay;
  };

  useEffect(() => {
    if (studentId) {
      fetchData();
    }
  }, [studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // @ts-ignore - Avoiding Supabase type complexity issue
      const submissionQuery = await (supabase
        .from('mus240_midterm_submissions')
        .select('*')
        .eq('user_id', studentId)
        .maybeSingle() as any);
      
      // @ts-ignore - Avoiding Supabase type complexity issue
      const profileQuery = await (supabase
        .from('gw_profiles')
        .select('full_name, email')
        .eq('user_id', studentId)
        .maybeSingle() as any);

      setSubmission(submissionQuery.data);
      setProfile(profileQuery.data);
      setManualFeedback(submissionQuery.data?.comprehensive_feedback || '');
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generateAIFeedback = async () => {
    if (!submission) return;

    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-comprehensive-feedback', {
        body: { submissionId: submission.id }
      });

      if (error) throw error;

      if (data.success) {
        await fetchData(); // Refresh to get the new feedback and grade
        toast.success('AI feedback and scoring generated successfully');
      } else {
        throw new Error(data.error || 'Failed to generate feedback');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate AI feedback');
    } finally {
      setAiGenerating(false);
    }
  };

  const saveFeedback = async () => {
    if (!submission) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('mus240_midterm_submissions')
        .update({ comprehensive_feedback: manualFeedback })
        .eq('id', submission.id);

      if (error) throw error;

      toast.success('Feedback saved successfully');
      setSubmission({ ...submission, comprehensive_feedback: manualFeedback });
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save feedback');
    } finally {
      setSaving(false);
    }
  };

  const saveManualGrade = async () => {
    if (!submission) return;

    setSaving(true);
    try {
      const total = totalManual();
      const { error } = await supabase
        .from('mus240_midterm_submissions')
        .update({
          grade: total,
          graded_by: user?.id ?? null,
          graded_at: new Date().toISOString()
        })
        .eq('id', submission.id);

      if (error) throw error;
      toast.success('Manual grade saved');
      setSubmission({ ...submission, grade: total, graded_by: user?.id, graded_at: new Date().toISOString() });
    } catch (error) {
      console.error('Save manual grade error:', error);
      toast.error('Failed to save manual grade');
    } finally {
      setSaving(false);
    }
  };

  const calculateLetterGrade = (score: number) => {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 65) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
  };

  const getLetterGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': case 'A-': return 'bg-green-100 text-green-800';
      case 'B+': case 'B': case 'B-': return 'bg-blue-100 text-blue-800';
      case 'C+': case 'C': case 'C-': return 'bg-yellow-100 text-yellow-800';
      case 'D+': case 'D': case 'D-': return 'bg-orange-100 text-orange-800';
      case 'F': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-lg">Loading student submission...</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/classes/mus240/instructor')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Submission Found</h2>
            <p className="text-gray-500">This student hasn't submitted their midterm exam yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/classes/mus240/instructor')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Info & Grade Summary */}
          <div className="space-y-6">
            {/* Student Profile */}
            <Card className="border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'ST'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {profile?.full_name || 'Name not provided'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {profile?.email}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Submitted: {new Date(submission.submitted_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>Time: {new Date(submission.submitted_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grade Summary */}
            <Card className="border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Grade Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {submission.grade ?? 0}/100
                  </div>
                  {/* Note: letter_grade column doesn't exist in this table */}
                  {submission.grade != null && (
                    <Badge className={getLetterGradeColor(calculateLetterGrade(submission.grade))}>
                      {calculateLetterGrade(submission.grade)}
                    </Badge>
                  )}
                  {submission.grade == null && (
                    <p className="text-xs text-muted-foreground mt-2">No score yet — Generate AI feedback or enter scores below.</p>
                  )}
                </div>

                {/* Manual Scoring */}
                <div className="space-y-3">
                  <h4 className="font-medium">Manual Scoring (Instructor)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Terms (0–40)</label>
                      <Input type="number" min={0} max={40} value={termsScore} onChange={(e) => setTermsScore(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Listening (0–30)</label>
                      <Input type="number" min={0} max={30} value={listeningScore} onChange={(e) => setListeningScore(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Essay (0–20)</label>
                      <Input type="number" min={0} max={20} value={essayScore} onChange={(e) => setEssayScore(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total: <strong>{totalManual()}/100</strong></span>
                    <Button size="sm" onClick={saveManualGrade} disabled={saving}>Save Manual Grade</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Writing Evaluation */}
            <Card className="border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Writing Evaluation
                  </CardTitle>
                  <Button
                    onClick={generateAIFeedback}
                    disabled={aiGenerating}
                    size="sm"
                    variant="outline"
                  >
                    {aiGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Generate AI Feedback
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={manualFeedback}
                  onChange={(e) => setManualFeedback(e.target.value)}
                  placeholder="AI-generated or manual feedback will appear here..."
                  className="min-h-[300px] bg-white/50"
                  rows={12}
                />
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={saveFeedback}
                    disabled={saving || !manualFeedback.trim()}
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Feedback
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Student Submission Content */}
            <Card className="border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Student Answers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white/50 rounded-lg p-4 max-h-96 overflow-y-auto space-y-4">
                  {submission.negro_spiritual_answer && (
                    <div className="border-b pb-3">
                      <h4 className="font-medium mb-2">Negro Spiritual</h4>
                      <p className="text-sm text-gray-700">{submission.negro_spiritual_answer}</p>
                    </div>
                  )}
                  {submission.field_holler_answer && (
                    <div className="border-b pb-3">
                      <h4 className="font-medium mb-2">Field Holler</h4>
                      <p className="text-sm text-gray-700">{submission.field_holler_answer}</p>
                    </div>
                  )}
                  {submission.ring_shout_answer && (
                    <div className="border-b pb-3">
                      <h4 className="font-medium mb-2">Ring Shout</h4>
                      <p className="text-sm text-gray-700">{submission.ring_shout_answer}</p>
                    </div>
                  )}
                  {submission.blues_answer && (
                    <div className="border-b pb-3">
                      <h4 className="font-medium mb-2">Blues</h4>
                      <p className="text-sm text-gray-700">{submission.blues_answer}</p>
                    </div>
                  )}
                  {submission.essay_answer && (
                    <div>
                      <h4 className="font-medium mb-2">Essay Answer</h4>
                      <p className="text-sm text-gray-700">{submission.essay_answer}</p>
                    </div>
                  )}
                  {!submission.negro_spiritual_answer && !submission.field_holler_answer && 
                   !submission.ring_shout_answer && !submission.blues_answer && !submission.essay_answer && (
                    <p className="text-gray-500">No submission content available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};