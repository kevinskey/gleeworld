import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useServiceProviders } from '@/hooks/useServiceProviders';
export const DashboardNavigation = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    data: providers = []
  } = useServiceProviders();

  // Check if current user is a service provider
  const isProvider = providers.some(provider => provider.user_id === user?.id);
  if (!isProvider) {
    return null;
  }
  return;
};