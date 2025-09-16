import React from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Award, Users, BookOpen, Star, Calendar } from 'lucide-react';

const BownaScholarLanding = () => {
  return (
    <UniversalLayout>
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The Bowman Scholar Program recognizes exceptional students who demonstrate outstanding 
              academic achievement, musical excellence, and leadership within the Spelman College 
              Glee Club community.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <BookOpen className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Academic Excellence</h3>
                <p className="text-sm text-muted-foreground">Minimum 3.5 GPA requirement</p>
              </div>
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <Star className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Musical Leadership</h3>
                <p className="text-sm text-muted-foreground">Active participation in all rehearsals</p>
              </div>
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Community Service</h3>
                <p className="text-sm text-muted-foreground">20+ hours per semester</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Scholar Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Academic Support</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Priority access to study resources</li>
                  <li>• Mentorship opportunities</li>
                  <li>• Academic planning assistance</li>
                  <li>• Research collaboration opportunities</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Musical Opportunities</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Solo performance opportunities</li>
                  <li>• Leadership roles in ensembles</li>
                  <li>• Masterclass participation</li>
                  <li>• Recording session priority</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Scholars */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary" className="text-primary">
                2024-2025
              </Badge>
              Current Bowman Scholars
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold">Scholar Recognition</h4>
                <p className="text-sm text-muted-foreground">Applications now open</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Application Process
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Eligibility Requirements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Current Glee Club member in good standing</li>
                  <li>• Minimum cumulative GPA of 3.5</li>
                  <li>• One full semester of active participation</li>
                  <li>• Demonstrated leadership potential</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Application Materials</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Completed application form</li>
                  <li>• Official transcript</li>
                  <li>• Personal statement (500 words)</li>
                  <li>• Two letters of recommendation</li>
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button className="flex-1">
                Apply Now
              </Button>
              <Button variant="outline" className="flex-1">
                Download Application
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </UniversalLayout>
  );
};

export default BownaScholarLanding;