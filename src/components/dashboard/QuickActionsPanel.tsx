import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { UNIFIED_MODULES } from "@/config/unified-modules";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Zap, Shield, Calendar, Clock, X, ChevronRight, ChevronDown, Users, BarChart3, Plus, Trash2, Settings, Music, FileText, Mail, Camera, Mic, BookOpen, Heart, Star, Globe, Home, MessageSquare, GripVertical } from "lucide-react";
interface QuickAction {
  id: string;
  module_id: string;
  display_order: number;
  is_visible: boolean;
}
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
    quickActions: QuickAction[];
    addQuickAction: (moduleId: string) => Promise<boolean>;
    removeQuickAction: (moduleId: string) => Promise<boolean>;
    reorderQuickActions?: (moduleIds: string[]) => Promise<void>;
    isInQuickActions: (moduleId: string) => boolean;
  };
}

// Available icons for quick actions
const availableIcons = {
  Zap,
  Shield,
  Calendar,
  Clock,
  Users,
  BarChart3,
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
  MessageSquare,
  Settings,
  GripVertical
};
interface SortableActionItemProps {
  action: {
    id: string;
    moduleId: string;
    title: string;
    description: string;
    icon: string;
  };
  isManaging: boolean;
  onActionClick: (moduleId: string) => void;
  onDelete: (moduleId: string) => void;
}
const SortableActionItem = ({
  action,
  isManaging,
  onActionClick,
  onDelete
}: SortableActionItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: action.moduleId
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  const IconComponent = availableIcons[action.icon as keyof typeof availableIcons] || Zap;
  return <div ref={setNodeRef} style={style} className="flex items-center gap-1.5">
      {isManaging && <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/10 rounded">
          <GripVertical className="h-3 w-3 text-popover-foreground/60" />
        </button>}
      <button className="flex-1 flex items-center px-2 py-1.5 text-xs rounded-none transition-colors text-popover-foreground hover:bg-white/10" onClick={() => onActionClick(action.moduleId)}>
        <IconComponent className="h-3 w-3 mr-1.5 text-primary" />
        <div className="flex-1 text-left">
          <div className="font-normal text-popover-foreground">{action.title}</div>
          <div className="text-[10px] text-popover-foreground/60">{action.description}</div>
        </div>
        <ChevronRight className="h-3 w-3 text-popover-foreground/50" />
      </button>
      {isManaging && <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-red-500/20 text-red-300 hover:text-red-200" onClick={() => onDelete(action.moduleId)}>
          <Trash2 className="h-3 w-3" />
        </Button>}
    </div>;
};
export const QuickActionsPanel = ({
  user,
  onModuleSelect,
  isOpen,
  onClose,
  quickActions
}: QuickActionsPanelProps) => {
  const navigate = useNavigate();
  const isAdmin = user.role === 'super-admin' || user.role === 'admin';
  const isMember = user.role === 'member';
  const [isManaging, setIsManaging] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedModuleToAdd, setSelectedModuleToAdd] = useState('');

  // Available modules for selection
  const availableModules = UNIFIED_MODULES.filter(module => module.isActive).map(module => ({
    id: module.id,
    name: module.name,
    title: module.title,
    description: module.description,
    icon: module.icon.name || module.title.charAt(0).toUpperCase(),
    category: module.category
  }));

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));

  // Build display actions from database-backed quickActions
  const allActions = useMemo(() => {
    if (!quickActions?.quickActions) return [];
    return quickActions.quickActions.filter(qa => qa.is_visible).sort((a, b) => a.display_order - b.display_order).map(qa => {
      const moduleConfig = UNIFIED_MODULES.find(m => m.name === qa.module_id);
      return {
        id: qa.id,
        moduleId: qa.module_id,
        title: moduleConfig?.title || qa.module_id,
        description: moduleConfig?.description || '',
        icon: moduleConfig?.icon?.name || 'Zap'
      };
    });
  }, [quickActions?.quickActions]);
  const handleActionClick = (moduleId: string) => {
    navigate({
      pathname: '/dashboard',
      search: `?module=${moduleId}`
    });
    onClose();
  };
  const handleAddAction = async () => {
    if (!selectedModuleToAdd || selectedModuleToAdd === 'none') {
      toast.error('Please select a module');
      return;
    }
    if (quickActions) {
      const success = await quickActions.addQuickAction(selectedModuleToAdd);
      if (success) {
        setSelectedModuleToAdd('');
        setShowAddDialog(false);
      }
    }
  };
  const handleDeleteAction = async (moduleId: string) => {
    if (quickActions) {
      await quickActions.removeQuickAction(moduleId);
    }
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      const oldIndex = allActions.findIndex(a => a.moduleId === active.id);
      const newIndex = allActions.findIndex(a => a.moduleId === over.id);
      const newOrder = arrayMove(allActions, oldIndex, newIndex);
      const moduleIds = newOrder.map(a => a.moduleId);
      if (quickActions?.reorderQuickActions) {
        await quickActions.reorderQuickActions(moduleIds);
      }
    }
  };
  return <>
      {/* Clear backdrop - must be first/behind the panel */}
      {isOpen && <div className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300" onClick={onClose} />}
      
      {/* Themed Dropdown Panel - centered in upper portion */}
      <div className={`fixed top-[15%] left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out ${isOpen ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 pointer-events-none'}`}>
        <div className="bg-popover text-popover-foreground border border-border shadow-2xl rounded-lg w-80 sm:w-96">
          
          {/* Header with management controls */}
          <div className="px-2 py-1.5 border-b border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-white/80" />
              <span className="text-xs font-semibold text-popover-foreground">
                Quick Actions
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-white/10">
                    <Plus className="h-3 w-3 text-popover-foreground" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-card">
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
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Choose a module to add" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border max-h-60 overflow-y-auto">
                          {availableModules.filter(module => {
                          if (quickActions) {
                            return !quickActions.isInQuickActions(module.name);
                          }
                          return true;
                        }).sort((a, b) => a.title.localeCompare(b.title)).map(module => <SelectItem key={module.id} value={module.name}>
                              {module.title}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleAddAction} className="flex-1">
                        Add to Quick Actions
                      </Button>
                      <Button variant="outline" onClick={() => {
                      setShowAddDialog(false);
                      setSelectedModuleToAdd('');
                    }} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-white/10" onClick={() => setIsManaging(!isManaging)} title={isManaging ? "Done editing" : "Edit & reorder"}>
                <Settings className={`h-3 w-3 text-popover-foreground ${isManaging ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Actions Grid with DnD */}
          <div className="p-1 space-y-0.5 max-h-80 overflow-y-auto">
            {isManaging ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={allActions.map(a => a.moduleId)} strategy={verticalListSortingStrategy}>
                  {allActions.map(action => <SortableActionItem key={action.moduleId} action={action} isManaging={isManaging} onActionClick={handleActionClick} onDelete={handleDeleteAction} />)}
                </SortableContext>
              </DndContext> : allActions.map(action => <SortableActionItem key={action.moduleId} action={action} isManaging={false} onActionClick={handleActionClick} onDelete={handleDeleteAction} />)}
            {allActions.length === 0 && <div className="text-center py-4 text-popover-foreground/70">
                <p className="text-xs mb-1">No quick actions configured</p>
                <p className="text-[10px]">Click + to add modules</p>
              </div>}
          </div>

          {/* Footer */}
          <div className="px-2 py-1.5 border-t border-white/20">
            <div className="flex items-center justify-between text-[10px] text-popover-foreground/60">
              <span>
                {isManaging ? 'Drag to reorder' : 'Click outside to close'}
              </span>
              <span>
                {allActions.length} action{allActions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>;
};