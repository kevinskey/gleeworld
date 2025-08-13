import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Send, Calendar, Clock, User } from 'lucide-react';

interface EmailNotificationManagerProps {
  appointment: any;
  onEmailSent?: () => void;
}

type EmailType = 'confirmation' | 'reminder' | 'cancellation' | 'rescheduling';

export const EmailNotificationManager = ({ appointment, onEmailSent }: EmailNotificationManagerProps) => {
  const [emailType, setEmailType] = useState<EmailType>('confirmation');
  const [customMessage, setCustomMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const sendEmailMutation = useMutation({
    mutationFn: async ({ type, message }: { type: EmailType; message?: string }) => {
      const { data, error } = await supabase.functions.invoke('send-appointment-notification', {
        body: {
          appointmentId: appointment.id,
          type: type,
          customMessage: message || undefined,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${emailType} email sent successfully`);
      setIsOpen(false);
      setCustomMessage('');
      onEmailSent?.();
    },
    onError: (error) => {
      console.error('Error sending email:', error);
      toast.error('Failed to send email notification');
    },
  });

  const handleSendEmail = () => {
    if (!appointment.client_email) {
      toast.error('No email address available for this client');
      return;
    }

    sendEmailMutation.mutate({
      type: emailType,
      message: customMessage.trim() || undefined,
    });
  };

  const emailTypeLabels = {
    confirmation: 'Confirmation',
    reminder: 'Reminder',
    cancellation: 'Cancellation',
    rescheduling: 'Rescheduling',
  };

  const emailTypeDescriptions = {
    confirmation: 'Send appointment confirmation to client',
    reminder: 'Send reminder about upcoming appointment',
    cancellation: 'Notify client about appointment cancellation',
    rescheduling: 'Inform client about appointment changes',
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const { date, time } = formatDateTime(appointment.appointment_date);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="h-4 w-4 mr-2" />
          Send Email
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email Notification
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Appointment Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Appointment Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Title:</strong> {appointment.title}</p>
                <p><strong>Client:</strong> {appointment.client_name}</p>
                <p><strong>Email:</strong> {appointment.client_email || 'Not provided'}</p>
              </div>
              <div>
                <p className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <strong>Date:</strong> {date}
                </p>
                <p className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <strong>Time:</strong> {time}
                </p>
                <p><strong>Duration:</strong> {appointment.duration_minutes} minutes</p>
              </div>
            </div>
          </div>

          {/* Email Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="email-type">Email Type</Label>
            <Select
              value={emailType}
              onValueChange={(value: EmailType) => setEmailType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(emailTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground">
                        {emailTypeDescriptions[value as EmailType]}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="custom-message">
              Custom Message <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="custom-message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal message to include in the email..."
              rows={3}
            />
          </div>

          {/* Preview */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h5 className="font-medium text-blue-900 mb-2">Email Preview</h5>
            <p className="text-sm text-blue-800">
              Subject: <strong>
                {emailType === 'confirmation' && `Appointment Confirmed: ${appointment.title}`}
                {emailType === 'reminder' && `Reminder: ${appointment.title} - Tomorrow`}
                {emailType === 'cancellation' && `Appointment Cancelled: ${appointment.title}`}
                {emailType === 'rescheduling' && `Appointment Rescheduled: ${appointment.title}`}
              </strong>
            </p>
            <p className="text-sm text-blue-700 mt-1">
              To: {appointment.client_email || 'No email provided'}
            </p>
            {customMessage && (
              <p className="text-sm text-blue-700 mt-2">
                <strong>Custom message:</strong> {customMessage}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendEmailMutation.isPending || !appointment.client_email}
            >
              {sendEmailMutation.isPending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};