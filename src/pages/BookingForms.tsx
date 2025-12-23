import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

// Booking Forms is now part of Tour Manager module
// Redirect to dashboard with tour-management module
const BookingForms: React.FC = () => {
  useEffect(() => {
    document.title = 'Booking Forms | GleeWorld';
  }, []);

  // Redirect to Tour Manager (which contains booking requests as its first tab)
  return <Navigate to="/dashboard?module=tour-management" replace />;
};

export default BookingForms;
