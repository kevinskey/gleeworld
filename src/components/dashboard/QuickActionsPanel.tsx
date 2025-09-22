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
      {/* Floating Trigger Button */}
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`h-12 w-12 rounded-full shadow-lg transition-all duration-300 ${
            isOpen 
              ? 'bg-primary text-primary-foreground rotate-45' 
              : 'bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground hover:shadow-xl hover:scale-110'
          }`}
          size="icon"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
        </Button>
      </div>

      {/* Slide-out Panel */}
      <div 
        className={`fixed right-0 top-1/2 transform -translate-y-1/2 z-40 transition-all duration-300 ease-in-out ${
          isOpen 
            ? 'translate-x-0 opacity-100' 
            : 'translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        <Card className="w-80 mr-20 shadow-2xl border-2 bg-background/95 backdrop-blur-sm">
          <CardContent className="p-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Quick Actions</h3>
                  <p className="text-xs text-muted-foreground">Fast access to key features</p>
                </div>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="p-4 space-y-2">
              {quickActions.map((action) => {
                const IconComponent = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 hover:bg-muted/50 group"
                    onClick={() => handleActionClick(action.action)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div 
                        className={`w-10 h-10 rounded-lg bg-${action.color}-100 dark:bg-${action.color}-900/20 flex items-center justify-center group-hover:scale-110 transition-transform`}
                      >
                        <IconComponent className={`h-5 w-5 text-${action.color}-600 dark:text-${action.color}-400`} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm">{action.title}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 pb-4 pt-2 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground text-center">
                Click outside to close
              </p>
            </div>
          </CardContent>
        </Card>
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