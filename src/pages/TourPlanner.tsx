import React from 'react';
import { TourManagerDashboard } from '@/components/tour-manager/TourManagerDashboard';

const TourPlanner: React.FC = () => {
  // TODO: Get user data from auth context or props
  const user = {
    id: 'current-user-id',
    email: 'user@example.com',
    full_name: 'Current User',
    role: 'admin',
    is_exec_board: true,
  };

  return <TourManagerDashboard user={user} />;
};

export default TourPlanner;