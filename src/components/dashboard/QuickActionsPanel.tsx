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
      {/* Header Trigger Button */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`h-10 px-4 rounded-lg shadow-lg transition-all duration-300 ${
            isOpen 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground hover:shadow-xl'
          }`}
        >
          <Zap className="h-4 w-4 mr-2" />
          <span className="text-sm font-medium">Quick Actions</span>
          {isOpen ? <X className="h-4 w-4 ml-2" /> : <ChevronRight className="h-4 w-4 ml-2 rotate-90" />}
        </Button>
      </div>

      {/* Dashboard Drawer - Slides down from header */}
      <div 
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ease-out ${
          isOpen 
            ? 'translate-y-0 opacity-100' 
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-background/98 backdrop-blur-lg border-b shadow-2xl mt-16">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-8 py-6 border-b border-border/50">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">Quick Actions Dashboard</h3>
                    <p className="text-muted-foreground">Fast access to key features and tools</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-muted/50"
                >
                  <X className="h-5 w-5 mr-2" />
                  Close
                </Button>
              </div>
            </div>
          </div>

          {/* Actions Grid */}
          <div className="px-8 py-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {quickActions.map((action) => {
                  const IconComponent = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="h-auto p-6 hover:bg-muted/50 group border-2 hover:border-primary/20 transition-all duration-200"
                      onClick={() => handleActionClick(action.action)}
                    >
                      <div className="flex flex-col items-center text-center w-full">
                        <div 
                          className={`w-16 h-16 rounded-2xl bg-${action.color}-100 dark:bg-${action.color}-900/20 flex items-center justify-center group-hover:scale-110 transition-transform mb-4`}
                        >
                          <IconComponent className={`h-8 w-8 text-${action.color}-600 dark:text-${action.color}-400`} />
                        </div>
                        <div className="font-semibold text-base mb-2">{action.title}</div>
                        <div className="text-sm text-muted-foreground">{action.description}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t bg-muted/10">
            <div className="max-w-7xl mx-auto">
              <p className="text-sm text-muted-foreground text-center">
                Press ESC to close or click the close button above
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};