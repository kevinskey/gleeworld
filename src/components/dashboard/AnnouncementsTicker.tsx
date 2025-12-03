import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Megaphone } from 'lucide-react';

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
    const { data, error } = await (supabase as any)
      .from('gw_announcements')
      .select('id, title, content, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setAnnouncements(data as Announcement[]);
    }
  };

  if (announcements.length === 0) {
    return null;
  }

  const tickerText = announcements.map(a => a.title || a.content).join('  •  ');

  return (
    <div className="hidden lg:flex items-center flex-1 mx-6 max-w-2xl">
      <div className="flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1.5 w-full overflow-hidden">
        <Megaphone className="w-4 h-4 text-primary shrink-0" />
        <div className="overflow-hidden flex-1">
          <div className="animate-marquee whitespace-nowrap text-sm text-foreground/80">
            {tickerText}  •  {tickerText}
          </div>
        </div>
      </div>
    </div>
  );
};
