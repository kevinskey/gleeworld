import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Trash2, Clock, Calendar } from 'lucide-react';

interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface AvailabilityRule {
  id?: string;
  day_of_week: number;
  time_slots: TimeSlot[];
  is_active: boolean;
}

export const AppointmentAvailability = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<AvailabilityRule | null>(null);

  const { data: availability, isLoading } = useQuery({
    queryKey: ['appointment-availability'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_appointment_availability')
        .select('*')
        .eq('user_id', user?.id)
        .order('day_of_week');

      return data || [];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (rule: AvailabilityRule) => {
      const { error } = await supabase
        .from('gw_appointment_availability')
        .insert([{
          user_id: user?.id,
          day_of_week: rule.day_of_week,
          start_time: rule.time_slots[0]?.start_time || '09:00',
          end_time: rule.time_slots[0]?.end_time || '17:00',
          is_available: rule.is_active,
          slot_duration_minutes: 60,
          buffer_time_minutes: 15,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-availability'] });
      toast.success('Availability rule created');
      setEditingRule(null);
    },
    onError: (error) => {
      toast.error('Failed to create availability rule');
      console.error('Error creating availability rule:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (rule: AvailabilityRule) => {
      const { error } = await supabase
        .from('gw_appointment_availability')
        .update({
          start_time: rule.time_slots[0]?.start_time || '09:00',
          end_time: rule.time_slots[0]?.end_time || '17:00',
          is_available: rule.is_active,
        })
        .eq('id', rule.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-availability'] });
      toast.success('Availability rule updated');
      setEditingRule(null);
    },
    onError: (error) => {
      toast.error('Failed to update availability rule');
      console.error('Error updating availability rule:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_appointment_availability')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-availability'] });
      toast.success('Availability rule deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete availability rule');
      console.error('Error deleting availability rule:', error);
    },
  });

  const daysOfWeek = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' },
  ];

  const handleAddRule = () => {
    setEditingRule({
      day_of_week: 1,
      time_slots: [{ start_time: '09:00', end_time: '17:00', is_available: true }],
      is_active: true,
    });
  };

  const handleSaveRule = () => {
    if (!editingRule) return;

    if (editingRule.id) {
      updateMutation.mutate(editingRule);
    } else {
      createMutation.mutate(editingRule);
    }
  };

  const handleEditRule = (rule: any) => {
    setEditingRule({
      id: rule.id,
      day_of_week: rule.day_of_week,
      time_slots: [{ 
        start_time: rule.start_time, 
        end_time: rule.end_time, 
        is_available: rule.is_available 
      }],
      is_active: rule.is_available,
    });
  };

  const updateEditingRule = (field: string, value: any) => {
    if (!editingRule) return;
    
    if (field === 'start_time' || field === 'end_time') {
      setEditingRule({
        ...editingRule,
        time_slots: [{ ...editingRule.time_slots[0], [field]: value }],
      });
    } else {
      setEditingRule({ ...editingRule, [field]: value });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded"></div>
            <div className="space-y-2">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Availability Settings</h2>
          <p className="text-muted-foreground">
            Set your available hours for appointments
          </p>
        </div>
        <Button onClick={handleAddRule}>
          <Plus className="h-4 w-4 mr-2" />
          Add Availability
        </Button>
      </div>

      {/* Current Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {daysOfWeek.map(day => {
              const dayAvailability = availability?.filter(a => a.day_of_week === day.value) || [];
              
              return (
                <div key={day.value} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 font-medium">{day.label}</div>
                    <div className="flex space-x-2">
                      {dayAvailability.length === 0 ? (
                        <Badge variant="secondary">Not Available</Badge>
                      ) : (
                        dayAvailability.map((slot, index) => (
                          <Badge
                            key={index}
                            variant={slot.is_available ? "default" : "secondary"}
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {slot.start_time} - {slot.end_time}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {dayAvailability.map((slot) => (
                      <Button
                        key={slot.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRule(slot)}
                      >
                        Edit
                      </Button>
                    ))}
                    {dayAvailability.length === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRule({
                          day_of_week: day.value,
                          time_slots: [{ start_time: '09:00', end_time: '17:00', is_available: true }],
                          is_active: true,
                        })}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Rule Dialog */}
      {editingRule && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRule.id ? 'Edit' : 'Add'} Availability Rule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={editingRule.day_of_week.toString()}
                  onValueChange={(value) => updateEditingRule('day_of_week', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={editingRule.time_slots[0]?.start_time || '09:00'}
                  onChange={(e) => updateEditingRule('start_time', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={editingRule.time_slots[0]?.end_time || '17:00'}
                  onChange={(e) => updateEditingRule('end_time', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={editingRule.is_active}
                onCheckedChange={(checked) => updateEditingRule('is_active', checked)}
              />
              <Label>Available for appointments</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setEditingRule(null)}
              >
                Cancel
              </Button>
              {editingRule.id && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteMutation.mutate(editingRule.id!);
                    setEditingRule(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button
                onClick={handleSaveRule}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : 'Save Rule'
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};