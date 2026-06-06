import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, Music, Users, Calendar, Target } from 'lucide-react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const Mus210SyllabusPage: React.FC = () => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <UniversalLayout>
      <div className="min-h-screen bg-background">
        {/* Action Bar - hidden in print */}
        <div className="print:hidden sticky top-16 z-20 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Syllabus
            </Button>
          </div>
        </div>

        {/* Syllabus Content */}
        <div className="max-w-4xl mx-auto p-6 md:p-10 bg-background text-foreground print:p-8">
          {/* Header */}
          <header className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img 
                src="/lovable-uploads/0f4599dd-da86-457f-808a-819f3ec7ae66.png" 
                alt="Riverside Music Institute Logo" 
                className="h-16 md:h-20 object-contain"
              />
            </div>
            <p className="text-sm font-medium text-primary mb-2">GleeWorld Academy</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
              MUS 210: Choral Conducting
            </h1>
            <p className="text-lg text-foreground/80">Spring 2026</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                3 Students
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                M/W • 75 min
              </Badge>
              <Badge variant="outline">SSAA Context</Badge>
              <Badge variant="outline">Beginner Undergraduate</Badge>
            </div>
          </header>

          <Separator className="my-6" />

          {/* Course Model */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
              Course Model
            </h2>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <p className="text-lg font-medium text-foreground mb-2">This is not a lecture course.</p>
                <p className="text-2xl font-bold text-primary mb-4">This is a conducting studio.</p>
                <p className="text-foreground/80 font-medium">Every class:</p>
                <ul className="mt-2 space-y-1 text-foreground/80">
                  <li>• 10 min warm-ups (student led)</li>
                  <li>• 3 × 18 min podium blocks</li>
                  <li>• 10 min score & video review</li>
                </ul>
                <p className="mt-4 text-primary font-semibold">Each student conducts every class.</p>
              </CardContent>
            </Card>
          </section>

          {/* Course Information */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
              Course Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p><span className="font-medium text-foreground/70">Course Code:</span> MUS 210</p>
                <p><span className="font-medium text-foreground/70">Term:</span> Spring 2026 (Jan 14 – Apr 29)</p>
                <p><span className="font-medium text-foreground/70">Class Time:</span> Monday & Wednesday, 75 min</p>
              </div>
              <div className="space-y-2">
                <p><span className="font-medium text-foreground/70">Spring Break:</span> Mar 9–13</p>
                <p><span className="font-medium text-foreground/70">Academic Hub:</span> GleeWorld</p>
              </div>
            </div>
          </section>

          {/* Instructor Information */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
              Instructor Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p><span className="font-medium text-foreground/70">Instructor:</span> Dr. Kevin Johnson</p>
                <p><span className="font-medium text-foreground/70">Email:</span> kjohns10@riversidechoir.example</p>
              </div>
              <div className="space-y-2">
                <p><span className="font-medium text-foreground/70">Office:</span> Fine Arts 105</p>
                <p><span className="font-medium text-foreground/70">Office Hours:</span> MWF 3–5 PM or appointment</p>
              </div>
            </div>
          </section>

          <Separator className="my-8" />

          {/* PHASE I */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">PHASE I</div>
              <h2 className="text-xl font-semibold text-foreground">Body → Time → Authority</h2>
            </div>
            <p className="text-sm text-foreground/60 mb-3">Jan 14 – Feb 4</p>
            <Card className="bg-muted/30 border-0 mb-4">
              <CardContent className="p-4">
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Goal: Build physical grammar of conducting before interpretation.
                </p>
              </CardContent>
            </Card>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Topics</h4>
                <ul className="space-y-1 text-foreground/80 text-sm">
                  <li>• Baton grip & posture</li>
                  <li>• Ictus & rebound</li>
                  <li>• 2-3-4 patterns</li>
                  <li>• Subdivision</li>
                  <li>• Preparatory beats</li>
                  <li>• Releases</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Assessments</h4>
                <ul className="space-y-1 text-foreground/80 text-sm">
                  <li>• Weekly conducting videos (GleeWorld)</li>
                  <li>• Mirror drills</li>
                  <li>• <strong>Technique Jury #1 (Feb 4)</strong></li>
                  <li className="pl-4 text-foreground/60">– Patterns, Preps, Cut-offs, Fermatas</li>
                </ul>
              </div>
            </div>
          </section>

          {/* PHASE II */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">PHASE II</div>
              <h2 className="text-xl font-semibold text-foreground">Score = Map</h2>
            </div>
            <p className="text-sm text-foreground/60 mb-3">Feb 9 – Feb 18</p>
            <Card className="bg-muted/30 border-0 mb-4">
              <CardContent className="p-4">
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Goal: Conductors learn to think before moving.
                </p>
              </CardContent>
            </Card>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Topics</h4>
                <ul className="space-y-1 text-foreground/80 text-sm">
                  <li>• Reading SSAA scores</li>
                  <li>• Vocal ranges</li>
                  <li>• Choir layout</li>
                  <li>• Score marking system</li>
                  <li>• Form & phrase structure</li>
                  <li>• Cue mapping</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Assignments</h4>
                <ul className="space-y-1 text-foreground/80 text-sm">
                  <li>• Choose final major work</li>
                  <li>• Begin score memory</li>
                  <li>• Upload marked score to GleeWorld</li>
                </ul>
              </div>
            </div>
          </section>

          {/* PHASE III */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">PHASE III</div>
              <h2 className="text-xl font-semibold text-foreground">Non-Touring Choir Practicum</h2>
            </div>
            <p className="text-sm text-foreground/60 mb-3">Feb 23 – Mar 6 (6 rehearsals)</p>
            <Card className="bg-accent/10 border-accent/30 mb-4">
              <CardContent className="p-4">
                <p className="text-lg font-medium text-foreground italic">
                  "You are not in the room. They run the choir."
                </p>
              </CardContent>
            </Card>
            
            <div className="grid md:grid-cols-2 gap-6 mb-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Repertoire</h4>
                <ul className="space-y-1 text-foreground/80 text-sm">
                  <li>• Morley – <em>Sing We and Chant It</em> (SSAA)</li>
                  <li>• <em>Wade in the Water</em> (SSAA)</li>
                  <li>• <em>Ubi Caritas</em> (SSAA)</li>
                  <li>• <em>Dona Nobis Pacem</em> (round)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Rehearsal Structure (75 min each)</h4>
                <ul className="space-y-1 text-foreground/80 text-sm">
                  <li>• Warm-ups (10)</li>
                  <li>• Conductor A (20)</li>
                  <li>• Conductor B (20)</li>
                  <li>• Conductor C (20)</li>
                  <li>• Debrief (5)</li>
                </ul>
              </div>
            </div>

            <Card className="bg-muted/30 border-0">
              <CardContent className="p-4">
                <h4 className="font-semibold text-foreground mb-2">Required GleeWorld Uploads (each rehearsal)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-foreground/80">
                  <span>• Rehearsal plan</span>
                  <span>• Marked score</span>
                  <span>• Video</span>
                  <span>• Post-rehearsal report</span>
                </div>
                <Separator className="my-3" />
                <p className="text-sm text-foreground/70">
                  <strong>This block fulfills:</strong> Baton technique, Score mastery, Musicianship, Rehearsal leadership
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Spring Break */}
          <div className="my-6 py-3 px-4 bg-muted/50 rounded-lg text-center">
            <p className="text-foreground/60 font-medium">Spring Break — Mar 9–13</p>
          </div>

          {/* PHASE IV */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">PHASE IV</div>
              <h2 className="text-xl font-semibold text-foreground">Advanced Control</h2>
            </div>
            <p className="text-sm text-foreground/60 mb-3">Mar 16 – Apr 1</p>
            <Card className="bg-muted/30 border-0 mb-4">
              <CardContent className="p-4">
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Goal: Move from beating time to shaping music.
                </p>
              </CardContent>
            </Card>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Topics</h4>
                <ul className="space-y-1 text-foreground/80 text-sm">
                  <li>• Rubato</li>
                  <li>• Fermata types</li>
                  <li>• Melding</li>
                  <li>• Mixed meter</li>
                  <li>• Conducting in 1 / 2 / 3 / 4</li>
                  <li>• Phrase direction</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Assessment</h4>
                <ul className="space-y-1 text-foreground/80 text-sm">
                  <li>• <strong>Technique Jury #2</strong></li>
                  <li className="pl-4 text-foreground/60">– Tempo control</li>
                  <li className="pl-4 text-foreground/60">– Fermatas</li>
                  <li className="pl-4 text-foreground/60">– Expressive shaping</li>
                </ul>
              </div>
            </div>
          </section>

          {/* PHASE V */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">PHASE V</div>
              <h2 className="text-xl font-semibold text-foreground">The Memory Arc</h2>
            </div>
            <p className="text-sm text-foreground/60 mb-3">Apr 6 – Apr 22</p>
            <Card className="bg-muted/30 border-0 mb-4">
              <CardContent className="p-4">
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Goal: Own the score completely.
                </p>
              </CardContent>
            </Card>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Work</h4>
                <ul className="space-y-1 text-foreground/80 text-sm">
                  <li>• Memorization drills</li>
                  <li>• Cue accuracy</li>
                  <li>• Structural awareness</li>
                  <li>• Full run-throughs</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Each student must be able to:</h4>
                <ul className="space-y-1 text-foreground/80 text-sm">
                  <li>• Conduct their entire major work</li>
                  <li>• From memory</li>
                  <li>• With clear cueing and phrasing</li>
                </ul>
              </div>
            </div>
          </section>

          {/* PHASE VI */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">PHASE VI</div>
              <h2 className="text-xl font-semibold text-foreground">Final Jury</h2>
            </div>
            <p className="text-sm text-foreground/60 mb-3">Wed, Apr 29</p>
            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="p-6">
                <p className="text-lg font-medium text-foreground mb-4">
                  Each student conducts <strong>30 minutes</strong> of a major choral work <strong>from memory</strong>.
                </p>
                <h4 className="font-semibold text-foreground mb-2">Assessed on:</h4>
                <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-foreground/80 text-sm">
                  <li>• Baton technique</li>
                  <li>• Time clarity</li>
                  <li>• Expressive gesture</li>
                  <li>• Score mastery</li>
                  <li>• Leadership</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <Separator className="my-8" />

          {/* Grading */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
              Grading
            </h2>
            <Card className="bg-muted/30 border-0">
              <CardContent className="p-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-foreground/20">
                      <th className="text-left py-2 font-semibold text-foreground">Area</th>
                      <th className="text-right py-2 font-semibold text-foreground">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground/80">
                    <tr className="border-b border-foreground/10">
                      <td className="py-3">Technique juries (2)</td>
                      <td className="text-right py-3 font-medium">20%</td>
                    </tr>
                    <tr className="border-b border-foreground/10">
                      <td className="py-3">Non-touring choir practicum</td>
                      <td className="text-right py-3 font-medium">30%</td>
                    </tr>
                    <tr className="border-b border-foreground/10">
                      <td className="py-3">Weekly videos & score uploads</td>
                      <td className="text-right py-3 font-medium">20%</td>
                    </tr>
                    <tr className="border-b border-foreground/10">
                      <td className="py-3">Final 30-minute jury</td>
                      <td className="text-right py-3 font-medium">30%</td>
                    </tr>
                    <tr className="font-semibold bg-primary/5">
                      <td className="py-3">Total</td>
                      <td className="text-right py-3">100%</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>

          {/* Academic Integrity */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
              Academic Integrity Policy
            </h2>
            <p className="text-foreground/80 leading-relaxed">
              At the heart of Riverside Music Institute's mission is academic excellence, along with the development 
              of intellectual, ethical and leadership qualities. All members of the academic community are 
              expected to follow the basic standards of honesty and integrity as outlined in the school 
              College Code of Conduct.
            </p>
          </section>

          {/* Student Access Statement */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary mb-4 border-b border-primary/30 pb-2">
              Student Access Statement
            </h2>
            <p className="text-foreground/80 leading-relaxed">
              Riverside Music Institute is committed to ensuring the full participation of all students in its programs. 
              If you have a documented disability, contact the Student Access Center (SAC) at 404-270-5289. 
              Located in MacVicar Hall, Room 106.
            </p>
          </section>

          {/* Footer */}
          <footer className="text-center text-sm text-foreground/60 mt-10 pt-6 border-t border-foreground/20">
            <p>This syllabus is subject to change at the discretion of the instructor.</p>
            <p className="mt-2">Riverside Music Institute • Department of Music • GleeWorld Academy</p>
          </footer>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default Mus210SyllabusPage;
