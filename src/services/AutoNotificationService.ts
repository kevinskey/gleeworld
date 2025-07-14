import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

export interface AutoNotificationOptions {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  category?: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: number;
  sendEmail?: boolean;
  sendSms?: boolean;
  metadata?: any;
}

export const AutoNotificationService = {
  // Contract-related notifications
  async notifyContractCreated(contractId: string, recipientEmail: string, contractTitle: string) {
    const { data: profile } = await supabase
      .from('gw_profiles')
      .select('user_id, full_name')
      .eq('email', recipientEmail)
      .single();

    if (profile?.user_id) {
      await this.sendNotification({
        userId: profile.user_id,
        title: 'New Contract Available',
        message: `You have a new contract to review: ${contractTitle}`,
        type: 'info',
        category: 'contract',
        actionUrl: `/contract-signing/${contractId}`,
        actionLabel: 'View Contract',
        sendEmail: true,
        metadata: { contractId, contractTitle }
      });
    }
  },

  async notifyContractSigned(contractId: string, signerName: string, adminUsers: string[]) {
    for (const adminUserId of adminUsers) {
      await this.sendNotification({
        userId: adminUserId,
        title: 'Contract Signed',
        message: `${signerName} has signed a contract and it's ready for admin review`,
        type: 'success',
        category: 'contract',
        actionUrl: `/admin-signing`,
        actionLabel: 'Review Contract',
        sendEmail: true,
        metadata: { contractId, signerName }
      });
    }
  },

  // Attendance-related notifications
  async notifyAttendanceMarked(eventId: string, userId: string, status: string) {
    const { data: event } = await supabase
      .from('gw_events')
      .select('title, created_by')
      .eq('id', eventId)
      .single();

    if (event?.created_by) {
      await this.sendNotification({
        userId: event.created_by,
        title: 'Attendance Updated',
        message: `Attendance has been marked as ${status} for event: ${event.title}`,
        type: 'info',
        category: 'attendance',
        actionUrl: `/attendance`,
        actionLabel: 'View Attendance',
        metadata: { eventId, userId, status }
      });
    }
  },

  async notifyExcuseRequested(eventId: string, userId: string, reason: string) {
    // Notify admins about excuse requests
    const { data: admins } = await supabase
      .from('gw_profiles')
      .select('user_id, full_name')
      .or('is_admin.eq.true,is_super_admin.eq.true');

    const { data: event } = await supabase
      .from('gw_events')
      .select('title')
      .eq('id', eventId)
      .single();

    const { data: user } = await supabase
      .from('gw_profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    if (admins && event && user) {
      for (const admin of admins) {
        if (admin.user_id) {
          await this.sendNotification({
            userId: admin.user_id,
            title: 'Excuse Request Submitted',
            message: `${user.full_name} has requested an excuse for ${event.title}: ${reason}`,
            type: 'warning',
            category: 'attendance',
            actionUrl: `/attendance`,
            actionLabel: 'Review Request',
            sendEmail: true,
            metadata: { eventId, userId, reason }
          });
        }
      }
    }
  },

  // Event-related notifications
  async notifyEventCreated(eventId: string, eventTitle: string, eventDate: string) {
    // Notify all members about new events
    const { data: members } = await supabase
      .from('gw_profiles')
      .select('user_id');

    if (members) {
      for (const member of members) {
        if (member.user_id) {
          await this.sendNotification({
            userId: member.user_id,
            title: 'New Event Created',
            message: `A new event has been scheduled: ${eventTitle} on ${new Date(eventDate).toLocaleDateString()}`,
            type: 'info',
            category: 'event',
            actionUrl: `/calendar`,
            actionLabel: 'View Calendar',
            metadata: { eventId, eventTitle, eventDate }
          });
        }
      }
    }
  },

  async notifyEventReminder(eventId: string, eventTitle: string, eventDate: string) {
    // Get event participants
    const { data: participants } = await supabase
      .from('gw_event_rsvps')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'attending');

    if (participants) {
      for (const participant of participants) {
        if (participant.user_id) {
          await this.sendNotification({
            userId: participant.user_id,
            title: 'Event Reminder',
            message: `Reminder: ${eventTitle} is tomorrow at ${new Date(eventDate).toLocaleTimeString()}`,
            type: 'info',
            category: 'event',
            actionUrl: `/calendar`,
            actionLabel: 'View Details',
            sendEmail: true,
            sendSms: true,
            metadata: { eventId, eventTitle, eventDate }
          });
        }
      }
    }
  },

  // Payment-related notifications
  async notifyPaymentReceived(userId: string, amount: number, description: string) {
    await this.sendNotification({
      userId,
      title: 'Payment Received',
      message: `Your payment of $${amount} for ${description} has been received`,
      type: 'success',
      category: 'payment',
      actionUrl: `/payments`,
      actionLabel: 'View Payments',
      sendEmail: true,
      metadata: { amount, description }
    });
  },

  async notifyPaymentDue(userId: string, amount: number, description: string, dueDate: string) {
    await this.sendNotification({
      userId,
      title: 'Payment Due',
      message: `Payment of $${amount} for ${description} is due on ${new Date(dueDate).toLocaleDateString()}`,
      type: 'warning',
      category: 'payment',
      actionUrl: `/payments`,
      actionLabel: 'Make Payment',
      sendEmail: true,
      sendSms: true,
      priority: 1,
      metadata: { amount, description, dueDate }
    });
  },

  // Generic notification sender
  async sendNotification(options: AutoNotificationOptions) {
    try {
      const { data, error } = await supabase.rpc('create_notification_with_delivery', {
        p_user_id: options.userId,
        p_title: options.title,
        p_message: options.message,
        p_type: options.type || 'info',
        p_category: options.category || 'general',
        p_action_url: options.actionUrl || null,
        p_action_label: options.actionLabel || null,
        p_metadata: options.metadata || {},
        p_priority: options.priority || 0,
        p_expires_at: null,
        p_send_email: options.sendEmail || false,
        p_send_sms: options.sendSms || false
      });

      if (error) {
        console.error('Error sending notification:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in sendNotification:', error);
      return null;
    }
  }
};

export default AutoNotificationService;