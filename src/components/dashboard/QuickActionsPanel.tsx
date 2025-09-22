import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Zap, 
  Shield, 
  Calendar, 
  Clock, 
  X,
  ChevronRight,
  Users,
  BarChart3
} from "lucide-react";

interface QuickActionsPanelProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
  };
  onModuleSelect: (moduleId: string) => void;
}

export const QuickActionsPanel = ({ user, onModuleSelect }: QuickActionsPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const isAdmin = user.role === 'super-admin' || user.role === 'admin';

  const quickActions = [
    ...(isAdmin ? [{
      id: 'permissions',
      title: 'Permissions',
      description: 'Manage access control',
      icon: Shield,
      color: 'orange',
      action: () => onModuleSelect('permissions')
    }] : []),
    {
      id: 'calendar',
      title: 'Calendar',
      description: 'View events & schedule',
      icon: Calendar,
      color: 'green',
      action: () => onModuleSelect('calendar')
    },
    ...(user.role !== 'auditioner' ? [{
      id: 'appointments',
      title: 'Appointments',
      description: 'Schedule meetings',
      icon: Clock,
      color: 'cyan',
      action: () => navigate('/appointments')
    }] : []),
    {
      id: 'attendance',
      title: 'Attendance',
      description: 'Track participation',
      icon: Users,
      color: 'purple',
      action: () => onModuleSelect('attendance')
    },
    ...(isAdmin ? [{
      id: 'analytics',
      title: 'Analytics',
      description: 'View insights',
      icon: BarChart3,
      color: 'blue',
      action: () => onModuleSelect('analytics')
    }] : [])
  ];

  const handleActionClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <>
      {/* Tab-style Trigger */}
      <div className="fixed right-0 top-32 z-50">
        <div 
          className={`relative transition-all duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : 'translate-x-0'
          }`}
        >
          <Button
            onClick={() => setIsOpen(!isOpen)}
            className={`h-16 w-8 rounded-l-xl rounded-r-none shadow-lg transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
              isOpen 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-gradient-to-b from-primary via-primary/90 to-primary/80 text-primary-foreground hover:shadow-xl'
            }`}
            size="icon"
          >
            <Zap className="h-4 w-4" />
            <div className="text-xs font-medium transform -rotate-90 whitespace-nowrap">
              Actions
            </div>
          </Button>
        </div>
      </div>

      {/* Full Menu Slide-out */}
      <div 
        className={`fixed right-0 top-0 h-full z-40 transition-all duration-300 ease-in-out ${
          isOpen 
            ? 'translate-x-0 opacity-100' 
            : 'translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-96 h-full bg-background/95 backdrop-blur-sm border-l shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Quick Actions</h3>
                  <p className="text-sm text-muted-foreground">Fast access to key features</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="hover:bg-muted/50"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Actions Grid */}
          <div className="p-6 space-y-3 overflow-y-auto h-full pb-20">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="ghost"
                  className="w-full justify-start h-auto p-4 hover:bg-muted/50 group border border-transparent hover:border-muted"
                  onClick={() => handleActionClick(action.action)}
                >
                  <div className="flex items-center gap-4 w-full">
                    <div 
                      className={`w-12 h-12 rounded-xl bg-${action.color}-100 dark:bg-${action.color}-900/20 flex items-center justify-center group-hover:scale-110 transition-transform`}
                    >
                      <IconComponent className={`h-6 w-6 text-${action.color}-600 dark:text-${action.color}-400`} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-base">{action.title}</div>
                      <div className="text-sm text-muted-foreground">{action.description}</div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background/95">
            <p className="text-sm text-muted-foreground text-center">
              Press ESC or click outside to close
            </p>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};