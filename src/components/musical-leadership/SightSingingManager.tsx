import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, BookOpen, TrendingUp, Target, Users } from 'lucide-react';
import { SightReadingGenerator } from '@/components/SightReadingGenerator';
import { SightReadingUploader } from '@/components/SightReadingUploader';
import { SightSingingRecords } from '@/components/sight-singing/SightSingingRecords';
import { SightReadingAssignmentManager } from '@/components/sight-singing/SightReadingAssignmentManager';
import { StudentProgressTracker } from '@/components/sight-singing/StudentProgressTracker';

interface SightSingingManagerProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
  };
}

export const SightSingingManager = ({ user }: SightSingingManagerProps) => {
  const [generatedMelody, setGeneratedMelody] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("assignments");
  const [stats] = useState({
    completionRate: 87,
    activeExercises: 12,
    totalSections: 4,
    weeklyProgress: 15
  });

  const handleStartSightReading = (melody: any[]) => {
    setGeneratedMelody(melody);
    setActiveTab("upload");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-foreground">Sight Singing Management</h3>
          <p className="text-muted-foreground">
            Manage sight singing exercises and track student progress
          </p>
        </div>
        <Button onClick={() => window.open('/sight-reading-submission', '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Sight Reading Submission
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-foreground">{stats.completionRate}%</div>
            <div className="text-sm text-muted-foreground">Completion Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-foreground">{stats.activeExercises}</div>
            <div className="text-sm text-muted-foreground">Active Exercises</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-foreground">{stats.totalSections}</div>
            <div className="text-sm text-muted-foreground">Sections</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-foreground">{stats.weeklyProgress}%</div>
            <div className="text-sm text-muted-foreground">Weekly Progress</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Management Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Sight Reading Management System</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="records">Records</TabsTrigger>
            </TabsList>
              
            <TabsContent value="assignments" className="space-y-6">
              <SightReadingAssignmentManager user={user} />
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              <StudentProgressTracker />
            </TabsContent>
              
            <TabsContent value="generate" className="space-y-6">
              <SightReadingGenerator onStartSightReading={handleStartSightReading} />
            </TabsContent>
              
            <TabsContent value="upload" className="space-y-6">
              <SightReadingUploader externalMelody={generatedMelody} />
            </TabsContent>
            
            <TabsContent value="records" className="space-y-6">
              <SightSingingRecords />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            This module provides comprehensive sight singing training and progress tracking for all choir sections.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveTab("assignments")}>
              <Target className="h-4 w-4 mr-2" />
              Manage Assignments
            </Button>
            <Button variant="outline" onClick={() => setActiveTab("progress")}>
              <TrendingUp className="h-4 w-4 mr-2" />
              View Progress Report
            </Button>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Section Performance
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};