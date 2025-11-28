import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, BookOpen, FileText, BarChart3, Clock } from 'lucide-react';

interface SyllabusSectionProps {
  courseData: {
    courseCode: string;
    title: string;
    credits: number;
    meetingTimes: string;
    location: string;
    instructor: {
      name: string;
      email: string;
      office: string;
      officeHours: string;
    };
    purpose: string;
    objectives: string[];
    requiredTexts: Array<{ title: string; author: string }>;
    requiredMaterials: string[];
    attendancePolicy: string;
    gradingBreakdown: Array<{ item: string; percentage: number }>;
  };
}

export const SyllabusSection: React.FC<SyllabusSectionProps> = ({ courseData }) => {
  const [showObjectives, setShowObjectives] = useState(true);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showGrading, setShowGrading] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Course Syllabus</h2>
        <Badge variant="outline">{courseData.credits} Credits</Badge>
      </div>

      {/* Course Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{courseData.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{courseData.courseCode}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Meeting Times</p>
              <p className="text-muted-foreground">{courseData.meetingTimes}</p>
            </div>
            <div>
              <p className="font-semibold">Location</p>
              <p className="text-muted-foreground">{courseData.location}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructor Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Instructor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <p className="font-semibold">{courseData.instructor.name}</p>
            <p className="text-muted-foreground">{courseData.instructor.email}</p>
          </div>
          <div>
            <p className="font-semibold">Office</p>
            <p className="text-muted-foreground">{courseData.instructor.office}</p>
          </div>
          <div>
            <p className="font-semibold">Office Hours</p>
            <p className="text-muted-foreground">{courseData.instructor.officeHours}</p>
          </div>
        </CardContent>
      </Card>

      {/* Course Purpose */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Purpose
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/90">{courseData.purpose}</p>
        </CardContent>
      </Card>

      {/* Learning Objectives */}
      <Card>
        <Collapsible open={showObjectives} onOpenChange={setShowObjectives}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Learning Objectives
                </span>
                {showObjectives ? <ChevronUp /> : <ChevronDown />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2">
                {courseData.objectives.map((objective, index) => (
                  <li key={index} className="text-foreground/90">{objective}</li>
                ))}
              </ol>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Grading Breakdown */}
      <Card>
        <Collapsible open={showGrading} onOpenChange={setShowGrading}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Grading Breakdown
                </span>
                {showGrading ? <ChevronUp /> : <ChevronDown />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-2">
                {courseData.gradingBreakdown.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-accent/30 rounded">
                    <span className="text-foreground/90">{item.item}</span>
                    <Badge variant="secondary">{item.percentage}%</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Required Materials */}
      <Card>
        <Collapsible open={showMaterials} onOpenChange={setShowMaterials}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Required Materials
                </span>
                {showMaterials ? <ChevronUp /> : <ChevronDown />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Textbooks</h4>
                <ul className="list-disc list-inside space-y-1">
                  {courseData.requiredTexts.map((text, index) => (
                    <li key={index} className="text-foreground/90">
                      <em>{text.title}</em> — {text.author}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Materials</h4>
                <ul className="list-disc list-inside space-y-1">
                  {courseData.requiredMaterials.map((material, index) => (
                    <li key={index} className="text-foreground/90">{material}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Attendance Policy */}
      <Card>
        <Collapsible open={showAttendance} onOpenChange={setShowAttendance}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Attendance Policy
                </span>
                {showAttendance ? <ChevronUp /> : <ChevronDown />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <p className="text-foreground/90">{courseData.attendancePolicy}</p>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};
