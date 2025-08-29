import React, { useState } from 'react';
import { Clock, Calendar, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

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

  const handleSave = () => {
    // In a real implementation, this would save to the database
    // For now, we'll save to localStorage
    localStorage.setItem('appointmentAvailabilityConfig', JSON.stringify(config));
    localStorage.setItem('appointmentBlockedDates', JSON.stringify(blockedDates));
    toast.success('Availability settings saved successfully!');
  };

  // Load from localStorage on component mount
  React.useEffect(() => {
    const savedConfig = localStorage.getItem('appointmentAvailabilityConfig');
    const savedBlockedDates = localStorage.getItem('appointmentBlockedDates');
    
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Error loading saved config:', error);
      }
    }
    
    if (savedBlockedDates) {
      try {
        setBlockedDates(JSON.parse(savedBlockedDates));
      } catch (error) {
        console.error('Error loading blocked dates:', error);
      }
    }
  }, []);

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
                <Input
                  type="time"
                  value={config.businessHours[key as keyof typeof config.businessHours].start}
                  onChange={(e) => updateBusinessHours(key, 'start', e.target.value)}
                  disabled={!config.businessHours[key as keyof typeof config.businessHours].enabled}
                  className="w-32"
                />
                <span>to</span>
                <Input
                  type="time"
                  value={config.businessHours[key as keyof typeof config.businessHours].end}
                  onChange={(e) => updateBusinessHours(key, 'end', e.target.value)}
                  disabled={!config.businessHours[key as keyof typeof config.businessHours].enabled}
                  className="w-32"
                />
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
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
};