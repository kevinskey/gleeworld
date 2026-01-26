import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, CheckCircle, ChevronDown, Search, Users, Clock, 
  BookOpen, MapPin, Loader2, RefreshCw, Mail
} from 'lucide-react';
import { useAllStudentSchedules, StudentSummary } from '@/hooks/useAllStudentSchedules';
import { getAvatarUrl, getInitials } from '@/utils/avatarUtils';
import { cn } from '@/lib/utils';

interface SecretaryScheduleViewProps {
  semester?: string;
}

const StudentScheduleCard: React.FC<{ student: StudentSummary }> = ({ student }) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        "transition-colors",
        student.conflict_count > 0 && "border-destructive/50 bg-destructive/5"
      )}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getAvatarUrl(student.avatar_url) || undefined} />
                  <AvatarFallback>{getInitials(student.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base font-medium">{student.full_name || 'Unknown Student'}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {student.voice_part && <Badge variant="outline" className="text-xs">{student.voice_part}</Badge>}
                    {student.class_year && <span>Class of {student.class_year}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{student.total_classes} classes</p>
                  {student.conflict_count > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {student.conflict_count} conflict{student.conflict_count > 1 ? 's' : ''}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      No conflicts
                    </Badge>
                  )}
                </div>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {student.email && (
              <a 
                href={`mailto:${student.email}`} 
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Mail className="h-3 w-3" />
                {student.email}
              </a>
            )}
            <div className="space-y-2">
              {student.schedules.map((schedule) => (
                <div 
                  key={schedule.id}
                  className={cn(
                    "p-3 rounded-lg border text-sm",
                    schedule.has_conflict 
                      ? "bg-destructive/10 border-destructive/30" 
                      : "bg-muted/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{schedule.course_name}</span>
                        {schedule.course_code && (
                          <Badge variant="outline" className="text-xs">{schedule.course_code}</Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span>{schedule.days.join(', ')}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(schedule.start_time)} – {formatTime(schedule.end_time)}
                        </span>
                        {schedule.location && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {schedule.location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {schedule.has_conflict && (
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                  </div>
                  {schedule.has_conflict && schedule.conflict_details && (
                    <p className="text-xs text-destructive mt-2 p-2 bg-destructive/10 rounded">
                      {schedule.conflict_details}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export const SecretaryScheduleView: React.FC<SecretaryScheduleViewProps> = ({ 
  semester = 'Spring 2026' 
}) => {
  const { 
    studentSummaries, 
    loading, 
    totalConflicts, 
    refetch,
    studentsWithConflicts,
    studentsWithoutConflicts 
  } = useAllStudentSchedules(semester);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = studentSummaries.filter(student => 
    (student.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.voice_part || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWithConflicts = studentsWithConflicts.filter(student => 
    (student.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWithoutConflicts = studentsWithoutConflicts.filter(student => 
    (student.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{studentSummaries.length}</p>
                <p className="text-sm text-muted-foreground">Students Submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={totalConflicts > 0 ? "border-destructive/50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                totalConflicts > 0 ? "bg-destructive/10" : "bg-green-100 dark:bg-green-900/30"
              )}>
                <AlertTriangle className={cn(
                  "h-5 w-5",
                  totalConflicts > 0 ? "text-destructive" : "text-green-600"
                )} />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalConflicts}</p>
                <p className="text-sm text-muted-foreground">Total Conflicts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{studentsWithoutConflicts.length}</p>
                <p className="text-sm text-muted-foreground">No Conflicts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Refresh */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or voice part..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs for filtering */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All ({filteredStudents.length})
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="text-destructive">
            With Conflicts ({filteredWithConflicts.length})
          </TabsTrigger>
          <TabsTrigger value="clear">
            No Conflicts ({filteredWithoutConflicts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          {filteredStudents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No student schedules submitted yet.</p>
              </CardContent>
            </Card>
          ) : (
            filteredStudents.map(student => (
              <StudentScheduleCard key={student.user_id} student={student} />
            ))
          )}
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-3 mt-4">
          {filteredWithConflicts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                <p>No students with conflicts!</p>
              </CardContent>
            </Card>
          ) : (
            filteredWithConflicts.map(student => (
              <StudentScheduleCard key={student.user_id} student={student} />
            ))
          )}
        </TabsContent>

        <TabsContent value="clear" className="space-y-3 mt-4">
          {filteredWithoutConflicts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students without conflicts yet.</p>
              </CardContent>
            </Card>
          ) : (
            filteredWithoutConflicts.map(student => (
              <StudentScheduleCard key={student.user_id} student={student} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
