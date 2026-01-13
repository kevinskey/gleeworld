import React from 'react';
import { format, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, MapPin, QrCode, Trash2, Plus, 
  BookOpen, Music, Users, GraduationCap, CheckCircle, 
  CalendarDays, AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClassSession {
  id: string;
  title: string;
  description?: string | null;
  session_type: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  attendance_required?: boolean;
  image_url?: string | null;
}

interface SpelmanEvent {
  id: string;
  title: string;
  location?: string;
}

interface CalendarDayDetailProps {
  date: Date;
  sessions: ClassSession[];
  spelmanEvents?: SpelmanEvent[];
  isHoliday?: boolean;
  isInstructor?: boolean;
  onGenerateQR?: (session: ClassSession) => void;
  onDelete?: (sessionId: string) => void;
  onAddSession?: () => void;
}

const SESSION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  class: { icon: BookOpen, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', label: 'Class' },
  rehearsal: { icon: Music, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300', label: 'Rehearsal' },
  lab: { icon: BookOpen, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', label: 'Lab' },
  workshop: { icon: Users, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300', label: 'Workshop' },
  lecture: { icon: GraduationCap, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300', label: 'Lecture' },
};

export const CalendarDayDetail: React.FC<CalendarDayDetailProps> = ({
  date,
  sessions,
  spelmanEvents = [],
  isHoliday = false,
  isInstructor = false,
  onGenerateQR,
  onDelete,
  onAddSession,
}) => {
  const isCurrentDay = isToday(date);

  return (
    <Card className="h-full">
      <CardHeader className={cn(
        "pb-3",
        isCurrentDay && "bg-primary/5"
      )}>
        <CardTitle className="flex items-center justify-between">
          <div>
            <div className={cn(
              "text-2xl font-bold",
              isCurrentDay && "text-primary"
            )}>
              {format(date, 'EEEE')}
            </div>
            <div className="text-sm font-normal text-muted-foreground mt-1">
              {format(date, 'MMMM d, yyyy')}
            </div>
          </div>
          {isCurrentDay && (
            <Badge className="bg-primary">Today</Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-400px)] min-h-[300px]">
          <div className="p-4 space-y-4">
            {/* Holiday Warning */}
            {isHoliday && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <div className="font-semibold">No Class Scheduled</div>
                  <div className="text-sm opacity-80">This is a holiday or exception date</div>
                </div>
              </div>
            )}

            {/* Spelman Events */}
            {spelmanEvents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  College Events
                </h4>
                {spelmanEvents.map(event => (
                  <div 
                    key={event.id} 
                    className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl"
                  >
                    <div className="font-semibold text-amber-800 dark:text-amber-200">
                      {event.title}
                    </div>
                    {event.location && (
                      <div className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.location}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Class Sessions */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Class Sessions ({sessions.length})
              </h4>
              
              {sessions.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed rounded-xl">
                  <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground font-medium">No sessions scheduled</p>
                  {isInstructor && onAddSession && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-4"
                      onClick={onAddSession}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Session
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map(session => {
                    const config = SESSION_CONFIG[session.session_type] || SESSION_CONFIG.class;
                    const IconComponent = config.icon;
                    
                    return (
                      <div 
                        key={session.id} 
                        className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {session.image_url && (
                          <img 
                            src={session.image_url} 
                            alt={session.title} 
                            className="w-full h-28 object-cover"
                          />
                        )}
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Badge variant="secondary" className={cn("mb-2", config.color)}>
                                <IconComponent className="h-3.5 w-3.5 mr-1" />
                                {config.label}
                              </Badge>
                              <h4 className="font-semibold text-lg">{session.title}</h4>
                            </div>
                            {session.attendance_required && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Required
                              </Badge>
                            )}
                          </div>
                          
                          {session.description && (
                            <p className="text-sm text-muted-foreground">
                              {session.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {session.start_time} - {session.end_time}
                            </span>
                            {session.location && (
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                {session.location}
                              </span>
                            )}
                          </div>
                          
                          {isInstructor && (
                            <div className="flex items-center gap-2 pt-3 border-t">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => onGenerateQR?.(session)}
                                className="flex-1"
                              >
                                <QrCode className="h-4 w-4 mr-2" />
                                QR Attendance
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => onDelete?.(session.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
