import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
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
    const {
      data,
      error
    } = await supabase.from('gw_announcements').select('id, title, content, created_at').not('publish_date', 'is', null).order('created_at', {
      ascending: false
    }).limit(10);
    if (!error && data) {
      setAnnouncements(data);
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