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
  ChevronDown,
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
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActionsPanel = ({ user, onModuleSelect, isOpen, onClose }: QuickActionsPanelProps) => {
  const navigate = useNavigate();
  const isAdmin = user.role === 'super-admin' || user.role === 'admin';
  
  // Debug logging
  console.log('QuickActionsPanel user:', {
    role: user.role,
    is_exec_board: user.is_exec_board,
    isAdmin,
    exec_board_role: user.exec_board_role
  });

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
    ...(isAdmin || user.is_exec_board ? [{
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
    try {
      console.log('Action clicked, executing...');
      action();
      console.log('Action executed successfully');
      onClose();
    } catch (error) {
      console.error('Error executing action:', error);
    }
  };

  return (
    <>
      {/* Steel Dropdown Panel - slides out from underneath header */}
      <div 
        className={`absolute top-16 left-0 right-0 z-50 transition-all duration-300 ease-out ${
          isOpen 
            ? 'translate-y-0 opacity-100 scale-100' 
            : '-translate-y-4 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 dark:from-slate-600 dark:via-slate-500 dark:to-slate-700 rounded-b-lg border-x-2 border-b-2 border-slate-400 dark:border-slate-500 shadow-2xl mx-4">
          {/* Actions Grid - No header */}
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="ghost"
                  className="w-full justify-start h-auto p-3 hover:bg-slate-400/20 dark:hover:bg-slate-600/20 group border border-transparent hover:border-slate-500 dark:hover:border-slate-400 rounded-lg transition-all duration-200"
                  onClick={() => handleActionClick(action.action)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div 
                      className={`w-10 h-10 rounded-lg bg-slate-400/30 dark:bg-slate-600/30 flex items-center justify-center group-hover:scale-110 transition-transform border border-slate-500 dark:border-slate-400`}
                    >
                      <IconComponent className={`h-5 w-5 text-slate-800 dark:text-slate-100`} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 font-mono">{action.title}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-mono">{action.description}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-slate-100 transition-colors" />
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Steel Footer */}
          <div className="relative p-3 border-t border-slate-400 dark:border-slate-500">
            {/* Bottom Left Rivet */}
            <div className="absolute left-3 bottom-3 w-3 h-3 bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500 dark:from-slate-500 dark:via-slate-400 dark:to-slate-600 rounded-full border border-slate-500 dark:border-slate-400 shadow-inner">
              <div className="w-1.5 h-1.5 bg-slate-600 dark:bg-slate-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
            
            {/* Bottom Right Rivet */}
            <div className="absolute right-3 bottom-3 w-3 h-3 bg-gradient-to-br from-slate-400 via-slate-300 to-slate-500 dark:from-slate-500 dark:via-slate-400 dark:to-slate-600 rounded-full border border-slate-500 dark:border-slate-400 shadow-inner">
              <div className="w-1.5 h-1.5 bg-slate-600 dark:bg-slate-300 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 text-center font-mono pt-2">
              Click outside to close
            </p>
          </div>
        </div>
      </div>

      {/* Clear backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/10 z-30 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
    </>
  );
};