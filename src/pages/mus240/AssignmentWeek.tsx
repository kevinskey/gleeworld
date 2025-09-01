import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, BookOpen, Music, FileText, GraduationCap, CheckCircle2, AlertCircle, Star } from 'lucide-react';
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

        {/* Assignment Instructions and Rubrics */}
        <Card className="mb-8 border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <GraduationCap className="h-5 w-5" />
              Assignment Instructions & Rubrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {/* Listening Journals Instructions */}
              <AccordionItem value="listening-journals">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold">Listening Journals (20 pts each)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        Writing Instructions
                      </h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Length:</strong> 250-300 words exactly</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Focus:</strong> Identify genre, style traits, and cultural significance</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Analysis:</strong> Connect musical features to historical context</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Terminology:</strong> Use correct musical terms</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Comments:</strong> Respond to 2 other students' journals</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-600" />
                        Grading Rubric
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                          <span>Musical Analysis (40%)</span>
                          <span className="font-medium">8 pts</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                          <span>Historical Context (30%)</span>
                          <span className="font-medium">6 pts</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                          <span>Terminology Usage (20%)</span>
                          <span className="font-medium">4 pts</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                          <span>Writing Quality (10%)</span>
                          <span className="font-medium">2 pts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Midterm Essay Instructions */}
              <AccordionItem value="midterm-essay">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold">Midterm Essay (50 pts)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-purple-600" />
                        Essay Requirements
                      </h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Topic:</strong> Development of African American music from spirituals to funk</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Length:</strong> 1000-1200 words</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Structure:</strong> Clear thesis, evidence from course materials</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Analysis:</strong> Connect musical elements across genres</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Context:</strong> Discuss cultural and social influences</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-600" />
                        Grading Rubric
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                          <span>Thesis & Argument (30%)</span>
                          <span className="font-medium">15 pts</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                          <span>Musical Analysis (25%)</span>
                          <span className="font-medium">12.5 pts</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                          <span>Historical Context (25%)</span>
                          <span className="font-medium">12.5 pts</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white rounded border">
                          <span>Organization & Writing (20%)</span>
                          <span className="font-medium">10 pts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

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
