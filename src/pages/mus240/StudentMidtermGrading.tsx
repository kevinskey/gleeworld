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
  
  // Individual question scores
  const [termScores, setTermScores] = useState<{[key: string]: string}>({});
  const [listeningScores, setListeningScores] = useState<{[key: string]: string}>({});
  const [essayScore, setEssayScore] = useState<string>('');
  
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  
  const calculateTotalScore = () => {
    const termTotal = Object.values(termScores).reduce((sum, score) => sum + clamp(Number(score || 0), 0, 10), 0);
    const listeningTotal = Object.values(listeningScores).reduce((sum, score) => sum + clamp(Number(score || 0), 0, 15), 0);
    const essayTotal = clamp(Number(essayScore || 0), 0, 20);
    return termTotal + listeningTotal + essayTotal;
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
      const total = calculateTotalScore();
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
                  {submission.grade != null && (
                    <Badge className={getLetterGradeColor(calculateLetterGrade(submission.grade))}>
                      {calculateLetterGrade(submission.grade)}
                    </Badge>
                  )}
                  {submission.grade == null && (
                    <p className="text-xs text-muted-foreground mt-2">No score yet — Generate AI feedback or enter scores below.</p>
                  )}
                </div>

                {/* Current Total Score */}
                <div className="space-y-3">
                  <h4 className="font-medium">Current Total Score</h4>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {calculateTotalScore()}/100
                    </div>
                    <Button size="sm" onClick={saveManualGrade} disabled={saving} className="mt-2">
                      {saving ? 'Saving...' : 'Save All Grades'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Student Answers with Inline Grading */}
          <div className="lg:col-span-2 space-y-6">
            {/* Terms Section */}
            <Card className="border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Term Definitions (40 points total)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {submission.negro_spiritual_answer && (
                  <div className="border border-border/50 rounded-lg p-4 bg-background/30">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
                          <h4 className="font-semibold text-primary mb-2">Question:</h4>
                          <p className="text-sm text-foreground/80 italic">
                            Define and explain the cultural significance of the Negro Spiritual. Include its historical context, musical characteristics, and role in African American culture.
                          </p>
                        </div>
                        <h4 className="font-semibold text-foreground mb-3">Student Answer:</h4>
                        <div className="prose prose-sm max-w-none">
                          <p className="leading-relaxed text-foreground/90 bg-background/50 p-4 rounded-md border border-border/30">
                            {submission.negro_spiritual_answer}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 min-w-[80px]">
                        <label className="text-xs font-medium text-muted-foreground">Score</label>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={termScores.negro_spiritual || ''}
                          onChange={(e) => setTermScores({...termScores, negro_spiritual: e.target.value})}
                          className="w-16 text-center font-mono"
                          placeholder="0"
                        />
                        <span className="text-xs text-muted-foreground">/10</span>
                      </div>
                    </div>
                  </div>
                )}

                {submission.field_holler_answer && (
                  <div className="border border-border/50 rounded-lg p-4 bg-background/30">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
                          <h4 className="font-semibold text-primary mb-2">Question:</h4>
                          <p className="text-sm text-foreground/80 italic">
                            Define and explain the cultural significance of the Field Holler. Include its historical context, musical characteristics, and influence on later musical forms.
                          </p>
                        </div>
                        <h4 className="font-semibold text-foreground mb-3">Student Answer:</h4>
                        <div className="prose prose-sm max-w-none">
                          <p className="leading-relaxed text-foreground/90 bg-background/50 p-4 rounded-md border border-border/30">
                            {submission.field_holler_answer}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 min-w-[80px]">
                        <label className="text-xs font-medium text-muted-foreground">Score</label>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={termScores.field_holler || ''}
                          onChange={(e) => setTermScores({...termScores, field_holler: e.target.value})}
                          className="w-16 text-center font-mono"
                          placeholder="0"
                        />
                        <span className="text-xs text-muted-foreground">/10</span>
                      </div>
                    </div>
                  </div>
                )}

                {submission.ring_shout_answer && (
                  <div className="border border-border/50 rounded-lg p-4 bg-background/30">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
                          <h4 className="font-semibold text-primary mb-2">Question:</h4>
                          <p className="text-sm text-foreground/80 italic">
                            Define and explain the cultural significance of the Ring Shout. Include its historical context, ritual elements, and role in preserving African traditions.
                          </p>
                        </div>
                        <h4 className="font-semibold text-foreground mb-3">Student Answer:</h4>
                        <div className="prose prose-sm max-w-none">
                          <p className="leading-relaxed text-foreground/90 bg-background/50 p-4 rounded-md border border-border/30">
                            {submission.ring_shout_answer}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 min-w-[80px]">
                        <label className="text-xs font-medium text-muted-foreground">Score</label>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={termScores.ring_shout || ''}
                          onChange={(e) => setTermScores({...termScores, ring_shout: e.target.value})}
                          className="w-16 text-center font-mono"
                          placeholder="0"
                        />
                        <span className="text-xs text-muted-foreground">/10</span>
                      </div>
                    </div>
                  </div>
                )}

                {submission.blues_answer && (
                  <div className="border border-border/50 rounded-lg p-4 bg-background/30">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
                          <h4 className="font-semibold text-primary mb-2">Question:</h4>
                          <p className="text-sm text-foreground/80 italic">
                            Define and explain the cultural significance of the Blues. Include its historical context, musical structure, and influence on American music.
                          </p>
                        </div>
                        <h4 className="font-semibold text-foreground mb-3">Student Answer:</h4>
                        <div className="prose prose-sm max-w-none">
                          <p className="leading-relaxed text-foreground/90 bg-background/50 p-4 rounded-md border border-border/30">
                            {submission.blues_answer}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 min-w-[80px]">
                        <label className="text-xs font-medium text-muted-foreground">Score</label>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={termScores.blues || ''}
                          onChange={(e) => setTermScores({...termScores, blues: e.target.value})}
                          className="w-16 text-center font-mono"
                          placeholder="0"
                        />
                        <span className="text-xs text-muted-foreground">/10</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Listening Analysis Section */}
            <Card className="border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Listening Analysis (30 points total)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {submission.excerpt_1_answer && (
                  <div className="border border-border/50 rounded-lg p-4 bg-background/30">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
                          <h4 className="font-semibold text-primary mb-2">Question:</h4>
                          <p className="text-sm text-foreground/80 italic">
                            Listen to Excerpt 1 and identify the genre, musical features, and historical context. Discuss the significance of this piece in African American music history.
                          </p>
                        </div>
                        <h4 className="font-semibold text-foreground mb-3">Student Answer:</h4>
                        <div className="prose prose-sm max-w-none">
                          <p className="leading-relaxed text-foreground/90 bg-background/50 p-4 rounded-md border border-border/30">
                            {submission.excerpt_1_answer}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 min-w-[80px]">
                        <label className="text-xs font-medium text-muted-foreground">Score</label>
                        <Input
                          type="number"
                          min={0}
                          max={15}
                          value={listeningScores.excerpt_1 || ''}
                          onChange={(e) => setListeningScores({...listeningScores, excerpt_1: e.target.value})}
                          className="w-16 text-center font-mono"
                          placeholder="0"
                        />
                        <span className="text-xs text-muted-foreground">/15</span>
                      </div>
                    </div>
                  </div>
                )}

                {submission.excerpt_2_answer && (
                  <div className="border border-border/50 rounded-lg p-4 bg-background/30">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
                          <h4 className="font-semibold text-primary mb-2">Question:</h4>
                          <p className="text-sm text-foreground/80 italic">
                            Listen to Excerpt 2 and identify the genre, musical features, and historical context. Analyze how this piece demonstrates key characteristics of its musical tradition.
                          </p>
                        </div>
                        <h4 className="font-semibold text-foreground mb-3">Student Answer:</h4>
                        <div className="prose prose-sm max-w-none">
                          <p className="leading-relaxed text-foreground/90 bg-background/50 p-4 rounded-md border border-border/30">
                            {submission.excerpt_2_answer}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 min-w-[80px]">
                        <label className="text-xs font-medium text-muted-foreground">Score</label>
                        <Input
                          type="number"
                          min={0}
                          max={15}
                          value={listeningScores.excerpt_2 || ''}
                          onChange={(e) => setListeningScores({...listeningScores, excerpt_2: e.target.value})}
                          className="w-16 text-center font-mono"
                          placeholder="0"
                        />
                        <span className="text-xs text-muted-foreground">/15</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Essay Section */}
            {submission.essay_answer && (
              <Card className="border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Essay Question (20 points)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border border-border/50 rounded-lg p-4 bg-background/30">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
                          <h4 className="font-semibold text-primary mb-2">Question:</h4>
                          <p className="text-sm text-foreground/80 italic">
                            Write an essay discussing the evolution and interconnections between the musical forms studied in this course. Choose at least three forms and analyze how they influenced each other and contributed to the development of African American musical traditions.
                          </p>
                        </div>
                        <h4 className="font-semibold text-foreground mb-3">Student Answer:</h4>
                        <div className="prose prose-sm max-w-none">
                          <p className="leading-relaxed text-foreground/90 bg-background/50 p-4 rounded-md border border-border/30 whitespace-pre-wrap">
                            {submission.essay_answer}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 min-w-[80px]">
                        <label className="text-xs font-medium text-muted-foreground">Score</label>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={essayScore}
                          onChange={(e) => setEssayScore(e.target.value)}
                          className="w-16 text-center font-mono"
                          placeholder="0"
                        />
                        <span className="text-xs text-muted-foreground">/20</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Feedback Section */}
            <Card className="border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Overall Feedback
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
                  className="min-h-[200px] bg-background/50"
                  rows={8}
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
          </div>
        </div>
      </div>
    </div>
  );
};