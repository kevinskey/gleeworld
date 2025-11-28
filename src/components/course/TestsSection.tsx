import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileCheck, Calendar, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TestsSectionProps {
  courseId: string;
}

export const TestsSection: React.FC<TestsSectionProps> = ({ courseId }) => {
  // Mock data - in real implementation, fetch from database
  const tests = [
    {
      id: 1,
      title: 'Midterm Exam',
      type: 'exam',
      date: new Date(2025, 2, 15),
      time: '10:00 AM - 12:00 PM',
      duration: 120,
      points: 100,
      status: 'upcoming',
      topics: [
        'Baton Technique',
        'Beat Patterns (2/4, 3/4, 4/4)',
        'Score Reading',
        'Basic Conducting Gestures'
      ]
    },
    {
      id: 2,
      title: 'Quiz 1: Conducting Fundamentals',
      type: 'quiz',
      date: new Date(2025, 1, 10),
      time: '2:00 PM - 2:30 PM',
      duration: 30,
      points: 25,
      status: 'completed',
      score: 23,
      topics: [
        'History of Conducting',
        'Basic Terminology'
      ]
    },
    {
      id: 3,
      title: 'Final Exam',
      type: 'exam',
      date: new Date(2025, 4, 5),
      time: '1:00 PM - 3:30 PM',
      duration: 150,
      points: 150,
      status: 'upcoming',
      topics: [
        'All Course Material',
        'Advanced Conducting Techniques',
        'Rehearsal Management',
        'Score Analysis'
      ]
    }
  ];

  const getStatusBadge = (status: string, score?: number, points?: number) => {
    switch (status) {
      case 'completed':
        const percentage = score && points ? (score / points) * 100 : 0;
        return (
          <Badge variant={percentage >= 70 ? 'default' : 'destructive'}>
            <CheckCircle className="h-3 w-3 mr-1" />
            {score}/{points}
          </Badge>
        );
      case 'upcoming':
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Upcoming
          </Badge>
        );
      case 'missed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Missed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'exam':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'quiz':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tests & Exams</h2>
      </div>

      <div className="grid gap-4">
        {tests.map((test) => (
          <Card key={test.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <FileCheck className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{test.title}</CardTitle>
                      <Badge className={getTypeColor(test.type)}>
                        {test.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(test.date, 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {test.time}
                      </div>
                      <span>({test.duration} min)</span>
                    </div>
                  </div>
                </div>
                {getStatusBadge(test.status, test.score, test.points)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Points</span>
                  <span className="font-semibold">{test.points} points</span>
                </div>

                {test.topics && test.topics.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Topics Covered:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {test.topics.map((topic, index) => (
                        <li key={index}>{topic}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {test.status === 'upcoming' && (
                  <div className="pt-3 border-t">
                    <Button className="w-full" variant="outline">
                      View Study Materials
                    </Button>
                  </div>
                )}

                {test.status === 'completed' && test.score && (
                  <div className="pt-3 border-t">
                    <div className="flex gap-2">
                      <Button className="flex-1" variant="outline">
                        View Results
                      </Button>
                      <Button className="flex-1" variant="outline">
                        Review Answers
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test Schedule Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Schedule Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Tests</span>
              <span className="font-semibold">{tests.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-semibold">
                {tests.filter(t => t.status === 'completed').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Upcoming</span>
              <span className="font-semibold">
                {tests.filter(t => t.status === 'upcoming').length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
