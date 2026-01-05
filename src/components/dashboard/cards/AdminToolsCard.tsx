import React from 'react';
import { RoleCard } from './RoleCard';
import { Shield, Users, Settings, FileText, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const AdminToolsCard = () => {
  const navigate = useNavigate();
  
  const adminLinks = [
    { label: 'User Management', icon: Users, module: 'user-management' },
    { label: 'Contracts', icon: FileText, module: 'contracts' },
    { label: 'Analytics', icon: BarChart3, module: 'analytics' },
    { label: 'Settings', icon: Settings, module: 'dashboard-settings' },
  ];

  return (
    <RoleCard 
      title="Admin Tools" 
      icon={Shield} 
      accentColor="text-red-500"
    >
      <div className="grid grid-cols-2 gap-2">
        {adminLinks.map((link) => (
          <Button
            key={link.module}
            variant="outline"
            size="sm"
            className="justify-start gap-2 h-auto py-3"
            onClick={() => navigate(`/dashboard?module=${link.module}`)}
          >
            <link.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{link.label}</span>
          </Button>
        ))}
      </div>
    </RoleCard>
  );
};
