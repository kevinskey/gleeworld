import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Pin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface AnnouncementsSectionProps {
  courseId: string;
}

export const AnnouncementsSection: React.FC<AnnouncementsSectionProps> = ({ courseId }) => {
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['course-announcements', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_announcements')
        .select('*')
        .eq('course_id', courseId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="p-6">Loading announcements...</div>;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold">Announcements</h2>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {announcements && announcements.length > 0 ? (
          announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <CardTitle className="text-base sm:text-lg">{announcement.title}</CardTitle>
                    {announcement.is_pinned && (
                      <Badge variant="secondary" className="text-xs">
                        <Pin className="h-3 w-3 mr-1" />
                        Pinned
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <p className="text-sm sm:text-base text-foreground/80 whitespace-pre-wrap">{announcement.content}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-6 sm:py-8 text-center text-muted-foreground text-sm sm:text-base">
              No announcements yet
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
