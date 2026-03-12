import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarWidget } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock, Bus, MapPin, Music, Users, Package, CheckCircle2, Plus, Edit, Save, Calendar,
  ShoppingBag, ClipboardList, UserCheck, Timer, DoorOpen, Trash2, Utensils, Megaphone,
  ArrowRight, Mic, Loader2, AlertCircle, CalendarPlus, ChevronDown, ChevronRight
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { publishTourToCalendar } from '@/utils/publishTourToCalendar';

// Category configuration
const EVENT_CATEGORIES = [
  { value: 'call_time', label: 'Call Time', icon: Megaphone, color: 'bg-orange-500' },
  { value: 'transport', label: 'Transport', icon: Bus, color: 'bg-blue-500' },
  { value: 'sound_check', label: 'Sound Check', icon: Mic, color: 'bg-amber-500' },
  { value: 'performance', label: 'Performance', icon: Music, color: 'bg-purple-500' },
  { value: 'meal', label: 'Meal', icon: Utensils, color: 'bg-green-500' },
  { value: 'merch', label: 'Merch', icon: ShoppingBag, color: 'bg-pink-500' },
  { value: 'crew', label: 'Crew', icon: Users, color: 'bg-cyan-500' },
  { value: 'load_in', label: 'Load In', icon: ArrowRight, color: 'bg-slate-500' },
  { value: 'load_out', label: 'Load Out', icon: Package, color: 'bg-slate-600' },
  { value: 'general', label: 'General', icon: Calendar, color: 'bg-muted-foreground' },
] as const;

const TARGET_GROUPS = [
  { value: 'all', label: 'Everyone' },
  { value: 'singers', label: 'Singers' },
  { value: 'first_year', label: 'First-Year Members' },
  { value: 'crew', label: 'Setup Crew' },
  { value: 'merch_team', label: 'Merch Team' },
  { value: 'setup_crew', label: 'Setup Crew' },
  { value: 'route_manager', label: 'Route Manager' },
];

interface UnifiedTimelineEvent {
  id: string;
  label: string;
  description: string | null;
  event_category: string;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  target_group: string;
  notes: string | null;
  status: string;
  location: string | null;
  city_name?: string;
  source: 'manual' | 'routes' | 'hotels';
  is_auto_generated: boolean;
}

const getCategoryConfig = (category: string) => {
  return EVENT_CATEGORIES.find(c => c.value === category) || EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];
};

