import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, BookOpen, TrendingUp, Target, Users } from 'lucide-react';

interface SightSingingManagerProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
  };
}

export const SightSingingManager = ({ user }: SightSingingManagerProps) => {
  const [stats] = useState({
    completionRate: 85,
    activeExercises: 12,
    totalSections: 4,
    weeklyProgress: 78
  });

  const exercises = [
    { id: '1', title: 'Interval Training - Major 3rds', type: 'Intervals', difficulty: 'Beginner', completion: 90 },
    { id: '2', title: 'Chord Recognition - Triads', type: 'Chords', difficulty: 'Intermediate', completion: 75 },
    { id: '3', title: 'Rhythmic Patterns - Compound Meter', type: 'Rhythm', difficulty: 'Advanced', completion: 60 },
    { id: '4', title: 'Scale Degrees - Minor Keys', type: 'Scales', difficulty: 'Intermediate', completion: 80 }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-foreground">Sight Singing Management</h3>
          <p className="text-muted-foreground">
            Integrate with SightReadingFactory.com and track progress
          </p>
        </div>
        <Button onClick={() => window.open('https://sightreadingfactory.com', '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open SightReadingFactory
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

      {/* Exercises List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Active Sight Singing Exercises
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {exercises.map((exercise) => (
            <div key={exercise.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{exercise.title}</div>
                <div className="text-sm text-muted-foreground">{exercise.type}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(exercise.difficulty)}`}>
                  {exercise.difficulty}
                </span>
                <div className="text-right">
                  <div className="text-sm font-medium">{exercise.completion}%</div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
                <Button size="sm" variant="outline">
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle>SightReadingFactory.com Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            This module integrates with SightReadingFactory.com to provide comprehensive sight singing training and progress tracking for all choir sections.
          </p>
          <div className="flex gap-2">
            <Button variant="outline">
              <Target className="h-4 w-4 mr-2" />
              Assign Exercise
            </Button>
            <Button variant="outline">
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