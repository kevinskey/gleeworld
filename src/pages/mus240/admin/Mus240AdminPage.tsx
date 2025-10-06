import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import ResourcesAdmin from '@/pages/mus240/admin/ResourcesAdmin';
import { EnrollmentManager } from '@/components/mus240/admin/EnrollmentManager';
import { JournalGradingManager } from '@/components/mus240/admin/JournalGradingManager';
import { ComprehensiveJournalAdmin } from '@/components/mus240/admin/ComprehensiveJournalAdmin';
import { PollResultsViewer } from '@/components/mus240/admin/PollResultsViewer';
import { PollParticipationTracker } from '@/components/mus240/admin/PollParticipationTracker';
import { StudentScoresViewer } from '@/components/mus240/admin/StudentScoresViewer';
import { Mus240PollSystem } from '@/components/mus240/Mus240PollSystem';
import { MidtermGradingManager } from '@/components/mus240/admin/MidtermGradingManager';
import { StudentAnalyticsDashboard } from '@/components/mus240/admin/StudentAnalyticsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, FileText, Settings, ExternalLink, BarChart, BookOpen, Trophy, ClipboardCheck, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';
import backgroundImage from '@/assets/mus240-background.jpg';
import { OpenAITestButton } from '@/components/mus240/admin/OpenAITestButton';

export const Mus240AdminPage = () => {
  const [activeTab, setActiveTab] = useState('scores');

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative bg-gradient-to-br from-orange-800 to-amber-600"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10"></div>
        
        <main className="relative z-10 max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
          {/* Header Section */}
          <div className="text-center mb-4 sm:mb-8">
            <div className="inline-flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 px-3 sm:px-6 py-2 sm:py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <Settings className="h-4 w-4 sm:h-6 sm:w-6 text-amber-300" />
              <span className="text-white/90 font-medium text-sm sm:text-base">Administration</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl px-2">
              MUS 240 Administration
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-white/95 mb-4 sm:mb-6 max-w-4xl mx-auto leading-relaxed px-2">
              Manage course enrollments, resources, and settings
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-2">
              <Button asChild variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 w-full sm:w-auto text-sm">
                <Link to="/classes/mus240/instructor/console">
                  <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Instructor Console
                </Link>
              </Button>
              <Button asChild className="bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30 w-full sm:w-auto text-sm">
                <Link to="/classes/mus240">
                  <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  View Course
                </Link>
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg sm:rounded-2xl p-3 sm:p-6 border border-white/20">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-8 mb-3 sm:mb-6 bg-white/20 backdrop-blur-sm h-auto p-1 gap-0.5 sm:gap-1">
                <TabsTrigger value="scores" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs py-2 px-1 sm:px-3 data-[state=active]:bg-white/30">
                  <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Scores</span>
                </TabsTrigger>
                <TabsTrigger value="enrollments" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs py-2 px-1 sm:px-3 data-[state=active]:bg-white/30">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Students</span>
                </TabsTrigger>
                <TabsTrigger value="journals" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs py-2 px-1 sm:px-3 data-[state=active]:bg-white/30">
                  <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Journals</span>
                </TabsTrigger>
                <TabsTrigger value="midterms" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs py-2 px-1 sm:px-3 data-[state=active]:bg-white/30">
                  <ClipboardCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Midterms</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs py-2 px-1 sm:px-3 data-[state=active]:bg-white/30">
                  <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="resources" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs py-2 px-1 sm:px-3 data-[state=active]:bg-white/30">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Resources</span>
                </TabsTrigger>
                <TabsTrigger value="polls" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs py-2 px-1 sm:px-3 data-[state=active]:bg-white/30">
                  <BarChart className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Polls</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs py-2 px-1 sm:px-3 data-[state=active]:bg-white/30">
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Settings</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="scores" className="mt-6">
                <StudentScoresViewer />
              </TabsContent>

              <TabsContent value="enrollments" className="mt-6">
                <EnrollmentManager />
              </TabsContent>
              
              <TabsContent value="journals" className="mt-6">
                <ComprehensiveJournalAdmin />
              </TabsContent>
              
              <TabsContent value="midterms" className="mt-6">
                <MidtermGradingManager />
              </TabsContent>
              
              <TabsContent value="analytics" className="mt-6">
                <StudentAnalyticsDashboard />
              </TabsContent>
              
              <TabsContent value="resources" className="mt-6">
                <ResourcesAdmin />
              </TabsContent>
              
              <TabsContent value="polls" className="mt-6">
                <div className="space-y-6">
                  <PollParticipationTracker />
                  <PollResultsViewer />
                  <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
                    <CardHeader>
                      <CardTitle>Poll Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Mus240PollSystem />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="settings" className="mt-6">
                <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Course Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-gray-600">
                        Course settings and configuration options will be available here.
                      </p>
                      <div className="flex gap-2">
                        <OpenAITestButton />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </UniversalLayout>
  );
};