import React, { useState, useEffect } from 'react';
import { AnnouncementsTicker } from './AnnouncementsTicker';
import { AnnouncementsFlip } from './AnnouncementsFlip';

export type AnnouncementDisplayStyle = 'ticker' | 'flip';

interface AnnouncementsDisplayProps {
  className?: string;
}

export const getAnnouncementStyle = (): AnnouncementDisplayStyle => {
  return (localStorage.getItem('announcement_style') as AnnouncementDisplayStyle) || 'flip';
};

export const setAnnouncementStyle = (style: AnnouncementDisplayStyle) => {
  localStorage.setItem('announcement_style', style);
  window.dispatchEvent(new CustomEvent('announcement-style-change', { detail: style }));
};

export const AnnouncementsDisplay = ({ className }: AnnouncementsDisplayProps) => {
  const [displayStyle, setDisplayStyle] = useState<AnnouncementDisplayStyle>(getAnnouncementStyle);

  useEffect(() => {
    const handleStyleChange = (e: CustomEvent<AnnouncementDisplayStyle>) => {
      setDisplayStyle(e.detail);
    };

    window.addEventListener('announcement-style-change', handleStyleChange as EventListener);
    return () => {
      window.removeEventListener('announcement-style-change', handleStyleChange as EventListener);
    };
  }, []);

  if (displayStyle === 'flip') {
    return <AnnouncementsFlip className={className} />;
  }

  return <AnnouncementsTicker className={className} />;
};
