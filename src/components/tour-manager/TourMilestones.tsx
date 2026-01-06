import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2, Edit2, Check, X, CalendarIcon, User, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  order: number;
  signedOffBy?: string;
  signOffDate?: string;
  synopsis?: string;
}

const DEFAULT_MILESTONES = ['Get concerts', 'Create contracts', 'Review contracts', 'Sign contracts', 'Send contracts', 'Receive contract and deposit', 'Final signed contract sent to host', 'Bus contacted', 'Bus secured', 'Route created', 'Route reviewed', 'Route sign off', 'Roster set', 'Singer contract created', 'Singer contract signed', 'Bus assignments', 'Room assignments', 'Budget approved', 'Stipend check requested', 'Stipend check received', 'Bus route/driver safety review', 'Food expenses set', 'Hotel expenses set', 'Singer stipend set', 'Bus food grocery list created', 'Bus food grocery list reviewed', 'Bus food grocery list finalized', 'Bus food grocery list approved', 'Master itinerary created', 'Master itinerary reviewed', 'Master itinerary approved', 'Tour retreat planned', 'Tour retreat approved', 'Tour retreat scheduled'];

const STORAGE_KEY = 'tour_milestones';

export const TourMilestones = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMilestone, setNewMilestone] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [openSignOffId, setOpenSignOffId] = useState<string | null>(null);

  useEffect(() => {
    loadMilestones();
  }, []);

  const loadMilestones = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setMilestones(JSON.parse(stored));
      } catch {
        initializeDefaults();
      }
    } else {
      initializeDefaults();
    }
  };

  const initializeDefaults = () => {
    const defaultData = DEFAULT_MILESTONES.map((title, index) => ({
      id: `milestone-${index}`,
      title,
      completed: false,
      order: index
    }));
    setMilestones(defaultData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  };

  const saveMilestones = (data: Milestone[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const toggleMilestone = (id: string) => {
    const updated = milestones.map(m => m.id === id ? {
      ...m,
      completed: !m.completed
    } : m);
    setMilestones(updated);
    saveMilestones(updated);
  };

  const addMilestone = () => {
    if (!newMilestone.trim()) return;
    const newItem: Milestone = {
      id: `milestone-${Date.now()}`,
      title: newMilestone.trim(),
      completed: false,
      order: milestones.length
    };
    const updated = [...milestones, newItem];
    setMilestones(updated);
    saveMilestones(updated);
    setNewMilestone('');
    toast.success('Milestone added');
  };

  const deleteMilestone = (id: string) => {
    const updated = milestones.filter(m => m.id !== id);
    setMilestones(updated);
    saveMilestones(updated);
    toast.success('Milestone removed');
  };

  const startEditing = (milestone: Milestone) => {
    setEditingId(milestone.id);
    setEditingTitle(milestone.title);
  };

  const saveEdit = () => {
    if (!editingTitle.trim()) return;
    const updated = milestones.map(m => m.id === editingId ? {
      ...m,
      title: editingTitle.trim()
    } : m);
    setMilestones(updated);
    saveMilestones(updated);
    setEditingId(null);
    setEditingTitle('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const updateSignOff = (id: string, field: 'signedOffBy' | 'signOffDate' | 'synopsis', value: string) => {
    const updated = milestones.map(m => m.id === id ? {
      ...m,
      [field]: value
    } : m);
    setMilestones(updated);
    saveMilestones(updated);
  };

  const completedCount = milestones.filter(m => m.completed).length;
  const progress = milestones.length > 0 ? completedCount / milestones.length * 100 : 0;

  return (
    <Card className="mb-4">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Tour Milestones
            <span className="text-xs font-normal text-secondary-foreground">
              ({completedCount}/{milestones.length})
            </span>
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{
              width: `${progress}%`
            }} />
          </div>
          <p className="text-[10px] mt-1 text-secondary-foreground">
            {Math.round(progress)}% complete
          </p>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="px-4 pb-4 pt-0">
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-1">
              {milestones.map(milestone => (
                <Popover key={milestone.id} open={openSignOffId === milestone.id} onOpenChange={(open) => setOpenSignOffId(open ? milestone.id : null)}>
                  <PopoverTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-2 p-2 rounded-md group hover:bg-muted/50 transition-colors cursor-pointer",
                      milestone.completed && "opacity-60"
                    )}>
                      <Checkbox 
                        checked={milestone.completed} 
                        onCheckedChange={() => toggleMilestone(milestone.id)} 
                        className="h-4 w-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      {editingId === milestone.id ? (
                        <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Input value={editingTitle} onChange={e => setEditingTitle(e.target.value)} className="h-7 text-xs" onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }} autoFocus />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={saveEdit}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className={cn(
                            "flex-1 text-left text-xs text-white",
                            milestone.completed && "line-through text-muted-foreground",
                            milestone.signedOffBy && "text-green-400"
                          )}>
                            {milestone.title}
                            {milestone.signedOffBy && (
                              <span className="ml-2 text-[10px] text-muted-foreground">
                                ✓ {milestone.signedOffBy}
                              </span>
                            )}
                          </span>

                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEditing(milestone)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => deleteMilestone(milestone.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3 bg-white dark:bg-gray-900 border shadow-lg z-50" align="start">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-foreground">Sign-off Details</h4>
                      
                      {/* Signed off by */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Signed off by
                        </label>
                        <Input
                          placeholder="Enter name..."
                          value={milestone.signedOffBy || ''}
                          onChange={(e) => updateSignOff(milestone.id, 'signedOffBy', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* Sign-off date */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          Date
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-8 justify-start text-left font-normal text-xs",
                                !milestone.signOffDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {milestone.signOffDate ? format(new Date(milestone.signOffDate), "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-card border z-[60]" align="start">
                            <Calendar
                              mode="single"
                              selected={milestone.signOffDate ? new Date(milestone.signOffDate) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  updateSignOff(milestone.id, 'signOffDate', date.toISOString());
                                }
                              }}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Synopsis */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Synopsis
                        </label>
                        <Textarea
                          placeholder="Brief summary..."
                          value={milestone.synopsis || ''}
                          onChange={(e) => updateSignOff(milestone.id, 'synopsis', e.target.value)}
                          className="text-xs min-h-[60px] resize-none"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ))}
            </div>
          </ScrollArea>

          {/* Add New Milestone */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <Input placeholder="Add new milestone..." value={newMilestone} onChange={e => setNewMilestone(e.target.value)} className="h-8 text-xs" onKeyDown={e => {
              if (e.key === 'Enter') addMilestone();
            }} />
            <Button size="sm" onClick={addMilestone} className="h-8">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
