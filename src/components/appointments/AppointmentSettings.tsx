import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Settings, Clock, Mail, Calendar, Users } from 'lucide-react';

export const AppointmentSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState({
    default_duration: 60,
    buffer_time: 15,
    advance_booking_limit: 30,
    same_day_booking: true,
    email_reminders: true,
    sms_reminders: false,
    auto_confirm: false,
    max_daily_appointments: 8,
    cancellation_notice: 24,
    booking_instructions: '',
    confirmation_message: '',
  });

  // Simplified for now - will be enhanced once schema is updated
  const appointmentTypes = [];
  const typesLoading = false;

  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['user-appointment-preferences'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_user_appointment_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setSettings({
          default_duration: 60, // Use default since column doesn't exist yet
          buffer_time: data.buffer_time_minutes || 15,
          advance_booking_limit: data.advance_booking_days || 30,
          same_day_booking: data.allow_same_day_booking || true,
          email_reminders: true, // Use default since column doesn't exist yet
          sms_reminders: false, // Use default since column doesn't exist yet
          auto_confirm: false, // Use default since column doesn't exist yet
          max_daily_appointments: data.max_daily_appointments || 8,
          cancellation_notice: 24, // Use default since column doesn't exist yet
          booking_instructions: '', // Use default since column doesn't exist yet
          confirmation_message: '', // Use default since column doesn't exist yet
        });
      }

      return data;
    },
    enabled: !!user,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: typeof settings) => {
      const { error } = await supabase
        .from('gw_user_appointment_preferences')
        .upsert([{
          user_id: user?.id,
          default_duration_minutes: newSettings.default_duration,
          buffer_time_minutes: newSettings.buffer_time,
          advance_booking_days: newSettings.advance_booking_limit,
          allow_same_day_booking: newSettings.same_day_booking,
          email_reminders_enabled: newSettings.email_reminders,
          sms_reminders_enabled: newSettings.sms_reminders,
          auto_confirm_appointments: newSettings.auto_confirm,
          max_daily_appointments: newSettings.max_daily_appointments,
          minimum_cancellation_hours: newSettings.cancellation_notice,
          booking_instructions: newSettings.booking_instructions,
          confirmation_message: newSettings.confirmation_message,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-appointment-preferences'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save settings');
      console.error('Error saving settings:', error);
    },
  });

  const createTypeMutation = useMutation({
    mutationFn: async (typeName: string) => {
      const { error } = await supabase
        .from('gw_appointment_types')
        .insert([{
          name: typeName,
          created_by: user?.id,
          duration_minutes: settings.default_duration,
          description: `${typeName} appointment`,
          color: '#3b82f6',
          is_active: true,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-types'] });
      toast.success('Appointment type created');
    },
    onError: (error) => {
      toast.error('Failed to create appointment type');
      console.error('Error creating appointment type:', error);
    },
  });

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(settings);
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const [newTypeName, setNewTypeName] = useState('');

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    
    createTypeMutation.mutate(newTypeName);
    setNewTypeName('');
  };

  if (preferencesLoading || typesLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded"></div>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Appointment Settings</h2>
        <p className="text-muted-foreground">
          Configure your appointment preferences and types
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Default Duration (minutes)</Label>
              <Select
                value={settings.default_duration.toString()}
                onValueChange={(value) => updateSetting('default_duration', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Buffer Time (minutes)</Label>
              <Select
                value={settings.buffer_time.toString()}
                onValueChange={(value) => updateSetting('buffer_time', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No buffer</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Advance Booking Limit (days)</Label>
              <Input
                type="number"
                value={settings.advance_booking_limit}
                onChange={(e) => updateSetting('advance_booking_limit', parseInt(e.target.value))}
                min="1"
                max="365"
              />
            </div>

            <div className="space-y-2">
              <Label>Max Daily Appointments</Label>
              <Input
                type="number"
                value={settings.max_daily_appointments}
                onChange={(e) => updateSetting('max_daily_appointments', parseInt(e.target.value))}
                min="1"
                max="20"
              />
            </div>

            <div className="space-y-2">
              <Label>Cancellation Notice (hours)</Label>
              <Input
                type="number"
                value={settings.cancellation_notice}
                onChange={(e) => updateSetting('cancellation_notice', parseInt(e.target.value))}
                min="1"
                max="168"
              />
            </div>
          </div>

          <Separator />

          {/* Toggle Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Same-Day Booking</Label>
                <p className="text-sm text-muted-foreground">
                  Clients can book appointments for today
                </p>
              </div>
              <Switch
                checked={settings.same_day_booking}
                onCheckedChange={(checked) => updateSetting('same_day_booking', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Confirm Appointments</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically confirm new appointments
                </p>
              </div>
              <Switch
                checked={settings.auto_confirm}
                onCheckedChange={(checked) => updateSetting('auto_confirm', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Send email reminders to clients
                </p>
              </div>
              <Switch
                checked={settings.email_reminders}
                onCheckedChange={(checked) => updateSetting('email_reminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Send SMS reminders to clients
                </p>
              </div>
              <Switch
                checked={settings.sms_reminders}
                onCheckedChange={(checked) => updateSetting('sms_reminders', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Message Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Booking Instructions</Label>
            <Textarea
              value={settings.booking_instructions}
              onChange={(e) => updateSetting('booking_instructions', e.target.value)}
              placeholder="Instructions shown to clients when booking..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Confirmation Message</Label>
            <Textarea
              value={settings.confirmation_message}
              onChange={(e) => updateSetting('confirmation_message', e.target.value)}
              placeholder="Message sent when appointment is confirmed..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appointment Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Appointment Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateType} className="flex gap-2">
            <Input
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="Enter appointment type name"
            />
            <Button type="submit" disabled={!newTypeName.trim()}>
              Add Type
            </Button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointmentTypes?.map((type) => (
              <div
                key={type.id}
                className="p-4 border border-border rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{type.name}</h4>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {type.description}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {type.default_duration_minutes} min
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    type.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {type.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={saveSettingsMutation.isPending}
          size="lg"
        >
          {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};