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

// Single opinionated style — GleeWorld brand
const STYLE = {
  background: 'linear-gradient(135deg, hsl(203 85% 50%) 0%, hsl(219 78% 31%) 100%)',
  borderColor: 'hsl(203 85% 70%)',
  textColor: 'hsl(0 0% 100%)',
  desktopTextColor: 'hsl(0 0% 100%)',
};

export const AnnouncementsTicker = ({
  className
}: AnnouncementsTickerProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gw_announcements' },
        () => fetchAnnouncements()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const now = new Date();
      const nowISO = now.toISOString();
      const { data, error } = await supabase.from('gw_announcements')
        .select('id, title, content, created_at, is_recurring, recurrence_start_date, publish_date')
        .not('publish_date', 'is', null)
        .lte('publish_date', nowISO)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        const filtered = data.filter((a) => {
          if (a.is_recurring && a.recurrence_start_date) {
            const rd = new Date(a.recurrence_start_date);
            if (now.getUTCHours() < rd.getUTCHours()) return false;
            if (now.getUTCHours() === rd.getUTCHours() && now.getUTCMinutes() < rd.getUTCMinutes()) return false;
          }
          return true;
        });
        setAnnouncements(filtered.slice(0, 10));
      }
    } catch (err) {
      console.warn('AnnouncementsTicker fetch failed:', err);
    }
  };

  if (announcements.length === 0) {
    return (
      <>
        <div className={`lg:hidden ${className || ''}`}>
          <div className="w-full rounded-xl px-4 py-3 shadow-lg border backdrop-blur-sm bg-muted border-border">
            <div className="flex items-center gap-2">
              <span className="text-lg opacity-50">📢</span>
              <p className="text-sm text-muted-foreground">No announcements</p>
            </div>
          </div>
        </div>
        <div className={`hidden lg:block overflow-hidden whitespace-nowrap w-full min-w-0 ${className || ''}`}>
          <div className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-[40px]">No announcements</div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile */}
      <div className={`lg:hidden ${className || ''}`}>
        <div
          className="w-full rounded-xl px-4 py-3 shadow-lg border backdrop-blur-sm"
          style={{ background: STYLE.background, borderColor: STYLE.borderColor }}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">📢</span>
            <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide">
              <p className="text-sm font-medium whitespace-nowrap leading-snug" style={{ color: STYLE.textColor }}>
                {announcements.map((a, i) => (
                  <span key={a.id}>
                    <span className="font-bold">{a.title}:</span>{' '}
                    <span style={{ opacity: 0.95 }}>{a.content}</span>
                    {i < announcements.length - 1 && <span className="mx-2" style={{ opacity: 0.6 }}>•</span>}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop ticker */}
      <div className={`hidden lg:block overflow-hidden whitespace-nowrap w-full min-w-0 ${className || ''}`}>
        <div
          className="animate-marquee inline-block text-xs sm:text-sm pl-[100%] my-0 py-0 px-2 sm:px-[40px]"
          style={{ color: STYLE.desktopTextColor }}
        >
          {announcements.map((a, i) => (
            <span key={a.id}>
              <span className="font-bold">{a.title}:</span> {a.content}
              {i < announcements.length - 1 && '  •  '}
            </span>
          ))}
        </div>
      </div>
    </>
  );
};
