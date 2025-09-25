import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProviderRoute } from '@/components/provider/ProviderRoute';
import ProviderAppointments from '@/pages/ProviderAppointments';

export const ProviderRoutes = () => {
  return (
    <Routes>
      <Route 
        path="appointments" 
        element={
          <ProviderRoute>
            <ProviderAppointments />
          </ProviderRoute>
        } 
      />
      <Route 
        path="appointments/:providerId" 
        element={
          <ProviderRoute>
            <ProviderAppointments />
          </ProviderRoute>
        } 
      />
    </Routes>
  );
};