import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, BookOpen, Music, FileText, GraduationCap, CheckCircle2, AlertCircle, Star, ArrowLeft, Edit } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { mus240Assignments } from '@/data/mus240Assignments';
import backgroundImage from '@/assets/mus240-background.jpg';
import { Mus240UserAvatar } from '@/components/mus240/Mus240UserAvatar';
import { useUserRole } from '@/hooks/useUserRole';

const AssignmentWeek: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'listening-journal': return <BookOpen className="h-4 w-4" />;
      case 'sight-reading': return <Music className="h-4 w-4" />;
      case 'essay': 
      case 'reflection-paper': return <FileText className="h-4 w-4" />;
      case 'exam': return <GraduationCap className="h-4 w-4" />;
      case 'project': 
      case 'research-proposal':
      case 'annotated-bibliography': return <Star className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'listening-journal': return 'bg-blue-100 text-blue-800';
      case 'sight-reading': return 'bg-green-100 text-green-800';
      case 'essay': 
      case 'reflection-paper': return 'bg-purple-100 text-purple-800';
      case 'exam': return 'bg-red-100 text-red-800';
      case 'project':
      case 'research-proposal':
      case 'annotated-bibliography': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <Mus240UserAvatar />
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative bg-gradient-to-br from-orange-800 to-amber-600"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10"></div>
        
        <main className="relative z-10 max-w-6xl mx-auto px-4 py-12">
          {/* Back Button */}
          <div className="mb-6">
            <Link 
              to="/classes/mus240" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-white/20 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to MUS 240
            </Link>
          </div>
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <FileText className="h-6 w-6 md:h-7 md:w-7 text-amber-300" />
              <span className="text-white/90 font-medium text-xl md:text-2xl lg:text-xl xl:text-2xl">MUS 240</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold mb-4 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
              Assignments
            </h1>
            
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-light text-white/95 mb-6 max-w-4xl mx-auto leading-relaxed">
              Complete assignments to deepen your understanding of African American music
            </h2>
          </div>

          {/* Assignment Instructions and Rubrics */}
          <div className="mb-8 bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <div className="flex items-center gap-2 text-amber-300 mb-6">
              <GraduationCap className="h-5 w-5" />
              <h3 className="text-xl font-semibold text-white">Assignment Instructions & Rubrics</h3>
            </div>
            
            <Accordion type="single" collapsible className="w-full space-y-4">
              {/* Listening Journals Instructions */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <AccordionItem value="listening-journals" className="border-none">
                  <AccordionTrigger className="text-left px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-2 text-white">
                      <BookOpen className="h-4 w-4 text-blue-400" />
                      <span className="font-semibold">Listening Journals (20 pts each)</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                          <AlertCircle className="h-4 w-4 text-blue-400" />
                          Writing Instructions
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-white/90"><strong>Length:</strong> 250-300 words exactly</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-white/90"><strong>Focus:</strong> Identify genre, style traits, and cultural significance</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-white/90"><strong>Analysis:</strong> Connect musical features to historical context</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-white/90"><strong>Terminology:</strong> Use correct musical terms</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-white/90"><strong>Peer Comments:</strong> Respond thoughtfully to 2 other students' journals (minimum 50 words each)</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                          <Star className="h-4 w-4 text-amber-400" />
                          Grading Rubric
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center p-2 bg-white/10 rounded border border-white/20">
                            <span className="text-white/90">Musical Analysis (35%)</span>
                            <span className="font-medium text-white">7 pts</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white/10 rounded border border-white/20">
                            <span className="text-white/90">Historical Context (25%)</span>
                            <span className="font-medium text-white">5 pts</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white/10 rounded border border-white/20">
                            <span className="text-white/90">Terminology Usage (15%)</span>
                            <span className="font-medium text-white">3 pts</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white/10 rounded border border-white/20">
                            <span className="text-white/90">Writing Quality (10%)</span>
                            <span className="font-medium text-white">2 pts</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white/10 rounded border border-white/20">
                            <span className="text-white/90">Peer Comments (15%)</span>
                            <span className="font-medium text-white">3 pts</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </div>

              {/* Midterm Essay Instructions */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <AccordionItem value="midterm-essay" className="border-none">
                  <AccordionTrigger className="text-left px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-2 text-white">
                      <FileText className="h-4 w-4 text-purple-400" />
                      <span className="font-semibold">Midterm Essay (50 pts)</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                          <AlertCircle className="h-4 w-4 text-purple-400" />
                          Essay Requirements
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-white/90"><strong>Topic:</strong> Development of African American music from spirituals to funk</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-white/90"><strong>Length:</strong> 1000-1200 words</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-white/90"><strong>Structure:</strong> Clear thesis, evidence from course materials</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-white/90"><strong>Analysis:</strong> Connect musical elements across genres</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-white/90"><strong>Context:</strong> Discuss cultural and social influences</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                          <Star className="h-4 w-4 text-amber-400" />
                          Grading Rubric
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center p-2 bg-white/10 rounded border border-white/20">
                            <span className="text-white/90">Thesis & Argument (30%)</span>
                            <span className="font-medium text-white">15 pts</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white/10 rounded border border-white/20">
                            <span className="text-white/90">Musical Analysis (25%)</span>
                            <span className="font-medium text-white">12.5 pts</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white/10 rounded border border-white/20">
                            <span className="text-white/90">Historical Context (25%)</span>
                            <span className="font-medium text-white">12.5 pts</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white/10 rounded border border-white/20">
                            <span className="text-white/90">Organization & Writing (20%)</span>
                            <span className="font-medium text-white">10 pts</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </div>
            </Accordion>
          </div>

          {/* Assignment Cards */}
          <div className="space-y-6">
            {mus240Assignments.map((weekData) => (
              <div key={weekData.week} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="mb-6">
                  <h3 className="flex items-center gap-2 text-xl font-semibold text-white mb-2">
                    <Calendar className="h-5 w-5 text-amber-300" />
                    Week {weekData.week}: {weekData.topic}
                  </h3>
                  <p className="text-sm text-white/70">
                    {new Date(weekData.startDate + 'T12:00:00').toLocaleDateString()} - {new Date(weekData.endDate + 'T12:00:00').toLocaleDateString()}
                  </p>
                </div>
                
                <div className="space-y-4">
                  {weekData.assignments.map((assignment) => (
                  <div key={assignment.id} className="bg-white/95 backdrop-blur-sm rounded-xl px-6 py-4 sm:px-4 sm:py-3 lg:px-8 lg:py-5 xl:px-10 xl:py-6 shadow-lg border border-white/30 hover:bg-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-xl sm:text-2xl md:text-3xl lg:text-2xl xl:text-3xl text-gray-900">{assignment.title}</h4>
                            {isAdmin() && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/classes/mus240/assignments/${assignment.id}`)}
                                className="flex-shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-lg sm:text-sm md:text-xl lg:text-base xl:text-lg text-gray-600 mb-3">
                            {assignment.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Badge variant="outline" className={getTypeColor(assignment.type)}>
                              {getTypeIcon(assignment.type)}
                              <span className="ml-1 text-xs">{assignment.type.replace('-', ' ')}</span>
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {assignment.points} points
                            </Badge>
                          </div>
                          <div className="text-xs sm:text-sm text-gray-700">
                            <strong>Due:</strong> {new Date(assignment.dueDate + 'T12:00:00').toLocaleDateString()}
                          </div>
                        </div>
                        <div className="w-full sm:w-auto sm:ml-4">
                          {assignment.type === 'listening-journal' ? (
                            <Button 
                              onClick={() => navigate(`/classes/mus240/assignments/${assignment.id}`)}
                              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 !text-white shadow-lg text-sm"
                            >
                              Open Journal
                            </Button>
                          ) : assignment.type === 'reflection-paper' || assignment.type === 'essay' ? (
                            <Button 
                              onClick={() => navigate(`/classes/mus240/assignments/${assignment.id}`)}
                              className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 !text-white shadow-lg text-sm"
                            >
                              Write Essay
                            </Button>
                          ) : assignment.type === 'research-proposal' || assignment.type === 'annotated-bibliography' || assignment.type === 'project' ? (
                            <Button 
                              onClick={() => navigate(`/classes/mus240/assignments/${assignment.id}`)}
                              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 !text-white shadow-lg text-sm"
                            >
                              Submit Work
                            </Button>
                          ) : assignment.type === 'exam' ? (
                            <Button variant="outline" disabled className="w-full sm:w-auto border-red-300 text-red-600 text-sm">
                              In-Class Exam
                            </Button>
                          ) : (
                            <Button variant="outline" disabled className="w-full sm:w-auto border-gray-300 text-gray-500 text-sm">
                              Coming Soon
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </UniversalLayout>
  );
};

export default AssignmentWeek;
