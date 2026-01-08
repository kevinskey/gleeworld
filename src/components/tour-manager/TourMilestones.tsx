import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2, Edit2, Check, X, CalendarIcon, User, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  display_order: number;
  signed_off_by?: string | null;
  sign_off_date?: string | null;
  synopsis?: string | null;
}

const DEFAULT_MILESTONES = ['Get concerts', 'Create contracts', 'Review contracts', 'Sign contracts', 'Send contracts', 'Receive contract and deposit', 'Final signed contract sent to host', 'Bus contacted', 'Bus secured', 'Route created', 'Route reviewed', 'Route sign off', 'Roster set', 'Singer contract created', 'Singer contract signed', 'Bus assignments', 'Room assignments', 'Budget approved', 'Stipend check requested', 'Stipend check received', 'Bus route/driver safety review', 'Food expenses set', 'Hotel expenses set', 'Singer stipend set', 'Bus food grocery list created', 'Bus food grocery list reviewed', 'Bus food grocery list finalized', 'Bus food grocery list approved', 'Master itinerary created', 'Master itinerary reviewed', 'Master itinerary approved', 'Tour retreat planned', 'Tour retreat approved', 'Tour retreat scheduled'];

export const TourMilestones = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMilestone, setNewMilestone] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [openSignOffId, setOpenSignOffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMilestones();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('tour_milestones_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tour_milestones' },
        () => {
          loadMilestones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMilestones = async () => {
    try {
      const { data, error } = await supabase
        .from('tour_milestones')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setMilestones(data);
      } else {
        // Initialize defaults if no milestones exist
        await initializeDefaults();
      }
    } catch (error) {
      console.error('Error loading milestones:', error);
      toast.error('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaults = async () => {
    try {
      const defaultData = DEFAULT_MILESTONES.map((title, index) => ({
        title,
        completed: false,
        display_order: index
      }));

      const { data, error } = await supabase
        .from('tour_milestones')
        .insert(defaultData)
        .select();

      if (error) throw error;
      if (data) setMilestones(data);
    } catch (error) {
      console.error('Error initializing defaults:', error);
    }
  };

  const toggleMilestone = async (id: string) => {
    const milestone = milestones.find(m => m.id === id);
    if (!milestone) return;

    try {
      const { error } = await supabase
        .from('tour_milestones')
        .update({ completed: !milestone.completed })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling milestone:', error);
      toast.error('Failed to update milestone');
    }
  };

  const addMilestone = async () => {
    if (!newMilestone.trim()) return;

    try {
      const { error } = await supabase
        .from('tour_milestones')
        .insert({
          title: newMilestone.trim(),
          completed: false,
          display_order: milestones.length
        });

      if (error) throw error;
      setNewMilestone('');
      toast.success('Milestone added');
    } catch (error) {
      console.error('Error adding milestone:', error);
      toast.error('Failed to add milestone');
    }
  };

  const deleteMilestone = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tour_milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Milestone removed');
    } catch (error) {
      console.error('Error deleting milestone:', error);
      toast.error('Failed to delete milestone');
    }
  };

  const startEditing = (milestone: Milestone) => {
    setEditingId(milestone.id);
    setEditingTitle(milestone.title);
  };

  const saveEdit = async () => {
    if (!editingTitle.trim() || !editingId) return;

    try {
      const { error } = await supabase
        .from('tour_milestones')
        .update({ title: editingTitle.trim() })
        .eq('id', editingId);

      if (error) throw error;
      setEditingId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Error saving edit:', error);
      toast.error('Failed to update milestone');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const updateSignOff = async (id: string, field: 'signed_off_by' | 'sign_off_date' | 'synopsis', value: string) => {
    try {
      const { error } = await supabase
        .from('tour_milestones')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating sign-off:', error);
      toast.error('Failed to update sign-off');
    }
  };

  const completedCount = milestones.filter(m => m.completed).length;
  const progress = milestones.length > 0 ? completedCount / milestones.length * 100 : 0;

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600">
      <CardHeader className="py-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Tour Milestones
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
              ({completedCount}/{milestones.length})
            </span>
          </CardTitle>
          <Button variant="outline" size="sm" className="h-8 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{
              width: `${progress}%`
            }} />
          </div>
          <p className="text-xs mt-1.5 text-slate-600 dark:text-slate-400">
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
                            "flex-1 text-left text-xs text-foreground",
                            milestone.completed && "line-through text-muted-foreground",
                            milestone.signed_off_by && "text-green-500"
                          )}>
                            {milestone.title}
                            {milestone.signed_off_by && (
                              <span className="ml-2 text-[10px] text-green-600 dark:text-green-400">
                                ✓ {milestone.signed_off_by}
                                {milestone.sign_off_date && (
                                  <span className="ml-1 text-muted-foreground">
                                    ({format(new Date(milestone.sign_off_date), 'MMM d')})
                                  </span>
                                )}
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
                  <PopoverContent className="w-72 p-3 bg-card border shadow-lg z-50" align="start">
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
                          value={milestone.signed_off_by || ''}
                          onChange={(e) => updateSignOff(milestone.id, 'signed_off_by', e.target.value)}
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
                                !milestone.sign_off_date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {milestone.sign_off_date ? format(new Date(milestone.sign_off_date), "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-card border z-[60]" align="start">
                            <Calendar
                              mode="single"
                              selected={milestone.sign_off_date ? new Date(milestone.sign_off_date) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  updateSignOff(milestone.id, 'sign_off_date', date.toISOString());
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
