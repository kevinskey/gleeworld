import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, Users, Calendar, TrendingUp, Filter, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface TimeSlot {
  start_time: string;
  end_time: string;
  day: string;
  count: number;
  students: string[];
}

interface StudentAvailability {
  user_id: string;
  student_name?: string;
  total_class_hours: number;
  busiest_day: string;
  free_periods: string[];
  schedule_count: number;
}

interface DayAnalysis {
  day: string;
  day_name: string;
  total_students_busy: number;
  peak_hours: string[];
  avg_busy_hours: number;
  conflicts: number;
}

const DAYS_MAP = {
  'M': 'Monday',
  'T': 'Tuesday', 
  'W': 'Wednesday',
  'R': 'Thursday',
  'F': 'Friday',
  'S': 'Saturday',
  'U': 'Sunday'
};

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export default function ScheduleAnalytics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [dayAnalysis, setDayAnalysis] = useState<DayAnalysis[]>([]);
  const [studentAvailability, setStudentAvailability] = useState<StudentAvailability[]>([]);
  const [busyTimeSlots, setBusyTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all');

  useEffect(() => {
    loadScheduleAnalytics();
  }, []);

  const loadScheduleAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch all active class schedules with user profiles
      const { data: schedules, error } = await supabase
        .from('gw_class_schedules')
        .select(`
          *,
          gw_profiles!inner(
            user_id,
            first_name,
            last_name,
            full_name
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      setScheduleData(schedules || []);
      analyzeScheduleData(schedules || []);

    } catch (error) {
      console.error('Error loading schedule analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load schedule analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeScheduleData = (schedules: any[]) => {
    // Analyze by day
    const dayStats: { [key: string]: DayAnalysis } = {};
    
    Object.entries(DAYS_MAP).forEach(([day, dayName]) => {
      const daySchedules = schedules.filter(s => s.days_of_week.includes(day));
      
      dayStats[day] = {
        day,
        day_name: dayName,
        total_students_busy: new Set(daySchedules.map(s => s.user_id)).size,
        peak_hours: findPeakHours(daySchedules),
        avg_busy_hours: calculateAvgBusyHours(daySchedules),
        conflicts: findConflicts(daySchedules)
      };
    });

    setDayAnalysis(Object.values(dayStats));

    // Analyze student availability
    const studentStats: { [key: string]: StudentAvailability } = {};
    
    schedules.forEach(schedule => {
      const userId = schedule.user_id;
      const studentName = schedule.gw_profiles?.full_name || 
                         `${schedule.gw_profiles?.first_name || ''} ${schedule.gw_profiles?.last_name || ''}`.trim() ||
                         'Unknown Student';
      
      if (!studentStats[userId]) {
        studentStats[userId] = {
          user_id: userId,
          student_name: studentName,
          total_class_hours: 0,
          busiest_day: '',
          free_periods: [],
          schedule_count: 0
        };
      }

      // Calculate total class hours
      const startTime = new Date(`2000-01-01T${schedule.start_time}`);
      const endTime = new Date(`2000-01-01T${schedule.end_time}`);
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      studentStats[userId].total_class_hours += duration * schedule.days_of_week.length;
      studentStats[userId].schedule_count += 1;
    });

    // Find busiest day for each student
    Object.keys(studentStats).forEach(userId => {
      const userSchedules = schedules.filter(s => s.user_id === userId);
      const dayHours: { [key: string]: number } = {};
      
      Object.keys(DAYS_MAP).forEach(day => {
        dayHours[day] = 0;
        userSchedules.forEach(schedule => {
          if (schedule.days_of_week.includes(day)) {
            const startTime = new Date(`2000-01-01T${schedule.start_time}`);
            const endTime = new Date(`2000-01-01T${schedule.end_time}`);
            const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            dayHours[day] += duration;
          }
        });
      });

      const busiestDay = Object.entries(dayHours).reduce((a, b) => 
        dayHours[a[0]] > dayHours[b[0]] ? a : b
      )[0];
      
      studentStats[userId].busiest_day = DAYS_MAP[busiestDay as keyof typeof DAYS_MAP];
    });

    setStudentAvailability(Object.values(studentStats));

    // Analyze busy time slots
    const timeSlotAnalysis = analyzeBusyTimeSlots(schedules);
    setBusyTimeSlots(timeSlotAnalysis);
  };

  const findPeakHours = (daySchedules: any[]): string[] => {
    const hourCounts: { [key: string]: number } = {};
    
    daySchedules.forEach(schedule => {
      const startHour = parseInt(schedule.start_time.split(':')[0]);
      const endHour = parseInt(schedule.end_time.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const hourStr = hour.toString().padStart(2, '0') + ':00';
        hourCounts[hourStr] = (hourCounts[hourStr] || 0) + 1;
      }
    });

    // Return top 3 busiest hours
    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);
  };

  const calculateAvgBusyHours = (daySchedules: any[]): number => {
    if (daySchedules.length === 0) return 0;
    
    const totalHours = daySchedules.reduce((sum, schedule) => {
      const startTime = new Date(`2000-01-01T${schedule.start_time}`);
      const endTime = new Date(`2000-01-01T${schedule.end_time}`);
      return sum + (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    }, 0);
    
    return Math.round((totalHours / new Set(daySchedules.map(s => s.user_id)).size) * 10) / 10;
  };

  const findConflicts = (daySchedules: any[]): number => {
    let conflicts = 0;
    
    for (let i = 0; i < daySchedules.length; i++) {
      for (let j = i + 1; j < daySchedules.length; j++) {
        if (daySchedules[i].user_id === daySchedules[j].user_id) {
          // Check for time overlap
          const start1 = daySchedules[i].start_time;
          const end1 = daySchedules[i].end_time;
          const start2 = daySchedules[j].start_time;
          const end2 = daySchedules[j].end_time;
          
          if ((start1 < end2 && end1 > start2)) {
            conflicts++;
          }
        }
      }
    }
    
    return conflicts;
  };

  const analyzeBusyTimeSlots = (schedules: any[]): TimeSlot[] => {
    const slots: { [key: string]: TimeSlot } = {};
    
    schedules.forEach(schedule => {
      schedule.days_of_week.forEach((day: string) => {
        const slotKey = `${day}-${schedule.start_time}-${schedule.end_time}`;
        const studentName = schedule.gw_profiles?.full_name || 'Unknown';
        
        if (!slots[slotKey]) {
          slots[slotKey] = {
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            day,
            count: 0,
            students: []
          };
        }
        
        slots[slotKey].count++;
        slots[slotKey].students.push(studentName);
      });
    });

    return Object.values(slots).sort((a, b) => b.count - a.count).slice(0, 20);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const exportData = () => {
    const csvData = studentAvailability.map(student => ({
      'Student Name': student.student_name,
      'Total Class Hours': student.total_class_hours,
      'Busiest Day': student.busiest_day,
      'Number of Classes': student.schedule_count
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-schedule-analytics.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading schedule analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Schedule Analytics</h2>
          <p className="text-muted-foreground">
            Analyze student availability and busy periods for planning
          </p>
        </div>
        
        <Button onClick={exportData} className="gap-2">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{studentAvailability.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Class Hours</p>
                <p className="text-2xl font-bold">
                  {studentAvailability.length > 0 
                    ? (studentAvailability.reduce((sum, s) => sum + s.total_class_hours, 0) / studentAvailability.length).toFixed(1)
                    : '0'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Classes</p>
                <p className="text-2xl font-bold">{scheduleData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Busiest Day</p>
                <p className="text-2xl font-bold">
                  {dayAnalysis.length > 0 
                    ? dayAnalysis.reduce((max, day) => 
                        day.total_students_busy > max.total_students_busy ? day : max
                      ).day_name.slice(0, 3)
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Daily Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dayAnalysis.map((day) => (
              <div key={day.day} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="font-semibold min-w-[100px]">{day.day_name}</div>
                  <Badge variant="secondary">{day.total_students_busy} students busy</Badge>
                  <span className="text-sm text-muted-foreground">
                    Avg: {day.avg_busy_hours}h
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Peak hours:</span>
                  {day.peak_hours.slice(0, 2).map((hour, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {formatTime(hour)}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Student Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student Availability Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {studentAvailability.map((student) => (
              <div key={student.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{student.student_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {student.total_class_hours.toFixed(1)}h total • Busiest: {student.busiest_day}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{student.schedule_count} classes</Badge>
                  <Badge 
                    variant={student.total_class_hours > 20 ? "destructive" : 
                            student.total_class_hours > 15 ? "default" : "secondary"}
                  >
                    {student.total_class_hours > 20 ? 'Very Busy' :
                     student.total_class_hours > 15 ? 'Busy' : 'Available'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Busiest Time Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Busiest Time Slots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {busyTimeSlots.slice(0, 10).map((slot, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">
                    {DAYS_MAP[slot.day as keyof typeof DAYS_MAP]} {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {slot.students.slice(0, 3).join(', ')}
                    {slot.students.length > 3 && ` +${slot.students.length - 3} more`}
                  </div>
                </div>
                <Badge variant="destructive">{slot.count} students</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}