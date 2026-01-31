import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Music, CheckCircle2, XCircle, MinusCircle, Clock } from 'lucide-react';
import { usePerformanceGrades, PerformanceStatus } from '@/hooks/usePerformanceGrades';
import { getCourseGradingConfig } from '@/config/courseGradingConfig';
import { cn } from '@/lib/utils';

interface PerformanceGradeEntryProps {
  courseId: string;
  courseCode?: string;
}

const MUS_070_COURSE_ID = 'a0000000-0000-0000-0000-000000000070';

// Extract performance names from the grading config
const getPerformanceNames = (courseId: string): { name: string; weight: number }[] => {
  const config = getCourseGradingConfig(courseId);
  // Filter for performance components (those that aren't Attendance, Sight Singing, or Sectionals)
  const performanceComponents = config.components.filter(c => 
    !['Attendance', 'Sight Singing – Music Reading', 'Sectionals'].includes(c.component)
  );
  return performanceComponents.map(c => ({ name: c.component, weight: c.weight }));
};

const statusConfig: Record<PerformanceStatus, { label: string; icon: React.ReactNode; className: string }> = {
  pending: { 
    label: 'Pending', 
    icon: <Clock className="h-3.5 w-3.5" />, 
    className: 'bg-muted text-muted-foreground' 
  },
  participated: { 
    label: 'Participated', 
    icon: <CheckCircle2 className="h-3.5 w-3.5" />, 
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
  },
  excused: { 
    label: 'Excused', 
    icon: <MinusCircle className="h-3.5 w-3.5" />, 
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
  },
  absent: { 
    label: 'Absent', 
    icon: <XCircle className="h-3.5 w-3.5" />, 
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
  },
};

export const PerformanceGradeEntry: React.FC<PerformanceGradeEntryProps> = ({ 
  courseId,
  courseCode = 'MUS 070'
}) => {
  const performances = getPerformanceNames(courseId);
  const performanceNames = performances.map(p => p.name);
  
  const { studentsWithGrades, isLoading, upsertGrade, batchUpdatePerformance } = usePerformanceGrades({
    courseId,
    performanceNames,
  });

  const [batchPerformance, setBatchPerformance] = useState<string | null>(null);

  const handleStatusChange = (studentProfileId: string, performanceName: string, status: PerformanceStatus) => {
    upsertGrade.mutate({ studentProfileId, performanceName, status });
  };

  const handleBatchUpdate = (performanceName: string, status: PerformanceStatus) => {
    if (!studentsWithGrades) return;
    const studentIds = studentsWithGrades.map(s => s.profile_id);
    batchUpdatePerformance.mutate({ performanceName, status, studentProfileIds: studentIds });
    setBatchPerformance(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          Performance Grades – {courseCode}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Mark student participation for each performance event. Changes save automatically.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {/* Batch operations */}
        <div className="flex flex-wrap items-center gap-2 px-4 pb-4 border-b">
          <span className="text-sm font-medium">Batch mark:</span>
          {performances.map(perf => (
            <div key={perf.name} className="flex items-center gap-1">
              <Button
                variant={batchPerformance === perf.name ? "secondary" : "outline"}
                size="sm"
                onClick={() => setBatchPerformance(batchPerformance === perf.name ? null : perf.name)}
                className="text-xs h-7"
              >
                {perf.name} ({perf.weight}%)
              </Button>
              {batchPerformance === perf.name && (
                <div className="flex gap-1 ml-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 px-2 text-emerald-600"
                    onClick={() => handleBatchUpdate(perf.name, 'participated')}
                    disabled={batchUpdatePerformance.isPending}
                  >
                    All Present
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 px-2 text-red-600"
                    onClick={() => handleBatchUpdate(perf.name, 'absent')}
                    disabled={batchUpdatePerformance.isPending}
                  >
                    All Absent
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Grade grid */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">Student</TableHead>
                <TableHead className="w-[100px]">Voice Part</TableHead>
                {performances.map(perf => (
                  <TableHead key={perf.name} className="text-center min-w-[140px]">
                    <div className="flex flex-col items-center">
                      <span>{perf.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">{perf.weight}%</span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentsWithGrades?.map(student => (
                <TableRow key={student.profile_id}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    {student.full_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {student.voice_part || 'TBD'}
                    </Badge>
                  </TableCell>
                  {performances.map(perf => {
                    const grade = student.grades[perf.name];
                    const currentStatus = grade?.status || 'pending';
                    const config = statusConfig[currentStatus];
                    
                    return (
                      <TableCell key={perf.name} className="text-center p-2">
                        <Select
                          value={currentStatus}
                          onValueChange={(value) => 
                            handleStatusChange(student.profile_id, perf.name, value as PerformanceStatus)
                          }
                        >
                          <SelectTrigger 
                            className={cn(
                              "w-[130px] h-8 mx-auto",
                              config.className
                            )}
                          >
                            <SelectValue>
                              <span className="flex items-center gap-1.5">
                                {config.icon}
                                {config.label}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                Pending
                              </span>
                            </SelectItem>
                            <SelectItem value="participated">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                Participated
                              </span>
                            </SelectItem>
                            <SelectItem value="excused">
                              <span className="flex items-center gap-1.5">
                                <MinusCircle className="h-3.5 w-3.5 text-amber-600" />
                                Excused
                              </span>
                            </SelectItem>
                            <SelectItem value="absent">
                              <span className="flex items-center gap-1.5">
                                <XCircle className="h-3.5 w-3.5 text-red-600" />
                                Absent
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {(!studentsWithGrades || studentsWithGrades.length === 0) && (
                <TableRow>
                  <TableCell colSpan={2 + performances.length} className="text-center py-8 text-muted-foreground">
                    No enrolled students found for this course.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
