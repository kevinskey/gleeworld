import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useServiceProviders } from '@/hooks/useServiceProviders';

export const DashboardNavigation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: providers = [] } = useServiceProviders();

  // Check if current user is a service provider
  const isProvider = providers.some(provider => provider.user_id === user?.id);

  if (!isProvider) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-card border rounded-lg">
      <h3 className="text-lg font-semibold mb-3">Provider Dashboard</h3>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/provider/appointments')}
          className="flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          My Appointments
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/provider-dashboard')}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Provider Settings
        </Button>
      </div>
    </div>
  );
};