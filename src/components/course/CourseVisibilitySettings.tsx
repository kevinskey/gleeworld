import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCourseVisibilitySettings, CourseVisibilitySettings as VisibilityType } from '@/hooks/useCourseVisibilitySettings';
import { ClipboardList, MessageSquare, PenLine, BarChart, FileCheck, Trophy, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CourseVisibilitySettingsProps {
  courseId: string;
  courseCode: string;
}

const VISIBILITY_OPTIONS: Array<{
  key: keyof VisibilityType;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    key: 'show_assignments',
    label: 'Assignments',
    description: 'Allow students to view and submit assignments',
    icon: ClipboardList,
  },
  {
    key: 'show_discussions',
    label: 'Discussions',
    description: 'Allow students to participate in course discussions',
    icon: MessageSquare,
  },
  {
    key: 'show_journals',
    label: 'Journals',
    description: 'Allow students to view and write journal entries',
    icon: PenLine,
  },
  {
    key: 'show_polls',
    label: 'Polls',
    description: 'Allow students to participate in course polls',
    icon: BarChart,
  },
  {
    key: 'show_tests',
    label: 'Tests',
    description: 'Allow students to view and take tests',
    icon: FileCheck,
  },
  {
    key: 'show_grades',
    label: 'Grades',
    description: 'Allow students to view their grades',
    icon: Trophy,
  },
];

export const CourseVisibilitySettings: React.FC<CourseVisibilitySettingsProps> = ({
  courseId,
  courseCode,
}) => {
  const { settings, isLoading, updateVisibility, isUpdating } = useCourseVisibilitySettings(courseId);

  const handleToggle = (key: keyof VisibilityType, checked: boolean) => {
    updateVisibility({ [key]: checked });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          Student Visibility Settings
        </CardTitle>
        <CardDescription>
          Control which course features are visible to students in {courseCode}. 
          Hidden features will not appear in the student navigation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {VISIBILITY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isVisible = settings[option.key];

          return (
            <div
              key={option.key}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                isVisible 
                  ? 'bg-card border-border' 
                  : 'bg-muted/50 border-muted'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-md ${isVisible ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Icon className={`h-5 w-5 ${isVisible ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <Label 
                    htmlFor={option.key} 
                    className={`text-base font-medium ${!isVisible && 'text-muted-foreground'}`}
                  >
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isUpdating && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <div className="flex items-center gap-2">
                  {isVisible ? (
                    <Eye className="h-4 w-4 text-green-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch
                    id={option.key}
                    checked={isVisible}
                    onCheckedChange={(checked) => handleToggle(option.key, checked)}
                    disabled={isUpdating}
                  />
                </div>
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Hiding a feature only removes it from the student navigation. 
            Existing submissions and data are preserved. You can re-enable features at any time.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
