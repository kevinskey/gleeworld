import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Music, Clock, MapPin, User, GraduationCap, BookOpen, Award, CheckCircle } from 'lucide-react';

const ChoralConductingLiterature = () => {
  const [showObjectives, setShowObjectives] = React.useState(false);
  const [showMaterials, setShowMaterials] = React.useState(false);
  const [showGrading, setShowGrading] = React.useState(false);
  const [showSchedule, setShowSchedule] = React.useState(false);
  const [showTextbook, setShowTextbook] = React.useState(false);

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Hero Section */}
        <section className="py-16 px-6 bg-gradient-to-b from-slate-900/50 to-transparent">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-primary/20 rounded-full shadow-lg shadow-primary/20">
                <Music className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              MUS 210 — Conducting for the Complete Musician
            </h1>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <Badge variant="secondary" className="text-sm">2 Credits</Badge>
              <Badge variant="outline" className="text-sm">Spring Semester</Badge>
            </div>
            <p className="text-base sm:text-lg text-slate-400 mb-6">
              with Dr. Kevin P. Johnson
            </p>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8 px-4">
              Develop the complete modern conductor with baton technique, expressive gesture, score analysis, rehearsal pedagogy, and stylistic fluency across classical, spirituals, gospel, and contemporary choral traditions
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center px-4">
              <Link to="/academy-student-registration" className="w-full sm:w-auto">
                <Button size="lg" className="gap-2 shadow-lg w-full sm:w-auto">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">Register for Course</span>
                </Button>
              </Link>
              <Link to="/auth?tab=login" className="w-full sm:w-auto">
                <Button size="lg" className="gap-2 bg-slate-800 hover:bg-slate-700 text-white border-slate-700 w-full sm:w-auto" variant="outline">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">Student Login</span>
                </Button>
              </Link>
            </div>
            <p className="text-sm text-slate-400 mt-4">
              Register or login as a student to access course materials
            </p>
          </div>
        </section>

        {/* Course Info Cards */}
        <section className="py-12 px-6 bg-slate-900/30">
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
                  <p className="text-sm text-muted-foreground">kjohns10@spelman.edu</p>
                  <p className="text-sm text-muted-foreground">Office: Fine Arts 105</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Duration</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>MW — 2× per week</p>
                  <p className="text-sm text-muted-foreground">50 min sessions</p>
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
                  <p>Fine Arts 109</p>
                  <p className="text-sm text-muted-foreground">Spelman College</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Level</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>Advanced</p>
                  <p className="text-sm text-muted-foreground">Prerequisites Required</p>
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
                  This course develops the complete modern conductor. Students gain baton technique, expressive gesture, 
                  score analysis methods, rehearsal pedagogy, and stylistic fluency across classical, spirituals, gospel, 
                  and contemporary choral traditions. Emphasis is placed on artistry, leadership, and practical rehearsal skills.
                </p>
              </CardContent>
            </Card>

            {/* Course Highlights */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-6 h-6" />
                  Course Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold mb-1">Conducting Technique</h4>
                        <p className="text-sm text-muted-foreground">Master fundamental and advanced conducting patterns, gestures, and communication techniques</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold mb-1">Score Analysis</h4>
                        <p className="text-sm text-muted-foreground">Learn to analyze choral scores for form, harmony, text setting, and expressive intent</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold mb-1">Rehearsal Planning</h4>
                        <p className="text-sm text-muted-foreground">Develop effective rehearsal strategies, warm-ups, and ensemble-building techniques</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold mb-1">Repertoire Selection</h4>
                        <p className="text-sm text-muted-foreground">Explore diverse choral literature and learn to build balanced, meaningful programs</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Learning Objectives - Collapsed by default */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 cursor-pointer" onClick={() => setShowObjectives(!showObjectives)}>
                  <GraduationCap className="w-6 h-6" />
                  Learning Objectives
                  <span className="ml-auto text-sm text-muted-foreground">
                    {showObjectives ? 'Hide' : 'Show'} Details
                  </span>
                </CardTitle>
              </CardHeader>
              {showObjectives && (
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-3">By the end of the semester, students will:</h3>
                      <ul className="space-y-3 text-muted-foreground">
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Demonstrate proper baton and expressive gesture technique
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Conduct beat patterns in multiple meters and tempi
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Employ advanced conducting techniques (phrase shaping, left hand, fermatas, releases, tempo changes)
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Analyze choral scores for harmony, text, structure, and style
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Demonstrate musicianship skills essential for conducting success
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Define major choral forms, styles, and terms
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Understand ensemble setup, balance, instrumentation, and seating
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Memorize and conduct 30 minutes of a major choral work
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Identify online and print choral resources
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Conduct rehearsals in real ensemble settings
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Required Materials - Collapsed by default */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 cursor-pointer" onClick={() => setShowMaterials(!showMaterials)}>
                  <BookOpen className="w-6 h-6" />
                  Required Materials
                  <span className="ml-auto text-sm text-muted-foreground">
                    {showMaterials ? 'Hide' : 'Show'} Details
                  </span>
                </CardTitle>
              </CardHeader>
              {showMaterials && (
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-3 text-foreground">Required Texts</h3>
                      <ul className="space-y-3 text-muted-foreground">
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                          <div><em>A Survey of Choral Music</em> — Homer Ulrich</div>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                          <div><em>The Modern Conductor</em> — Elizabeth Green & Mark Gibson</div>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-3 text-foreground">Required Materials</h3>
                      <ul className="space-y-3 text-muted-foreground">
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                          <div><span className="font-semibold text-foreground">Baton</span></div>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                          <div><span className="font-semibold text-foreground">Video recording device</span></div>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                          <div><span className="font-semibold text-foreground">Internet access</span></div>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                          <div><span className="font-semibold text-foreground">Pencil</span> (No. 2)</div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Grading Policy - Collapsed by default */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 cursor-pointer" onClick={() => setShowGrading(!showGrading)}>
                  <Award className="w-6 h-6" />
                  Assessment & Grading
                  <span className="ml-auto text-sm text-muted-foreground">
                    {showGrading ? 'Hide' : 'Show'} Details
                  </span>
                </CardTitle>
              </CardHeader>
              {showGrading && (
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3 text-foreground">Attendance Policy</h3>
                      <p className="text-muted-foreground mb-2">Students may miss 2 classes without penalty.</p>
                      <p className="text-muted-foreground mb-2">Each additional absence lowers the final grade by one letter.</p>
                      <p className="text-muted-foreground mb-2">Four absences result in removal from the class (unless documented emergencies).</p>
                      <p className="text-muted-foreground">Three tardies = 1 absence.</p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3 text-foreground">Grading Breakdown</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span>Class Participation</span>
                          <Badge variant="secondary">15%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span>5 Choral Warm-Ups (PDF)</span>
                          <Badge variant="secondary">20%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span>30-Minute Major Work (Final)</span>
                          <Badge variant="secondary">20%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span>Midterm Exam</span>
                          <Badge variant="secondary">15%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span>Final Exam</span>
                          <Badge variant="secondary">15%</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span>Period Presentations</span>
                          <Badge variant="secondary">15%</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Weekly Schedule - Collapsed by default */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 cursor-pointer" onClick={() => setShowSchedule(!showSchedule)}>
                  <Clock className="w-6 h-6" />
                  Weekly Schedule
                  <span className="ml-auto text-sm text-muted-foreground">
                    {showSchedule ? 'Hide' : 'Show'} Details
                  </span>
                </CardTitle>
              </CardHeader>
              {showSchedule && (
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-l-2 border-primary pl-4">
                      <h4 className="font-semibold">WEEK 1 — Jan 14 & 16</h4>
                      <p className="text-sm text-muted-foreground">Course introduction • Posture, window, meter • Basic conducting patterns • Diagnostic video</p>
                    </div>
                    <div className="border-l-2 border-muted pl-4">
                      <h4 className="font-semibold">WEEK 2 — Jan 21 & 23</h4>
                      <p className="text-sm text-muted-foreground">Patterns continued • "Choral Conductor as Leader" presentations • Conducting Exercise 1</p>
                    </div>
                    <div className="border-l-2 border-muted pl-4">
                      <h4 className="font-semibold">WEEK 3 — Jan 28 & 30</h4>
                      <p className="text-sm text-muted-foreground">Pattern refinement • Conducting Exercise 2</p>
                    </div>
                    <div className="border-l-2 border-muted pl-4">
                      <h4 className="font-semibold">WEEK 4 — Feb 4 & 6</h4>
                      <p className="text-sm text-muted-foreground">Renaissance presentations • Renaissance style & practice</p>
                    </div>
                    <div className="border-l-2 border-muted pl-4">
                      <h4 className="font-semibold">WEEK 5 — Feb 11 & 13</h4>
                      <p className="text-sm text-muted-foreground">Renaissance Conducting Exam</p>
                    </div>
                    <div className="border-l-2 border-muted pl-4">
                      <h4 className="font-semibold">WEEK 6 — Feb 18 & 20</h4>
                      <p className="text-sm text-muted-foreground">Baroque presentations</p>
                    </div>
                    <div className="border-l-2 border-muted pl-4">
                      <h4 className="font-semibold">WEEK 7 — Feb 25 & 27</h4>
                      <p className="text-sm text-muted-foreground">Baroque Conducting Exam</p>
                    </div>
                    <div className="border-l-2 border-primary pl-4">
                      <h4 className="font-semibold">WEEK 8 — March 5 & 6 (MIDTERM)</h4>
                      <p className="text-sm text-muted-foreground">Conducting Exercise 3 • Classical presentations • Midterm practical & written</p>
                    </div>
                    <div className="border-l-2 border-muted-foreground/50 pl-4 bg-muted/30 rounded p-2">
                      <h4 className="font-semibold">WEEK 9 — March 9-13</h4>
                      <p className="text-sm text-muted-foreground">SPRING BREAK — No Classes</p>
                    </div>
                    <div className="border-l-2 border-muted pl-4">
                      <h4 className="font-semibold">WEEK 10 — March 17 & 19</h4>
                      <p className="text-sm text-muted-foreground">Classical conducting • Classical Conducting Exam</p>
                    </div>
                    <div className="border-l-2 border-muted pl-4">
                      <h4 className="font-semibold">WEEK 11 — March 24 & 26</h4>
                      <p className="text-sm text-muted-foreground">Romantic presentations</p>
                    </div>
                    <div className="border-l-2 border-muted pl-4">
                      <h4 className="font-semibold">WEEK 12 — March 31 & April 2</h4>
                      <p className="text-sm text-muted-foreground">Romantic Conducting Exam • Conducting Exercise 4 • Negro Spirituals presentations</p>
                    </div>
                    <div className="border-l-2 border-muted pl-4">
                      <h4 className="font-semibold">WEEK 13 — April 7 & 9</h4>
                      <p className="text-sm text-muted-foreground">Negro Spirituals Conducting Exam</p>
                    </div>
                    <div className="border-l-2 border-muted pl-4">
                      <h4 className="font-semibold">WEEK 14 — April 14 & 16</h4>
                      <p className="text-sm text-muted-foreground">Gospel presentations</p>
                    </div>
                    <div className="border-l-2 border-muted pl-4">
                      <h4 className="font-semibold">WEEK 15 — April 21 & 23</h4>
                      <p className="text-sm text-muted-foreground">Gospel Conducting Exam • Final project coaching</p>
                    </div>
                    <div className="border-l-2 border-muted pl-4">
                      <h4 className="font-semibold">WEEK 16 — April 28 & 29</h4>
                      <p className="text-sm text-muted-foreground">Final project practice • Course evaluations</p>
                    </div>
                    <div className="border-l-2 border-primary pl-4">
                      <h4 className="font-semibold">FINAL EXAM WEEK — May 4-8</h4>
                      <p className="text-sm text-muted-foreground">Conduct 30-Minute Final Project • Written Final Exam</p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Assignments */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-6 h-6" />
                  Assignments & Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Complete assigned readings and weekly conducting labs
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Prepare 5 original choral warm-ups (PDF)
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Present historical periods with one-page handout
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Conduct one work from each major musical era
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Midterm written + practical exam
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Final project: 30 minutes of a major work by memory
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Prerequisites */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Office Hours & Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-muted-foreground">
                  <p><span className="font-semibold text-foreground">Office Hours:</span> MWF 3–5 PM or by appointment</p>
                  <p><span className="font-semibold text-foreground">Email:</span> kjohns10@spelman.edu</p>
                  <p><span className="font-semibold text-foreground">Office:</span> Fine Arts 105</p>
                </div>
              </CardContent>
            </Card>

            {/* Policies */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Course Policies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2 text-foreground">Disability Statement</h3>
                    <p className="text-muted-foreground text-sm">
                      Students requiring accommodations should contact the Office of Disability Services 
                      (MacVicar Hall, 404-223-7590) for coordination.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-foreground">Academic Honesty</h3>
                    <p className="text-muted-foreground text-sm">
                      All submitted work must be original and comply with Spelman's Code of Conduct regarding 
                      academic integrity.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Textbook - Collapsed by default */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 cursor-pointer" onClick={() => setShowTextbook(!showTextbook)}>
                  <BookOpen className="w-6 h-6" />
                  Course Textbook
                  <span className="ml-auto text-sm text-muted-foreground">
                    {showTextbook ? 'Hide' : 'Show'} Textbook
                  </span>
                </CardTitle>
              </CardHeader>
              {showTextbook && (
                <CardContent>
                  <div className="w-full border border-border rounded-lg overflow-hidden">
                    <iframe
                      src="https://gamma.app/embed/qpwgjhqyohq63uo"
                      className="w-full h-[450px]"
                      title="Conducting for the Complete Musician: A Choral Conducting Text (1925–2025)"
                      allow="fullscreen"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 px-6 bg-gradient-to-b from-transparent to-slate-900/50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to Master Choral Conducting?
            </h2>
            <p className="text-slate-300 mb-8">
              Join us in this transformative journey to develop your skills as a choral conductor and leader.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/academy-student-registration">
                <Button size="lg" className="gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Register Now
                </Button>
              </Link>
              <Link to="/booking">
                <Button size="lg" variant="outline" className="gap-2 border-2">
                  <User className="w-5 h-5" />
                  Schedule Consultation
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
};

export default ChoralConductingLiterature;
