import React, { useEffect } from 'react';
import { SMUS100MidtermExam } from '@/components/exams/SMUS100MidtermExam';

const SMUS100MidtermExamPage: React.FC = () => {
  useEffect(() => {
    // Set SEO metadata
    document.title = "SMUS-100 Midterm Exam | Music Fundamentals Assessment";
    
    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Comprehensive midterm examination for Music Fundamentals covering notation, rhythm, scales, chords, listening identification, and cultural context. Timed assessment with mixed auto-graded and instructor-graded sections.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Comprehensive midterm examination for Music Fundamentals covering notation, rhythm, scales, chords, listening identification, and cultural context. Timed assessment with mixed auto-graded and instructor-graded sections.';
      document.head.appendChild(meta);
    }

    // Set canonical link
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', `${window.location.origin}/smus100-midterm-exam`);
    } else {
      const link = document.createElement('link');
      link.rel = 'canonical';
      link.href = `${window.location.origin}/smus100-midterm-exam`;
      document.head.appendChild(link);
    }
  }, []);

  return <SMUS100MidtermExam />;
};

export default SMUS100MidtermExamPage;