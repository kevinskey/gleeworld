import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Play, Download, BookOpen, Award, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSRFAssignments } from '@/hooks/useSRFAssignments';
import { BackNavigation } from '@/components/shared/BackNavigation';

const SightReadingPage = () => {
  const { assignments, loading } = useSRFAssignments();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const completedAssignments = assignments.filter(a => a.completedCount === a.assignedCount);
  const pendingAssignments = assignments.filter(a => a.completedCount < a.assignedCount);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Navigation */}
        <BackNavigation />
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg p-3 bg-blue-100 text-blue-600">
            <Eye className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Sight Reading Studio</h1>
            <p className="text-muted-foreground">Practice sight reading and complete assignments</p>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4 text-center bg-blue-50 border-blue-200">
            <Award className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold">Current Grade</h3>
            <p className="text-2xl font-bold text-blue-600">A-</p>
          </Card>
          <Card className="p-4 text-center bg-green-50 border-green-200">
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <h3 className="font-semibold">Assignments</h3>
            <p className="text-sm text-muted-foreground">{pendingAssignments.length} pending</p>
          </Card>
          <Card className="p-4 text-center bg-purple-50 border-purple-200">
            <Play className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <h3 className="font-semibold">Completed</h3>
            <p className="text-sm text-muted-foreground">{completedAssignments.length} assignments</p>
          </Card>
          <Card className="p-4 text-center bg-orange-50 border-orange-200">
            <Clock className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <h3 className="font-semibold">Total Assignments</h3>
            <p className="text-sm text-muted-foreground">{assignments.length} total</p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Assignments */}
            <Card>
              <CardHeader>
                <CardTitle>Current Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No sight reading assignments available yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment) => {
                      const progress = Math.round((assignment.completedCount / assignment.assignedCount) * 100);
                      const isCompleted = assignment.completedCount === assignment.assignedCount;
                      const isOverdue = new Date(assignment.dueDate + 'T12:00:00') < new Date();
                      
                      return (
                        <div key={assignment.id} className="p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold">{assignment.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                Due: {new Date(assignment.dueDate + 'T12:00:00').toLocaleDateString()}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge 
                                  variant={isCompleted ? 'default' : isOverdue ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'In Progress'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {assignment.difficulty}
                                </Badge>
                              </div>
                            </div>
                            <Button size="sm" className="ml-4" disabled={isCompleted}>
                              {isCompleted ? 'Completed' : 'Continue'}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Progress ({assignment.completedCount}/{assignment.assignedCount})</span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Practice Tools */}
            <Card>
              <CardHeader>
                <CardTitle>Practice Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Play className="h-6 w-6" />
                    <span>Quick Practice</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <BookOpen className="h-6 w-6" />
                    <span>Theory Review</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Eye className="h-6 w-6" />
                    <span>Sight Reading Test</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Award className="h-6 w-6" />
                    <span>Progress Report</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Weekly Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Overall Progress</span>
                      <span>68%</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Assignments Completed</span>
                      <span>5/8</span>
                    </div>
                    <Progress value={62.5} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Practice Hours</span>
                      <span>4.5/6</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Scale Practice</span>
                    <Badge variant="default">A</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Interval Recognition</span>
                    <Badge variant="default">A-</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rhythm Reading</span>
                    <Badge variant="secondary">B+</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Melody Sight Reading</span>
                    <Badge variant="default">A</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Download Exercises
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Award className="h-4 w-4 mr-2" />
                  View Grades
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Study Schedule
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SightReadingPage;