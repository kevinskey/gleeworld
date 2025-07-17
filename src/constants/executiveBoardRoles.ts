export const EXECUTIVE_BOARD_ROLES = {
  PRESIDENT: 'president',
  VICE_PRESIDENT: 'vice-president',
  TREASURER: 'treasurer',
  SECRETARY: 'secretary',
  MUSIC_DIRECTOR: 'music-director',
  ASSISTANT_MUSIC_DIRECTOR: 'assistant-music-director',
  SOCIAL_CHAIR: 'social-chair',
  PUBLICITY_CHAIR: 'publicity-chair',
  EVENTS_COORDINATOR: 'events-coordinator',
  HISTORIAN: 'historian',
  LIBRARIAN: 'librarian',
  TECHNICAL_DIRECTOR: 'technical-director',
  FUNDRAISING_CHAIR: 'fundraising-chair',
  ALUMNI_RELATIONS: 'alumni-relations',
  MEMBERSHIP_CHAIR: 'membership-chair',
} as const;

export type ExecutiveBoardRole = typeof EXECUTIVE_BOARD_ROLES[keyof typeof EXECUTIVE_BOARD_ROLES];

export const ROLE_DISPLAY_NAMES: Record<ExecutiveBoardRole, string> = {
  [EXECUTIVE_BOARD_ROLES.PRESIDENT]: 'President',
  [EXECUTIVE_BOARD_ROLES.VICE_PRESIDENT]: 'Vice President',
  [EXECUTIVE_BOARD_ROLES.TREASURER]: 'Treasurer',
  [EXECUTIVE_BOARD_ROLES.SECRETARY]: 'Secretary',
  [EXECUTIVE_BOARD_ROLES.MUSIC_DIRECTOR]: 'Music Director',
  [EXECUTIVE_BOARD_ROLES.ASSISTANT_MUSIC_DIRECTOR]: 'Assistant Music Director',
  [EXECUTIVE_BOARD_ROLES.SOCIAL_CHAIR]: 'Social Chair',
  [EXECUTIVE_BOARD_ROLES.PUBLICITY_CHAIR]: 'Publicity Chair',
  [EXECUTIVE_BOARD_ROLES.EVENTS_COORDINATOR]: 'Events Coordinator',
  [EXECUTIVE_BOARD_ROLES.HISTORIAN]: 'Historian',
  [EXECUTIVE_BOARD_ROLES.LIBRARIAN]: 'Librarian',
  [EXECUTIVE_BOARD_ROLES.TECHNICAL_DIRECTOR]: 'Technical Director',
  [EXECUTIVE_BOARD_ROLES.FUNDRAISING_CHAIR]: 'Fundraising Chair',
  [EXECUTIVE_BOARD_ROLES.ALUMNI_RELATIONS]: 'Alumni Relations',
  [EXECUTIVE_BOARD_ROLES.MEMBERSHIP_CHAIR]: 'Membership Chair',
};

export const ROLE_RESPONSIBILITIES: Record<ExecutiveBoardRole, string> = {
  [EXECUTIVE_BOARD_ROLES.PRESIDENT]: 'Overall leadership, strategic direction, and system oversight',
  [EXECUTIVE_BOARD_ROLES.VICE_PRESIDENT]: 'Support president, backup leadership, special projects',
  [EXECUTIVE_BOARD_ROLES.TREASURER]: 'Financial management, budgets, payments, and financial reporting',
  [EXECUTIVE_BOARD_ROLES.SECRETARY]: 'Meeting minutes, communications, and record keeping',
  [EXECUTIVE_BOARD_ROLES.MUSIC_DIRECTOR]: 'Musical content, sheet music, and performance management',
  [EXECUTIVE_BOARD_ROLES.ASSISTANT_MUSIC_DIRECTOR]: 'Support music director, backup musical leadership',
  [EXECUTIVE_BOARD_ROLES.SOCIAL_CHAIR]: 'Social events, member engagement, and community building',
  [EXECUTIVE_BOARD_ROLES.PUBLICITY_CHAIR]: 'Marketing, social media, and public relations',
  [EXECUTIVE_BOARD_ROLES.EVENTS_COORDINATOR]: 'Event planning, logistics, and execution',
  [EXECUTIVE_BOARD_ROLES.HISTORIAN]: 'Club history, documentation, and archival management',
  [EXECUTIVE_BOARD_ROLES.LIBRARIAN]: 'Sheet music library, music organization, and access',
  [EXECUTIVE_BOARD_ROLES.TECHNICAL_DIRECTOR]: 'Technical setup, audio/visual, and equipment',
  [EXECUTIVE_BOARD_ROLES.FUNDRAISING_CHAIR]: 'Fundraising campaigns, donor relations, and revenue',
  [EXECUTIVE_BOARD_ROLES.ALUMNI_RELATIONS]: 'Alumni engagement, networking, and communication',
  [EXECUTIVE_BOARD_ROLES.MEMBERSHIP_CHAIR]: 'Member recruitment, onboarding, and retention',
};

