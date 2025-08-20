import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Upload, BookOpen, Trophy, Settings } from 'lucide-react';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { SightSingingGenerator } from '@/components/music-fundamentals/SightSingingGenerator';
import { FileUploadSection } from '@/components/music-fundamentals/FileUploadSection';
import { AssignmentsList } from '@/components/music-fundamentals/AssignmentsList';
import { AdminGradingPanel } from '@/components/music-fundamentals/AdminGradingPanel';
import { StudentProgress } from '@/components/music-fundamentals/StudentProgress';
import { useAuth } from '@/contexts/AuthContext';

export const MusicFundamentalsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('practice');
  
  // Check if user has admin role (will implement proper role checking later)
  const isAdmin = user?.email?.includes('admin') || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <UniversalHeader />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10 mr-4">
              <Music className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Music Fundamentals
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Practice sight singing, complete assignments, and master the fundamentals of music theory and performance.
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="practice" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Practice
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Progress
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          {/* Practice Tab - Sight Singing Generator */}
          <TabsContent value="practice" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5 text-primary" />
                  Sight Singing Practice
                </CardTitle>
                <CardDescription>
                  Generate custom sight singing exercises and record your performance for evaluation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SightSingingGenerator />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Current Assignments
                </CardTitle>
                <CardDescription>
                  View and complete your music fundamentals assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssignmentsList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  File Uploads
                </CardTitle>
                <CardDescription>
                  Upload MusicXML files, PDFs, and audio recordings for your assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploadSection />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Your Progress
                </CardTitle>
                <CardDescription>
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
            <TabsContent value="admin" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Grading & Administration
                  </CardTitle>
                  <CardDescription>
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
  );
};