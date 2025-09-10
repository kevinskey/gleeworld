import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import ResourcesAdmin from '@/pages/mus240/admin/ResourcesAdmin';
import { EnrollmentManager } from '@/components/mus240/admin/EnrollmentManager';
import { JournalGradingManager } from '@/components/mus240/admin/JournalGradingManager';
import { ComprehensiveJournalAdmin } from '@/components/mus240/admin/ComprehensiveJournalAdmin';
import { PollResultsViewer } from '@/components/mus240/admin/PollResultsViewer';
import { StudentScoresViewer } from '@/components/mus240/admin/StudentScoresViewer';
import { Mus240PollSystem } from '@/components/mus240/Mus240PollSystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, FileText, Settings, ExternalLink, BarChart, BookOpen, Trophy } from 'lucide-react';
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
        
        <main className="relative z-10 max-w-6xl mx-auto px-4 py-8 sm:py-12">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <Settings className="h-6 w-6 text-amber-300" />
              <span className="text-white/90 font-medium">Administration</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
              MUS 240 Administration
            </h1>
            
            <p className="text-lg sm:text-xl text-white/95 mb-6 max-w-4xl mx-auto leading-relaxed">
              Manage course enrollments, resources, and settings
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20">
                <Link to="/classes/mus240/instructor">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Instructor Console
                </Link>
              </Button>
              <Button asChild className="bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30">
                <Link to="/classes/mus240">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  View Course
                </Link>
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-6 bg-white/20 backdrop-blur-sm">
                <TabsTrigger value="scores" className="flex items-center gap-2 text-xs sm:text-sm">
                  <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Scores</span>
                  <span className="sm:hidden">Scores</span>
                </TabsTrigger>
                <TabsTrigger value="enrollments" className="flex items-center gap-2 text-xs sm:text-sm">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Enrollments</span>
                  <span className="sm:hidden">Students</span>
                </TabsTrigger>
                <TabsTrigger value="journals" className="flex items-center gap-2 text-xs sm:text-sm">
                  <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Journals</span>
                  <span className="sm:hidden">Journals</span>
                </TabsTrigger>
                <TabsTrigger value="resources" className="flex items-center gap-2 text-xs sm:text-sm">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                  Resources
                </TabsTrigger>
                <TabsTrigger value="polls" className="flex items-center gap-2 text-xs sm:text-sm">
                  <BarChart className="h-3 w-3 sm:h-4 sm:w-4" />
                  Polls
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2 text-xs sm:text-sm">
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                  Settings
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
              
              <TabsContent value="resources" className="mt-6">
                <ResourcesAdmin />
              </TabsContent>
              
              <TabsContent value="polls" className="mt-6">
                <div className="space-y-6">
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