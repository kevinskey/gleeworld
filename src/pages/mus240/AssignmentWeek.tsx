import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, BookOpen, Music, FileText, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { mus240Assignments } from '@/data/mus240Assignments';

const AssignmentWeek: React.FC = () => {
  const navigate = useNavigate();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'listening-journal': return <BookOpen className="h-4 w-4" />;
      case 'sight-reading': return <Music className="h-4 w-4" />;
      case 'essay': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'listening-journal': return 'bg-blue-100 text-blue-800';
      case 'sight-reading': return 'bg-green-100 text-green-800';
      case 'essay': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <UniversalLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">MUS 240 Assignments</h1>
          <p className="text-lg text-muted-foreground">Complete assignments to deepen your understanding of African American music</p>
        </div>

        {mus240Assignments.map((weekData) => (
          <Card key={weekData.week} className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Week {weekData.week}: {weekData.topic}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date(weekData.startDate).toLocaleDateString()} - {new Date(weekData.endDate).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weekData.assignments.map((assignment) => (
                  <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-2">{assignment.title}</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            {assignment.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Badge variant="outline" className={getTypeColor(assignment.type)}>
                              {getTypeIcon(assignment.type)}
                              <span className="ml-1">{assignment.type.replace('-', ' ')}</span>
                            </Badge>
                            <Badge variant="secondary">
                              {assignment.points} points
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {assignment.estimatedTime}
                            </div>
                          </div>
                          <div className="text-sm">
                            <strong>Due:</strong> {new Date(assignment.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="ml-4">
                          {assignment.type === 'listening-journal' ? (
                            <Button 
                              onClick={() => navigate(`/classes/mus240/assignments/${assignment.id}`)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Open Journal
                            </Button>
                          ) : (
                            <Button variant="outline" disabled>
                              Coming Soon
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </UniversalLayout>
  );
};

export default AssignmentWeek;