// Define which dashboard modules each executive board role has access to
export const EXEC_BOARD_MODULE_PERMISSIONS: Record<ExecutiveBoardRole, string[]> = {
  [EXECUTIVE_BOARD_ROLES.PRESIDENT]: [
    'hero_management',
    'dashboard_settings',
    'youtube_management',
    'send_notifications',
    'budget_creation',
    'contracts',
    'send_emails',
    'manage_permissions',
  ],
  [EXECUTIVE_BOARD_ROLES.VICE_PRESIDENT]: [
    'send_notifications',
    'budget_creation',
    'contracts',
    'send_emails',
    'youtube_management',
  ],
  [EXECUTIVE_BOARD_ROLES.TREASURER]: [
    'budget_creation',
    'contracts',
    'send_notifications',
    'send_emails',
  ],
  [EXECUTIVE_BOARD_ROLES.SECRETARY]: [
    'send_notifications',
    'send_emails',
    'contracts',
  ],
  [EXECUTIVE_BOARD_ROLES.MUSIC_DIRECTOR]: [
    'youtube_management',
    'send_notifications',
    'send_emails',
  ],
  [EXECUTIVE_BOARD_ROLES.ASSISTANT_MUSIC_DIRECTOR]: [
    'youtube_management',
    'send_notifications',
  ],
  [EXECUTIVE_BOARD_ROLES.SOCIAL_CHAIR]: [
    'send_notifications',
    'send_emails',
    'budget_creation',
  ],
  [EXECUTIVE_BOARD_ROLES.PUBLICITY_CHAIR]: [
    'hero_management',
    'send_notifications',
    'send_emails',
    'youtube_management',
  ],
  [EXECUTIVE_BOARD_ROLES.EVENTS_COORDINATOR]: [
    'budget_creation',
    'contracts',
    'send_notifications',
    'send_emails',
  ],
  [EXECUTIVE_BOARD_ROLES.HISTORIAN]: [
    'youtube_management',
    'send_notifications',
  ],
  [EXECUTIVE_BOARD_ROLES.LIBRARIAN]: [
    'send_notifications',
  ],
  [EXECUTIVE_BOARD_ROLES.TECHNICAL_DIRECTOR]: [
    'dashboard_settings',
    'youtube_management',
    'send_notifications',
  ],
  [EXECUTIVE_BOARD_ROLES.FUNDRAISING_CHAIR]: [
    'budget_creation',
    'send_notifications',
    'send_emails',
  ],
  [EXECUTIVE_BOARD_ROLES.ALUMNI_RELATIONS]: [
    'send_notifications',
    'send_emails',
  ],
  [EXECUTIVE_BOARD_ROLES.MEMBERSHIP_CHAIR]: [
    'send_notifications',
    'send_emails',
  ],
};

// Role hierarchy for inheritance (higher roles can act with permissions of lower roles)
export const ROLE_HIERARCHY: Record<ExecutiveBoardRole, ExecutiveBoardRole[]> = {
  [EXECUTIVE_BOARD_ROLES.PRESIDENT]: [
    EXECUTIVE_BOARD_ROLES.VICE_PRESIDENT,
    EXECUTIVE_BOARD_ROLES.TREASURER,
    EXECUTIVE_BOARD_ROLES.SECRETARY,
  ],
  [EXECUTIVE_BOARD_ROLES.VICE_PRESIDENT]: [
    EXECUTIVE_BOARD_ROLES.SECRETARY,
  ],
  [EXECUTIVE_BOARD_ROLES.MUSIC_DIRECTOR]: [
    EXECUTIVE_BOARD_ROLES.ASSISTANT_MUSIC_DIRECTOR,
    EXECUTIVE_BOARD_ROLES.LIBRARIAN,
  ],
  [EXECUTIVE_BOARD_ROLES.TREASURER]: [],
  [EXECUTIVE_BOARD_ROLES.SECRETARY]: [],
  [EXECUTIVE_BOARD_ROLES.ASSISTANT_MUSIC_DIRECTOR]: [],
  [EXECUTIVE_BOARD_ROLES.SOCIAL_CHAIR]: [],
  [EXECUTIVE_BOARD_ROLES.PUBLICITY_CHAIR]: [],
  [EXECUTIVE_BOARD_ROLES.EVENTS_COORDINATOR]: [],
  [EXECUTIVE_BOARD_ROLES.HISTORIAN]: [],
  [EXECUTIVE_BOARD_ROLES.LIBRARIAN]: [],
  [EXECUTIVE_BOARD_ROLES.TECHNICAL_DIRECTOR]: [],
  [EXECUTIVE_BOARD_ROLES.FUNDRAISING_CHAIR]: [],
  [EXECUTIVE_BOARD_ROLES.ALUMNI_RELATIONS]: [],
  [EXECUTIVE_BOARD_ROLES.MEMBERSHIP_CHAIR]: [],
};

