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

  const loadExistingScores = async () => {
    if (!submission?.id) return;
    
    try {
      const { data: grades, error } = await supabase
        .from('mus240_submission_grades')
        .select('*')
        .eq('submission_id', submission.id)
        .not('graded_by', 'is', null);
      
      if (error) throw error;
      
      if (grades && grades.length > 0) {
        const newTermScores: any = {};
        const newListeningScores: any = {};
        let newEssayScore = '';
        
        grades.forEach(grade => {
          if (grade.question_type === 'term_definition') {
            newTermScores[grade.question_id] = grade.instructor_score?.toString() || '';
          } else if (grade.question_type === 'listening_analysis') {
            newListeningScores[grade.question_id] = grade.instructor_score?.toString() || '';
          } else if (grade.question_type === 'essay') {
            newEssayScore = grade.instructor_score?.toString() || '';
          }
        });
        
        setTermScores(newTermScores);
        setListeningScores(newListeningScores);
        setEssayScore(newEssayScore);
      }
    } catch (error) {
      console.error('Error loading existing scores:', error);
    }
  };

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
      
      // Load existing detailed scores if submission exists
      if (submissionQuery.data) {
        // Add a small delay to ensure state is set
        setTimeout(() => loadExistingScores(), 100);
      }
      
      // Debug: Log submission data to console
      console.log('Submission data:', submissionQuery.data);
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
      
      // Save individual scores to mus240_submission_grades table
      const gradeEntries = [];
      
      // Term definition scores
      Object.entries(termScores).forEach(([term, score]) => {
        if (score) {
          gradeEntries.push({
            submission_id: submission.id,
            question_type: 'term_definition',
            question_id: term,
            instructor_score: parseFloat(score),
            graded_by: user?.id,
            graded_at: new Date().toISOString()
          });
        }
      });
      
      // Listening analysis scores
      Object.entries(listeningScores).forEach(([excerpt, score]) => {
        if (score) {
          gradeEntries.push({
            submission_id: submission.id,
            question_type: 'listening_analysis',
            question_id: excerpt,
            instructor_score: parseFloat(score),
            graded_by: user?.id,
            graded_at: new Date().toISOString()
          });
        }
      });
      
      // Essay score
      if (essayScore) {
        gradeEntries.push({
          submission_id: submission.id,
          question_type: 'essay',
          question_id: 'essay_response',
          instructor_score: parseFloat(essayScore),
          graded_by: user?.id,
          graded_at: new Date().toISOString()
        });
      }
      
      // Delete existing manual grades for this submission
      await supabase
        .from('mus240_submission_grades')
        .delete()
        .eq('submission_id', submission.id)
        .not('graded_by', 'is', null);
      
      // Insert new manual grades
      if (gradeEntries.length > 0) {
        const { error: gradesError } = await supabase
          .from('mus240_submission_grades')
          .insert(gradeEntries);
        
        if (gradesError) throw gradesError;
      }
      
      // Update main submission record
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
                <CardTitle>Grade Control Panel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Final Grade Display */}
                <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {calculateTotalScore()}/85
                  </div>
                  {calculateTotalScore() > 0 && (
                    <Badge className={getLetterGradeColor(calculateLetterGrade(calculateTotalScore()))}>
                      {calculateLetterGrade(calculateTotalScore())}
                    </Badge>
                  )}
                  {calculateTotalScore() === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">No scores entered yet</p>
                  )}
                </div>

                {/* Score Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-medium">Score Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Terms ({Object.values(termScores).reduce((sum, score) => sum + clamp(Number(score || 0), 0, 10), 0)}/20)</span>
                      <span className="font-mono">{Object.values(termScores).reduce((sum, score) => sum + clamp(Number(score || 0), 0, 10), 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Listening ({Object.values(listeningScores).reduce((sum, score) => sum + clamp(Number(score || 0), 0, 15), 0)}/45)</span>
                      <span className="font-mono">{Object.values(listeningScores).reduce((sum, score) => sum + clamp(Number(score || 0), 0, 15), 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Essay ({clamp(Number(essayScore || 0), 0, 20)}/20)</span>
                      <span className="font-mono">{clamp(Number(essayScore || 0), 0, 20)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Current Total</span>
                      <span className="font-mono">{calculateTotalScore()}/85</span>
                    </div>
                  </div>
                </div>

                {/* Grade Controls */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={saveManualGrade} 
                      disabled={saving} 
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Grade'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setTermScores({});
                        setListeningScores({});
                        setEssayScore('');
                      }}
                      className="px-3"
                    >
                      Clear
                    </Button>
                  </div>
                  
                  {/* Quick Grade Buttons */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Quick Grade:</p>
                    <div className="grid grid-cols-3 gap-1">
                      {[90, 85, 80, 75, 70, 65].map(grade => (
                        <Button
                          key={grade}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const percentage = grade / 100;
                            // 20 points for terms (2 terms × 10 pts each)
                            const termScore = Math.round(10 * percentage);
                            // 45 points for listening (3 excerpts × 15 pts each)  
                            const listeningScore = Math.round(15 * percentage);
                            // 20 points for essay
                            const essayTotal = Math.round(20 * percentage);
                            
                            // Only set scores for the first 2 term definitions
                            const termKeys = Object.keys(termScores);
                            const newTermScores: any = {};
                            termKeys.slice(0, 2).forEach(key => {
                              newTermScores[key] = termScore.toString();
                            });
                            setTermScores(newTermScores);
                            setListeningScores({
                              listening_1: listeningScore.toString(),
                              listening_2: listeningScore.toString(),
                              listening_3: listeningScore.toString()
                            });
                            setEssayScore(essayTotal.toString());
                          }}
                          className="text-xs"
                        >
                          {grade}%
                        </Button>
                      ))}
                    </div>
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
                  Term Definitions (20 points total)
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
                {/* Excerpt 1 - Show even if no answer */}
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
                          {submission.excerpt_1_answer || submission.listening_1_answer || submission.listening_analysis_1 || 'No answer provided'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 min-w-[80px]">
                      <label className="text-xs font-medium text-muted-foreground">Score</label>
                      <Input
                        type="number"
                        min={0}
                        max={15}
                        value={listeningScores.listening_1 || ''}
                        onChange={(e) => setListeningScores({...listeningScores, listening_1: e.target.value})}
                        className="w-16 text-center font-mono"
                        placeholder="0"
                      />
                      <span className="text-xs text-muted-foreground">/15</span>
                    </div>
                  </div>
                </div>

                {/* Excerpt 2 - Show even if no answer */}
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
                          {submission.excerpt_2_answer || submission.listening_2_answer || submission.listening_analysis_2 || 'No answer provided'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 min-w-[80px]">
                      <label className="text-xs font-medium text-muted-foreground">Score</label>
                      <Input
                        type="number"
                        min={0}
                        max={15}
                        value={listeningScores.listening_2 || ''}
                        onChange={(e) => setListeningScores({...listeningScores, listening_2: e.target.value})}
                        className="w-16 text-center font-mono"
                        placeholder="0"
                      />
                      <span className="text-xs text-muted-foreground">/15</span>
                    </div>
                  </div>
                </div>
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