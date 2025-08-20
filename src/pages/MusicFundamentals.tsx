import React, { useEffect } from 'react';
import { MusicFundamentalsPage } from '@/components/music-fundamentals/MusicFundamentalsPage';

const MusicFundamentals = () => {
  useEffect(() => {
    document.title = 'Music Fundamentals | GleeWorld';
    // Meta description
    const desc = 'Music Fundamentals — Practice sight singing, upload assignments, and track your progress in music theory and performance.';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    if (meta) meta.setAttribute('content', desc);

    // Canonical link
    const href = `${window.location.origin}/music-fundamentals`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    if (link) link.setAttribute('href', href);
  }, []);

  return <MusicFundamentalsPage />;
};

export default MusicFundamentals;