import React, { useState } from 'react';
import { Clock, Calendar, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parse } from 'date-fns';

interface BusinessHours {
  start: string;
  end: string;
  enabled: boolean;
}

interface AvailabilityConfig {
  businessHours: {
    monday: BusinessHours;
    tuesday: BusinessHours;
    wednesday: BusinessHours;
    thursday: BusinessHours;
    friday: BusinessHours;
    saturday: BusinessHours;
    sunday: BusinessHours;
  };
  slotDuration: number;
  bufferTime: number;
  advanceBookingDays: number;
  timezone: string;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' }
];

export const AvailabilitySettings = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<AvailabilityConfig>({
    businessHours: {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '10:00', end: '15:00', enabled: false },
      sunday: { start: '10:00', end: '15:00', enabled: false }
    },
    slotDuration: 30,
    bufferTime: 0,
    advanceBookingDays: 30,
    timezone: 'America/New_York'
  });

  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper function to convert 24-hour time to 12-hour format
  const formatTo12Hour = (time24: string) => {
    try {
      if (!time24 || typeof time24 !== 'string' || !time24.includes(':')) {
        return time24 || '';
      }
      const parsed = parse(time24, 'HH:mm', new Date());
      if (isNaN(parsed.getTime())) {
        return time24;
      }
      return format(parsed, 'h:mm a');
    } catch {
      return time24 || '';
    }
  };

  const updateBusinessHours = (day: string, field: keyof BusinessHours, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day as keyof typeof prev.businessHours],
          [field]: value
        }
      }
    }));
  };

  const addBlockedDate = () => {
    if (newBlockedDate && !blockedDates.includes(newBlockedDate)) {
      setBlockedDates(prev => [...prev, newBlockedDate].sort());
      setNewBlockedDate('');
    }
  };

  const removeBlockedDate = (date: string) => {
    setBlockedDates(prev => prev.filter(d => d !== date));
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in to save availability settings');
      return;
    }

    setLoading(true);
    
    try {
      // First, clear existing availability slots for this user
      await supabase
        .from('gw_appointment_availability')
        .delete()
        .eq('user_id', user.id);

      // Convert business hours to availability slots
      const availabilitySlots = [];
      
      Object.entries(config.businessHours).forEach(([dayName, hours], index) => {
        if (hours.enabled) {
          // Get day of week index (0 = Sunday, 1 = Monday, etc.)
          const dayMapping: { [key: string]: number } = {
            sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
            thursday: 4, friday: 5, saturday: 6
          };
          
          availabilitySlots.push({
            user_id: user.id,
            day_of_week: dayMapping[dayName],
            start_time: hours.start,
            end_time: hours.end,
            is_available: true
          });
        }
      });

      // Insert new availability slots
      if (availabilitySlots.length > 0) {
        const { error: slotsError } = await supabase
          .from('gw_appointment_availability')
          .insert(availabilitySlots);

        if (slotsError) throw slotsError;
      }

      // Save user preferences
      const { error: prefsError } = await supabase
        .from('gw_user_appointment_preferences')
        .upsert([{
          user_id: user.id,
          buffer_time_minutes: config.bufferTime,
          advance_booking_days: config.advanceBookingDays,
          max_daily_appointments: 20,
          allow_same_day_booking: true,
          google_calendar_sync: false,
          apple_calendar_sync: false
        }]);

      if (prefsError) throw prefsError;

      toast.success('Availability settings saved successfully!');
    } catch (error) {
      console.error('Error saving availability settings:', error);
      toast.error('Failed to save availability settings');
    } finally {
      setLoading(false);
    }
  };

  // Load availability settings from database on component mount
  React.useEffect(() => {
    if (user) {
      loadAvailabilitySettings();
    }
  }, [user]);

  const loadAvailabilitySettings = async () => {
    if (!user) return;

    try {
      // Load availability slots
      const { data: slots, error: slotsError } = await supabase
        .from('gw_appointment_availability')
        .select('*')
        .eq('user_id', user.id);

      if (slotsError) throw slotsError;

      // Load user preferences
      const { data: prefs, error: prefsError } = await supabase
        .from('gw_user_appointment_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prefsError && prefsError.code !== 'PGRST116') {
        console.error('Error loading preferences:', prefsError);
      }

      // Convert slots back to business hours format
      if (slots && slots.length > 0) {
        const newBusinessHours = { ...config.businessHours };
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        // Reset all days to disabled first
        Object.keys(newBusinessHours).forEach(day => {
          newBusinessHours[day as keyof typeof newBusinessHours].enabled = false;
        });

        // Enable days that have availability slots
        slots.forEach(slot => {
          const dayName = dayNames[slot.day_of_week];
          if (dayName && newBusinessHours[dayName as keyof typeof newBusinessHours]) {
            newBusinessHours[dayName as keyof typeof newBusinessHours] = {
              start: slot.start_time,
              end: slot.end_time,
              enabled: slot.is_available
            };
          }
        });

        setConfig(prev => ({
          ...prev,
          businessHours: newBusinessHours,
          ...(prefs && {
            bufferTime: prefs.buffer_time_minutes || 0,
            advanceBookingDays: prefs.advance_booking_days || 30
          })
        }));
      }
    } catch (error) {
      console.error('Error loading availability settings:', error);
      toast.error('Failed to load availability settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Business Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-4">
              <div className="w-24">
                <Switch
                  checked={config.businessHours[key as keyof typeof config.businessHours].enabled}
                  onCheckedChange={(checked) => updateBusinessHours(key, 'enabled', checked)}
                />
              </div>
              <div className="w-20 text-sm font-medium">{label}</div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <Input
                    type="time"
                    value={config.businessHours[key as keyof typeof config.businessHours].start}
                    onChange={(e) => updateBusinessHours(key, 'start', e.target.value)}
                    disabled={!config.businessHours[key as keyof typeof config.businessHours].enabled}
                    className="w-32"
                  />
                  <span className="text-xs text-muted-foreground text-center">
                    {formatTo12Hour(config.businessHours[key as keyof typeof config.businessHours].start)}
                  </span>
                </div>
                <span>to</span>
                <div className="flex flex-col gap-1">
                  <Input
                    type="time"
                    value={config.businessHours[key as keyof typeof config.businessHours].end}
                    onChange={(e) => updateBusinessHours(key, 'end', e.target.value)}
                    disabled={!config.businessHours[key as keyof typeof config.businessHours].enabled}
                    className="w-32"
                  />
                  <span className="text-xs text-muted-foreground text-center">
                    {formatTo12Hour(config.businessHours[key as keyof typeof config.businessHours].end)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="slotDuration">Appointment Slot Duration (minutes)</Label>
              <Select
                value={config.slotDuration.toString()}
                onValueChange={(value) => setConfig(prev => ({ ...prev, slotDuration: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="bufferTime">Buffer Time Between Appointments (minutes)</Label>
              <Select
                value={config.bufferTime.toString()}
                onValueChange={(value) => setConfig(prev => ({ ...prev, bufferTime: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No buffer</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="advanceBooking">Advance Booking Limit (days)</Label>
              <Input
                id="advanceBooking"
                type="number"
                min="1"
                max="365"
                value={config.advanceBookingDays}
                onChange={(e) => setConfig(prev => ({ ...prev, advanceBookingDays: parseInt(e.target.value) || 30 }))}
              />
            </div>
            
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={config.timezone}
                onValueChange={(value) => setConfig(prev => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocked Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Blocked Dates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="date"
              value={newBlockedDate}
              onChange={(e) => setNewBlockedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <Button onClick={addBlockedDate} disabled={!newBlockedDate}>
              Add Blocked Date
            </Button>
          </div>
          
          {blockedDates.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Blocked dates:</p>
              <div className="space-y-2">
                {blockedDates.map(date => (
                  <div key={date} className="flex items-center justify-between p-2 border rounded">
                    <span>{new Date(date).toLocaleDateString()}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBlockedDate(date)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};