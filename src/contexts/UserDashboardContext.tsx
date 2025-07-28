import React, { createContext, useContext } from 'react';
import { useUserDashboard } from '@/hooks/useUserDashboard';

type UserDashboardContextType = ReturnType<typeof useUserDashboard>;

const UserDashboardContext = createContext<UserDashboardContextType | null>(null);

export const UserDashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dashboardData = useUserDashboard();
  
  return (
    <UserDashboardContext.Provider value={dashboardData}>
      {children}
    </UserDashboardContext.Provider>
  );
};

export const useUserDashboardContext = () => {
  const context = useContext(UserDashboardContext);
  if (!context) {
    throw new Error('useUserDashboardContext must be used within a UserDashboardProvider');
  }
  return context;
};