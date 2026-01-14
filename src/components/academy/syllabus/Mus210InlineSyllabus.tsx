import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, Users, Mail, MapPin, Clock, Target, 
  ChevronUp, ChevronDown, Calendar, Music, CheckCircle2
} from 'lucide-react';

export const Mus210InlineSyllabus: React.FC = () => {
  const [showSchedule, setShowSchedule] = useState(false);
  const [showGrading, setShowGrading] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);

  const phases = [
    {
      phase: 'I',
      title: 'Body → Time → Authority',
      dates: 'Jan 14 – Feb 4',
      goal: 'Build physical grammar of conducting before interpretation.',
      topics: ['Baton grip & posture', 'Ictus & rebound', '2-3-4 patterns', 'Subdivision', 'Preparatory beats', 'Releases'],
      assessments: ['Weekly conducting videos (GleeWorld)', 'Mirror drills', 'Technique Jury #1 (Feb 4)']
    },
    {
      phase: 'II',
      title: 'Score = Map',
      dates: 'Feb 9 – Feb 18',
      goal: 'Conductors learn to think before moving.',
      topics: ['Reading SSAA scores', 'Vocal ranges', 'Choir layout', 'Score marking system', 'Form & phrase structure', 'Cue mapping'],
      assessments: ['Choose final major work', 'Begin score memory', 'Upload marked score to GleeWorld']
    },
    {
      phase: 'III',
      title: 'Non-Touring Choir Practicum',
      dates: 'Feb 23 – Mar 6 (6 rehearsals)',
      goal: 'You are not in the room. They run the choir.',
      topics: ['Morley – Sing We and Chant It (SSAA)', 'Wade in the Water (SSAA)', 'Ubi Caritas (SSAA)', 'Dona Nobis Pacem (round)'],
      assessments: ['Rehearsal plan', 'Marked score', 'Video', 'Post-rehearsal report']
    },
    {
      phase: 'IV',
      title: 'Advanced Control',
      dates: 'Mar 16 – Apr 1',
      goal: 'Move from beating time to shaping music.',
      topics: ['Rubato', 'Fermata types', 'Melding', 'Mixed meter', 'Conducting in 1/2/3/4', 'Phrase direction'],
      assessments: ['Technique Jury #2']
    },
    {
      phase: 'V',
      title: 'The Memory Arc',
      dates: 'Apr 6 – Apr 22',
      goal: 'Own the score completely.',
      topics: ['Memorization drills', 'Cue accuracy', 'Structural awareness', 'Full run-throughs'],
      assessments: ['Conduct entire major work from memory with clear cueing and phrasing']
    },
    {
      phase: 'VI',
      title: 'Final Jury',
      dates: 'Wed, Apr 29',
      goal: 'Each student conducts 30 minutes of a major choral work from memory.',
      topics: ['Baton technique', 'Time clarity', 'Expressive gesture', 'Score mastery', 'Leadership'],
      assessments: []
    }
  ];

  const gradingBreakdown = [
    { component: 'Technique juries (2)', weight: 20 },
    { component: 'Non-touring choir practicum', weight: 30 },
    { component: 'Weekly videos & score uploads', weight: 20 },
    { component: 'Final 30-minute jury', weight: 30 }
  ];

  return (
    <div className="space-y-4">
      {/* Course Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">MUS 210 Course Syllabus</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">MUS 210 • Spring 2026</p>
            </div>
            <Badge variant="secondary">Conducting Studio</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Meeting Times</p>
              <p className="text-muted-foreground">M/W • 75 minutes</p>
            </div>
            <div>
              <p className="font-semibold">Location</p>
              <p className="text-muted-foreground">Fine Arts 109</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructor */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Instructor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">Dr. Kevin Johnson</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">kjohns10@spelman.edu</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Office: Fine Arts 105</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Office Hours: MWF 3–5 PM or appointment</span>
          </div>
        </CardContent>
      </Card>

      {/* Course Model */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-primary/10 p-4 rounded-lg">
            <p className="text-foreground font-medium">This is not a lecture course.</p>
            <p className="text-primary text-lg font-bold">This is a conducting studio.</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/80 mb-2">Every class:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 10 min warm-ups (student led)</li>
              <li>• 3 × 18 min podium blocks</li>
              <li>• 10 min score & video review</li>
            </ul>
            <p className="text-sm text-primary font-semibold mt-3">Each student conducts every class.</p>
          </div>
        </CardContent>
      </Card>

      {/* Learning Objectives / Phases */}
      <Card>
        <Collapsible open={showSchedule} onOpenChange={setShowSchedule}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Semester Phases
                </CardTitle>
                {showSchedule ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {phases.map((phase, index) => (
                <div key={phase.phase} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="text-xs">PHASE {phase.phase}</Badge>
                    <span className="font-semibold text-foreground">{phase.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{phase.dates}</p>
                  <div className="bg-muted/30 p-2 rounded mb-3">
                    <p className="text-sm text-foreground/90 flex items-start gap-2">
                      <Target className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span><strong>Goal:</strong> {phase.goal}</span>
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-foreground/80 mb-1">Topics</p>
                      <ul className="text-muted-foreground space-y-0.5">
                        {phase.topics.map((topic, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-primary">•</span> {topic}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {phase.assessments.length > 0 && (
                      <div>
                        <p className="font-medium text-foreground/80 mb-1">Assessments</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          {phase.assessments.map((assessment, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <CheckCircle2 className="h-3 w-3 mt-1 text-primary shrink-0" /> {assessment}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {index === 2 && (
                    <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                      <strong>Spring Break:</strong> Mar 9–13
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Grading */}
      <Card>
        <Collapsible open={showGrading} onOpenChange={setShowGrading}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Grading
                </CardTitle>
                {showGrading ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {gradingBreakdown.map((item) => (
                  <div key={item.component} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm text-foreground/90">{item.component}</span>
                    <Badge variant="outline">{item.weight}%</Badge>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 bg-primary/5 rounded px-2 mt-2">
                  <span className="text-sm font-semibold">Total</span>
                  <Badge>100%</Badge>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Policies */}
      <Card>
        <Collapsible open={showPolicies} onOpenChange={setShowPolicies}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Academic Policies
                </CardTitle>
                {showPolicies ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0 text-sm text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Academic Integrity</h4>
                <p>At the heart of Spelman College's mission is academic excellence, along with the development of intellectual, ethical and leadership qualities. All members of the academic community are expected to follow the basic standards of honesty and integrity as outlined in the Spelman College Code of Conduct.</p>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold text-foreground mb-2">Student Access Statement</h4>
                <p>Spelman College is committed to ensuring the full participation of all students in its programs. If you have a documented disability, contact the Student Access Center (SAC) at 404-270-5289. Located in MacVicar Hall, Room 106.</p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};
