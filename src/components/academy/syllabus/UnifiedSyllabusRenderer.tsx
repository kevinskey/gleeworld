import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, Users, Mail, MapPin, Clock, Target, 
  ChevronUp, ChevronDown, Calendar, BarChart3, CheckCircle2,
  FileText, Scale, AlertCircle
} from 'lucide-react';
import { AcademyCourse } from '@/config/academyCourses';

export interface SyllabusPhase {
  phase: string;
  title: string;
  dates: string;
  goal: string;
  topics: string[];
  assessments: string[];
}

export interface GradingItem {
  component: string;
  weight: number;
}

export interface WeeklyScheduleItem {
  week: string;
  topics?: string;
  topic?: string;
  readings?: string;
  assignments?: string;
}

export interface UnifiedSyllabusData {
  id: string;
  name: string;
  term: string | null;
  credits: number | null;
  class_time: string | null;
  classroom: string | null;
  instructor_name: string | null;
  instructor_email: string | null;
  instructor_office: string | null;
  office_hours: string | null;
  purpose: string | null;
  course_model: string | null;
  course_badge: string | null;
  course_phases: SyllabusPhase[] | null;
  grading_breakdown: GradingItem[] | Record<string, number> | null;
  grading_scale: Record<string, string> | null;
  weekly_schedule: WeeklyScheduleItem[] | null;
  attendance_policy: string | null;
  late_assignment_policy: string | null;
  academic_honesty_policy: string | null;
  disability_statement: string | null;
  additional_policies: any;
}

export interface LearningObjective {
  id: string;
  objective_text: string;
  bloom_level: string;
  is_measurable: boolean;
}

export interface CourseRequirement {
  id: string;
  requirement_text: string;
  weight_percentage: number;
  position: number;
}

interface UnifiedSyllabusRendererProps {
  course: AcademyCourse;
  syllabus: UnifiedSyllabusData;
  objectives?: LearningObjective[];
  requirements?: CourseRequirement[];
}

