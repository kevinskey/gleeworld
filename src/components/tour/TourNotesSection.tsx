import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  StickyNote, Plus, Pin, CheckCircle2, Clock, MapPin,
  Building2, Music, Bus, Hotel, Users, Filter, Search,
  AlertTriangle, Info, Loader2, MessageSquare, Reply, Send,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/utils/formatters';

interface TourNote {
  id: string;
  author_id: string;
  author_name: string;
  category: string;
  subject: string;
  content: string;
  city_id: string | null;
  city_name: string | null;
  priority: string;
  is_pinned: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  reply_count: number;
  created_at: string;
  updated_at: string;
}

interface NoteReply {
  id: string;
  note_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

const CATEGORIES = [
  { value: 'general', label: 'General', icon: StickyNote },
  { value: 'city', label: 'City / Venue', icon: MapPin },
  { value: 'host', label: 'Host / Contact', icon: Building2 },
  { value: 'concert', label: 'Concert / Performance', icon: Music },
  { value: 'transport', label: 'Bus / Transport', icon: Bus },
  { value: 'hotel', label: 'Hotel / Lodging', icon: Hotel },
  { value: 'roster', label: 'Roster / Members', icon: Users },
  { value: 'urgent', label: 'Urgent', icon: AlertTriangle },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-secondary text-secondary-foreground',
  high: 'bg-destructive/10 text-destructive',
  urgent: 'bg-destructive text-destructive-foreground',
};

const getCategoryIcon = (cat: string) => {
  const found = CATEGORIES.find(c => c.value === cat);
  return found ? found.icon : StickyNote;
};

const getInitials = (name: string) => {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

// ─── Thread component for each note ────────────────────────────
const NoteThread: React.FC<{
  noteId: string;
  replyCount: number;
  currentUser: { user_id: string; full_name: string } | null;
}> = ({ noteId, replyCount, currentUser }) => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  // Fetch replies only when expanded
  const { data: replies = [], isLoading: loadingReplies } = useQuery({
    queryKey: ['tour-note-replies', noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tour_note_replies')
        .select('*')
        .eq('note_id', noteId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as NoteReply[];
    },
    enabled: expanded,
  });

  // Real-time for replies
  useEffect(() => {
    if (!expanded) return;
    const channel = supabase
      .channel(`note-replies-${noteId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gw_tour_note_replies', filter: `note_id=eq.${noteId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tour-note-replies', noteId] });
          queryClient.invalidateQueries({ queryKey: ['tour-notes'] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [expanded, noteId, queryClient]);

  const postReply = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error('Not authenticated');
      if (!replyContent.trim()) throw new Error('Reply cannot be empty');
      const { error } = await supabase.from('gw_tour_note_replies').insert({
        note_id: noteId,
        author_id: currentUser.user_id,
        author_name: currentUser.full_name || 'Unknown',
        content: replyContent.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-note-replies', noteId] });
      queryClient.invalidateQueries({ queryKey: ['tour-notes'] });
      setReplyContent('');
      setShowReplyInput(false);
      if (!expanded) setExpanded(true);
      toast.success('Reply posted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="pt-2 space-y-2">
      {/* Action row */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => {
            setShowReplyInput(!showReplyInput);
            if (!expanded && replyCount > 0) setExpanded(true);
          }}
        >
          <Reply className="h-3 w-3" />
          Reply
        </Button>
        {replyCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </Button>
        )}
      </div>

      {/* Inline reply input */}
      {showReplyInput && (
        <div className="flex gap-2 pl-4 border-l-2 border-primary/20">
          <Textarea
            placeholder="Write a reply..."
            rows={2}
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            className="text-sm min-h-[60px] flex-1"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                postReply.mutate();
              }
            }}
          />
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              className="h-8 px-2"
              disabled={!replyContent.trim() || postReply.isPending}
              onClick={() => postReply.mutate()}
            >
              {postReply.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      )}

      {/* Thread replies */}
      {expanded && (
        <div className="pl-4 border-l-2 border-border space-y-2">
          {loadingReplies ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading replies...
            </div>
          ) : replies.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">No replies yet.</p>
          ) : (
            replies.map(reply => (
              <div key={reply.id} className="flex gap-2 py-1.5">
                <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                    {getInitials(reply.author_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold">{reply.author_name}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDateTime(reply.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap mt-0.5">{reply.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────
export const TourNotesSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [newSubject, setNewSubject] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newPriority, setNewPriority] = useState('normal');
  const [newCityId, setNewCityId] = useState('');

  // Fetch tour cities for dropdown
  const { data: tourCities = [] } = useQuery({
    queryKey: ['tour-cities-for-notes'],
    queryFn: async () => {
      const { data: tours } = await supabase
        .from('gw_tours')
        .select('id')
        .in('status', ['active', 'planning', 'draft'])
        .order('start_date', { ascending: true })
        .limit(1);
      if (!tours || tours.length === 0) return [];
      const { data, error } = await supabase
        .from('gw_tour_cities')
        .select('id, city_name, state_code, city_order')
        .eq('tour_id', tours[0].id)
        .order('city_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['tour-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tour_notes')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TourNote[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('tour-notes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gw_tour_notes' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tour-notes'] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-profile-notes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('gw_profiles')
        .select('full_name, user_id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
  });

  // Create note
  const createNote = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error('Not authenticated');
      if (!newCityId) throw new Error('Please select a city');
      const selectedCity = tourCities.find(c => c.id === newCityId);
      const { error } = await supabase.from('gw_tour_notes').insert({
        author_id: currentUser.user_id,
        author_name: currentUser.full_name || 'Unknown',
        category: newCategory,
        subject: newSubject,
        content: newContent,
        priority: newPriority,
        city_id: newCityId,
        city_name: selectedCity ? `${selectedCity.city_name}${selectedCity.state_code ? `, ${selectedCity.state_code}` : ''}` : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-notes'] });
      toast.success('Note added');
      setDialogOpen(false);
      setNewSubject('');
      setNewContent('');
      setNewCategory('general');
      setNewPriority('normal');
      setNewCityId('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Toggle resolved
  const toggleResolved = useMutation({
    mutationFn: async (note: TourNote) => {
      const { error } = await supabase
        .from('gw_tour_notes')
        .update({
          is_resolved: !note.is_resolved,
          resolved_at: !note.is_resolved ? new Date().toISOString() : null,
          resolved_by: !note.is_resolved ? (currentUser?.full_name || 'Unknown') : null,
        })
        .eq('id', note.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tour-notes'] }),
  });

  // Toggle pinned
  const togglePinned = useMutation({
    mutationFn: async (note: TourNote) => {
      const { error } = await supabase
        .from('gw_tour_notes')
        .update({ is_pinned: !note.is_pinned })
        .eq('id', note.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tour-notes'] }),
  });

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (filterCategory !== 'all' && n.category !== filterCategory) return false;
      if (filterCity !== 'all' && n.city_id !== filterCity) return false;
      if (filterStatus === 'active' && n.is_resolved) return false;
      if (filterStatus === 'resolved' && !n.is_resolved) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!n.subject.toLowerCase().includes(q) && !n.content.toLowerCase().includes(q) && !(n.city_name || '').toLowerCase().includes(q) && !n.author_name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [notes, filterCategory, filterCity, filterStatus, searchTerm]);

  const activeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    notes.filter(n => !n.is_resolved).forEach(n => {
      counts.all++;
      counts[n.category] = (counts[n.category] || 0) + 1;
    });
    return counts;
  }, [notes]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Tour Notes & Status Updates
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time notes from executive board and tour managers
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New Tour Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">City <span className="text-destructive">*</span></label>
                <Select value={newCityId} onValueChange={setNewCityId}>
                  <SelectTrigger><SelectValue placeholder="Select a city..." /></SelectTrigger>
                  <SelectContent>
                    {tourCities.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.city_name}{c.state_code ? `, ${c.state_code}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder="Brief summary..."
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Details</label>
                <Textarea
                  placeholder="Full update details..."
                  rows={4}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={!newSubject.trim() || !newContent.trim() || !newCityId || createNote.isPending}
                onClick={() => createNote.mutate()}
              >
                {createNote.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                Post Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({activeCounts.all || 0})</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label} {activeCounts[c.value] ? `(${activeCounts[c.value]})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-[150px] h-8 text-sm">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {tourCities.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.city_name}{c.state_code ? `, ${c.state_code}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              className="pl-8 h-8 text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Notes Feed */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading notes...
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card className="p-8 text-center">
          <StickyNote className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {notes.length === 0 ? 'No notes yet. Add the first one!' : 'No notes match your filters.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map(note => {
            const CatIcon = getCategoryIcon(note.category);
            return (
              <Card
                key={note.id}
                className={`transition-all ${note.is_pinned ? 'border-primary/40 bg-primary/5' : ''} ${note.is_resolved ? 'opacity-60' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <CatIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Top line */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-semibold text-sm ${note.is_resolved ? 'line-through' : ''}`}>
                            {note.subject}
                          </h3>
                          {note.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {CATEGORIES.find(c => c.value === note.category)?.label || note.category}
                          </Badge>
                          <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[note.priority] || ''}`}>
                            {note.priority}
                          </Badge>
                        </div>
                      </div>

                      {/* City tag */}
                      {note.city_name && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {note.city_name}
                        </div>
                      )}

                      {/* Content */}
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{note.content}</p>

                      {/* Meta */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-medium">{note.author_name}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(note.created_at)}
                          </span>
                          {note.is_resolved && note.resolved_by && (
                            <span className="flex items-center gap-1 text-primary">
                              <CheckCircle2 className="h-3 w-3" />
                              Resolved by {note.resolved_by}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => togglePinned.mutate(note)}
                          >
                            <Pin className={`h-3 w-3 mr-1 ${note.is_pinned ? 'text-primary fill-primary' : ''}`} />
                            {note.is_pinned ? 'Unpin' : 'Pin'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => toggleResolved.mutate(note)}
                          >
                            <CheckCircle2 className={`h-3 w-3 mr-1 ${note.is_resolved ? 'text-primary' : ''}`} />
                            {note.is_resolved ? 'Reopen' : 'Resolve'}
                          </Button>
                        </div>
                      </div>

                      {/* Thread */}
                      <Separator className="my-1" />
                      <NoteThread
                        noteId={note.id}
                        replyCount={note.reply_count || 0}
                        currentUser={currentUser || null}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
