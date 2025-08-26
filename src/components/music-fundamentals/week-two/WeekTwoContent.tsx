import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Clock, Music2, Volume2 } from 'lucide-react';
import { TimeSignatureExplainer } from './TimeSignatureExplainer';
import { RhythmDictationExercise } from './RhythmDictationExercise';
import { MeterPractice } from './MeterPractice';

export const WeekTwoContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('theory');

  return (
    <div className="section-spacing">
      <div className="text-center mb-2 md:mb-4">
        <div className="flex items-center justify-center mb-1 md:mb-2">
          <div className="p-1.5 md:p-3 rounded-full bg-primary/10 mr-2 md:mr-4">
            <Clock className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          </div>
          <h1 className="mobile-text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Week 2: Time Signatures & Meter
          </h1>
        </div>
        <p className="mobile-text-lg text-muted-foreground max-w-3xl mx-auto px-2">
          Master time signatures, understand meter, and develop rhythm dictation skills through interactive exercises and practice.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-2 md:mb-4 gap-0.5 md:gap-1">
          <TabsTrigger value="theory" className="flex items-center gap-1 md:gap-2 touch-target">
            <Music2 className="h-3 w-3 md:h-4 md:w-4" />
            <span className="text-xs md:text-sm">Theory</span>
          </TabsTrigger>
          <TabsTrigger value="practice" className="flex items-center gap-1 md:gap-2 touch-target">
            <Clock className="h-3 w-3 md:h-4 md:w-4" />
            <span className="text-xs md:text-sm">Meter Practice</span>
          </TabsTrigger>
          <TabsTrigger value="dictation" className="flex items-center gap-1 md:gap-2 touch-target">
            <Volume2 className="h-3 w-3 md:h-4 md:w-4" />
            <span className="text-xs md:text-sm">Rhythm Dictation</span>
          </TabsTrigger>
          <TabsTrigger value="assessment" className="flex items-center gap-1 md:gap-2 touch-target">
            <Play className="h-3 w-3 md:h-4 md:w-4" />
            <span className="text-xs md:text-sm">Assessment</span>
          </TabsTrigger>
        </TabsList>

        {/* Theory Tab */}
        <TabsContent value="theory" className="section-spacing">
          <div className="responsive-grid-2">
            <Card className="card-compact">
              <CardHeader className="card-header-compact">
                <CardTitle className="page-header">
                  Understanding Time Signatures
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Learn how time signatures organize musical time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeSignatureExplainer />
              </CardContent>
            </Card>

            <Card className="card-compact">
              <CardHeader className="card-header-compact">
                <CardTitle className="page-header">
                  Common Time Signatures
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Examples and applications in music
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="text-lg md:text-xl font-mono bg-primary/10 px-2 py-1 rounded">4/4</div>
                      <span className="text-sm md:text-base font-medium">Common Time</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">Most Popular</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="text-lg md:text-xl font-mono bg-primary/10 px-2 py-1 rounded">3/4</div>
                      <span className="text-sm md:text-base font-medium">Waltz Time</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Triple Meter</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="text-lg md:text-xl font-mono bg-primary/10 px-2 py-1 rounded">2/4</div>
                      <span className="text-sm md:text-base font-medium">March Time</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Duple Meter</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="text-lg md:text-xl font-mono bg-primary/10 px-2 py-1 rounded">6/8</div>
                      <span className="text-sm md:text-base font-medium">Compound Duple</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Compound</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Meter Practice Tab */}
        <TabsContent value="practice" className="section-spacing">
          <Card className="card-compact">
            <CardHeader className="card-header-compact">
              <CardTitle className="page-header">
                Meter Recognition Practice
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Practice identifying different meters and conducting patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MeterPractice />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rhythm Dictation Tab */}
        <TabsContent value="dictation" className="section-spacing">
          <Card className="card-compact">
            <CardHeader className="card-header-compact">
              <CardTitle className="page-header">
                Rhythm Dictation Exercises
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Listen to rhythmic patterns and notate them accurately
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RhythmDictationExercise />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assessment Tab */}
        <TabsContent value="assessment" className="section-spacing">
          <div className="responsive-grid-2">
            <Card className="card-compact">
              <CardHeader className="card-header-compact">
                <CardTitle className="page-header">
                  Week 2 Quiz
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Test your understanding of time signatures and meter
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-primary/5 border-l-4 border-primary">
                  <h4 className="font-medium text-sm md:text-base mb-1">Assessment Topics:</h4>
                  <ul className="text-xs md:text-sm text-muted-foreground space-y-1">
                    <li>• Time signature identification</li>
                    <li>• Beat grouping in different meters</li>
                    <li>• Rhythm dictation accuracy</li>
                    <li>• Conducting pattern recognition</li>
                  </ul>
                </div>
                <Button className="w-full touch-target" size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Start Assessment
                </Button>
              </CardContent>
            </Card>

            <Card className="card-compact">
              <CardHeader className="card-header-compact">
                <CardTitle className="page-header">
                  Practice Assignment
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Complete these exercises before next week
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg border">
                    <span className="text-sm font-medium">Rhythm Dictation Set A</span>
                    <Badge variant="outline" className="text-xs">5 exercises</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg border">
                    <span className="text-sm font-medium">Conducting Practice</span>
                    <Badge variant="outline" className="text-xs">4/4, 3/4, 2/4</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg border">
                    <span className="text-sm font-medium">Meter Analysis</span>
                    <Badge variant="outline" className="text-xs">3 pieces</Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full touch-target">
                  <Music2 className="h-4 w-4 mr-2" />
                  View All Assignments
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};