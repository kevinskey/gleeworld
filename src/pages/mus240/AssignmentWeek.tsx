import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar, BookOpen, Music, FileText, GraduationCap, CheckCircle2, AlertCircle, Star, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { mus240Assignments } from '@/data/mus240Assignments';
import backgroundImage from '@/assets/mus240-background.jpg';
import { Mus240UserAvatar } from '@/components/mus240/Mus240UserAvatar';

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
              <FileText className="h-6 w-6 text-amber-300" />
              <span className="text-white/90 font-medium">MUS 240</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
              Assignments
            </h1>
            
            <h2 className="text-xl md:text-2xl font-light text-white/95 mb-6 max-w-4xl mx-auto leading-relaxed">
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
                    {new Date(weekData.startDate).toLocaleDateString()} - {new Date(weekData.endDate).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="space-y-4">
                  {weekData.assignments.map((assignment) => (
                    <div key={assignment.id} className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/30 hover:bg-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-2 text-gray-900">{assignment.title}</h4>
                          <p className="text-sm text-gray-600 mb-3">
                            {assignment.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Badge variant="outline" className={getTypeColor(assignment.type)}>
                              {getTypeIcon(assignment.type)}
                              <span className="ml-1">{assignment.type.replace('-', ' ')}</span>
                            </Badge>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                              {assignment.points} points
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-700">
                            <strong>Due:</strong> {new Date(assignment.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="ml-4">
                          {assignment.type === 'listening-journal' ? (
                            <Button 
                              onClick={() => navigate(`/classes/mus240/assignments/${assignment.id}`)}
                              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg"
                            >
                              Open Journal
                            </Button>
                          ) : (
                            <Button variant="outline" disabled className="border-gray-300 text-gray-500">
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
