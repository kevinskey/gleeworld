import React from 'react';
import { Settings } from 'lucide-react';
import { AppointmentServiceManager } from '../appointments/AppointmentServiceManager';

export const AppointmentAdminDashboard = () => {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage appointment services
          </p>
        </div>
      </div>

      <AppointmentServiceManager />
    </div>
  );
};