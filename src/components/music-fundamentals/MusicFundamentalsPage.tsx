import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Upload, BookOpen, Trophy, Settings, Clock } from 'lucide-react';
import { UniversalHeader } from '@/components/layout/UniversalHeader';

import { FileUploadSection } from '@/components/music-fundamentals/FileUploadSection';
import { AssignmentsList } from '@/components/music-fundamentals/AssignmentsList';
import { AdminGradingPanel } from '@/components/music-fundamentals/AdminGradingPanel';
import { StudentProgress } from '@/components/music-fundamentals/StudentProgress';
import { WeekTwoContent } from '@/components/music-fundamentals/week-two/WeekTwoContent';
import { useAuth } from '@/contexts/AuthContext';

export const MusicFundamentalsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('practice');
  
  // Check if user has admin role (will implement proper role checking later)
  const isAdmin = user?.email?.includes('admin') || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <UniversalHeader />
      
      <div className="page-container">
        <div className="container mx-auto px-1 sm:px-2 lg:px-4">
          {/* Header Section */}
          <div className="text-center mb-2 md:mb-4">
            <div className="flex items-center justify-center mb-1 md:mb-2">
              <div className="p-1.5 md:p-3 rounded-full bg-primary/10 mr-2 md:mr-4">
                <Music className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h1 className="mobile-text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Music Fundamentals
              </h1>
            </div>
            <p className="mobile-text-lg text-muted-foreground max-w-2xl mx-auto px-2">
              Practice sight singing, complete assignments, and master the fundamentals of music theory and performance.
            </p>
            <div className="mt-4">
              <a 
                href="/grand-staves"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <Music className="h-4 w-4" />
                Open Grand Staves for Class
              </a>
            </div>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 mb-2 md:mb-4 gap-0.5 md:gap-1">
            <TabsTrigger value="practice" className="flex items-center gap-1 md:gap-2 touch-target">
              <Music className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm">Practice</span>
            </TabsTrigger>
            <TabsTrigger value="week2" className="flex items-center gap-1 md:gap-2 touch-target">
              <Clock className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm">Week 2</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-1 md:gap-2 touch-target">
              <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm">Assignments</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-1 md:gap-2 touch-target">
              <Upload className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-1 md:gap-2 touch-target">
              <Trophy className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm">Progress</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-1 md:gap-2 touch-target">
                <Settings className="h-3 w-3 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Admin</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Week 2 Tab - Time Signatures & Meter */}
          <TabsContent value="week2" className="section-spacing">
            <div className="p-4 bg-primary/5 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Week 2: Time Signatures & Meter</h2>
              <p>This is the Week 2 content - Time signatures, meter, and rhythm dictation exercises.</p>
              <div className="mt-4 space-y-2">
                <div className="p-3 bg-background rounded border">
                  <h3 className="font-medium">📚 Theory</h3>
                  <p className="text-sm text-muted-foreground">Learn about time signatures and their meanings</p>
                </div>
                <div className="p-3 bg-background rounded border">
                  <h3 className="font-medium">🎼 Meter Practice</h3>
                  <p className="text-sm text-muted-foreground">Practice conducting patterns for different meters</p>
                </div>
                <div className="p-3 bg-background rounded border">
                  <h3 className="font-medium">🎵 Rhythm Dictation</h3>
                  <p className="text-sm text-muted-foreground">Listen and notate rhythmic patterns</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Practice Tab - MusicXML Library */}
          <TabsContent value="practice" className="section-spacing">
            <Card className="card-compact">
              <CardHeader className="card-header-compact">
                <CardTitle className="flex items-center gap-1 md:gap-2 page-header">
                  <Music className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  Sight Singing Practice Library
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Access the MusicXML library to practice sight singing with uploaded exercises
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-6 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">Practice with MusicXML Library</h3>
                      <p className="text-muted-foreground mb-4">
                        Access a curated library of sight singing exercises in MusicXML format. 
                        View the music notation, practice with playback, and record your performances.
                      </p>
                      <a 
                        href="/mus100-sight-singing"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                      >
                        <Music className="h-4 w-4" />
                        Open Practice Library
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-background rounded-lg border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Public Library
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Access curated sight singing exercises uploaded by instructors
                    </p>
                  </div>
                  
                  <div className="p-4 bg-background rounded-lg border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Upload className="h-4 w-4 text-primary" />
                      Your Uploads
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Upload and practice with your own MusicXML files
                    </p>
                  </div>
                  
                  <div className="p-4 bg-background rounded-lg border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Music className="h-4 w-4 text-primary" />
                      Practice Tools
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Playback, tempo control, and recording features
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="section-spacing">
            <Card className="card-compact">
              <CardHeader className="card-header-compact">
                <CardTitle className="flex items-center gap-1 md:gap-2 page-header">
                  <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  Current Assignments
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  View and complete your music fundamentals assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssignmentsList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="section-spacing">
            <Card className="card-compact">
              <CardHeader className="card-header-compact">
                <CardTitle className="flex items-center gap-1 md:gap-2 page-header">
                  <Upload className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  File Uploads
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Upload MusicXML files, PDFs, and audio recordings for your assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploadSection />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="section-spacing">
            <Card className="card-compact">
              <CardHeader className="card-header-compact">
                <CardTitle className="flex items-center gap-1 md:gap-2 page-header">
                  <Trophy className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  Your Progress
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Track your improvement in sight singing and music theory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudentProgress />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Tab - Only visible to instructors/admins */}
          {isAdmin && (
            <TabsContent value="admin" className="section-spacing">
              <Card className="card-compact">
                <CardHeader className="card-header-compact">
                  <CardTitle className="flex items-center gap-1 md:gap-2 page-header">
                    <Settings className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    Grading & Administration
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Review student submissions and provide feedback
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminGradingPanel />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
        </div>
      </div>
    </div>
  );
};