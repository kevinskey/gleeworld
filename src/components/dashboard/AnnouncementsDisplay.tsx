import React, { useState, useEffect } from 'react';
import { AnnouncementsTicker } from './AnnouncementsTicker';
import { AnnouncementsFlip } from './AnnouncementsFlip';

export type AnnouncementDisplayStyle = 'ticker' | 'flip' | 'slide-left' | 'slide-right';

interface AnnouncementsDisplayProps {
  className?: string;
}

export const getAnnouncementStyle = (): AnnouncementDisplayStyle => {
  return (localStorage.getItem('announcement_style') as AnnouncementDisplayStyle) || 'slide-left';
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

  if (displayStyle === 'ticker') {
    return <AnnouncementsTicker className={className} />;
  }

  // flip, slide-left, slide-right all use AnnouncementsFlip with direction prop
  const direction = displayStyle === 'slide-right' ? 'right' : displayStyle === 'flip' ? 'up' : 'left';
  return <AnnouncementsFlip className={className} direction={direction} />;
};
