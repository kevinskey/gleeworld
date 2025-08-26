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
                  <p>Mon, Tue, Thu, Fri</p>
                  <p className="text-sm text-muted-foreground">2-Credit Course</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Components</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>3 Integrated Parts</p>
                  <p className="text-sm text-muted-foreground">Theory, Keyboard, History</p>
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
                  <p className="text-sm text-muted-foreground">in EACH component</p>
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
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Fundamentals of Music is a multi-faceted fundamental course designed to establish a strong 
                  foundation for all music majors and minors. This 2-credit course meets four days a week 
                  (Monday–Friday, excluding Wednesday) and is designed to reinforce essential skills simultaneously 
                  across multiple modalities (theoretical, applied, and contextual), ensuring that students build 
                  fluency in music fundamentals that will support advanced coursework.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  This structure is intentional and reflects the course's foundational, preparatory nature within 
                  the music curriculum.
                </p>
              </CardContent>
            </Card>

            {/* Course Structure */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Course Structure & Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  This course is designed as a foundational preparatory course for all music majors and minors. 
                  To ensure students develop well-rounded musicianship, the course is divided into three 
                  interdependent components:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card className="border-l-4 border-l-primary">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">1. Keyboard Skills</CardTitle>
                      <CardDescription>Mondays</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Focuses on building technical proficiency and practical musicianship at the keyboard.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">2. Music Theory</CardTitle>
                      <CardDescription>Tuesdays & Thursdays</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Provides the structural and analytical tools necessary for understanding written music.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">3. History & Terminology</CardTitle>
                      <CardDescription>Fridays</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Grounds students in vocabulary, stylistic traditions, and cultural contexts that shape music study.
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-800 mb-2">Important Requirements:</h4>
                  <ul className="space-y-1 text-sm text-amber-700">
                    <li>• Each component has its own grading system and assignments</li>
                    <li>• Students must remain engaged in all three areas</li>
                    <li>• A minimum grade of C (74%) in each individual component is required</li>
                    <li>• Neglecting one component will affect overall progress</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Course & Student Learning Objectives */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-6 h-6" />
                    Course Objectives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 font-medium">By the end of this course, students will be able to:</p>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      Demonstrate fundamental keyboard proficiency through scales, chords, harmonization, and repertoire.
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      Apply theoretical concepts such as notation, intervals, scales, and chord progressions in written and aural exercises.
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      Recognize and define essential music terminology across historical periods and genres.
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      Integrate keyboard, theory, and historical knowledge into broader musicianship and academic study.
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Student Learning Objectives</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 font-medium">Upon successful completion, students will demonstrate skills in:</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-primary text-sm mb-2">1. Keyboard Skills</h4>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li>• Basic performance skills and technique</li>
                        <li>• Scales, arpeggios, and primary triads</li>
                        <li>• Harmonization and transposition</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-primary text-sm mb-2">2. Music Theory</h4>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li>• Notation fluency and construction</li>
                        <li>• Rhythmic principles and chord progressions</li>
                        <li>• Harmonic analysis and aural skills</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-primary text-sm mb-2">3. History & Terminology</h4>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li>• Essential music vocabulary</li>
                        <li>• Major stylistic periods and composers</li>
                        <li>• Historical and contemporary contexts</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Required Materials */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Required Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold text-primary mb-2">Keyboard Skills</h4>
                    <p className="text-sm text-muted-foreground">Alfred's Group Piano for Adults, Book 1 (Lancaster & Renfrow)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary mb-2">Music Theory</h4>
                    <p className="text-sm text-muted-foreground">Instructor handouts and selected texts (see component syllabus)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary mb-2">History & Terminology</h4>
                    <p className="text-sm text-muted-foreground">Instructor handouts, online resources, and listening assignments</p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <ul className="space-y-2 text-sm text-muted-foreground">
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

            {/* Grading Policy */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Grading Policy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-red-800 mb-2">Critical Requirement:</h4>
                  <p className="text-red-700 text-sm">
                    Students must earn at least a C (74%) or higher in each component (Keyboard Skills, Theory, and History/Terminology) to pass Fundamentals of Music overall.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Keyboard Skills</span>
                    <Badge variant="secondary">33.3%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Music Theory</span>
                    <Badge variant="secondary">33.3%</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>History/Terminology</span>
                    <Badge variant="secondary">33.3%</Badge>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-800 mb-2">Example Scenario:</h4>
                  <div className="text-sm text-amber-700 space-y-1">
                    <p>• Keyboard Skills = 82% (B)</p>
                    <p>• Theory = 76% (C)</p>
                    <p>• History/Terminology = 64% (D)</p>
                    <p className="font-semibold">→ Student does NOT pass the course, even though the overall average is 74%.</p>
                  </div>
                </div>
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

            {/* Attendance & Participation */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Attendance & Participation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Because each component meets only once or twice per week, attendance is mandatory. Students are expected to:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    Arrive prepared with all required materials
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    Participate actively in class discussion and performance activities
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    Submit assignments on time
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Policies */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Course Policies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-primary mb-2">Accessibility</h4>
                    <p className="text-sm text-muted-foreground">
                      Spelman College is committed to ensuring full participation of all students. If you have a documented 
                      disability and need reasonable accommodations, contact the Student Access Center at 404-270-5289. 
                      Located in MacVicar Hall, Room 106.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold text-primary mb-2">Academic Integrity</h4>
                    <p className="text-sm text-muted-foreground">
                      All work must be your own. Submitting work that is not yours will result in course failure. 
                      If you're having trouble with deadlines or assignments, please talk to Dr. Johnson proactively 
                      rather than risk academic dishonesty.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold text-primary mb-2">Incomplete Policy</h4>
                    <p className="text-sm text-muted-foreground">
                      An Incomplete (IP) may be assigned for extenuating circumstances preventing completion of final 
                      work. Must be completed by deadline specified on academic calendar or automatically becomes an F.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold text-primary mb-2">Title IX</h4>
                    <p className="text-sm text-muted-foreground">
                      Spelman provides a safe learning environment free from discrimination and harassment. 
                      Faculty are "responsible employees" and must report incidents to the Title IX Director. 
                      Support services are available through Counseling Services, Health Services, and Public Safety.
                    </p>
                  </div>
                </div>
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