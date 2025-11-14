import React, { useState } from 'react';
import { Mail, Music, Calendar, Shirt, DollarSign, UserCheck, Settings, BookOpen, Users, Camera, Radio, Briefcase, ScanLine, Crown, GraduationCap, ChevronDown, ChevronRight, ClipboardList, BookCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ModuleSelectorProps {
  selectedModule: string;
  onSelectModule: (moduleId: string) => void;
}

export const ModuleSelector = ({ selectedModule, onSelectModule }: ModuleSelectorProps) => {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const modules = [
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      description: 'Messages & Communications',
      notifications: 3,
      category: 'Communication'
    },
    {
      id: 'music-library',
      name: 'Music Library',
      icon: Music,
      description: 'Sheet Music & Recordings',
      notifications: 0,
      category: 'Music'
    },
    {
      id: 'calendar',
      name: 'Calendar',
      icon: Calendar,
      description: 'Events & Rehearsals',
      notifications: 2,
      category: 'Schedule'
    },
    {
      id: 'wardrobe',
      name: 'Wardrobe',
      icon: Shirt,
      description: 'Costume Management',
      notifications: 0,
      category: 'Performance'
    },
    {
      id: 'finances',
      name: 'Finances',
      icon: DollarSign,
      description: 'Dues & Payments',
      notifications: 1,
      category: 'Administration'
    },
    {
      id: 'attendance',
      name: 'Attendance',
      icon: UserCheck,
      description: 'Check-in & Records',
      notifications: 0,
      category: 'Administration'
    },
    {
      id: 'radio',
      name: 'Radio Station',
      icon: Radio,
      description: 'Glee World Radio',
      notifications: 0,
      category: 'Media'
    },
    {
      id: 'handbook',
      name: 'Handbook',
      icon: BookOpen,
      description: 'Rules & Guidelines',
      notifications: 0,
      category: 'Reference'
    },
    {
      id: 'directory',
      name: 'Directory',
      icon: Users,
      description: 'Member Contacts',
      notifications: 0,
      category: 'Reference'
    },
    {
      id: 'media',
      name: 'Media Hub',
      icon: Camera,
      description: 'Photos & Videos',
      notifications: 0,
      category: 'Media'
    },
    {
      id: 'executive',
      name: 'Executive Board',
      icon: Briefcase,
      description: 'Leadership Tools',
      notifications: 0,
      category: 'Administration'
    },
    {
      id: 'user-management',
      name: 'User Management',
      icon: Users,
      description: 'Manage member accounts, roles, and permissions',
      notifications: 0,
      category: 'Administration'
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: Settings,
      description: 'Account & Preferences',
      notifications: 0,
      category: 'System'
    },
    {
      id: 'auditions-management',
      name: 'Auditions',
      icon: ScanLine,
      description: 'Manage audition sessions and applications',
      notifications: 0,
      category: 'Administration'
    },
    {
      id: 'simple-executive-hub',
      name: 'Executive Hub (Simple)',
      icon: Crown,
      description: 'Simplified executive board module hub - works immediately',
      notifications: 0,
      category: 'Executive'
    },
    {
      id: 'bowman-scholars',
      name: 'Bowman Scholars',
      icon: GraduationCap,
      description: 'Academic excellence program for distinguished students',
      notifications: 0,
      category: 'Reference'
    },
    {
      id: 'test-builder',
      name: 'Test Builder',
      icon: ClipboardList,
      description: 'Create and manage tests for all Glee Academy courses with multimedia support',
      notifications: 0,
      category: 'Administration'
    },
    {
      id: 'grading-admin',
      name: 'Grading Admin',
      icon: BookCheck,
      description: 'Manage courses, assign instructors, and oversee the grading system',
      notifications: 0,
      category: 'Administration'
    }
  ];

  const categories = [...new Set(modules.map(m => m.category))];

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-2">Modules</h2>
        <p className="text-sm text-muted-foreground">Select a module to get started</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {categories.map((category) => {
            const isOpen = openCategories.has(category);
            
            return (
              <Collapsible key={category} open={isOpen} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-accent/50 p-2 rounded-md transition-colors">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {category}
                  </h3>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-2">
                  <div className="space-y-2 ml-6">
                    {modules
                      .filter(module => module.category === category)
                      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                      .map((module) => {
                    const Icon = module.icon;
                    const isSelected = selectedModule === module.id;
                    
                    return (
                      <Card 
                        key={module.id}
                        className={`p-4 cursor-pointer transition-all hover:shadow-md border border-border ${
                          isSelected 
                            ? 'bg-primary/10 border-primary shadow-sm' 
                            : 'bg-card hover:bg-accent/10'
                        }`}
                        onClick={() => onSelectModule(module.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            isSelected 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`font-medium text-sm ${
                                isSelected ? 'text-primary' : 'text-foreground'
                              }`}>
                                {module.name}
                              </p>
                              {module.notifications > 0 && (
                                <Badge variant="destructive" className="w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs">
                                  {module.notifications}
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-xs text-muted-foreground">
                              {module.description}
                            </p>
                          </div>
                        </div>
                      </Card>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};