const formatTime12 = (time24: string | null) => {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const TourLogisticsSection = () => {
  const { user } = useAuth();
  const [selectedTourId, setSelectedTourId] = useState<string>('');
  const [tours, setTours] = useState<any[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<UnifiedTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [publishing, setPublishing] = useState(false);
  const [editingEvent, setEditingEvent] = useState<UnifiedTimelineEvent | null>(null);
  const [editForm, setEditForm] = useState({
    label: '',
    description: '',
    event_category: 'call_time',
    event_date: '',
    event_time: '',
    end_time: '',
    target_group: 'all',
    notes: '',
    location: '',
    status: 'pending',
  });

  // New event form state
  const [newEvent, setNewEvent] = useState({
    label: '',
    description: '',
    event_category: 'call_time',
    event_date: '',
    event_time: '',
    end_time: '',
    target_group: 'all',
    notes: '',
    location: '',
    status: 'pending',
  });

  // Fetch tours
  useEffect(() => {
    const fetchTours = async () => {
      const { data } = await supabase
        .from('gw_tours')
        .select('id, name, start_date, end_date, status')
        .order('start_date', { ascending: false });
      setTours(data || []);
      if (data && data.length > 0 && !selectedTourId) {
        setSelectedTourId(data[0].id);
      }
    };
    fetchTours();
  }, []);

  // Fetch unified timeline
  const fetchTimeline = useCallback(async () => {
    if (!selectedTourId) return;
    setLoading(true);
    try {
      // Fetch manual timeline events
      const { data: manualEvents } = await supabase
        .from('gw_tour_timeline_events')
        .select('*, gw_tour_cities(city_name)')
        .eq('tour_id', selectedTourId)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });

      // Fetch route cities for auto-generated entries
      const { data: cities } = await supabase
        .from('gw_tour_cities')
        .select('*')
        .eq('tour_id', selectedTourId)
        .order('city_order', { ascending: true });

      const unified: UnifiedTimelineEvent[] = [];

      // Add manual events
      (manualEvents || []).forEach(e => {
        unified.push({
          id: e.id,
          label: e.label,
          description: (e as any).description || null,
          event_category: e.event_category,
          event_date: e.event_date,
          event_time: e.event_time,
          end_time: e.end_time,
          target_group: e.target_group || 'all',
          notes: e.notes,
          status: e.status,
          location: e.location,
          city_name: (e as any).gw_tour_cities?.city_name,
          source: 'manual',
          is_auto_generated: e.is_auto_generated || false,
        });
      });

      // Auto-generate transport entries from route cities
      (cities || []).forEach(city => {
        if (city.arrival_date) {
          unified.push({
            id: `route-arrival-${city.id}`,
            label: `Arrive in ${city.city_name}`,
            description: null,
            event_category: 'transport',
            event_date: city.arrival_date,
            event_time: city.arrival_time,
            end_time: null,
            target_group: 'all',
            notes: city.city_notes,
            status: 'confirmed',
            location: `${city.city_name}${city.state_code ? `, ${city.state_code}` : ''}`,
            city_name: city.city_name,
            source: 'routes',
            is_auto_generated: true,
          });
        }
        if (city.departure_date) {
          unified.push({
            id: `route-depart-${city.id}`,
            label: `Depart ${city.city_name}`,
            description: null,
            event_category: 'transport',
            event_date: city.departure_date,
            event_time: city.departure_time,
            end_time: null,
            target_group: 'all',
            notes: city.meal_notes ? `Meals: ${city.meal_notes}` : null,
            status: 'confirmed',
            location: city.city_name,
            city_name: city.city_name,
            source: 'routes',
            is_auto_generated: true,
          });
        }
      });

      // Sort by date then time
      unified.sort((a, b) => {
        const dateComp = (a.event_date || '').localeCompare(b.event_date || '');
        if (dateComp !== 0) return dateComp;
        return (a.event_time || '').localeCompare(b.event_time || '');
      });

      setTimelineEvents(unified);
    } catch (err) {
      console.error('Error fetching timeline:', err);
      toast.error('Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }, [selectedTourId]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  // Get unique dates for filter
  const uniqueDates = [...new Set(timelineEvents.map(e => e.event_date))].sort();

  // Filter events
  const filteredEvents = timelineEvents.filter(e => {
    if (categoryFilter !== 'all' && e.event_category !== categoryFilter) return false;
    if (dateFilter !== 'all' && e.event_date !== dateFilter) return false;
    return true;
  });

  // Separate completed vs active, sort active newest-first (most current on top), completed oldest-first (at bottom)
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const nowTimeStr = format(now, 'HH:mm');

  const activeEvents = filteredEvents.filter(e => e.status !== 'completed' && e.status !== 'cancelled');
  const completedEvents = filteredEvents.filter(e => e.status === 'completed' || e.status === 'cancelled');

  // Sort active: soonest first (today at top, then tomorrow, etc.)
  // Within each day, sort by time ascending
  activeEvents.sort((a, b) => {
    const dateComp = (a.event_date || '').localeCompare(b.event_date || '');
    if (dateComp !== 0) return dateComp;
    return (a.event_time || '').localeCompare(b.event_time || '');
  });

  // Sort completed: most recently completed first
  completedEvents.sort((a, b) => {
    const dateComp = (b.event_date || '').localeCompare(a.event_date || '');
    if (dateComp !== 0) return dateComp;
    return (b.event_time || '').localeCompare(a.event_time || '');
  });

  // Group helper
  const groupByDate = (events: UnifiedTimelineEvent[]) =>
    events.reduce<Record<string, UnifiedTimelineEvent[]>>((acc, e) => {
      const key = e.event_date || 'unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
      return acc;
    }, {});

  const activeGrouped = groupByDate(activeEvents);
  const completedGrouped = groupByDate(completedEvents);

  const handleAddEvent = async () => {
    if (!newEvent.label || !newEvent.event_date || !selectedTourId) {
      toast.error('Label and date are required');
      return;
    }
    if (!user?.id) {
      toast.error('You must be logged in to add events');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('gw_tour_timeline_events').insert({
        tour_id: selectedTourId,
        label: newEvent.label,
        description: newEvent.description || null,
        event_category: newEvent.event_category,
        event_date: newEvent.event_date,
        event_time: newEvent.event_time || null,
        end_time: newEvent.end_time || null,
        target_group: newEvent.target_group,
        notes: newEvent.notes || null,
        location: newEvent.location || null,
        status: newEvent.status,
        created_by: user?.id,
        is_auto_generated: false,
        source_module: 'manual',
      });
      if (error) throw error;
      toast.success('Event added');
      setIsAddingEvent(false);
      setNewEvent({ label: '', description: '', event_category: 'call_time', event_date: '', event_time: '', end_time: '', target_group: 'all', notes: '', location: '', status: 'pending' });
      fetchTimeline();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add event');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (event: UnifiedTimelineEvent) => {
    setEditForm({
      label: event.label,
      description: event.description || '',
      event_category: event.event_category,
      event_date: event.event_date,
      event_time: event.event_time || '',
      end_time: event.end_time || '',
      target_group: event.target_group,
      notes: event.notes || '',
      location: event.location || '',
      status: event.status,
    });
    setEditingEvent(event);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('gw_tour_timeline_events').update({
        label: editForm.label,
        description: editForm.description || null,
        event_category: editForm.event_category,
        event_date: editForm.event_date,
        event_time: editForm.event_time || null,
        end_time: editForm.end_time || null,
        target_group: editForm.target_group,
        notes: editForm.notes || null,
        location: editForm.location || null,
        status: editForm.status,
      }).eq('id', editingEvent.id);
      if (error) throw error;
      toast.success('Event updated');
      setEditingEvent(null);
      fetchTimeline();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const { error } = await supabase.from('gw_tour_timeline_events').delete().eq('id', id);
      if (error) throw error;
      toast.success('Event removed');
      setEditingEvent(null);
      fetchTimeline();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'pending' ? 'confirmed' : currentStatus === 'confirmed' ? 'completed' : 'pending';
    try {
      const { error } = await supabase.from('gw_tour_timeline_events').update({ status: nextStatus }).eq('id', id);
      if (error) throw error;
      fetchTimeline();
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: string, source: string) => {
    if (source === 'routes') {
      return <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 dark:text-blue-400">From Routes</Badge>;
    }
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100 text-xs">Done</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 text-xs">Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
    }
  };

  const selectedTour = tours.find(t => t.id === selectedTourId);

  const handlePublishToCalendar = async () => {
    setPublishing(true);
    try {
      const result = await publishTourToCalendar();
      toast.success(`Published ${result?.length || 0} tour events to MUS 070 calendar`);
    } catch (err: any) {
      toast.error('Failed to publish: ' + (err.message || 'Unknown error'));
    } finally {
      setPublishing(false);
    }
  };


  return (
    <div className="space-y-4">
      {/* Header with tour selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Unified Operations Timeline</h2>
          <p className="text-sm text-muted-foreground">All call times, transport, performances, meals, and crew schedules</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePublishToCalendar}
            disabled={publishing || !selectedTourId}
            className="gap-1.5"
          >
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
            {publishing ? 'Publishing...' : 'Publish to MUS 070 Calendar'}
          </Button>
          <Select value={selectedTourId} onValueChange={setSelectedTourId}>
            <SelectTrigger className="w-[260px] bg-card border-border">
              <SelectValue placeholder="Select Tour" />
            </SelectTrigger>
            <SelectContent>
              {tours.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.status || 'planning'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick stats strip */}
      {selectedTour && (
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-md px-3 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{selectedTour.start_date} → {selectedTour.end_date}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-md px-3 py-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{timelineEvents.length} events</span>
          </div>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-md px-3 py-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{uniqueDates.length} days</span>
          </div>
        </div>
      )}

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setCategoryFilter('all')}
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
            categoryFilter === 'all'
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        {EVENT_CATEGORIES.map(cat => {
          const count = timelineEvents.filter(e => e.event_category === cat.value).length;
          if (count === 0) return null;
          const Icon = cat.icon;
          return (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1",
                categoryFilter === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3 w-3" />
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Date filter */}
      {uniqueDates.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setDateFilter('all')}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              dateFilter === 'all'
                ? "bg-accent text-accent-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            )}
          >
            All Dates
          </button>
          {uniqueDates.map(d => (
            <button
              key={d}
              onClick={() => setDateFilter(d)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                dateFilter === d
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {format(parseISO(d), 'EEE, MMM d')}
            </button>
          ))}
        </div>
      )}

      {/* Add Event Button */}
      <div className="flex justify-end">
        <Dialog open={isAddingEvent} onOpenChange={setIsAddingEvent}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!selectedTourId}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Timeline Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Event Label *</Label>
                <Input
                  placeholder="e.g. Singer Call Time"
                  value={newEvent.label}
                  onChange={e => setNewEvent(p => ({ ...p, label: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                  className="h-16"
                  placeholder="What is this event about? Details for the tour manager..."
                  value={newEvent.description}
                  onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select value={newEvent.event_category} onValueChange={v => setNewEvent(p => ({ ...p, event_category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">For</Label>
                  <Select value={newEvent.target_group} onValueChange={v => setNewEvent(p => ({ ...p, target_group: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TARGET_GROUPS.map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10 text-sm", !newEvent.event_date && "text-muted-foreground")}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {newEvent.event_date ? format(parseISO(newEvent.event_date), 'MMM d, yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white text-black" align="start">
                      <CalendarWidget
                        mode="single"
                        selected={newEvent.event_date ? parseISO(newEvent.event_date) : undefined}
                        onSelect={(date) => setNewEvent(p => ({ ...p, event_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Start</Label>
                  <Input type="time" value={newEvent.event_time} onChange={e => setNewEvent(p => ({ ...p, event_time: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End</Label>
                  <Input type="time" value={newEvent.end_time} onChange={e => setNewEvent(p => ({ ...p, end_time: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location</Label>
                <Input placeholder="Venue, city, etc." value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea className="h-16" placeholder="Additional details..." value={newEvent.notes} onChange={e => setNewEvent(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddEvent} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Timeline Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No timeline events</p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedTourId ? 'Add events or set up route cities to populate the timeline' : 'Select a tour to view its timeline'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active / Upcoming Section */}
          {activeEvents.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Current & Upcoming</h3>
                <Badge variant="secondary" className="text-xs">{activeEvents.length}</Badge>
                <div className="flex-1 h-px bg-border" />
              </div>
              {Object.entries(activeGrouped).map(([date, events]) => (
                <CollapsibleDateGroup key={`active-${date}`} date={date} events={events} defaultOpen={true}
                  getCategoryConfig={getCategoryConfig} formatTime12={formatTime12}
                  getStatusBadge={getStatusBadge} openEditDialog={openEditDialog}
                  handleStatusToggle={handleStatusToggle} handleDeleteEvent={handleDeleteEvent}
                />
              ))}
            </div>
          )}

          {/* Completed Section */}
          {completedEvents.length > 0 && (
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full group cursor-pointer py-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Completed</h3>
                <Badge variant="outline" className="text-xs text-muted-foreground">{completedEvents.length}</Badge>
                <div className="flex-1 h-px bg-border" />
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                {Object.entries(completedGrouped).map(([date, events]) => (
                  <CollapsibleDateGroup key={`done-${date}`} date={date} events={events} defaultOpen={false}
                    getCategoryConfig={getCategoryConfig} formatTime12={formatTime12}
                    getStatusBadge={getStatusBadge} openEditDialog={openEditDialog}
                    handleStatusToggle={handleStatusToggle} handleDeleteEvent={handleDeleteEvent}
                    muted
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {/* Edit Event Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Event Label *</Label>
              <Input
                placeholder="e.g. Singer Call Time"
                value={editForm.label}
                onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                className="h-16"
                placeholder="What is this event about?"
                value={editForm.description}
                onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={editForm.event_category} onValueChange={v => setEditForm(p => ({ ...p, event_category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">For</Label>
                <Select value={editForm.target_group} onValueChange={v => setEditForm(p => ({ ...p, target_group: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGET_GROUPS.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date *</Label>
                <Input type="date" value={editForm.event_date} onChange={e => setEditForm(p => ({ ...p, event_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start</Label>
                <Input type="time" value={editForm.event_time} onChange={e => setEditForm(p => ({ ...p, event_time: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End</Label>
                <Input type="time" value={editForm.end_time} onChange={e => setEditForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Input placeholder="Venue, city, etc." value={editForm.location} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea className="h-16" placeholder="Additional details..." value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => editingEvent && handleDeleteEvent(editingEvent.id)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
            <Button onClick={handleUpdateEvent} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
