import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export const AnnouncementsTicker = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('gw_announcements')
      .select('id, title, content, created_at')
      .not('publish_date', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setAnnouncements(data);
    }
  };

  if (announcements.length === 0) {
    return <span className="text-sm text-muted-foreground">No announcements</span>;
  }

  const tickerText = announcements.map(a => `${a.title}: ${a.content}`).join('  •  ');

  return (
    <div className="animate-marquee whitespace-nowrap text-sm text-foreground/80">
      {tickerText}  •  {tickerText}
    </div>
  );
};
