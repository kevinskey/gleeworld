import React from 'react';
import { format, isToday, isTomorrow, differenceInDays, startOfDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, QrCode, Trash2, BookOpen, Music, Users, GraduationCap, CheckCircle, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClassSession {
  id: string;
  title: string;
  description?: string | null;
  session_type: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  attendance_required?: boolean;
  image_url?: string | null;
}

interface ClassAgendaViewProps {
  sessions: ClassSession[];
  isInstructor?: boolean;
  onGenerateQR?: (session: ClassSession) => void;
  onDelete?: (sessionId: string) => void;
  showPastSessions?: boolean;
}

const SESSION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  class: { icon: BookOpen, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', label: 'Class' },
  rehearsal: { icon: Music, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300', label: 'Rehearsal' },
  lab: { icon: BookOpen, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', label: 'Lab' },
  workshop: { icon: Users, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300', label: 'Workshop' },
  lecture: { icon: GraduationCap, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300', label: 'Lecture' },
};

const getRelativeDateLabel = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  const today = startOfDay(new Date());
  
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  
  const diff = differenceInDays(date, today);
  if (diff > 0 && diff <= 7) return format(date, 'EEEE'); // Day name for next week
  
  return format(date, 'EEEE, MMM d');
};

export const ClassAgendaView: React.FC<ClassAgendaViewProps> = ({
  sessions,
  isInstructor = false,
  onGenerateQR,
  onDelete,
  showPastSessions = false,
}) => {
  const today = startOfDay(new Date());
  
  // Filter and group sessions by date
  const filteredSessions = showPastSessions 
    ? sessions 
    : sessions.filter(s => new Date(s.session_date + 'T23:59:59') >= today);
  
  const groupedSessions = filteredSessions.reduce((groups, session) => {
    const date = session.session_date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(session);
    return groups;
  }, {} as Record<string, ClassSession[]>);

  const sortedDates = Object.keys(groupedSessions).sort();

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-16">
        <CalendarDays className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">No Upcoming Sessions</h3>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {isInstructor ? 'Create a new session to get started' : 'Check back later for updates'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map(date => {
        const dateLabel = getRelativeDateLabel(date);
        const isCurrentDay = isToday(new Date(date + 'T00:00:00'));
        const daySessions = groupedSessions[date];
        
        return (
          <div key={date} className="space-y-3">
            {/* Date Header */}
            <div className={cn(
              "flex items-center gap-3 py-2 px-3 rounded-lg",
              isCurrentDay && "bg-primary/10"
            )}>
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl font-bold text-lg",
                isCurrentDay 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {format(new Date(date + 'T00:00:00'), 'd')}
              </div>
              <div>
                <div className={cn(
                  "font-semibold text-lg",
                  isCurrentDay && "text-primary"
                )}>
                  {dateLabel}
                </div>
                <div className="text-sm text-muted-foreground">
                  {daySessions.length} session{daySessions.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Sessions */}
            <div className="space-y-3 pl-4 border-l-2 border-muted ml-6">
              {daySessions.map(session => {
                const config = SESSION_CONFIG[session.session_type] || SESSION_CONFIG.class;
                const IconComponent = config.icon;
                
                return (
                  <Card 
                    key={session.id} 
                    className={cn(
                      "overflow-hidden transition-all hover:shadow-md",
                      isCurrentDay && "ring-1 ring-primary/20"
                    )}
                  >
                    {session.image_url && (
                      <div className="h-32 overflow-hidden">
                        <img 
                          src={session.image_url} 
                          alt={session.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Type Badge */}
                          <Badge 
                            variant="secondary" 
                            className={cn("mb-2", config.color)}
                          >
                            <IconComponent className="h-3.5 w-3.5 mr-1" />
                            {config.label}
                          </Badge>
                          
                          {/* Title */}
                          <h3 className="font-semibold text-lg leading-tight mb-2">
                            {session.title}
                          </h3>
                          
                          {/* Description */}
                          {session.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {session.description}
                            </p>
                          )}
                          
                          {/* Time & Location */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">{session.start_time}</span>
                              <span>-</span>
                              <span className="font-medium">{session.end_time}</span>
                            </span>
                            
                            {session.location && (
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                {session.location}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Attendance Badge */}
                        {session.attendance_required && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800 shrink-0">
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Required
                          </Badge>
                        )}
                      </div>
                      
                      {/* Instructor Actions */}
                      {isInstructor && (
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => onGenerateQR?.(session)}
                            className="flex-1"
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            Attendance QR
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => onDelete?.(session.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
