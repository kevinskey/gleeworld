import React, { useEffect } from 'react';
import { MusicLibrary } from "@/components/music-library/MusicLibrary";
import { UniversalLayout } from "@/components/layout/UniversalLayout";

const MusicLibraryPage = () => {
  useEffect(() => {
    document.title = 'Music Library | GleeWorld';
    // Meta description
    const desc =
      'Music Library — Spelman College Glee Club sheet music, study scores, setlists.';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    if (meta) meta.setAttribute('content', desc);

    // Canonical link
    const href = `${window.location.origin}/music-library`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    if (link) link.setAttribute('href', href);
  }, []);

  return (
    <UniversalLayout showFooter={false} containerized={false}>
      <MusicLibrary />
    </UniversalLayout>
  );
};

export default MusicLibraryPage;