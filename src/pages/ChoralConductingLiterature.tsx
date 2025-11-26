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
              Choral Conducting and Literature
            </h1>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <Badge variant="secondary" className="text-sm">Advanced Level</Badge>
              <Badge variant="outline" className="text-sm">16 Weeks</Badge>
            </div>
            <p className="text-base sm:text-lg text-slate-400 mb-6">
              with Dr. Kevin P. Johnson
            </p>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8 px-4">
              Master the art of choral conducting with comprehensive training in technique, score analysis, and repertoire selection
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
                  <p>16 Weeks</p>
                  <p className="text-sm text-muted-foreground">3-Credit Course</p>
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
                  <p className="text-sm text-muted-foreground">Music Wing</p>
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
                <p className="text-muted-foreground leading-relaxed mb-4">
                  This advanced course provides comprehensive training in the art and craft of choral conducting. 
                  Students will develop technical proficiency in conducting patterns, score analysis, rehearsal 
                  techniques, and repertoire selection across diverse musical periods and styles.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Through hands-on practice, video analysis, and live conducting opportunities with the Spelman 
                  College Glee Club and other ensembles, students will cultivate their artistic voice and develop 
                  the leadership skills essential for successful choral direction.
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
                      <h3 className="font-semibold mb-3">By the end of this course, students will be able to:</h3>
                      <ul className="space-y-3 text-muted-foreground">
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Demonstrate proficiency in conducting patterns and expressive gestures for various meters and styles
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Analyze choral scores and prepare interpretive plans that reflect musical and textual understanding
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Plan and execute effective rehearsals that address technical, musical, and ensemble-building goals
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Select and program appropriate repertoire for various choral ensembles and contexts
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Develop a personal conducting style grounded in technical precision and artistic expression
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          Apply knowledge of choral literature from diverse periods, cultures, and traditions
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
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                      <div>
                        <span className="font-semibold text-foreground">Conducting baton</span> (professional quality recommended)
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                      <div>
                        <span className="font-semibold text-foreground">Selected choral scores</span> (provided by instructor)
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                      <div>
                        <span className="font-semibold text-foreground">Recording device</span> for self-evaluation and practice
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                      <div>
                        <span className="font-semibold text-foreground">Access to piano/keyboard</span> for score study
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                      <div>
                        Assigned readings and resources (provided via GleeWorld platform)
                      </div>
                    </li>
                  </ul>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span>Conducting Technique Exams</span>
                      <Badge variant="secondary">30%</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span>Score Analysis Papers</span>
                      <Badge variant="secondary">25%</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span>Rehearsal Plans & Execution</span>
                      <Badge variant="secondary">25%</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span>Final Conducting Project</span>
                      <Badge variant="secondary">20%</Badge>
                    </div>
                  </div>

                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <h4 className="font-semibold text-foreground mb-3">Grading Scale:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div><span className="font-semibold">A:</span> 93-100</div>
                      <div><span className="font-semibold">A-:</span> 90-92</div>
                      <div><span className="font-semibold">B+:</span> 87-89</div>
                      <div><span className="font-semibold">B:</span> 83-86</div>
                      <div><span className="font-semibold">B-:</span> 80-82</div>
                      <div><span className="font-semibold">C+:</span> 77-79</div>
                      <div><span className="font-semibold">C:</span> 73-76</div>
                      <div><span className="font-semibold">C-:</span> 70-72</div>
                      <div><span className="font-semibold">D:</span> 60-69</div>
                      <div><span className="font-semibold">F:</span> Below 60</div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Prerequisites */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Prerequisites</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Completion of Music Theory I & II or equivalent
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Proficiency in piano/keyboard skills
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Experience in choral ensemble participation
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    Instructor approval required
                  </li>
                </ul>
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
                  <div className="w-full h-[600px] border border-border rounded-lg overflow-hidden">
                    <iframe
                      src="YOUR_TEXTBOOK_URL_HERE"
                      className="w-full h-full"
                      title="Choral Conducting Textbook"
                      allow="fullscreen"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Replace YOUR_TEXTBOOK_URL_HERE with your actual textbook embed URL
                  </p>
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
