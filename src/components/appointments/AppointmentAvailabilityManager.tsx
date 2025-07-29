import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface UserPreferences {
  id?: string;
  buffer_time_minutes: number;
  max_daily_appointments: number;
  allow_same_day_booking: boolean;
  advance_booking_days: number;
  google_calendar_sync: boolean;
  apple_calendar_sync: boolean;
}

export const AppointmentAvailabilityManager = () => {
  const { user } = useAuth();
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    buffer_time_minutes: 15,
    max_daily_appointments: 10,
    allow_same_day_booking: true,
    advance_booking_days: 30,
    google_calendar_sync: false,
    apple_calendar_sync: false
  });
  const [newSlot, setNewSlot] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00'
  });

  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  useEffect(() => {
    if (user) {
      fetchAvailability();
      fetchPreferences();
    }
  }, [user]);

  const fetchAvailability = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('gw_appointment_availability')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      toast.error('Failed to fetch availability');
      return;
    }

    setAvailabilitySlots(data || []);
  };

  const fetchPreferences = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('gw_user_appointment_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      toast.error('Failed to fetch preferences');
      return;
    }

    if (data) {
      setPreferences(data);
    }
  };

  const addAvailabilitySlot = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('gw_appointment_availability')
        .insert([{
          ...newSlot,
          user_id: user.id,
          is_available: true
        }]);

      if (error) throw error;

      toast.success('Availability slot added');
      fetchAvailability();
      setNewSlot({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00'
      });
    } catch (error) {
      toast.error('Failed to add availability slot');
    }
  };

  const removeAvailabilitySlot = async (slotId: string) => {
    try {
      const { error } = await supabase
        .from('gw_appointment_availability')
        .delete()
        .eq('id', slotId);

      if (error) throw error;

      toast.success('Availability slot removed');
      fetchAvailability();
    } catch (error) {
      toast.error('Failed to remove availability slot');
    }
  };

  const toggleSlotAvailability = async (slotId: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_appointment_availability')
        .update({ is_available: !isAvailable })
        .eq('id', slotId);

      if (error) throw error;

      fetchAvailability();
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('gw_user_appointment_preferences')
        .upsert([{
          ...preferences,
          user_id: user.id
        }]);

      if (error) throw error;

      toast.success('Preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
    }
  };

  return (
    <div className="space-y-6">
      {/* Availability Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Weekly Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Slot */}
          <div className="flex gap-2 items-end">
            <div>
              <Label>Day</Label>
              <select
                value={newSlot.day_of_week}
                onChange={(e) => setNewSlot({ ...newSlot, day_of_week: parseInt(e.target.value) })}
                className="w-full p-2 border rounded-md"
              >
                {daysOfWeek.map((day, index) => (
                  <option key={index} value={index}>{day}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={newSlot.start_time}
                onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={newSlot.end_time}
                onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
              />
            </div>
            <Button onClick={addAvailabilitySlot} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Existing Slots */}
          <div className="space-y-2">
            {availabilitySlots.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant="outline">
                    {daysOfWeek[slot.day_of_week]}
                  </Badge>
                  <span className="text-sm">
                    {slot.start_time} - {slot.end_time}
                  </span>
                  <Switch
                    checked={slot.is_available}
                    onCheckedChange={() => toggleSlotAvailability(slot.id, slot.is_available)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAvailabilitySlot(slot.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Buffer Time (minutes)</Label>
              <Input
                type="number"
                min="0"
                max="60"
                value={preferences.buffer_time_minutes}
                onChange={(e) => setPreferences({ 
                  ...preferences, 
                  buffer_time_minutes: parseInt(e.target.value) || 0 
                })}
              />
            </div>
            <div>
              <Label>Max Daily Appointments</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={preferences.max_daily_appointments}
                onChange={(e) => setPreferences({ 
                  ...preferences, 
                  max_daily_appointments: parseInt(e.target.value) || 1 
                })}
              />
            </div>
            <div>
              <Label>Advance Booking Days</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={preferences.advance_booking_days}
                onChange={(e) => setPreferences({ 
                  ...preferences, 
                  advance_booking_days: parseInt(e.target.value) || 1 
                })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Allow Same-Day Booking</Label>
              <Switch
                checked={preferences.allow_same_day_booking}
                onCheckedChange={(checked) => setPreferences({ 
                  ...preferences, 
                  allow_same_day_booking: checked 
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Google Calendar Sync</Label>
              <Switch
                checked={preferences.google_calendar_sync}
                onCheckedChange={(checked) => setPreferences({ 
                  ...preferences, 
                  google_calendar_sync: checked 
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Apple Calendar Sync</Label>
              <Switch
                checked={preferences.apple_calendar_sync}
                onCheckedChange={(checked) => setPreferences({ 
                  ...preferences, 
                  apple_calendar_sync: checked 
                })}
              />
            </div>
          </div>

          <Button onClick={savePreferences} className="w-full">
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
