import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, User, Phone, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PendingAppointment {
  id: string;
  title: string;
  appointment_date: string;
  duration_minutes: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  notes: string | null;
  description: string | null;
  created_at: string;
}

export const AppointmentApprovalHandler = () => {
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<PendingAppointment | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'deny' | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingAppointments();
  }, []);

  const fetchPendingAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_appointments')
        .select('*')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingAppointments(data || []);
    } catch (error) {
      console.error('Error fetching pending appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load pending appointments",
        variant: "destructive"
      });
    }
  };

  const handleAction = async (appointment: PendingAppointment, action: 'approve' | 'deny') => {
    setSelectedAppointment(appointment);
    setActionType(action);
  };

  const confirmAction = async () => {
    if (!selectedAppointment || !actionType) return;

    setLoading(true);
    try {
      const newStatus = actionType === 'approve' ? 'confirmed' : 'cancelled';
      
      // Update appointment status
      const { error: updateError } = await supabase
        .from('gw_appointments')
        .update({ 
          status: newStatus,
          notes: reason || selectedAppointment.notes
        })
        .eq('id', selectedAppointment.id);

      if (updateError) throw updateError;

      // Send notification to client
      const message = actionType === 'approve' 
        ? `Great news! Your appointment for ${format(new Date(selectedAppointment.appointment_date), 'PPP')} at ${format(new Date(selectedAppointment.appointment_date), 'h:mm a')} has been APPROVED. Please arrive 5 minutes early. Payment will be collected in person.`
        : `Your appointment request for ${format(new Date(selectedAppointment.appointment_date), 'PPP')} has been declined. ${reason ? `Reason: ${reason}` : 'Please contact us to reschedule.'}`;

      // Send SMS notification
      try {
        await supabase.functions.invoke('gw-send-sms', {
          body: {
            to: selectedAppointment.client_phone,
            message
          }
        });
      } catch (smsError) {
        console.error('SMS sending failed:', smsError);
      }

      // Send email notification
      try {
        await supabase.functions.invoke('gw-send-email', {
          body: {
            to: selectedAppointment.client_email,
            subject: `Appointment ${actionType === 'approve' ? 'Confirmed' : 'Update'}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Appointment ${actionType === 'approve' ? 'Confirmed' : 'Update'}</h2>
                <p>Dear ${selectedAppointment.client_name},</p>
                <p>${message}</p>
                ${actionType === 'approve' ? `
                  <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Appointment Details:</h3>
                    <p><strong>Date:</strong> ${format(new Date(selectedAppointment.appointment_date), 'PPP')}</p>
                    <p><strong>Time:</strong> ${format(new Date(selectedAppointment.appointment_date), 'h:mm a')}</p>
                    <p><strong>Duration:</strong> ${selectedAppointment.duration_minutes} minutes</p>
                    <p><strong>Type:</strong> ${selectedAppointment.title}</p>
                  </div>
                ` : ''}
                <p>Best regards,<br>The Glee World Team</p>
              </div>
            `
          }
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }

      toast({
        title: "Success",
        description: `Appointment ${actionType === 'approve' ? 'approved' : 'denied'} and client notified`,
      });

      // Refresh the list
      fetchPendingAppointments();
      
      // Close dialog
      setSelectedAppointment(null);
      setActionType(null);
      setReason("");

    } catch (error) {
      console.error('Error processing appointment:', error);
      toast({
        title: "Error",
        description: "Failed to process appointment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Approvals ({pendingAppointments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No pending appointments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingAppointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{appointment.client_name}</h3>
                      <p className="text-sm text-muted-foreground">{appointment.title}</p>
                    </div>
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{format(new Date(appointment.appointment_date), 'PPP p')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{appointment.client_phone}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{appointment.client_email}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Duration: {appointment.duration_minutes} minutes
                      </div>
                    </div>
                  </div>

                  {appointment.description && (
                    <div className="bg-muted p-3 rounded">
                      <p className="text-sm font-medium mb-1">Purpose:</p>
                      <p className="text-sm">{appointment.description}</p>
                    </div>
                  )}

                  {appointment.notes && (
                    <div className="bg-muted p-3 rounded">
                      <p className="text-sm font-medium mb-1">Notes:</p>
                      <p className="text-sm">{appointment.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleAction(appointment, 'approve')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(appointment, 'deny')}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => {
        setSelectedAppointment(null);
        setActionType(null);
        setReason("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Appointment' : 'Deny Appointment'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold">{selectedAppointment.client_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedAppointment.appointment_date), 'PPP p')}
                </p>
              </div>

              {actionType === 'deny' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Reason for denial (optional)
                  </label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide a reason for declining this appointment..."
                    className="resize-none"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedAppointment(null);
                    setActionType(null);
                    setReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAction}
                  disabled={loading}
                  className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                  variant={actionType === 'deny' ? 'destructive' : 'default'}
                >
                  {loading ? 'Processing...' : `Confirm ${actionType === 'approve' ? 'Approval' : 'Denial'}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};