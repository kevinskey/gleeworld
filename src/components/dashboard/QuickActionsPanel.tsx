import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { UNIFIED_MODULES } from "@/config/unified-modules";
import { 
  Zap, 
  Shield, 
  Calendar, 
  Clock, 
  X,
  ChevronRight,
  ChevronDown,
  Users,
  BarChart3,
  Plus,
  Trash2,
  Settings,
  Music,
  FileText,
  Mail,
  Camera,
  Mic,
  BookOpen,
  Heart,
  Star,
  Globe,
  Home,
  MessageSquare
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
  quickActions?: {
    addQuickAction: (moduleId: string) => Promise<boolean>;
    removeQuickAction: (moduleId: string) => Promise<boolean>;
    isInQuickActions: (moduleId: string) => boolean;
  };
}

export const QuickActionsPanel = ({ user, onModuleSelect, isOpen, onClose, quickActions }: QuickActionsPanelProps) => {
  const navigate = useNavigate();
  const isAdmin = user.role === 'super-admin' || user.role === 'admin';
  const isMember = user.role === 'member';
  const [isManaging, setIsManaging] = useState(false);
  const [customActions, setCustomActions] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedModuleToAdd, setSelectedModuleToAdd] = useState('');
  
  // Debug logging
  console.log('QuickActionsPanel user:', {
    role: user.role,
    is_exec_board: user.is_exec_board,
    isAdmin,
    exec_board_role: user.exec_board_role
  });

  // Available modules for selection
  const availableModules = UNIFIED_MODULES.filter(module => module.isActive).map(module => ({
    id: module.id,
    name: module.name,
    title: module.title,
    description: module.description,
    icon: module.icon.name || module.title.charAt(0).toUpperCase(),
    category: module.category
  }));

  // Available icons for quick actions
  const availableIcons = {
    Zap, Shield, Calendar, Clock, Users, BarChart3, Music, FileText, Mail, 
    Camera, Mic, BookOpen, Heart, Star, Globe, Home, MessageSquare, Settings
  };

  // Load custom actions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`quickActions_${user.id}`);
    if (stored) {
      try {
        setCustomActions(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading custom actions:', error);
      }
    }
  }, [user.id]);

  // Save custom actions to localStorage (strip runtime functions)
  const saveCustomActions = (actions: any[]) => {
    const serialized = actions.map(({ action, ...rest }) => rest);
    localStorage.setItem(`quickActions_${user.id}`, JSON.stringify(serialized));
    setCustomActions(serialized);
  };

  const computedCustomActions = customActions.map((a) => ({
    ...a,
    action: typeof a.action === 'function' ? a.action : () => onModuleSelect(a.moduleId || a.name || a.id),
  }));

  const allActions = computedCustomActions;

  const handleActionClick = (actionFn?: () => void, fallbackModuleId?: string) => {
    try {
      console.log('Action clicked, executing...');
      if (typeof actionFn === 'function') {
        actionFn();
      } else if (fallbackModuleId) {
        onModuleSelect(fallbackModuleId);
      } else {
        throw new TypeError('actionFn is not a function');
      }
      console.log('Action executed successfully');
      onClose();
    } catch (error) {
      console.error('Error executing action:', error);
    }
  };

  const handleAddAction = async () => {
    if (!selectedModuleToAdd || selectedModuleToAdd === 'none') {
      toast.error('Please select a module');
      return;
    }

    // If member with quickActions, use the hook
    if (isMember && quickActions) {
      const success = await quickActions.addQuickAction(selectedModuleToAdd);
      if (success) {
        setSelectedModuleToAdd('');
        setShowAddDialog(false);
      }
      return;
    }

    // Otherwise, add to custom actions (for non-members)
    const selectedModule = availableModules.find(m => m.name === selectedModuleToAdd);
    if (!selectedModule) {
      toast.error('Module not found');
      return;
    }
    
    const newAction = {
      id: `custom_${Date.now()}`,
      title: selectedModule.title,
      description: selectedModule.description,
      icon: 'Zap',
      color: 'blue',
      action: () => onModuleSelect(selectedModuleToAdd),
      isDefault: false,
      moduleId: selectedModuleToAdd
    };

    const updatedActions = [...customActions, newAction];
    saveCustomActions(updatedActions);
    
    setSelectedModuleToAdd('');
    setShowAddDialog(false);
    
    toast.success(`Quick action "${selectedModule.title}" added successfully!`);
  };

  const handleDeleteAction = (actionId: string) => {
    const updatedActions = customActions.filter(action => action.id !== actionId);
    saveCustomActions(updatedActions);
    toast.success('Quick action removed successfully!');
  };

  // Handle adding module to member quick actions
  const handleAddToQuickActions = async (moduleId: string) => {
    if (!quickActions) {
      toast.error('Quick actions not available');
      return;
    }

    const success = await quickActions.addQuickAction(moduleId);
    if (success) {
      onClose();
    }
  };

  // Handle removing module from member quick actions
  const handleRemoveFromQuickActions = async (moduleId: string) => {
    if (!quickActions) {
      toast.error('Quick actions not available');
      return;
    }

    const success = await quickActions.removeQuickAction(moduleId);
  };

  const getIconComponent = (iconName: string) => {
    return availableIcons[iconName as keyof typeof availableIcons] || Zap;
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
          
          {/* Header with management controls */}
          <div className="p-3 border-b border-slate-400 dark:border-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-slate-800 dark:text-slate-100" />
              <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-100">
                Quick Actions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-slate-400/20 dark:hover:bg-slate-600/20"
                  >
                    <Plus className="h-3 w-3 text-slate-800 dark:text-slate-100" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Quick Action</DialogTitle>
                    <DialogDescription>
                      Select a module to add to your quick actions
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Select Module</label>
                      <Select value={selectedModuleToAdd} onValueChange={setSelectedModuleToAdd}>
                        <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                          <SelectValue placeholder="Choose a module to add" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 max-h-60 overflow-y-auto">
                          {availableModules
                            .filter(module => {
                              // For members, filter out modules already in quick actions
                              if (isMember && quickActions) {
                                return !quickActions.isInQuickActions(module.name);
                              }
                              // For non-members, filter out modules already in custom actions
                              return !customActions.some(action => action.moduleId === module.name);
                            })
                            .sort((a, b) => a.title.localeCompare(b.title))
                            .map((module) => (
                            <SelectItem key={module.id} value={module.name}>
                              {module.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleAddAction} className="flex-1">
                        Add to Quick Actions
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowAddDialog(false);
                          setSelectedModuleToAdd('');
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-slate-400/20 dark:hover:bg-slate-600/20"
                onClick={() => setIsManaging(!isManaging)}
              >
                <Settings className="h-3 w-3 text-slate-800 dark:text-slate-100" />
              </Button>
            </div>
          </div>

          {/* Actions Grid */}
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {allActions.map((action) => {
              const IconComponent = getIconComponent(action.icon);
              return (
                <div key={action.id} className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1 justify-start h-auto p-3 hover:bg-slate-400/20 dark:hover:bg-slate-600/20 group border border-transparent hover:border-slate-500 dark:hover:border-slate-400 rounded-lg transition-all duration-200"
                    onClick={() => handleActionClick(action.action, (action as any).moduleId || action.id)}
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
                  {isManaging && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0 hover:bg-red-500/20 text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteAction(action.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
            {allActions.length === 0 && (
              <div className="text-center py-8 text-slate-600 dark:text-slate-300">
                <p className="text-sm font-mono mb-2">No quick actions configured</p>
                <p className="text-xs font-mono">Click the + button above to add modules</p>
              </div>
            )}
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
            
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-mono pt-2">
              <span>
                {isManaging ? 'Managing Mode' : 'Click outside to close'}
              </span>
              <span>
                {allActions.length} action{allActions.length !== 1 ? 's' : ''}
              </span>
            </div>
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