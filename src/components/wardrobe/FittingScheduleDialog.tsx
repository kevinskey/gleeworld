import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface FittingScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  wardrobeItemId?: string;
  wardrobeItemName?: string;
}

export const FittingScheduleDialog = ({ 
  isOpen, 
  onClose, 
  wardrobeItemId, 
  wardrobeItemName 
}: FittingScheduleDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const timeSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM'
  ];

  useEffect(() => {
    if (isOpen && wardrobeItemName) {
      setNotes(`Fitting appointment for ${wardrobeItemName}`);
    }
  }, [isOpen, wardrobeItemName]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !user) {
      toast({
        title: "Error",
        description: "Please select both date and time for your fitting appointment.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert time to 24-hour format for database
      const [time, meridiem] = selectedTime.split(' ');
      const [hours, minutes] = time.split(':');
      let hour24 = parseInt(hours);
      
      if (meridiem === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (meridiem === 'AM' && hour24 === 12) {
        hour24 = 0;
      }

      // Create appointment date/time
      const appointmentDateTime = new Date(selectedDate);
      appointmentDateTime.setHours(hour24, parseInt(minutes));

      // Create appointment
      const { data: appointment, error } = await supabase
        .from('gw_appointments')
        .insert({
          title: `Wardrobe Fitting - ${wardrobeItemName || 'Costume Fitting'}`,
          description: notes,
          appointment_date: appointmentDateTime.toISOString(),
          duration_minutes: 20,
          appointment_type: 'Wardrobe Fitting',
          client_name: user.user_metadata?.full_name || user.email || 'Member',
          client_email: user.email,
          created_by: user.id,
          status: 'pending_approval'
        })
        .select()
        .single();

      if (error) throw error;

      // Send approval request SMS to wardrobe managers
      console.log('Sending approval request for appointment:', appointment.id);
      const { error: smsError } = await supabase.functions.invoke('send-fitting-approval-request', {
        body: {
          appointmentId: appointment.id,
          clientName: appointment.client_name,
          appointmentDate: new Date(appointment.appointment_date).toLocaleDateString(),
          appointmentTime: new Date(appointment.appointment_date).toLocaleTimeString(),
          notes: appointment.description
        }
      });

      if (smsError) {
        console.error('Failed to send approval request:', smsError);
        // Don't fail the appointment creation, just log the error
      }

      toast({
        title: "Request Submitted",
        description: "Your fitting appointment request has been submitted for approval. You'll receive a text confirmation once it's reviewed.",
      });

      // Reset form
      setSelectedDate(undefined);
      setSelectedTime('');
      setNotes('');
      onClose();

    } catch (error) {
      console.error('Error scheduling fitting:', error);
      toast({
        title: "Error",
        description: "Failed to schedule fitting appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedDate(undefined);
    setSelectedTime('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Schedule Wardrobe Fitting
          </DialogTitle>
          <DialogDescription>
            Book an appointment for your wardrobe fitting session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Preferred Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label>Preferred Time</Label>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific requirements or notes..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !selectedDate || !selectedTime}
              className="flex-1"
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Fitting'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};