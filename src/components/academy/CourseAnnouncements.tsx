import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pin, Calendar } from 'lucide-react';
import { useCourseAnnouncements } from '@/hooks/useCourseAnnouncements';
import { format } from 'date-fns';

interface CourseAnnouncementsProps {
  courseId: string;
}

export const CourseAnnouncements: React.FC<CourseAnnouncementsProps> = ({ courseId }) => {
  const { announcements, loading } = useCourseAnnouncements(courseId);

  if (loading) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Announcements</h2>
          <p className="text-muted-foreground">Loading announcements...</p>
        </CardContent>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Announcements</h2>
          <p className="text-muted-foreground">No announcements yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border">
      <CardContent className="p-6">
        <h2 className="text-xl font-bold text-foreground mb-6">Announcements</h2>
        <div className="space-y-3 sm:space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="bg-muted/30 border-border">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">{announcement.title}</h3>
                    {announcement.is_pinned && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Pin className="h-3 w-3" />
                        Pinned
                      </Badge>
                    )}
                  </div>
                  {announcement.created_at && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">
                  {announcement.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