export const UnifiedSyllabusRenderer: React.FC<UnifiedSyllabusRendererProps> = ({ 
  course, 
  syllabus,
  objectives = [],
  requirements = []
}) => {
  const [showObjectives, setShowObjectives] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showGrading, setShowGrading] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);

  const phases = syllabus.course_phases || [];
  const weeklySchedule = syllabus.weekly_schedule || [];
  const gradingScale = syllabus.grading_scale || {};

  // Normalize grading breakdown to array format
  const getGradingBreakdown = (): GradingItem[] => {
    if (!syllabus.grading_breakdown) return [];
    if (Array.isArray(syllabus.grading_breakdown)) {
      return syllabus.grading_breakdown;
    }
    // Convert object format to array
    return Object.entries(syllabus.grading_breakdown).map(([component, weight]) => ({
      component,
      weight: typeof weight === 'number' ? weight : 0
    }));
  };

  const gradingBreakdown = getGradingBreakdown();
  const hasPhases = phases.length > 0;
  const hasWeeklySchedule = weeklySchedule.length > 0;
  const hasGrading = gradingBreakdown.length > 0 || requirements.length > 0 || Object.keys(gradingScale).length > 0;
  const hasPolicies = syllabus.attendance_policy || syllabus.late_assignment_policy || 
                      syllabus.academic_honesty_policy || syllabus.disability_statement;

  return (
    <div className="space-y-4">
      {/* Course Header with Instructor */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{syllabus.name || course.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {course.courseCode} {syllabus.term ? `• ${syllabus.term}` : ''}
              </p>
            </div>
            {syllabus.course_badge ? (
              <Badge variant="secondary">{syllabus.course_badge}</Badge>
            ) : (
              <Badge variant="outline">{syllabus.credits || 3} Credits</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          {/* Meeting Times & Location */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Meeting Times</p>
              <p className="text-muted-foreground">{syllabus.class_time || 'TBA'}</p>
            </div>
            <div>
              <p className="font-semibold">Location</p>
              <p className="text-muted-foreground">{syllabus.classroom || 'TBA'}</p>
            </div>
          </div>
          
          {/* Instructor Info */}
          <div className="border-t pt-4">
            <p className="font-semibold text-sm mb-2">Instructor</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{syllabus.instructor_name || course.instructor.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{syllabus.instructor_email || course.instructor.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{syllabus.instructor_office || course.instructor.office}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{syllabus.office_hours || course.instructor.hours}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Model (if exists) */}
      {syllabus.course_model && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-primary/10 p-4 rounded-lg whitespace-pre-wrap">
              {syllabus.course_model}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Purpose (if no course model) */}
      {!syllabus.course_model && syllabus.purpose && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Purpose
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/90 whitespace-pre-wrap">{syllabus.purpose}</p>
          </CardContent>
        </Card>
      )}

      {/* Learning Objectives (from DB) */}
      {objectives.length > 0 && (
        <Card>
          <Collapsible open={showObjectives} onOpenChange={setShowObjectives}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Learning Objectives
                  </CardTitle>
                  {showObjectives ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  Upon completion of this course, students will be able to:
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  {objectives.map((objective) => (
                    <li key={objective.id} className="text-sm text-foreground/90">
                      {objective.objective_text}
                      {objective.bloom_level && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {objective.bloom_level}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Semester Phases (phase-based courses like MUS 210) */}
      {hasPhases && (
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
                  <div key={phase.phase || index} className="border rounded-lg p-4">
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
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Weekly Schedule (traditional courses) */}
      {!hasPhases && hasWeeklySchedule && (
        <Card>
          <Collapsible open={showSchedule} onOpenChange={setShowSchedule}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Course Schedule
                  </CardTitle>
                  {showSchedule ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {weeklySchedule.map((week, index) => (
                    <div key={index} className="flex gap-3 p-2 border rounded-lg">
                      <div className="flex-shrink-0 w-16 text-sm font-semibold text-primary">
                        {week.week || `Week ${index + 1}`}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{week.topics || week.topic}</p>
                        {week.readings && (
                          <p className="text-xs text-muted-foreground mt-1">Readings: {week.readings}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Grading */}
      {hasGrading && (
        <Card>
          <Collapsible open={showGrading} onOpenChange={setShowGrading}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Grading
                  </CardTitle>
                  {showGrading ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 pt-0">
                {/* From grading_breakdown JSONB */}
                {gradingBreakdown.length > 0 && (
                  <div className="space-y-2">
                    {gradingBreakdown.map((item) => (
                      <div key={item.component} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                        <span className="text-sm text-foreground/90">{item.component}</span>
                        <Badge variant="outline">{item.weight}%</Badge>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2 bg-primary/5 rounded px-2 mt-2">
                      <span className="text-sm font-semibold">Total</span>
                      <Badge>{gradingBreakdown.reduce((sum, item) => sum + item.weight, 0)}%</Badge>
                    </div>
                  </div>
                )}

                {/* From requirements table */}
                {requirements.length > 0 && gradingBreakdown.length === 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Grade Weights
                    </h4>
                    <div className="space-y-2">
                      {requirements.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium">{req.requirement_text}</span>
                          {req.weight_percentage > 0 && (
                            <Badge className="text-xs">{req.weight_percentage}%</Badge>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center justify-between p-2 border-t mt-2 pt-3">
                        <span className="text-sm font-semibold">Total</span>
                        <Badge variant="secondary" className="text-sm">
                          {requirements.reduce((sum, r) => sum + r.weight_percentage, 0)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grading Scale */}
                {Object.keys(gradingScale).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Grading Scale
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {Object.entries(gradingScale).map(([grade, range]) => (
                        <div key={grade} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span className="text-sm font-medium">{grade}</span>
                          <span className="text-xs text-muted-foreground">{String(range)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Policies */}
      {hasPolicies && (
        <Card>
          <Collapsible open={showPolicies} onOpenChange={setShowPolicies}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Course Policies
                  </CardTitle>
                  {showPolicies ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0 text-sm text-muted-foreground">
                {syllabus.attendance_policy && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Attendance Policy</h4>
                    <p className="whitespace-pre-wrap">{syllabus.attendance_policy}</p>
                  </div>
                )}
                {syllabus.late_assignment_policy && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Late Assignment Policy</h4>
                      <p className="whitespace-pre-wrap">{syllabus.late_assignment_policy}</p>
                    </div>
                  </>
                )}
                {syllabus.academic_honesty_policy && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Academic Integrity</h4>
                      <p className="whitespace-pre-wrap">{syllabus.academic_honesty_policy}</p>
                    </div>
                  </>
                )}
                {syllabus.disability_statement && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Student Access Statement</h4>
                      <p className="whitespace-pre-wrap">{syllabus.disability_statement}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
};
