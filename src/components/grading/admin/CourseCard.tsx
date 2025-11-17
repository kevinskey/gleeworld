import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface CourseCardProps {
  id: string;
  code: string;
  title: string;
  term: string;
  instructorName: string;
  assignmentCount: number;
  status?: 'active' | 'archived' | 'draft';
  onViewCourse: () => void;
  onOpenGradebook: () => void;
  onManageStudents: () => void;
  onDelete: () => void;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
};

const getTermBadgeClasses = (term: string) => {
  const lowerTerm = term.toLowerCase();
  if (lowerTerm.includes('fall')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
  if (lowerTerm.includes('spring')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300';
  if (lowerTerm.includes('summer')) return 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300';
  return 'bg-muted text-muted-foreground';
};

const getStatusBadgeClasses = (status?: string) => {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300';
  if (status === 'archived') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  if (status === 'draft') return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
  return 'bg-muted text-muted-foreground';
};

export const CourseCard: React.FC<CourseCardProps> = ({
  code,
  title,
  term,
  instructorName,
  assignmentCount,
  status = 'active',
  onViewCourse,
  onOpenGradebook,
  onManageStudents,
  onDelete,
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-lg">{code} • {title}</h3>
            <div className="flex items-center gap-2 mt-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(instructorName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="text-muted-foreground text-xs">Instructor</p>
                <p className="font-medium">{instructorName}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge className={getTermBadgeClasses(term)}>{term}</Badge>
            <Badge className={getStatusBadgeClasses(status)}>{status}</Badge>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {assignmentCount} {assignmentCount === 1 ? 'assignment' : 'assignments'}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={onViewCourse}>View Course</Button>
          <Button size="sm" variant="outline" onClick={onOpenGradebook}>Gradebook</Button>
          <Button size="sm" variant="outline" onClick={onManageStudents}>Manage Students</Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>Delete</Button>
        </div>
      </CardContent>
    </Card>
  );
};
