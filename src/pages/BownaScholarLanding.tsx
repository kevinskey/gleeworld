import React from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GraduationCap, Award, Users, BookOpen, Star, Calendar, Info } from 'lucide-react';

const BownaScholarLanding = () => {
  return (
    <TooltipProvider>
      <UniversalLayout>
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-6 cursor-help">
                  <GraduationCap className="h-10 w-10 text-white" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Named after Sister Thea Bowman, honoring her legacy of academic excellence and spiritual leadership</p>
              </TooltipContent>
            </Tooltip>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-4">
              Bowman Scholars
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Excellence in Academic Achievement and Musical Leadership
            </p>
          </div>

          {/* Program Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Program Overview
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This program recognizes the top 5% of Glee Club members who demonstrate exceptional commitment</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The Bowman Scholar Program recognizes exceptional students who demonstrate outstanding 
              academic achievement, musical excellence, and leadership within the Spelman College 
              Glee Club community.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center p-4 bg-primary/5 rounded-lg cursor-help">
                    <BookOpen className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Academic Excellence</h3>
                    <p className="text-sm text-muted-foreground">Minimum 3.5 GPA requirement</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Scholars must maintain a cumulative GPA of 3.5 or higher and show consistent academic progress</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center p-4 bg-primary/5 rounded-lg cursor-help">
                    <Star className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Musical Leadership</h3>
                    <p className="text-sm text-muted-foreground">Active participation in all rehearsals</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Demonstrate leadership through mentoring, section leadership, and exemplary musical performance</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center p-4 bg-primary/5 rounded-lg cursor-help">
                    <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Community Service</h3>
                    <p className="text-sm text-muted-foreground">20+ hours per semester</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Engage in meaningful community service, particularly in music education and outreach programs</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

          {/* Benefits */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Scholar Benefits
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Exclusive benefits available only to Bowman Scholars throughout their academic journey</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h4 className="font-semibold mb-3 cursor-help flex items-center gap-1">
                      Academic Support
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </h4>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Comprehensive academic resources and personalized support systems</p>
                  </TooltipContent>
                </Tooltip>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Priority access to study resources</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>First access to study rooms, library resources, and academic materials</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Mentorship opportunities</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Paired with successful alumnae and faculty members for guidance</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Academic planning assistance</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Personalized academic advising and course selection guidance</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Research collaboration opportunities</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Opportunities to work with faculty on research projects and publications</p>
                    </TooltipContent>
                  </Tooltip>
                </ul>
              </div>
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h4 className="font-semibold mb-3 cursor-help flex items-center gap-1">
                      Musical Opportunities
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </h4>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Exclusive musical performance and leadership opportunities</p>
                  </TooltipContent>
                </Tooltip>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Solo performance opportunities</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Featured solo performances in concerts and special events</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Leadership roles in ensembles</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Section leader positions and ensemble coordination responsibilities</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Masterclass participation</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Exclusive access to masterclasses with renowned musicians and composers</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Recording session priority</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Priority participation in professional recording sessions and album projects</p>
                    </TooltipContent>
                  </Tooltip>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

          {/* Current Scholars */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-primary cursor-help">
                      2024-2025
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Current academic year cohort of Bowman Scholars</p>
                  </TooltipContent>
                </Tooltip>
                Current Bowman Scholars
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Meet the exceptional students who have earned Bowman Scholar recognition this year</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-4 border rounded-lg text-center cursor-help hover:bg-muted/50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <GraduationCap className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold">Scholar Recognition</h4>
                    <p className="text-sm text-muted-foreground">Applications now open</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Join the prestigious ranks of Bowman Scholars - applications are currently being accepted for the next cohort</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

          {/* Application Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Application Process
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Complete guide to applying for the Bowman Scholar Program</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h4 className="font-semibold mb-2 cursor-help flex items-center gap-1">
                      Eligibility Requirements
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </h4>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>All requirements must be met before submitting your application</p>
                  </TooltipContent>
                </Tooltip>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Current Glee Club member in good standing</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Must be an active member with no disciplinary actions or attendance issues</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Minimum cumulative GPA of 3.5</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Must maintain this GPA throughout the scholar program</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• One full semester of active participation</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Demonstrates commitment and understanding of Glee Club expectations</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Demonstrated leadership potential</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Examples include mentoring new members, leading initiatives, or holding leadership positions</p>
                    </TooltipContent>
                  </Tooltip>
                </ul>
              </div>
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h4 className="font-semibold mb-2 cursor-help flex items-center gap-1">
                      Application Materials
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </h4>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>All materials must be submitted by the application deadline</p>
                  </TooltipContent>
                </Tooltip>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Completed application form</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Online application available through the student portal</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Official transcript</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Must be current and include all completed coursework</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Personal statement (500 words)</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Describe your commitment to excellence and future goals</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <li className="cursor-help">• Two letters of recommendation</li>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>One from a faculty member and one from a community leader or mentor</p>
                    </TooltipContent>
                  </Tooltip>
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button className="flex-1">
                    Apply Now
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Start your application for the Bowman Scholar Program</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    Download Application
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download a PDF version of the application for offline completion</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
        </div>
      </UniversalLayout>
    </TooltipProvider>
  );
};

export default BownaScholarLanding;