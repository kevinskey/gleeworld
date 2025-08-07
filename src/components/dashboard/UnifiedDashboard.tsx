import React from 'react';
import { Header } from '../Header';
import { useAuth } from '@/contexts/AuthContext';

export const UnifiedDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      <Header 
        activeTab=""
        onTabChange={() => {}}
      />
      
      {/* Hero Section */}
      <div className="flex items-center justify-center h-[calc(100vh-72px)]">
        <div className="text-center space-y-6 max-w-4xl mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome to GleeWorld
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            The official digital platform of the Spelman College Glee Club, celebrating 100+ years of musical excellence.
          </p>
          <div className="text-primary font-medium text-lg">
            "To Amaze and Inspire"
          </div>
        </div>
      </div>
    </div>
  );
};