
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back{user?.email ? `, ${user.email}` : ''}!</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card text-card-foreground rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-2">Quick Access</h3>
          <p className="text-sm text-muted-foreground">Your personalized dashboard content will appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
