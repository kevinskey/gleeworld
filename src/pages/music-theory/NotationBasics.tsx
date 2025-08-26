import React, { useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Music, Clock, BookOpen, Play, CheckCircle, Circle, ArrowRight, Volume2 } from 'lucide-react';

const NotationBasics = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const timelineSteps = [
    {
      id: 0,
      title: "Music Staff & Lines",
      duration: "10 min",
      description: "Understanding the 5-line staff system and spaces",
      content: {
        theory: "The musical staff consists of five horizontal lines and four spaces. Each line and space represents a different pitch.",
        examples: ["Line notes: E, G, B, D, F (Every Good Boy Does Fine)", "Space notes: F, A, C, E (FACE)"],
        practice: "Identify line and space positions on the treble clef staff"
      }
    },
    {
      id: 1,
      title: "Treble Clef",
      duration: "12 min", 
      description: "The most common clef for higher-pitched instruments",
      content: {
        theory: "The treble clef (𝄞) indicates that the second line of the staff represents the pitch G above middle C.",
        examples: ["Used for: piano right hand, violin, flute, trumpet", "G clef symbol wraps around the G line"],
        practice: "Read simple note names in treble clef"
      }
    },
    {
      id: 2,
      title: "Bass Clef",
      duration: "12 min",
      description: "Essential clef for lower-pitched instruments",
      content: {
        theory: "The bass clef (𝄢) indicates that the fourth line of the staff represents the pitch F below middle C.",
        examples: ["Used for: piano left hand, bass guitar, tuba, trombone", "Two dots surround the F line"],
        practice: "Compare note positions between treble and bass clefs"
      }
    },
    {
      id: 3,
      title: "Whole & Half Notes",
      duration: "15 min",
      description: "Understanding longer note durations",
      content: {
        theory: "Whole notes last 4 beats, half notes last 2 beats. Note duration is shown by the note head style.",
        examples: ["Whole note: ○ (4 beats)", "Half note: ♩ (2 beats with stem)"],
        practice: "Count and clap different note durations"
      }
    },
    {
      id: 4,
      title: "Quarter & Eighth Notes", 
      duration: "15 min",
      description: "Shorter note values for detailed rhythms",
      content: {
        theory: "Quarter notes are 1 beat, eighth notes are 1/2 beat. Stems and beams show duration.",
        examples: ["Quarter note: ♪ (1 beat)", "Eighth note: ♫ (1/2 beat, often beamed together)"],
        practice: "Clap simple rhythm patterns with quarter and eighth notes"
      }
    },
    {
      id: 5,
      title: "Rhythm Combinations",
      duration: "16 min",
      description: "Putting different note values together",
      content: {
        theory: "Different note values can be combined to create complex rhythmic patterns in music.",
        examples: ["♪ ♫ ♪ ♪ pattern", "♩ ♪ ♪ ♩ pattern"],
        practice: "Read and perform mixed rhythm exercises"
      }
    }
  ];

  const handleStepComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
    if (stepId < timelineSteps.length - 1) {
      setCurrentStep(stepId + 1);
    }
  };

  const progressPercentage = (completedSteps.length / timelineSteps.length) * 100;

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        {/* Hero Section */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-primary/10 rounded-full">
                <Music className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Introduction to Music Notation
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Week 1: Clefs, Staff, and Rhythm Values
            </p>
            <p className="text-lg text-muted-foreground mb-6">
              Music Theory Fundamentals with Dr. Kevin P. Johnson
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Total Time: ~80 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>6 Learning Modules</span>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Section */}
        <section className="py-8 px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Your Progress</span>
                  <Badge variant="secondary">{completedSteps.length}/{timelineSteps.length} Complete</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={progressPercentage} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2">
                  {progressPercentage.toFixed(0)}% completed
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Learning Timeline */}
        <section className="py-8 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Learning Timeline</h2>
            
            <div className="space-y-6">
              {timelineSteps.map((step, index) => (
                <div key={step.id} className="relative">
                  {/* Timeline connector */}
                  {index < timelineSteps.length - 1 && (
                    <div className="absolute left-6 top-16 w-0.5 h-24 bg-border"></div>
                  )}
                  
                  <div className={`flex gap-6 ${currentStep === step.id ? 'ring-2 ring-primary/20 rounded-lg p-4' : ''}`}>
                    {/* Timeline dot */}
                    <div className="flex-shrink-0 mt-6">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                        completedSteps.includes(step.id) 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : currentStep === step.id
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-background border-border text-muted-foreground'
                      }`}>
                        {completedSteps.includes(step.id) ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <Circle className="w-6 h-6" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <Card className={`${currentStep === step.id ? 'border-primary shadow-md' : ''}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-3">
                                {step.title}
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {step.duration}
                                </Badge>
                              </CardTitle>
                              <CardDescription>{step.description}</CardDescription>
                            </div>
                            {currentStep === step.id && (
                              <Badge className="bg-primary/10 text-primary border-primary">
                                Current
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        
                        {currentStep === step.id && (
                          <CardContent>
                            <div className="space-y-4">
                              {/* Theory Section */}
                              <div>
                                <h4 className="font-semibold text-primary mb-2">Theory</h4>
                                <p className="text-muted-foreground">{step.content.theory}</p>
                              </div>

                              <Separator />

                              {/* Examples Section */}
                              <div>
                                <h4 className="font-semibold text-primary mb-2">Examples</h4>
                                <ul className="space-y-1">
                                  {step.content.examples.map((example, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                                      <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                                      {example}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <Separator />

                              {/* Practice Section */}
                              <div>
                                <h4 className="font-semibold text-primary mb-2">Practice</h4>
                                <p className="text-muted-foreground mb-4">{step.content.practice}</p>
                                
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => handleStepComplete(step.id)}
                                    disabled={completedSteps.includes(step.id)}
                                  >
                                    {completedSteps.includes(step.id) ? (
                                      <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Completed
                                      </>
                                    ) : (
                                      <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Start Practice
                                      </>
                                    )}
                                  </Button>
                                  
                                  {step.id < timelineSteps.length - 1 && completedSteps.includes(step.id) && (
                                    <Button 
                                      variant="outline" 
                                      onClick={() => setCurrentStep(step.id + 1)}
                                    >
                                      Next Module
                                      <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        )}
                        
                        {currentStep !== step.id && !completedSteps.includes(step.id) && (
                          <CardContent>
                            <Button 
                              variant="outline" 
                              onClick={() => setCurrentStep(step.id)}
                              className="w-full"
                            >
                              Start Module
                            </Button>
                          </CardContent>
                        )}
                      </Card>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Reference Cards */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Quick Reference</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Staff Lines (Treble Clef)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm"><strong>Lines:</strong> E, G, B, D, F</p>
                    <p className="text-xs text-muted-foreground">"Every Good Boy Does Fine"</p>
                    <p className="text-sm"><strong>Spaces:</strong> F, A, C, E</p>
                    <p className="text-xs text-muted-foreground">"FACE"</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Note Values</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">○ Whole = 4 beats</p>
                    <p className="text-sm">♩ Half = 2 beats</p>
                    <p className="text-sm">♪ Quarter = 1 beat</p>
                    <p className="text-sm">♫ Eighth = 1/2 beat</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Clef Symbols</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm"><strong>Treble (𝄞):</strong> G on 2nd line</p>
                    <p className="text-sm"><strong>Bass (𝄢):</strong> F on 4th line</p>
                    <p className="text-sm"><strong>Alto (𝄡):</strong> C on 3rd line</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <section className="py-8 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Ready for Week 2?</h3>
                <p className="text-muted-foreground mb-6">
                  Continue your music theory journey with time signatures and meter
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg">
                    Next: Time Signatures & Meter
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" size="lg">
                    Back to Course Overview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
};

export default NotationBasics;