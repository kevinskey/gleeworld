import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, Mail, Phone, Book, ExternalLink } from 'lucide-react';

interface HelpSectionProps {
  instructor: {
    name: string;
    email: string;
    office: string;
    officeHours: string;
  };
}

export const HelpSection: React.FC<HelpSectionProps> = ({ instructor }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Help & Support</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contact Instructor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-medium">{instructor.name}</p>
            <p className="text-sm text-muted-foreground">{instructor.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Office:</p>
            <p className="text-sm text-muted-foreground">{instructor.office}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Office Hours:</p>
            <p className="text-sm text-muted-foreground">{instructor.officeHours}</p>
          </div>
          <Button className="w-full">
            <Mail className="h-4 w-4 mr-2" />
            Email Instructor
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Course Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <ExternalLink className="h-4 w-4 mr-2" />
            Syllabus
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <ExternalLink className="h-4 w-4 mr-2" />
            Course Policies
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <ExternalLink className="h-4 w-4 mr-2" />
            Technical Support
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium text-sm">How do I submit assignments?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Navigate to the Assignments section and click the Submit button on any assignment.
            </p>
          </div>
          <div>
            <p className="font-medium text-sm">Where can I find my grades?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check the Gradescope section to view all your grades and overall performance.
            </p>
          </div>
          <div>
            <p className="font-medium text-sm">How do I contact classmates?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use the Mail Center or Discussions section to communicate with classmates.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
