export interface RecipientGroup {
  id: string;
  label: string;
  type: 'role' | 'voice_part' | 'academic_year' | 'special';
  query?: string;
  count?: number;
}

export interface CommunicationChannel {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  variables: string[];
  is_active: boolean;
}

export interface Communication {
  id: string;
  title: string;
  content: string;
  sender_id: string;
  recipient_groups: RecipientGroup[];
  channels: string[];
  total_recipients: number;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_for?: string;
  sent_at?: string;
  template_id?: string;
  delivery_summary: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CommunicationDelivery {
  id: string;
  communication_id: string;
  recipient_id?: string;
  recipient_email: string;
  recipient_name?: string;
  channel: string;
  status: 'pending' | 'sending' | 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked';
  external_id?: string;
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
}

export const RECIPIENT_GROUPS: RecipientGroup[] = [
  // Administrative Roles
  { id: 'doc', label: 'Doc (Super Admin)', type: 'role' },
  { id: 'all_exec_board', label: 'All Executive Board', type: 'role' },
  { id: 'section_leaders', label: 'Section Leaders', type: 'role' },
  { id: 'student_conductor', label: 'Student Conductor', type: 'role' },
  
  // Voice Parts
  { id: 'soprano_1', label: 'Soprano 1', type: 'voice_part' },
  { id: 'soprano_2', label: 'Soprano 2', type: 'voice_part' },
  { id: 'alto_1', label: 'Alto 1', type: 'voice_part' },
  { id: 'alto_2', label: 'Alto 2', type: 'voice_part' },
  
  // Academic Standing
  { id: 'first_years', label: 'First Years', type: 'academic_year' },
  { id: 'sophomores', label: 'Sophomores', type: 'academic_year' },
  { id: 'juniors', label: 'Juniors', type: 'academic_year' },
  { id: 'seniors', label: 'Seniors', type: 'academic_year' },
  
  // Special Groups
  { id: 'alumnae', label: 'Alumnae', type: 'special' },
  { id: 'all_users', label: 'All Users', type: 'special' },
];

export const COMMUNICATION_CHANNELS: CommunicationChannel[] = [
  {
    id: 'email',
    label: 'Email',
    description: 'Individual emails via Resend',
    enabled: true,
  },
  {
    id: 'mass_email',
    label: 'Mass Email',
    description: 'Bulk emails via Elastic Email',
    enabled: true,
  },
  {
    id: 'sms',
    label: 'SMS',
    description: 'Text messages via Twilio',
    enabled: true,
  },
  {
    id: 'in_app',
    label: 'In-App Notification',
    description: 'Notifications within the app',
    enabled: true,
  },
];