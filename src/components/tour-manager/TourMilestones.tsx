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
    const channel = supabase.channel('tour_milestones_changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tour_milestones'
    }, () => {
      loadMilestones();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const loadMilestones = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('tour_milestones').select('*').order('display_order', {
        ascending: true
      });
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
      const {
        data,
        error
      } = await supabase.from('tour_milestones').insert(defaultData).select();
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
      const {
        error
      } = await supabase.from('tour_milestones').update({
        completed: !milestone.completed
      }).eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error toggling milestone:', error);
      toast.error('Failed to update milestone');
    }
  };
  const addMilestone = async () => {
    if (!newMilestone.trim()) return;
    try {
      const {
        error
      } = await supabase.from('tour_milestones').insert({
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
      const {
        error
      } = await supabase.from('tour_milestones').delete().eq('id', id);
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
      const {
        error
      } = await supabase.from('tour_milestones').update({
        title: editingTitle.trim()
      }).eq('id', editingId);
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
      const {
        error
      } = await supabase.from('tour_milestones').update({
        [field]: value
      }).eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating sign-off:', error);
      toast.error('Failed to update sign-off');
    }
  };
  const completedCount = milestones.filter(m => m.completed).length;
  const progress = milestones.length > 0 ? completedCount / milestones.length * 100 : 0;
  if (loading) {
    return <Card className="mb-4">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>;
  }
  return;
};