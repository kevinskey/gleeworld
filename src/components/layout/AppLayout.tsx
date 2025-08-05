import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
interface AppLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showHeader?: boolean;
}

export const AppLayout = ({ 
  children, 
  activeTab = '', 
  onTabChange = () => {}, 
  showHeader = true 
}: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {showHeader && (
        <Header 
          activeTab={activeTab} 
          onTabChange={onTabChange}
        />
      )}
      <main>
        {children}
      </main>
    </div>
  );
};