import React, { useEffect } from 'react';
import { MusicLibrary } from "@/components/music-library/MusicLibrary";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useIsMobile } from '@/hooks/use-mobile';

const MusicLibraryPage = () => {
  const isMobile = useIsMobile();
  
  useEffect(() => {
    document.title = 'Music Library | GleeWorld';
    const desc =
      'Music Library — Spelman College Glee Club sheet music, study scores, setlists.';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    if (meta) meta.setAttribute('content', desc);

    const href = `${window.location.origin}/music-library`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    if (link) link.setAttribute('href', href);
  }, []);

  // On mobile, use minimal layout without footer for full-screen library experience
  return (
    <UniversalLayout 
      showFooter={false} 
      containerized={false}
    >
      <div className={isMobile ? 'h-[calc(100dvh-4rem)]' : ''}>
        <MusicLibrary />
      </div>
    </UniversalLayout>
  );
};

export default MusicLibraryPage;
