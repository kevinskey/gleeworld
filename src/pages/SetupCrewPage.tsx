import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetupCrews } from '@/hooks/useSetupCrews';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Users, Calendar, Settings, Trash2 } from 'lucide-react';
import { SetupCrewDetails } from '@/components/setup-crew/SetupCrewDetails';
import { useToast } from '@/hooks/use-toast';

interface Event {
  id: string;
  title: string;
  start_date: string;
  event_type: string;
}

export default function SetupCrewPage() {
  const navigate = useNavigate();
  const { crews, loading, fetchCrews, createCrew } = useSetupCrews();
  const { toast } = useToast();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [formData, setFormData] = useState({
    event_id: '',
    crew_name: '',
    max_members: 8,
    notes: '',
  });

  useEffect(() => {
    fetchCrews();
    fetchEvents();
  }, [fetchCrews]);

  const fetchEvents = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('gw_events')
        .select('id, title, start_date, event_type')
        .gte('start_date', new Date().toISOString())
        .order('start_date');

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch events: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateCrew = async () => {
    if (!formData.event_id || !formData.crew_name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const success = await createCrew(formData);
    if (success) {
      setShowCreateDialog(false);
      setFormData({
        event_id: '',
        crew_name: '',
        max_members: 8,
        notes: '',
      });
    }
  };

  const getStatusColor = (crew: any) => {
    const ratio = crew.member_count / crew.max_members;
    if (ratio === 1) return 'bg-green-500';
    if (ratio >= 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (selectedCrew) {
    return (
      <SetupCrewDetails
        crewId={selectedCrew}
        onBack={() => setSelectedCrew(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Setup Crews</h1>
              </div>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Crew
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Setup Crew</DialogTitle>
                  <DialogDescription>
                    Create a new setup crew for an upcoming event
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="event">Event *</Label>
                    <Select value={formData.event_id} onValueChange={(value) => setFormData(prev => ({ ...prev, event_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map(event => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.title} - {new Date(event.start_date).toLocaleDateString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="crew_name">Crew Name *</Label>
                    <Input
                      id="crew_name"
                      value={formData.crew_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, crew_name: e.target.value }))}
                      placeholder="e.g., Setup Team Alpha"
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_members">Max Members</Label>
                    <Input
                      id="max_members"
                      type="number"
                      min={1}
                      max={20}
                      value={formData.max_members}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_members: parseInt(e.target.value) || 8 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Special requirements or notes for this crew..."
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCrew}>
                    Create Crew
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg">Loading setup crews...</div>
          </div>
        ) : crews.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Setup Crews</h3>
              <p className="text-muted-foreground text-center mb-6">
                Create your first setup crew to organize first-year students for events
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Crew
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {crews.map(crew => (
              <Card key={crew.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{crew.crew_name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        {crew.event_title}
                      </CardDescription>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(crew)}`} title="Crew Status" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Members</span>
                      <Badge variant="secondary">
                        {crew.member_count} / {crew.max_members}
                      </Badge>
                    </div>
                    
                    {crew.event_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Event Date</span>
                        <span className="text-sm">{new Date(crew.event_date).toLocaleDateString()}</span>
                      </div>
                    )}

                    {crew.notes && (
                      <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        {crew.notes}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedCrew(crew.id)}
                        className="flex-1 gap-2"
                      >
                        <Settings className="h-3 w-3" />
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}