// Quick actions for each role
export const ROLE_QUICK_ACTIONS: Record<ExecutiveBoardRole, Array<{
  action: string;
  label: string;
  description: string;
}>> = {
  [EXECUTIVE_BOARD_ROLES.PRESIDENT]: [
    { action: 'manage_permissions', label: 'Manage Permissions', description: 'Assign module access to members' },
    { action: 'system_overview', label: 'System Overview', description: 'View system health and metrics' },
    { action: 'send_announcements', label: 'Send Announcements', description: 'Communicate with all members' },
  ],
  [EXECUTIVE_BOARD_ROLES.VICE_PRESIDENT]: [
    { action: 'create_budget', label: 'Create Budget', description: 'Set up new project budget' },
    { action: 'schedule_event', label: 'Schedule Event', description: 'Plan upcoming events' },
    { action: 'send_notifications', label: 'Send Notifications', description: 'Notify members about updates' },
  ],
  [EXECUTIVE_BOARD_ROLES.TREASURER]: [
    { action: 'create_budget', label: 'Create Budget', description: 'Set up financial budgets' },
    { action: 'track_payments', label: 'Track Payments', description: 'Monitor financial transactions' },
    { action: 'financial_reports', label: 'Financial Reports', description: 'Generate financial summaries' },
  ],
  [EXECUTIVE_BOARD_ROLES.SECRETARY]: [
    { action: 'send_emails', label: 'Send Emails', description: 'Email club communications' },
    { action: 'create_contracts', label: 'Create Contracts', description: 'Draft member agreements' },
    { action: 'member_records', label: 'Member Records', description: 'Maintain member information' },
  ],
  [EXECUTIVE_BOARD_ROLES.MUSIC_DIRECTOR]: [
    { action: 'schedule_rehearsal', label: 'Schedule Rehearsal', description: 'Plan practice sessions' },
  ],
  [EXECUTIVE_BOARD_ROLES.ASSISTANT_MUSIC_DIRECTOR]: [
    { action: 'manage_sections', label: 'Manage Sections', description: 'Coordinate voice parts' },
  ],
  [EXECUTIVE_BOARD_ROLES.SOCIAL_CHAIR]: [
    { action: 'plan_social_event', label: 'Plan Social Event', description: 'Organize member gatherings' },
    { action: 'send_invitations', label: 'Send Invitations', description: 'Invite members to events' },
  ],
  [EXECUTIVE_BOARD_ROLES.PUBLICITY_CHAIR]: [
    { action: 'update_homepage', label: 'Update Homepage', description: 'Manage hero content' },
    { action: 'social_media', label: 'Social Media', description: 'Post announcements' },
    { action: 'promotional_content', label: 'Promotional Content', description: 'Create marketing materials' },
  ],
  [EXECUTIVE_BOARD_ROLES.EVENTS_COORDINATOR]: [
    { action: 'schedule_event', label: 'Schedule Event', description: 'Plan and organize events' },
    { action: 'event_budget', label: 'Event Budget', description: 'Create event budgets' },
    { action: 'event_contracts', label: 'Event Contracts', description: 'Manage event agreements' },
  ],
  [EXECUTIVE_BOARD_ROLES.HISTORIAN]: [
    { action: 'archive_content', label: 'Archive Content', description: 'Preserve club history' },
    { action: 'youtube_archive', label: 'YouTube Archive', description: 'Organize video history' },
  ],
  [EXECUTIVE_BOARD_ROLES.LIBRARIAN]: [
    { action: 'manage_resources', label: 'Manage Resources', description: 'Organize materials' },
  ],
  [EXECUTIVE_BOARD_ROLES.TECHNICAL_DIRECTOR]: [
    { action: 'system_settings', label: 'System Settings', description: 'Configure technical settings' },
    { action: 'dashboard_config', label: 'Dashboard Config', description: 'Customize dashboard appearance' },
  ],
  [EXECUTIVE_BOARD_ROLES.FUNDRAISING_CHAIR]: [
    { action: 'fundraising_budget', label: 'Fundraising Budget', description: 'Plan fundraising campaigns' },
    { action: 'donor_outreach', label: 'Donor Outreach', description: 'Contact potential donors' },
  ],
  [EXECUTIVE_BOARD_ROLES.ALUMNI_RELATIONS]: [
    { action: 'alumni_outreach', label: 'Alumni Outreach', description: 'Connect with alumni' },
    { action: 'alumni_events', label: 'Alumni Events', description: 'Plan alumni gatherings' },
  ],
  [EXECUTIVE_BOARD_ROLES.MEMBERSHIP_CHAIR]: [
    { action: 'member_recruitment', label: 'Member Recruitment', description: 'Recruit new members' },
    { action: 'member_onboarding', label: 'Member Onboarding', description: 'Welcome new members' },
  ],
};