import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Award,
  ChevronDown,
  Save,
  Sparkles,
  User,
  FileText,
  MessageSquare,
  Users as UsersIcon,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GradingPanelProps {
  discussionId: string;
  rubric: any[];
  posts: any[];
  students: any[];
  grades: any[];
  onRefresh: () => void;
}

interface StudentGrade {
  student_id: string;
  individual_score: number;
  peer_score: number;
  synthesis_score: number;
  professionalism_score: number;
  instructor_feedback: string;
}

export const GradingPanel: React.FC<GradingPanelProps> = ({
  discussionId,
  rubric,
  posts,
  students,
  grades,
  onRefresh
}) => {
  const { toast } = useToast();
  const [studentGrades, setStudentGrades] = useState<Record<string, StudentGrade>>({});
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [isAiScoring, setIsAiScoring] = useState(false);

  // Initialize grades from existing data
  useEffect(() => {
    const gradeMap: Record<string, StudentGrade> = {};
    grades.forEach(g => {
      gradeMap[g.student_id] = {
        student_id: g.student_id,
        individual_score: g.individual_score || 0,
        peer_score: g.peer_score || 0,
        synthesis_score: g.synthesis_score || 0,
        professionalism_score: g.professionalism_score || 0,
        instructor_feedback: g.instructor_feedback || ''
      };
    });
    
    // Initialize empty grades for ungraded students
    students.forEach(s => {
      if (!gradeMap[s.user_id]) {
        gradeMap[s.user_id] = {
          student_id: s.user_id,
          individual_score: 0,
          peer_score: 0,
          synthesis_score: 0,
          professionalism_score: 0,
          instructor_feedback: ''
        };
      }
    });
    
    setStudentGrades(gradeMap);
  }, [grades, students]);

  const getStudentPosts = (studentId: string) => {
    return posts.filter(p => p.author_id === studentId);
  };

  const calculateTotalScore = (grade: StudentGrade) => {
    return (
      (grade.individual_score * 0.4) +
      (grade.peer_score * 0.3) +
      (grade.synthesis_score * 0.2) +
      (grade.professionalism_score * 0.1)
    );
  };

  const updateGrade = (studentId: string, field: keyof StudentGrade, value: number | string) => {
    setStudentGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const saveGrade = async (studentId: string) => {
    const grade = studentGrades[studentId];
    if (!grade) return;

    try {
      await supabase.from('discussion_grades').upsert({
        discussion_id: discussionId,
        student_id: studentId,
        individual_score: grade.individual_score,
        peer_score: grade.peer_score,
        synthesis_score: grade.synthesis_score,
        professionalism_score: grade.professionalism_score,
        instructor_feedback: grade.instructor_feedback
      }, { onConflict: 'discussion_id,student_id' });

      toast({ title: 'Grade Saved', description: 'Student grade has been updated' });
      onRefresh();
    } catch (error) {
      console.error('Save grade error:', error);
      toast({ title: 'Error', description: 'Failed to save grade', variant: 'destructive' });
    }
  };

  const runAiPreScoring = async () => {
    setIsAiScoring(true);
    
    // Simulate AI scoring based on post metrics
    const newGrades: Record<string, StudentGrade> = { ...studentGrades };
    
    students.forEach(student => {
      const studentPosts = getStudentPosts(student.user_id);
      const individualPost = studentPosts.find(p => p.post_type === 'individual');
      const peerResponses = studentPosts.filter(p => p.post_type === 'peer_response');
      const synthesisPost = studentPosts.find(p => p.post_type === 'synthesis');

      // Simple heuristic scoring
      let individualScore = 0;
      if (individualPost) {
        const wordCount = individualPost.word_count || 0;
        individualScore = Math.min(100, (wordCount >= 200 ? 70 : wordCount / 200 * 70) + 
          (individualPost.content?.includes('?') ? 15 : 0) + 
          (wordCount >= 250 ? 15 : 0));
      }

      let peerScore = 0;
      if (peerResponses.length > 0) {
        const avgWords = peerResponses.reduce((sum, p) => sum + (p.word_count || 0), 0) / peerResponses.length;
        peerScore = Math.min(100, peerResponses.length >= 2 ? 60 : 30) + 
          (avgWords >= 100 ? 25 : avgWords / 100 * 25) + 
          (peerResponses.some(p => p.response_type) ? 15 : 0);
      }

      let synthesisScore = 0;
      if (synthesisPost) {
        synthesisScore = Math.min(100, 70 + (synthesisPost.word_count >= 300 ? 30 : synthesisPost.word_count / 300 * 30));
      }

      // Professionalism based on meeting requirements
      const professionalismScore = (individualPost ? 25 : 0) + 
        (peerResponses.length >= 2 ? 50 : peerResponses.length * 25) + 
        (synthesisPost ? 25 : 0);

      newGrades[student.user_id] = {
        ...newGrades[student.user_id],
        individual_score: Math.round(individualScore),
        peer_score: Math.round(peerScore),
        synthesis_score: Math.round(synthesisScore),
        professionalism_score: Math.round(professionalismScore)
      };
    });

    setStudentGrades(newGrades);
    setIsAiScoring(false);
    
    toast({ 
      title: 'AI Pre-Scoring Complete', 
      description: 'Review and adjust scores as needed before saving' 
    });
  };

  const getGradeColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 80) return 'text-blue-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5" />
            Grading Panel
          </CardTitle>
          <Button onClick={runAiPreScoring} disabled={isAiScoring} variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            {isAiScoring ? 'Analyzing...' : 'AI Pre-Score'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Rubric reference */}
        <Collapsible className="mb-4">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full p-2 bg-muted/50 rounded hover:bg-muted">
            <ChevronDown className="h-4 w-4" />
            View Rubric
          </CollapsibleTrigger>
          <CollapsibleContent className="p-3 space-y-2 border-t">
            {rubric.length > 0 ? rubric.map(r => (
              <div key={r.id} className="flex justify-between text-sm">
                <span>{r.category}</span>
                <Badge variant="outline">{r.max_points} pts</Badge>
              </div>
            )) : (
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex justify-between"><span>Individual Post</span><Badge variant="outline">40%</Badge></div>
                <div className="flex justify-between"><span>Peer Responses</span><Badge variant="outline">30%</Badge></div>
                <div className="flex justify-between"><span>Group Synthesis</span><Badge variant="outline">20%</Badge></div>
                <div className="flex justify-between"><span>Professionalism</span><Badge variant="outline">10%</Badge></div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Student grades */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {students.map(student => {
              const grade = studentGrades[student.user_id];
              const studentPosts = getStudentPosts(student.user_id);
              const totalScore = grade ? calculateTotalScore(grade) : 0;
              const isExpanded = expandedStudent === student.user_id;

              return (
                <Collapsible 
                  key={student.user_id} 
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedStudent(open ? student.user_id : null)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {student.gw_profiles?.full_name || student.user_id.slice(0, 8)}
                        </span>
                        <div className="flex gap-1">
                          {studentPosts.some(p => p.post_type === 'individual') && (
                            <Badge variant="outline" className="text-xs"><FileText className="h-3 w-3" /></Badge>
                          )}
                          {studentPosts.filter(p => p.post_type === 'peer_response').length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              {studentPosts.filter(p => p.post_type === 'peer_response').length}
                            </Badge>
                          )}
                          {studentPosts.some(p => p.post_type === 'synthesis') && (
                            <Badge variant="outline" className="text-xs"><UsersIcon className="h-3 w-3" /></Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${getGradeColor(totalScore)}`}>
                          {totalScore.toFixed(1)}%
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="px-3 pb-3">
                    <div className="mt-3 p-4 bg-muted/30 rounded-lg space-y-4">
                      {/* Score inputs */}
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">Individual (40%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={grade?.individual_score || 0}
                            onChange={(e) => updateGrade(student.user_id, 'individual_score', Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Peer (30%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={grade?.peer_score || 0}
                            onChange={(e) => updateGrade(student.user_id, 'peer_score', Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Synthesis (20%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={grade?.synthesis_score || 0}
                            onChange={(e) => updateGrade(student.user_id, 'synthesis_score', Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Prof. (10%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={grade?.professionalism_score || 0}
                            onChange={(e) => updateGrade(student.user_id, 'professionalism_score', Number(e.target.value))}
                          />
                        </div>
                      </div>

                      {/* Feedback */}
                      <div>
                        <Label className="text-xs">Instructor Feedback</Label>
                        <Textarea
                          placeholder="Enter feedback for the student..."
                          value={grade?.instructor_feedback || ''}
                          onChange={(e) => updateGrade(student.user_id, 'instructor_feedback', e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      {/* Save button */}
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          Total: <span className={`font-bold ${getGradeColor(totalScore)}`}>{totalScore.toFixed(1)}%</span>
                        </div>
                        <Button size="sm" onClick={() => saveGrade(student.user_id)}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Grade
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
