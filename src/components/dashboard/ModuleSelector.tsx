import React from 'react';
import { Mail, Music, Calendar, Shirt, DollarSign, UserCheck, Settings, BookOpen, Users, Camera, Radio, Briefcase, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface ModuleSelectorProps {
  selectedModule: string;
  onSelectModule: (moduleId: string) => void;
}

export const ModuleSelector = ({ selectedModule, onSelectModule }: ModuleSelectorProps) => {
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
    }
  ];

  const categories = [...new Set(modules.map(m => m.category))];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-2">Modules</h2>
        <p className="text-sm text-muted-foreground">Select a module to get started</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {category}
              </h3>
              
              <div className="space-y-2">
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
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};