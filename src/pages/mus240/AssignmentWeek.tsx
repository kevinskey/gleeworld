import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Calendar, BookOpen, Music, FileText, CheckCircle2, Clock, Star, GraduationCap } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { mus240Assignments } from '@/data/mus240Assignments';
import { useMus240Progress } from '@/hooks/useMus240Progress';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AssignmentWeekProps {
  week: string;
  topic: string;
  startDate: string;
  endDate: string;
  assignments: any[];
}

const AssignmentWeek: React.FC = () => {
  const { weekNumber } = useParams<{ weekNumber: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { submissions, loading } = useMus240Progress();
  const [submissionMap, setSubmissionMap] = useState<Record<string, any>>({});

  const week = mus240Assignments.find(w => w.week.toString() === weekNumber);

  useEffect(() => {
    if (submissions) {
      const map = submissions.reduce((acc: any, sub: any) => {
        acc[sub.assignment_id] = sub;
        return acc;
      }, {});
      setSubmissionMap(map);
    }
  }, [submissions]);

  const handleSubmitAssignment = (assignment: any) => {
    toast({
      title: "Feature Coming Soon",
      description: `${assignment.title} submission will be available soon.`,
    });
  };

  const getSubmissionStatus = (assignmentId: string) => {
    if (!submissionMap || !submissions) {
      return { submitted: false, graded: false, score: null };
    }
    
    const submission = submissionMap[assignmentId];
    if (!submission) return { submitted: false, graded: false, score: null };
    
    return {
      submitted: true,
      graded: submission.status === 'graded' && submission.score !== null,
      score: submission.score
    };
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'listening_journal': return <BookOpen className="h-4 w-4" />;
      case 'sight_reading': return <Music className="h-4 w-4" />;
      case 'theory_quiz': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'listening_journal': return 'bg-blue-500';
      case 'sight_reading': return 'bg-green-500';
      case 'theory_quiz': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // If no weekNumber is provided, show all assignments overview
  if (!weekNumber) {
    return (
      <UniversalLayout>
        <div className="container mx-auto py-8 space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">MUS 240 Assignments</h1>
            <p className="text-lg text-muted-foreground">All course assignments organized by week</p>
          </div>

          {mus240Assignments.map((weekData) => (
            <Card key={weekData.week} className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Week {weekData.week}: {weekData.topic}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {weekData.startDate} - {weekData.endDate}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {weekData.assignments.map((assignment) => {
                    const { submitted, graded, score } = getSubmissionStatus(assignment.id);
                    
                    return (
                      <Card 
                        key={assignment.id}
                        className={`relative group hover:shadow-lg transition-all cursor-pointer ${
                          submitted ? 'border-green-300 bg-green-50/50' : ''
                        }`}
                        onClick={() => {
                          if (assignment.type === 'listening-journal') {
                            navigate(`/classes/mus240/assignments/${assignment.id}`);
                          } else {
                            handleSubmitAssignment(assignment);
                          }
                        }}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{assignment.title}</CardTitle>
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {getTypeIcon(assignment.type)}
                              {assignment.type.replace('_', ' ')}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {assignment.points} pts
                            </Badge>
                            {submitted && (
                              <Badge variant="default" className="bg-green-600 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Submitted
                              </Badge>
                            )}
                            {graded && (
                              <Badge variant="default" className="bg-blue-600 text-xs">
                                <GraduationCap className="h-3 w-3 mr-1" />
                                {Math.round(score)}%
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {assignment.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                            {assignment.estimatedTime && <span>{assignment.estimatedTime}</span>}
                          </div>
                          {graded && score !== null && (
                            <div className="mt-2">
                              <Progress value={score} className="h-1" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </UniversalLayout>
    );
  }

  if (!week) {
    return (
      <UniversalLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Week Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The requested week could not be found.
              </p>
              <Button onClick={() => navigate('/classes/mus240/assignments')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Assignments
              </Button>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }


  return (
    <UniversalLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/classes/mus240/assignments')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assignments
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Week {week.week}</h1>
          <p className="text-lg text-muted-foreground">{week.topic}</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              {week.startDate} - {week.endDate}
            </span>
          </div>
        </div>

        {/* Assignments Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {week.assignments.map((assignment, index) => {
            const { submitted, graded, score } = getSubmissionStatus(assignment.id);
            
            return (
              <Card 
                key={assignment.id}
                className={`relative group hover:shadow-xl transition-all cursor-pointer bg-white/95 backdrop-blur-sm border border-white/30 hover:bg-white hover:shadow-2xl hover:-translate-y-1 ${
                  submitted ? 'border-green-300 bg-green-50/95' : 'hover:border-white/50'
                }`}
                onClick={() => {
                  if (!submitted) {
                    if (assignment.type === 'listening-journal') {
                      navigate(`/classes/mus240/assignments/${assignment.id}`);
                    } else {
                      handleSubmitAssignment(assignment);
                    }
                  } else if (assignment.type === 'listening-journal') {
                    navigate(`/classes/mus240/assignments/${assignment.id}`);
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
                        {assignment.title}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getTypeIcon(assignment.type)}
                          {assignment.type.replace('_', ' ')}
                        </Badge>
                        <Badge variant="secondary">
                          {assignment.points} pts
                        </Badge>
                        {submitted && (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Submitted
                          </Badge>
                        )}
                        {graded && (
                          <Badge variant="default" className="bg-blue-600 flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {Math.round(score)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div 
                      className={`w-3 h-3 rounded-full ${getTypeColor(assignment.type)} opacity-60 group-hover:opacity-100 transition-opacity`}
                    />
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {assignment.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Due Date
                      </span>
                      <span className="font-medium">
                        {new Date(assignment.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {assignment.estimatedTime && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Est. Time</span>
                        <span>{assignment.estimatedTime}</span>
                      </div>
                    )}

                    {graded && score !== null && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Your Score</span>
                          <span className="font-bold text-lg">{Math.round(score)}%</span>
                        </div>
                        <Progress value={score} className="h-2" />
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    {!submitted ? (
                      <Button 
                        size="sm" 
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (assignment.type === 'listening-journal') {
                            navigate(`/classes/mus240/assignments/${assignment.id}`);
                          } else {
                            handleSubmitAssignment(assignment);
                          }
                        }}
                      >
                        Start Assignment
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (assignment.type === 'listening-journal') {
                            navigate(`/classes/mus240/assignments/${assignment.id}`);
                          }
                        }}
                      >
                        View Submission
                        {graded && <Star className="h-3 w-3 ml-1" />}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Week Summary */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Week {week.week} Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This week focuses on <strong>{week.topic}</strong>. Complete all assignments by their due dates 
              to stay on track with the course schedule.
            </p>
          </CardContent>
        </Card>
      </div>
    </UniversalLayout>
  );
};

export default AssignmentWeek;
