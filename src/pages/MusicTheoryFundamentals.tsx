import React from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Music, Clock, MapPin, User, GraduationCap, BookOpen, Award, Calendar, CheckCircle } from 'lucide-react';

const MusicTheoryFundamentals = () => {
  const weeklySchedule = [
    {
      month: "August",
      weeks: [
        { week: 1, date: "Aug 21", topic: "Intro to notation, clefs, rhythm values" },
        { week: 2, date: "Aug 26 & 28", topic: "Time signatures and meter; rhythm dictation" }
      ]
    },
    {
      month: "September", 
      weeks: [
        { week: 3, topic: "Major scales; stepwise solfège singing" },
        { week: 4, topic: "Intervals (M, m, P); interval dictation" },
        { week: 5, topic: "Triads; arpeggio sight singing" },
        { week: 6, topic: "Key signatures & Circle of Fifths; scale singing in varied keys" }
      ]
    },
    {
      month: "October",
      weeks: [
        { week: 7, topic: "Triad inversions; harmonic ear training" },
        { week: "Midterm", date: "Oct 2", topic: "Midterm Exam", isExam: true },
        { week: 8, topic: "Seventh chords (Mm7, MM7, mm7); dictation" },
        { week: 9, topic: "Harmonic function & cadences; ii–V–I singing" },
        { week: 10, topic: "Diatonic chords in major keys; melodic dictation with leaps" },
        { week: 11, topic: "Secondary dominants (V7/V, V7/IV); applied singing drills" }
      ]
    },
    {
      month: "November",
      weeks: [
        { week: 12, topic: "More secondary dominants; tonicization dictation" },
        { week: 13, topic: "ii–V–I cadences; short melodic dictation" },
        { week: 14, topic: "Formal review of forms; integrated dictation" },
        { week: 15, date: "Nov 25", topic: "Comprehensive review (no class Nov 27)" }
      ]
    },
    {
      month: "December",
      weeks: [
        { week: 16, date: "Dec 2", topic: "Final Exam (written + aural)", isExam: true }
      ]
    }
  ];

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
              Music Theory Fundamentals
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Fundamentals of Music – Theory & Ear Training Component
            </p>
            <p className="text-lg text-muted-foreground mb-6">
              with Dr. Kevin P. Johnson
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Master the building blocks of music with comprehensive lessons in theory, notation, and ear training
            </p>
          </div>
        </section>

        {/* Course Info Cards */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Instructor</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">Dr. Kevin Johnson</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Schedule</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>Tuesdays & Thursdays</p>
                  <p className="text-sm text-muted-foreground">3:00–3:50 pm</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Location</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>Rockefeller Fine Arts</p>
                  <p className="text-sm text-muted-foreground">Room #303</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Requirement</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>Minimum C (74%)</p>
                  <p className="text-sm text-muted-foreground">to pass course</p>
                </CardContent>
              </Card>
            </div>

            {/* Course Description */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-6 h-6" />
                  Course Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  The Theory component of Fundamentals of Music builds fluency in written notation, scales, 
                  intervals, chords, and harmonic function, reinforced by daily sight singing and ear training. 
                  This sequence parallels the keyboard curriculum, ensuring students develop skills across written, 
                  aural, and applied modalities.
                </p>
              </CardContent>
            </Card>

            {/* Learning Objectives */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-6 h-6" />
                  Learning Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 font-medium">By the end of the semester, students will:</p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Demonstrate fluency in reading/writing standard music notation.
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Identify and construct scales, intervals, triads, and seventh chords.
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Apply rhythmic principles in simple and compound meters.
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Analyze and realize chord progressions with cadences and secondary functions.
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Sight-sing melodies using solfège and rhythm syllables with accuracy.
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Accurately transcribe short melodic and rhythmic dictations.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Required Materials */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Required Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                    Instructor handouts and selected readings (provided via course site)
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                    Fundamentals Hub (Lovable/ChatGPT interface) for sight singing and dictation assignments
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                    Manuscript paper, pencil, and personal device with audio playback/recording
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Grading Breakdown */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Grading (Theory Component)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Written Assignments</span>
                    <Badge variant="secondary">30%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Aural/Sight Singing</span>
                    <Badge variant="secondary">25%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Midterm Exam</span>
                    <Badge variant="secondary">20%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Final Exam</span>
                    <Badge variant="secondary">25%</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4 italic">
                  *A minimum grade of C (74%) in this component is required to pass Fundamentals of Music overall.*
                </p>
              </CardContent>
            </Card>

            {/* Weekly Schedule */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-6 h-6" />
                  Weekly Content & Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weeklySchedule.map((month, monthIndex) => (
                  <div key={month.month} className="mb-6">
                    <h3 className="text-lg font-semibold text-primary mb-3">{month.month}</h3>
                    <div className="space-y-2">
                      {month.weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className={`p-3 rounded-lg border ${week.isExam ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex items-center gap-2">
                              {week.isExam && <Award className="w-4 h-4 text-primary" />}
                              <span className="font-medium">
                                Week {week.week}
                              </span>
                              {week.date && (
                                <Badge variant="outline" className="text-xs">
                                  {week.date}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between flex-1">
                              <span className="text-muted-foreground">{week.topic}</span>
                              {week.week === 1 && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.location.href = '/music-theory/notation-basics'}
                                >
                                  Start Learning
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {monthIndex < weeklySchedule.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Class Structure */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Weekly Class Structure (Typical)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="bg-primary text-primary-foreground rounded px-2 py-1 text-sm font-medium">
                      5–10 min
                    </div>
                    <div>
                      <h4 className="font-medium">Warm-Up</h4>
                      <p className="text-sm text-muted-foreground">Sight singing with solfège, rhythm syllables</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="bg-primary text-primary-foreground rounded px-2 py-1 text-sm font-medium">
                      25–30 min
                    </div>
                    <div>
                      <h4 className="font-medium">Core Topic</h4>
                      <p className="text-sm text-muted-foreground">Theory instruction (notation, scales, harmony)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="bg-primary text-primary-foreground rounded px-2 py-1 text-sm font-medium">
                      10 min
                    </div>
                    <div>
                      <h4 className="font-medium">Application</h4>
                      <p className="text-sm text-muted-foreground">Ear training dictation or listening recognition</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assessment Statement */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Assessment Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Evidence of achievement in basic musicianship will be determined by formal examinations and by 
                  scored artifacts generated via the Fundamentals Hub (notation, recordings, automated analysis, 
                  rubrics). Outcomes are synchronized with weekly Keyboard skills to ensure transfer across written, 
                  aural, and applied domains.
                </p>
              </CardContent>
            </Card>

            {/* Get Started Section */}
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Begin?</h2>
              <p className="text-muted-foreground mb-6">
                Start your journey in music theory fundamentals today
              </p>
              <Button size="lg" className="mr-4">
                Access Course Materials
              </Button>
              <Button variant="outline" size="lg">
                Contact Dr. Johnson
              </Button>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
};

export default MusicTheoryFundamentals;