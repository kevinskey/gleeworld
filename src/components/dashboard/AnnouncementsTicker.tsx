import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_recurring?: boolean;
  recurrence_start_date?: string;
}

interface AnnouncementsTickerProps {
  className?: string;
}

export const AnnouncementsTicker = ({
  className
}: AnnouncementsTickerProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const now = new Date();
    const nowISO = now.toISOString();

    const { data, error } = await supabase.from('gw_announcements')
      .select('id, title, content, created_at, is_recurring, recurrence_start_date, publish_date')
      .not('publish_date', 'is', null)
      .lte('publish_date', nowISO)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      // Filter recurring announcements based on time of day
      const filtered = data.filter((announcement) => {
        if (announcement.is_recurring && announcement.recurrence_start_date) {
          const recurrenceDate = new Date(announcement.recurrence_start_date);
          const recurrenceHour = recurrenceDate.getUTCHours();
          const recurrenceMinute = recurrenceDate.getUTCMinutes();
          
          const currentHour = now.getUTCHours();
          const currentMinute = now.getUTCMinutes();
          
          // Check if current time is past the recurrence start time
          if (currentHour < recurrenceHour) return false;
          if (currentHour === recurrenceHour && currentMinute < recurrenceMinute) return false;
        }
        return true;
      });

      setAnnouncements(filtered.slice(0, 10));
    }
  };

  if (announcements.length === 0) {
    return <span className="text-xs sm:text-sm text-muted-foreground">No announcements</span>;
  }

  return (
    <div className={`overflow-hidden whitespace-nowrap w-full min-w-0 ${className || ''}`}>
      <div className="animate-marquee inline-block text-xs sm:text-sm text-foreground/80 pl-[100%] my-0 py-0 px-2 sm:px-[40px]">
        {announcements.map((a, i) => (
          <span key={a.id}>
            <span className="font-bold">{a.title}:</span> {a.content}
            {i < announcements.length - 1 && '  •  '}
          </span>
        ))}
      </div>
    </div>
  );
};
