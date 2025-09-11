import React, { useEffect } from 'react';
import { BookingFormsModule } from '@/components/modules/BookingFormsModule';
import { useAuth } from '@/contexts/AuthContext';

const BookingForms = () => {
  const { user } = useAuth();

  useEffect(() => {
    document.title = 'Booking Forms | GleeWorld';
    const desc = 'Booking Forms — Review, filter, and manage incoming performance booking requests.';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    if (meta) meta.setAttribute('content', desc);

    const href = `${window.location.origin}/booking-forms`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    if (link) link.setAttribute('href', href);
  }, []);

  return <BookingFormsModule user={user ? { id: user.id, email: user.email || '' } : undefined} isFullPage />;
};

export default BookingForms;
