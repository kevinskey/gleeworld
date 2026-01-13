import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Vote, Users, UserPlus, ChevronRight, BookOpen, 
  ClipboardCheck, Star, Award, Calendar, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ElectionsModuleProps {
  courseId: string;
}

// Shadowing content from Appendix D
const SHADOWING_CONTENT = {
  purpose: `The Executive Board Shadowing Program ensures continuity, professionalism, and institutional stability in the leadership of the Spelman College Glee Club. Leadership is earned through service, training, and evaluation.`,
  
  whoMayParticipate: `Any active member of the Glee Club in good standing may apply to shadow an Executive Board position during the Spring semester for the following academic year.`,
  
  whatShadowingIs: `Shadowing is a working apprenticeship. A shadow assists the current officer, completes assigned tasks, and is evaluated on professionalism, reliability, and competence. Shadowing does not guarantee election or appointment.`,
  
  structure: [
    'An Officer of Record',
    'One or more Shadows',
    'Defined responsibilities, tasks, and evaluation criteria'
  ],
  
  application: `Students apply during the Spring semester by selecting a primary and alternate position, submitting a statement of intent, confirming availability, and agreeing to professional conduct standards. Final approval rests with the Director.`,
  
  evaluation: `Shadows are evaluated by their assigned officer using a standardized rubric measuring reliability, professionalism, skill, leadership, and growth.`,
  
  certification: [
    'Complete all required tasks',
    'Receive a satisfactory evaluation',
    'Be approved by the Director'
  ],
  
  elections: `Only certified candidates may appear on election ballots. This protects the integrity and continuity of the Spelman College Glee Club.`
};

export const ElectionsModule: React.FC<ElectionsModuleProps> = ({ courseId }) => {
  const [activeTab, setActiveTab] = useState('shadowing');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Vote className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Elections & Leadership</CardTitle>
              <CardDescription>
                Executive Board shadowing, voting, and onboarding process
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="shadowing" className="flex items-center gap-2 py-3">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Shadowing</span>
          </TabsTrigger>
          <TabsTrigger value="voting" className="flex items-center gap-2 py-3">
            <Vote className="h-4 w-4" />
            <span className="hidden sm:inline">Voting</span>
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="flex items-center gap-2 py-3">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Onboarding</span>
          </TabsTrigger>
        </TabsList>

        {/* Shadowing Tab */}
        <TabsContent value="shadowing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                Executive Board Shadowing & Leadership Pipeline
              </CardTitle>
              <CardDescription>
                Spelman College Glee Club — MUS 070
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6 text-sm">
                  {/* Purpose */}
                  <section>
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      Purpose
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {SHADOWING_CONTENT.purpose}
                    </p>
                  </section>

                  {/* Who May Participate */}
                  <section>
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Who May Participate
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {SHADOWING_CONTENT.whoMayParticipate}
                    </p>
                  </section>

                  {/* What Shadowing Is */}
                  <section>
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      What Shadowing Is
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {SHADOWING_CONTENT.whatShadowingIs}
                    </p>
                  </section>

                  {/* Structure */}
                  <section>
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-primary" />
                      Structure
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      Each Executive Board position has:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                      {SHADOWING_CONTENT.structure.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  {/* Application */}
                  <section>
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Application
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {SHADOWING_CONTENT.application}
                    </p>
                  </section>

                  {/* Evaluation */}
                  <section>
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-primary" />
                      Evaluation
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {SHADOWING_CONTENT.evaluation}
                    </p>
                  </section>

                  {/* Certification */}
                  <section>
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      Certification
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      Only students who:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                      {SHADOWING_CONTENT.certification.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                    <p className="text-muted-foreground mt-2">
                      may be certified to run for the corresponding Executive Board position.
                    </p>
                  </section>

                  {/* Elections */}
                  <section>
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                      <Vote className="h-4 w-4 text-primary" />
                      Elections
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {SHADOWING_CONTENT.elections}
                    </p>
                  </section>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voting Tab */}
        <TabsContent value="voting" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Vote className="h-5 w-5 text-primary" />
                Executive Board Voting
              </CardTitle>
              <CardDescription>
                Cast your vote for certified candidates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Vote className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Voting Coming Soon</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  The voting module is currently under development. Elections will be held 
                  prior to the banquet at the close of the Spring Semester.
                </p>
                <Badge variant="secondary" className="mt-4">
                  In Development
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5 text-primary" />
                Onboarding New Executive Board Members
              </CardTitle>
              <CardDescription>
                Transition and training for elected officers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 text-sm">
                <section>
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Post-Election Onboarding Process
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">1</Badge>
                      <div>
                        <p className="font-medium">Official Announcement</p>
                        <p className="text-muted-foreground text-sm">
                          Results announced at the Spring Banquet following election completion.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">2</Badge>
                      <div>
                        <p className="font-medium">Transition Meeting</p>
                        <p className="text-muted-foreground text-sm">
                          Outgoing officers meet with incoming officers for knowledge transfer.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">3</Badge>
                      <div>
                        <p className="font-medium">Documentation Handoff</p>
                        <p className="text-muted-foreground text-sm">
                          Access to position-specific files, contacts, and resources.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">4</Badge>
                      <div>
                        <p className="font-medium">Summer Preparation</p>
                        <p className="text-muted-foreground text-sm">
                          Review handbook, prepare for Fall semester responsibilities.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Badge variant="outline" className="mt-0.5">5</Badge>
                      <div>
                        <p className="font-medium">Executive Board Retreat</p>
                        <p className="text-muted-foreground text-sm">
                          Team building and strategic planning before Fall semester begins.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
