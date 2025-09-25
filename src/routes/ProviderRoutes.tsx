import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProviderRoute } from '@/components/provider/ProviderRoute';
import ProviderAppointments from '@/pages/ProviderAppointments';

export const ProviderRoutes = () => {
  return (
    <Routes>
      {/* Index: /appointments/provider */}
      <Route 
        index 
        element={
          <ProviderRoute>
            <ProviderAppointments />
          </ProviderRoute>
        } 
      />
      {/* Provider-specific: /appointments/provider/:providerId (e.g., Drew, Soleil) */}
      <Route 
        path=":providerId" 
        element={
          <ProviderRoute>
            <ProviderAppointments />
          </ProviderRoute>
        } 
      />
    </Routes>
  );
};