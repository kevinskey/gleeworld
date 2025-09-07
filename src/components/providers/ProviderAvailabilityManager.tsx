import React, { useState } from 'react';
import { Plus, Clock, Trash2, Edit2, RefreshCw, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ServiceProvider, 
  useProviderAvailability, 
  useUpdateProviderAvailability, 
  useDeleteProviderAvailability,
  ProviderAvailability 
} from '@/hooks/useServiceProviders';

interface ProviderAvailabilityManagerProps {
  provider: ServiceProvider;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const ProviderAvailabilityManager: React.FC<ProviderAvailabilityManagerProps> = ({
  provider
}) => {
  const { toast } = useToast();
  const { data: availability = [] } = useProviderAvailability(provider.id);
  const updateMutation = useUpdateProviderAvailability();
  const deleteMutation = useDeleteProviderAvailability();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleCalendarId, setGoogleCalendarId] = useState('');
  const [editingAvailability, setEditingAvailability] = useState<ProviderAvailability | null>(null);
  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 30,
    break_between_slots_minutes: 15,
    is_available: true,
  });

  const resetForm = () => {
    setFormData({
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
      slot_duration_minutes: 30,
      break_between_slots_minutes: 15,
      is_available: true,
    });
    setEditingAvailability(null);
  };

  const handleSubmit = async () => {
    try {
      await updateMutation.mutateAsync({
        ...(editingAvailability?.id && { id: editingAvailability.id }),
        provider_id: provider.id,
        ...formData,
      });

      toast({
        title: "Success",
        description: editingAvailability ? "Availability updated" : "Availability added",
      });

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save availability",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: ProviderAvailability) => {
    setEditingAvailability(item);
    setFormData({
      day_of_week: item.day_of_week,
      start_time: item.start_time,
      end_time: item.end_time,
      slot_duration_minutes: item.slot_duration_minutes,
      break_between_slots_minutes: item.break_between_slots_minutes,
      is_available: item.is_available,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: "Success",
        description: "Availability slot deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete availability slot",
        variant: "destructive",
      });
    }
  };

  const handleGoogleCalendarSync = async () => {
    if (!googleCalendarId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Google Calendar ID",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
        body: { calendarId: googleCalendarId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Google Calendar synced successfully! Your availability will be updated based on your calendar events.",
      });

      setIsSyncDialogOpen(false);
      setGoogleCalendarId('');
      
      // Refresh availability data
      window.location.reload();
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Error",
        description: error.message || "Failed to sync Google Calendar",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getDayName = (dayNum: number) => {
    return DAYS_OF_WEEK.find(d => d.value === dayNum)?.label || 'Unknown';
  };

  const groupedAvailability = DAYS_OF_WEEK.map(day => ({
    ...day,
    slots: availability.filter(slot => slot.day_of_week === day.value)
  }));

  return (
    <div className="space-y-6">
      {/* Header with Sync Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Availability Management</h2>
          <p className="text-muted-foreground">Set your working hours and sync with Google Calendar</p>
        </div>
        
        <div className="flex gap-2">
          {/* Google Calendar Sync Dialog */}
          <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Sync Google Calendar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sync Google Calendar</DialogTitle>
                <DialogDescription>
                  Import your calendar events to automatically update your availability
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Google Calendar ID</Label>
                  <Input
                    placeholder="your-calendar@gmail.com or calendar-id"
                    value={googleCalendarId}
                    onChange={(e) => setGoogleCalendarId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Find your Calendar ID in Google Calendar settings → Calendar settings → Integrate calendar
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsSyncDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleGoogleCalendarSync} 
                    disabled={isSyncing}
                    className="flex items-center gap-2"
                  >
                    {isSyncing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Calendar className="h-4 w-4" />
                    )}
                    {isSyncing ? 'Syncing...' : 'Sync Calendar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Manual Availability Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Availability
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAvailability ? 'Edit' : 'Add'} Availability
                </DialogTitle>
                <DialogDescription>
                  Set your working hours for a specific day of the week
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Day of Week</Label>
                  <Select
                    value={formData.day_of_week.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, day_of_week: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Slot Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.slot_duration_minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, slot_duration_minutes: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Break Between Slots (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.break_between_slots_minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, break_between_slots_minutes: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_available}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_available: checked }))}
                  />
                  <Label>Available for appointments</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
                    {editingAvailability ? 'Update' : 'Add'} Availability
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Availability Grid */}
      <div className="grid gap-4">
        {groupedAvailability.map(day => (
          <Card key={day.value}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {day.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {day.slots.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No availability set for this day
                </p>
              ) : (
                <div className="space-y-2">
                  {day.slots.map(slot => (
                    <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-medium">
                            {slot.start_time} - {slot.end_time}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {slot.slot_duration_minutes}min slots, {slot.break_between_slots_minutes}min breaks
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${slot.is_available ? 'bg-green-500' : 'bg-red-500'}`} />
                          <Badge variant={slot.is_available ? 'default' : 'secondary'}>
                            {slot.is_available ? 'Available' : 'Unavailable'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(slot)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(slot.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sync Instructions */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground" />
            <h3 className="font-medium">Sync with Google Calendar</h3>
            <p className="text-sm text-muted-foreground">
              Connect your Google Calendar to automatically update your availability based on existing events. 
              Busy times will be marked as unavailable for new appointments.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsSyncDialogOpen(true)}
              className="mt-2"
            >
              Get Started
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};