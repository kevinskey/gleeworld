import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RehearsalLink {
  id: string;
  event_id: string;
  notes: string | null;
  created_at: string;
  event: {
    id: string;
    title: string;
    start_date: string;
    end_date: string | null;
    location: string | null;
  };
}

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
}

interface RehearsalLinksProps {
  musicId: string;
  isAdmin?: boolean;
}

export const RehearsalLinks = ({ musicId, isAdmin = false }: RehearsalLinksProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rehearsalLinks, setRehearsalLinks] = useState<RehearsalLink[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [newLink, setNewLink] = useState({
    event_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchRehearsalLinks();
    if (isAdmin) {
      fetchEvents();
    }
  }, [musicId, isAdmin]);

  const fetchRehearsalLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_rehearsal_music_links')
        .select(`
          *,
          gw_events!inner(
            id,
            title,
            start_date,
            end_date,
            location
          )
        `)
        .eq('music_id', musicId)
        .order('gw_events(start_date)', { ascending: true });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = data?.map(link => ({
        ...link,
        event: link.gw_events
      })) || [];

      setRehearsalLinks(transformedData);
    } catch (error) {
      console.error('Error fetching rehearsal links:', error);
      toast({
        title: "Error",
        description: "Failed to load rehearsal links",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_events')
        .select('id, title, start_date, end_date, location')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(50);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleLinkRehearsal = async () => {
    if (!user || !newLink.event_id) return;

    try {
      const { error } = await supabase
        .from('gw_rehearsal_music_links')
        .insert({
          event_id: newLink.event_id,
          music_id: musicId,
          notes: newLink.notes || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Music linked to rehearsal successfully",
      });

      setNewLink({ event_id: '', notes: '' });
      setShowLinkDialog(false);
      fetchRehearsalLinks();
    } catch (error) {
      console.error('Error linking rehearsal:', error);
      toast({
        title: "Error",
        description: "Failed to link rehearsal",
        variant: "destructive",
      });
    }
  };

  const handleUnlinkRehearsal = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('gw_rehearsal_music_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Rehearsal link removed successfully",
      });
      fetchRehearsalLinks();
    } catch (error) {
      console.error('Error unlinking rehearsal:', error);
      toast({
        title: "Error",
        description: "Failed to remove rehearsal link",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading rehearsal links...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Linked Rehearsals
        </h3>
        {isAdmin && (
          <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Link Rehearsal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link to Rehearsal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="event">Select Rehearsal/Event</Label>
                  <select
                    id="event"
                    value={newLink.event_id}
                    onChange={(e) => setNewLink({ ...newLink, event_id: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select an event...</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>
                        {event.title} - {formatDate(event.start_date)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={newLink.notes}
                    onChange={(e) => setNewLink({ ...newLink, notes: e.target.value })}
                    placeholder="Add any specific notes about this rehearsal..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleLinkRehearsal} 
                    disabled={!newLink.event_id}
                  >
                    Link Rehearsal
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {rehearsalLinks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No rehearsals linked to this piece yet.</p>
          {isAdmin && (
            <p className="text-sm">Link rehearsals to help members know when this piece will be practiced.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {rehearsalLinks.map(link => {
            const isPast = new Date(link.event.start_date) < new Date();
            
            return (
              <Card key={link.id} className={isPast ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {link.event.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {isPast && <Badge variant="secondary">Past</Badge>}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlinkRehearsal(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDate(link.event.start_date)} at {formatTime(link.event.start_date)}
                        {link.event.end_date && ` - ${formatTime(link.event.end_date)}`}
                      </span>
                    </div>
                    {link.event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{link.event.location}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                {link.notes && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{link.notes}</p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};