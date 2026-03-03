import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Plus, Lock, ChevronDown, Clock, Users, MapPin, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export const TourRollCallSection: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [cityId, setCityId] = useState<string>('none');
  const [checkinDate, setCheckinDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editCheckin, setEditCheckin] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCityId, setEditCityId] = useState('none');
  const [editDate, setEditDate] = useState('');

  // Fetch active tour
  const { data: tour } = useQuery({
    queryKey: ['rollcall-tour'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tours')
        .select('id, name')
        .in('status', ['planning', 'confirmed', 'active'])
        .order('start_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Fetch cities for dropdown
  const { data: cities = [] } = useQuery({
    queryKey: ['rollcall-cities', tour?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tour_cities')
        .select('id, city_name, state_code, city_order')
        .eq('tour_id', tour!.id)
        .order('city_order');
      return data || [];
    },
    enabled: !!tour?.id,
  });

  // Fetch all checkin sessions
  const { data: checkins = [], isLoading } = useQuery({
    queryKey: ['rollcall-checkins', tour?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tour_checkins')
        .select('*')
        .eq('tour_id', tour!.id)
        .order('opened_at', { ascending: false });
      return data || [];
    },
    enabled: !!tour?.id,
    refetchInterval: 10000,
  });

  // Fetch roster count
  const { data: rosterCount = 0 } = useQuery({
    queryKey: ['rollcall-roster-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('gw_tour_roster')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed');
      return count || 0;
    },
  });

  // Fetch roster members with profiles (for attendance board)
  const { data: rosterMembers = [] } = useQuery({
    queryKey: ['rollcall-roster-members'],
    queryFn: async () => {
      const { data: roster } = await supabase
        .from('gw_tour_roster')
        .select('user_id')
        .eq('status', 'confirmed');
      if (!roster?.length) return [];
      const userIds = roster.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, voice_part')
        .in('user_id', userIds);
      return profiles || [];
    },
  });

  // Fetch responses for all active checkins
  const activeCheckins = checkins.filter(c => !c.closed_at);
  const { data: responses = [] } = useQuery({
    queryKey: ['rollcall-responses', activeCheckins.map(c => c.id)],
    queryFn: async () => {
      if (!activeCheckins.length) return [];
      const { data } = await supabase
        .from('gw_tour_checkin_responses')
        .select('*')
        .in('checkin_id', activeCheckins.map(c => c.id));
      return data || [];
    },
    enabled: activeCheckins.length > 0,
    refetchInterval: 10000,
  });

  // Create session mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('gw_tour_checkins').insert({
        tour_id: tour!.id,
        city_id: cityId === 'none' ? null : cityId,
        title,
        checkin_date: checkinDate,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rollcall-checkins'] });
      toast({ title: 'Roll Call Created', description: 'Session is now active.' });
      setCreateOpen(false);
      setTitle('');
      setCityId('none');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Close session mutation
  const closeMutation = useMutation({
    mutationFn: async (checkinId: string) => {
      const { error } = await supabase
        .from('gw_tour_checkins')
        .update({ closed_at: new Date().toISOString() })
        .eq('id', checkinId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rollcall-checkins'] });
      toast({ title: 'Session Closed' });
    },
  });

  // Edit session mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, title, cityId, date }: { id: string; title: string; cityId: string; date: string }) => {
      const { error } = await supabase
        .from('gw_tour_checkins')
        .update({ title, city_id: cityId === 'none' ? null : cityId, checkin_date: date })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rollcall-checkins'] });
      toast({ title: 'Roll Call Updated' });
      setEditCheckin(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Delete session mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gw_tour_checkins').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rollcall-checkins'] });
      toast({ title: 'Roll Call Deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openEdit = (checkin: any) => {
    setEditCheckin(checkin);
    setEditTitle(checkin.title);
    setEditCityId(checkin.city_id || 'none');
    setEditDate(checkin.checkin_date);
  };

  const closedCheckins = checkins.filter(c => !!c.closed_at);

  const getResponsesForCheckin = (checkinId: string) =>
    responses.filter(r => r.checkin_id === checkinId);

  const getCityName = (cId: string | null) => {
    if (!cId) return null;
    const city = cities.find(c => c.id === cId);
    return city ? `${city.city_name}, ${city.state_code}` : null;
  };

  if (isLoading) return <LoadingSpinner text="Loading roll call..." />;

  if (!tour) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No active tour found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Roll Call</h2>
          <p className="text-sm text-muted-foreground">{tour.name} • {rosterCount} roster members</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> New Roll Call
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Roll Call Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Morning Roll Call - Chicago"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Label>City (optional)</Label>
                <Select value={cityId} onValueChange={setCityId}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific city</SelectItem>
                    {cities.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.city_name}, {c.state_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={checkinDate} onChange={e => setCheckinDate(e.target.value)} />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!title.trim() || createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? 'Creating...' : 'Open Roll Call'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Sessions */}
      {activeCheckins.length === 0 && closedCheckins.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No roll call sessions yet</p>
            <p className="text-sm mt-1">Create one to start tracking attendance.</p>
          </CardContent>
        </Card>
      )}

      {activeCheckins.map(checkin => {
        const checkinResponses = getResponsesForCheckin(checkin.id);
        const checkedInIds = new Set(checkinResponses.map(r => r.user_id));
        const cityName = getCityName(checkin.city_id);

        return (
          <Card key={checkin.id} className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="default" className="mb-2 bg-green-600">Active</Badge>
                  <CardTitle className="text-base">{checkin.title}</CardTitle>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Opened {format(new Date(checkin.opened_at), 'h:mm a')}
                    </span>
                    {cityName && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {cityName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-2xl font-bold text-primary">
                    {checkedInIds.size}<span className="text-sm text-muted-foreground font-normal">/{rosterCount}</span>
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(checkin)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Roll Call?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete "{checkin.title}" and all check-in responses.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(checkin.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => closeMutation.mutate(checkin.id)}
                      disabled={closeMutation.isPending}
                    >
                      <Lock className="h-3 w-3" /> Close
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Attendance Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                {rosterMembers.map(member => {
                  const isPresent = checkedInIds.has(member.user_id);
                  const response = checkinResponses.find(r => r.user_id === member.user_id);
                  return (
                    <div
                      key={member.user_id}
                      className={`flex items-center gap-2 p-2 rounded-md text-sm border ${
                        isPresent
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-muted/30 border-border'
                      }`}
                    >
                      {isPresent ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive/50 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate text-foreground text-xs">{member.full_name || 'Unknown'}</p>
                        {isPresent && response && (
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(response.checked_in_at), 'h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Past Sessions */}
      {closedCheckins.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="gap-2 text-muted-foreground w-full justify-between">
              <span>Past Sessions ({closedCheckins.length})</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-2">
            {closedCheckins.map(checkin => {
              const cityName = getCityName(checkin.city_id);
              return (
                <Card key={checkin.id} className="bg-muted/20">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-foreground">{checkin.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{format(new Date(checkin.checkin_date), 'MMM d, yyyy')}</span>
                          {cityName && <span>• {cityName}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(checkin)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Roll Call?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete "{checkin.title}" and all responses.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(checkin.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Badge variant="secondary" className="text-xs">Closed</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editCheckin} onOpenChange={open => { if (!open) setEditCheckin(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Roll Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label>City (optional)</Label>
              <Select value={editCityId} onValueChange={setEditCityId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific city</SelectItem>
                  {cities.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.city_name}, {c.state_code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>
            <Button
              onClick={() => editCheckin && editMutation.mutate({ id: editCheckin.id, title: editTitle, cityId: editCityId, date: editDate })}
              disabled={!editTitle.trim() || editMutation.isPending}
              className="w-full"
            >
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
