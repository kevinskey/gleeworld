import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Radio, Plus, Pencil, Trash2, Clock, Music, Calendar, GripVertical, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RadioChannel {
  id: string;
  name: string;
  description: string | null;
  stream_url: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
}

interface NowPlayingOverride {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  art_url: string | null;
  is_active: boolean;
  expires_at: string | null;
}

interface ScheduleEntry {
  id: string;
  channel_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ICONS = ['Radio', 'Music', 'Music2', 'Church', 'Sparkles', 'Heart', 'Star', 'Mic'];

export const RadioChannelsTab = () => {
  const [channels, setChannels] = useState<RadioChannel[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [nowPlayingOverride, setNowPlayingOverride] = useState<NowPlayingOverride | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingChannel, setEditingChannel] = useState<RadioChannel | null>(null);
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState<Partial<ScheduleEntry>>({});

  // Channel form state
  const [channelForm, setChannelForm] = useState({
    name: '',
    description: '',
    stream_url: '',
    icon: 'Radio',
    color: '#7BAFD4',
    is_active: true,
    is_default: false,
  });

  // Now playing override form
  const [overrideForm, setOverrideForm] = useState({
    title: '',
    artist: '',
    album: '',
    art_url: '',
    is_active: false,
    expires_at: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [channelsRes, scheduleRes, overrideRes] = await Promise.all([
        supabase.from('gw_radio_channels').select('*').order('sort_order'),
        supabase.from('gw_radio_schedule').select('*').order('day_of_week').order('start_time'),
        supabase.from('gw_radio_now_playing_override').select('*').eq('is_active', true).maybeSingle(),
      ]);

      if (channelsRes.data) setChannels(channelsRes.data);
      if (scheduleRes.data) setSchedule(scheduleRes.data);
      if (overrideRes.data) {
        setNowPlayingOverride(overrideRes.data);
        setOverrideForm({
          title: overrideRes.data.title || '',
          artist: overrideRes.data.artist || '',
          album: overrideRes.data.album || '',
          art_url: overrideRes.data.art_url || '',
          is_active: overrideRes.data.is_active,
          expires_at: overrideRes.data.expires_at || '',
        });
      }
    } catch (error) {
      console.error('Error fetching radio data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChannel = async () => {
    try {
      if (editingChannel) {
        const { error } = await supabase
          .from('gw_radio_channels')
          .update({
            name: channelForm.name,
            description: channelForm.description || null,
            stream_url: channelForm.stream_url,
            icon: channelForm.icon,
            color: channelForm.color,
            is_active: channelForm.is_active,
            is_default: channelForm.is_default,
          })
          .eq('id', editingChannel.id);

        if (error) throw error;
        toast({ title: 'Channel Updated', description: 'Radio channel has been updated.' });
      } else {
        const maxOrder = Math.max(...channels.map(c => c.sort_order), 0);
        const { error } = await supabase.from('gw_radio_channels').insert({
          name: channelForm.name,
          description: channelForm.description || null,
          stream_url: channelForm.stream_url,
          icon: channelForm.icon,
          color: channelForm.color,
          is_active: channelForm.is_active,
          is_default: channelForm.is_default,
          sort_order: maxOrder + 1,
        });

        if (error) throw error;
        toast({ title: 'Channel Created', description: 'New radio channel has been added.' });
      }

      setIsChannelDialogOpen(false);
      setEditingChannel(null);
      resetChannelForm();
      fetchData();
    } catch (error) {
      console.error('Error saving channel:', error);
      toast({ title: 'Error', description: 'Failed to save channel.', variant: 'destructive' });
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm('Delete this channel?')) return;
    try {
      const { error } = await supabase.from('gw_radio_channels').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Channel Deleted' });
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete channel.', variant: 'destructive' });
    }
  };

  const handleEditChannel = (channel: RadioChannel) => {
    setEditingChannel(channel);
    setChannelForm({
      name: channel.name,
      description: channel.description || '',
      stream_url: channel.stream_url,
      icon: channel.icon || 'Radio',
      color: channel.color || '#7BAFD4',
      is_active: channel.is_active,
      is_default: channel.is_default,
    });
    setIsChannelDialogOpen(true);
  };

  const resetChannelForm = () => {
    setChannelForm({
      name: '',
      description: '',
      stream_url: '',
      icon: 'Radio',
      color: '#7BAFD4',
      is_active: true,
      is_default: false,
    });
  };

  const handleSaveOverride = async () => {
    try {
      // Deactivate any existing override first
      await supabase.from('gw_radio_now_playing_override').update({ is_active: false }).eq('is_active', true);

      if (overrideForm.is_active && overrideForm.title) {
        const { error } = await supabase.from('gw_radio_now_playing_override').insert({
          title: overrideForm.title,
          artist: overrideForm.artist || null,
          album: overrideForm.album || null,
          art_url: overrideForm.art_url || null,
          is_active: true,
          expires_at: overrideForm.expires_at || null,
        });
        if (error) throw error;
        toast({ title: 'Now Playing Override Active', description: 'Custom now playing info is now displayed.' });
      } else {
        toast({ title: 'Override Disabled', description: 'Now showing actual stream info.' });
      }
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save override.', variant: 'destructive' });
    }
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.channel_id || newSchedule.day_of_week === undefined || !newSchedule.start_time || !newSchedule.end_time) {
      toast({ title: 'Error', description: 'Please fill all schedule fields.', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.from('gw_radio_schedule').insert({
        channel_id: newSchedule.channel_id,
        day_of_week: newSchedule.day_of_week,
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time,
        is_active: true,
      });

      if (error) throw error;
      toast({ title: 'Schedule Added' });
      setIsScheduleDialogOpen(false);
      setNewSchedule({});
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add schedule.', variant: 'destructive' });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const { error } = await supabase.from('gw_radio_schedule').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete schedule.', variant: 'destructive' });
    }
  };

  const getChannelName = (channelId: string) => {
    return channels.find(c => c.id === channelId)?.name || 'Unknown';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Radio className="h-4 w-4" />
          Radio Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="channels" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="channels" className="text-xs">Channels</TabsTrigger>
            <TabsTrigger value="nowplaying" className="text-xs">Now Playing</TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs">Schedule</TabsTrigger>
          </TabsList>

          {/* Channels Tab */}
          <TabsContent value="channels" className="space-y-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{channels.length} channels</span>
              <Dialog open={isChannelDialogOpen} onOpenChange={(open) => {
                setIsChannelDialogOpen(open);
                if (!open) {
                  setEditingChannel(null);
                  resetChannelForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add Channel
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingChannel ? 'Edit Channel' : 'Add Channel'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={channelForm.name}
                        onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                        placeholder="Channel name"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Stream URL</Label>
                      <Input
                        value={channelForm.stream_url}
                        onChange={(e) => setChannelForm({ ...channelForm, stream_url: e.target.value })}
                        placeholder="https://..."
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={channelForm.description}
                        onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })}
                        placeholder="Optional description"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Icon</Label>
                        <Select value={channelForm.icon} onValueChange={(v) => setChannelForm({ ...channelForm, icon: v })}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ICONS.map(icon => (
                              <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Color</Label>
                        <Input
                          type="color"
                          value={channelForm.color}
                          onChange={(e) => setChannelForm({ ...channelForm, color: e.target.value })}
                          className="h-8 p-1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={channelForm.is_active}
                          onCheckedChange={(v) => setChannelForm({ ...channelForm, is_active: v })}
                        />
                        <Label className="text-xs">Active</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={channelForm.is_default}
                          onCheckedChange={(v) => setChannelForm({ ...channelForm, is_default: v })}
                        />
                        <Label className="text-xs">Default</Label>
                      </div>
                    </div>
                    <Button onClick={handleSaveChannel} className="w-full h-8 text-sm">
                      <Save className="h-3 w-3 mr-1" /> Save Channel
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded border",
                    channel.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: channel.color || '#7BAFD4' }}
                    />
                    <span className="text-xs font-medium">{channel.name}</span>
                    {channel.is_default && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">Default</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleEditChannel(channel)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => handleDeleteChannel(channel.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Now Playing Override Tab */}
          <TabsContent value="nowplaying" className="space-y-3 mt-3">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={overrideForm.is_active}
                  onCheckedChange={(v) => setOverrideForm({ ...overrideForm, is_active: v })}
                />
                <Label className="text-xs">Enable Override</Label>
                {overrideForm.is_active && (
                  <Badge variant="default" className="text-[9px] h-4">Active</Badge>
                )}
              </div>

              <div className={cn(!overrideForm.is_active && "opacity-50 pointer-events-none")}>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Song Title *</Label>
                    <Input
                      value={overrideForm.title}
                      onChange={(e) => setOverrideForm({ ...overrideForm, title: e.target.value })}
                      placeholder="Song title"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Artist</Label>
                    <Input
                      value={overrideForm.artist}
                      onChange={(e) => setOverrideForm({ ...overrideForm, artist: e.target.value })}
                      placeholder="Artist name"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Album</Label>
                    <Input
                      value={overrideForm.album}
                      onChange={(e) => setOverrideForm({ ...overrideForm, album: e.target.value })}
                      placeholder="Album name"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Album Art URL</Label>
                    <Input
                      value={overrideForm.art_url}
                      onChange={(e) => setOverrideForm({ ...overrideForm, art_url: e.target.value })}
                      placeholder="https://..."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Expires At (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={overrideForm.expires_at}
                      onChange={(e) => setOverrideForm({ ...overrideForm, expires_at: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveOverride} className="w-full h-8 text-sm">
                <Save className="h-3 w-3 mr-1" /> Save Override
              </Button>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{schedule.length} scheduled slots</span>
              <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Schedule Slot</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Channel</Label>
                      <Select
                        value={newSchedule.channel_id}
                        onValueChange={(v) => setNewSchedule({ ...newSchedule, channel_id: v })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.filter(c => c.is_active).map(channel => (
                            <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Day of Week</Label>
                      <Select
                        value={newSchedule.day_of_week?.toString()}
                        onValueChange={(v) => setNewSchedule({ ...newSchedule, day_of_week: parseInt(v) })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((day, i) => (
                            <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Start Time</Label>
                        <Input
                          type="time"
                          value={newSchedule.start_time || ''}
                          onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">End Time</Label>
                        <Input
                          type="time"
                          value={newSchedule.end_time || ''}
                          onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddSchedule} className="w-full h-8 text-sm">
                      <Save className="h-3 w-3 mr-1" /> Add Schedule
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {schedule.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No scheduled slots yet</p>
              ) : (
                schedule.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 rounded border bg-card"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium">{DAYS[entry.day_of_week]}</span>
                      <Clock className="h-3 w-3 text-muted-foreground ml-2" />
                      <span className="text-xs">{entry.start_time} - {entry.end_time}</span>
                      <Badge variant="outline" className="text-[9px] h-4 ml-2">
                        {getChannelName(entry.channel_id)}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => handleDeleteSchedule(entry.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RadioChannelsTab;
