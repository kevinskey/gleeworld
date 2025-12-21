import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  UserCheck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Calendar,
  TrendingUp,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { useAcademyAttendance } from '@/hooks/useAcademyAttendance';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns';

export const AttendanceModule = () => {
  const {
    enrolledCourses,
    courseStats,
    loading,
    selectedCourseId,
    setSelectedCourseId,
    getOverallStats,
    getLowAttendanceCourses,
    getAttendanceByDate,
    ATTENDANCE_THRESHOLD
  } = useAcademyAttendance();

  const [currentMonth, setCurrentMonth] = useState(new Date());

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <UserCheck className="w-12 h-12 mx-auto mb-3 animate-pulse" />
          <p>Loading attendance...</p>
        </div>
      </div>
    );
  }

  if (enrolledCourses.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-2">No Courses Found</h3>
          <p className="text-sm">Enroll in Glee Academy courses to track attendance</p>
        </div>
      </div>
    );
  }

  const overallStats = getOverallStats();
  const lowAttendanceCourses = getLowAttendanceCourses();
  const attendanceByDate = getAttendanceByDate();
  const selectedStats = selectedCourseId ? courseStats.get(selectedCourseId) : null;

  return (
    <div className="h-full flex flex-col gap-4 p-1">
      {/* Low Attendance Alert */}
      {lowAttendanceCourses.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive text-sm">Low Attendance Alert</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lowAttendanceCourses.map(c => `${c.courseCode} (${c.attendanceRate}%)`).join(', ')} 
                  {' '}below {ATTENDANCE_THRESHOLD}% threshold
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard 
          label="Overall Rate" 
          value={`${overallStats.overallRate}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          variant={overallStats.overallRate >= ATTENDANCE_THRESHOLD ? 'success' : 'warning'}
        />
        <StatCard 
          label="Present" 
          value={overallStats.totalPresent}
          icon={<CheckCircle className="h-4 w-4" />}
          variant="success"
        />
        <StatCard 
          label="Absent" 
          value={overallStats.totalAbsent}
          icon={<XCircle className="h-4 w-4" />}
          variant="danger"
        />
        <StatCard 
          label="Late/Excused" 
          value={overallStats.totalLate + overallStats.totalExcused}
          icon={<Clock className="h-4 w-4" />}
          variant="neutral"
        />
      </div>

      {/* Course Tabs */}
      <Tabs 
        value={selectedCourseId || enrolledCourses[0]?.id} 
        onValueChange={setSelectedCourseId}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-muted/50 p-1">
          {enrolledCourses.map(course => {
            const stats = courseStats.get(course.id);
            const isLow = stats && stats.total > 0 && stats.attendanceRate < ATTENDANCE_THRESHOLD;
            return (
              <TabsTrigger 
                key={course.id} 
                value={course.id}
                className="text-xs px-2 py-1.5 data-[state=active]:bg-background"
              >
                <span className="flex items-center gap-1.5">
                  {course.courseCode}
                  {isLow && <AlertCircle className="h-3 w-3 text-destructive" />}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {enrolledCourses.map(course => (
          <TabsContent 
            key={course.id} 
            value={course.id}
            className="flex-1 mt-3 min-h-0"
          >
            <CourseAttendanceView 
              stats={courseStats.get(course.id)} 
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              attendanceByDate={attendanceByDate}
              courseCode={course.courseCode}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, variant }) => {
  const variantStyles = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
    neutral: 'text-muted-foreground'
  };

  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className={`flex items-center justify-center gap-1 ${variantStyles[variant]}`}>
          {icon}
          <span className="text-xl font-bold">{value}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
};

interface CourseAttendanceViewProps {
  stats?: {
    courseCode: string;
    courseTitle: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendanceRate: number;
    records: Array<{
      id: string;
      attendance_date: string;
      status: string;
      notes?: string;
    }>;
  };
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  attendanceByDate: Map<string, { status: string; courseCode: string }[]>;
  courseCode: string;
}

const CourseAttendanceView: React.FC<CourseAttendanceViewProps> = ({ 
  stats,
  currentMonth,
  setCurrentMonth,
  attendanceByDate,
  courseCode
}) => {
  const [view, setView] = useState<'history' | 'calendar'>('history');

  if (!stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No attendance data available</p>
      </div>
    );
  }

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'late': return 'bg-yellow-500';
      case 'excused': return 'bg-blue-500';
      default: return 'bg-muted';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
      case 'absent': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
      case 'late': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'excused': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400';
      default: return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
      case 'absent': return <XCircle className="h-3.5 w-3.5 text-red-600" />;
      case 'late': return <Clock className="h-3.5 w-3.5 text-yellow-600" />;
      case 'excused': return <AlertTriangle className="h-3.5 w-3.5 text-blue-600" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Course Stats Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono">{stats.courseCode}</Badge>
          <span className="text-sm font-medium">{stats.attendanceRate}% attendance</span>
          <span className="text-xs text-muted-foreground">({stats.total} classes)</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setView('history')}
            className={`p-1.5 rounded transition-colors ${view === 'history' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            <UserCheck className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`p-1.5 rounded transition-colors ${view === 'calendar' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>
      </div>

      {view === 'history' ? (
        <ScrollArea className="flex-1">
          {stats.records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No attendance records yet</p>
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {stats.records.map(record => (
                <div 
                  key={record.id}
                  className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(record.status)}
                    <span className="text-sm">
                      {format(parseISO(record.attendance_date), 'EEE, MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.notes && (
                      <span className="text-xs text-muted-foreground max-w-[120px] truncate">
                        {record.notes}
                      </span>
                    )}
                    <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(record.status)}`}>
                      {record.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      ) : (
        <div className="flex-1">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-1 hover:bg-muted rounded"
            >
              ←
            </button>
            <span className="font-medium text-sm">{format(currentMonth, 'MMMM yyyy')}</span>
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-1 hover:bg-muted rounded"
            >
              →
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-xs text-muted-foreground py-1">{day}</div>
            ))}
            
            {/* Empty cells for start of month */}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {/* Days */}
            {days.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayRecords = attendanceByDate.get(dateKey)?.filter(r => r.courseCode === courseCode) || [];
              const hasRecord = dayRecords.length > 0;
              const status = hasRecord ? dayRecords[0].status : null;
              
              return (
                <div 
                  key={dateKey}
                  className={`
                    aspect-square flex items-center justify-center text-xs rounded
                    ${!isSameMonth(day, currentMonth) ? 'text-muted-foreground/30' : ''}
                    ${isToday(day) ? 'ring-1 ring-primary' : ''}
                    ${hasRecord ? 'relative' : ''}
                  `}
                >
                  <span>{format(day, 'd')}</span>
                  {hasRecord && (
                    <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${getStatusColor(status!)}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-3 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Late</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Excused</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
