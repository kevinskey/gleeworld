export const EXECUTIVE_BOARD_ROLES = {
  // Artistic Leadership
  STUDENT_CONDUCTOR: 'student-conductor',
  SOPRANO_1_SECTION_LEADER: 'soprano-1-section-leader',
  SOPRANO_2_SECTION_LEADER: 'soprano-2-section-leader',
  ALTO_1_SECTION_LEADER: 'alto-1-section-leader',
  ALTO_2_SECTION_LEADER: 'alto-2-section-leader',
  
  // Managing Leadership / Executive Officers
  PRESIDENT: 'president',
  VICE_PRESIDENT: 'vice-president',
  SECRETARY: 'secretary',
  TREASURER: 'treasurer',
  TOUR_MANAGER: 'tour-manager',
  ROAD_MANAGER: 'road-manager',
  MERCHANDISE_MANAGER: 'merchandise-manager',
  PUBLIC_RELATIONS_COORDINATOR: 'public-relations-coordinator',
  PUBLIC_RELATIONS_CO_MANAGER_1: 'public-relations-co-manager-1',
  PUBLIC_RELATIONS_CO_MANAGER_2: 'public-relations-co-manager-2',
  HISTORIAN: 'historian',
  ALUMNAE_LIAISON: 'alumnae-liaison',
  ALUMNAE_CORRESPONDENT: 'alumnae-correspondent',
  CO_LIBRARIAN_1: 'co-librarian-1',
  CO_LIBRARIAN_2: 'co-librarian-2',
  CO_WARDROBE_MISTRESS_1: 'co-wardrobe-mistress-1',
  CO_WARDROBE_MISTRESS_2: 'co-wardrobe-mistress-2',
  CHAPLAIN: 'chaplain',
  SET_UP_CREW_MANAGER: 'set-up-crew-manager',
  STAGE_MANAGER: 'stage-manager',
  CHIEF_OF_STAFF: 'chief-of-staff',
  DATA_ANALYST: 'data-analyst',
} as const;

export type ExecutiveBoardRole = typeof EXECUTIVE_BOARD_ROLES[keyof typeof EXECUTIVE_BOARD_ROLES];

export const ROLE_DISPLAY_NAMES: Record<ExecutiveBoardRole, string> = {
  // Artistic Leadership
  [EXECUTIVE_BOARD_ROLES.STUDENT_CONDUCTOR]: 'Student Conductor',
  [EXECUTIVE_BOARD_ROLES.SOPRANO_1_SECTION_LEADER]: 'Soprano 1 Section Leader',
  [EXECUTIVE_BOARD_ROLES.SOPRANO_2_SECTION_LEADER]: 'Soprano 2 Section Leader',
  [EXECUTIVE_BOARD_ROLES.ALTO_1_SECTION_LEADER]: 'Alto 1 Section Leader',
  [EXECUTIVE_BOARD_ROLES.ALTO_2_SECTION_LEADER]: 'Alto 2 Section Leader',
  
  // Managing Leadership / Executive Officers
  [EXECUTIVE_BOARD_ROLES.PRESIDENT]: 'President',
  [EXECUTIVE_BOARD_ROLES.VICE_PRESIDENT]: 'Vice President',
  [EXECUTIVE_BOARD_ROLES.SECRETARY]: 'Secretary',
  [EXECUTIVE_BOARD_ROLES.TREASURER]: 'Treasurer',
  [EXECUTIVE_BOARD_ROLES.TOUR_MANAGER]: 'Tour Manager',
  [EXECUTIVE_BOARD_ROLES.ROAD_MANAGER]: 'Road Manager',
  [EXECUTIVE_BOARD_ROLES.MERCHANDISE_MANAGER]: 'Merchandise Manager',
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_COORDINATOR]: 'Public Relations Coordinator',
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_CO_MANAGER_1]: 'Public Relations Co-Manager 1',
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_CO_MANAGER_2]: 'Public Relations Co-Manager 2',
  [EXECUTIVE_BOARD_ROLES.HISTORIAN]: 'Historian',
  [EXECUTIVE_BOARD_ROLES.ALUMNAE_LIAISON]: 'Alumnae Liaison',
  [EXECUTIVE_BOARD_ROLES.ALUMNAE_CORRESPONDENT]: 'Alumnae Correspondent',
  [EXECUTIVE_BOARD_ROLES.CO_LIBRARIAN_1]: 'Co-Librarian 1',
  [EXECUTIVE_BOARD_ROLES.CO_LIBRARIAN_2]: 'Co-Librarian 2',
  [EXECUTIVE_BOARD_ROLES.CO_WARDROBE_MISTRESS_1]: 'Co-Wardrobe Mistress 1',
  [EXECUTIVE_BOARD_ROLES.CO_WARDROBE_MISTRESS_2]: 'Co-Wardrobe Mistress 2',
  [EXECUTIVE_BOARD_ROLES.CHAPLAIN]: 'Chaplain',
  [EXECUTIVE_BOARD_ROLES.SET_UP_CREW_MANAGER]: 'Set-Up Crew Manager',
  [EXECUTIVE_BOARD_ROLES.STAGE_MANAGER]: 'Stage Manager',
  [EXECUTIVE_BOARD_ROLES.CHIEF_OF_STAFF]: 'Chief of Staff',
  [EXECUTIVE_BOARD_ROLES.DATA_ANALYST]: 'Data Analyst',
};

export const ROLE_RESPONSIBILITIES: Record<ExecutiveBoardRole, string> = {
  // Artistic Leadership
  [EXECUTIVE_BOARD_ROLES.STUDENT_CONDUCTOR]: 'Lead musical direction, conduct rehearsals and performances',
  [EXECUTIVE_BOARD_ROLES.SOPRANO_1_SECTION_LEADER]: 'Lead soprano 1 section, coordinate voice part activities',
  [EXECUTIVE_BOARD_ROLES.SOPRANO_2_SECTION_LEADER]: 'Lead soprano 2 section, coordinate voice part activities',
  [EXECUTIVE_BOARD_ROLES.ALTO_1_SECTION_LEADER]: 'Lead alto 1 section, coordinate voice part activities',
  [EXECUTIVE_BOARD_ROLES.ALTO_2_SECTION_LEADER]: 'Lead alto 2 section, coordinate voice part activities',
  
  // Managing Leadership / Executive Officers
  [EXECUTIVE_BOARD_ROLES.PRESIDENT]: 'Overall leadership, strategic direction, and system oversight',
  [EXECUTIVE_BOARD_ROLES.VICE_PRESIDENT]: 'Support president, backup leadership, special projects',
  [EXECUTIVE_BOARD_ROLES.SECRETARY]: 'Meeting minutes, communications, and record keeping',
  [EXECUTIVE_BOARD_ROLES.TREASURER]: 'Financial management, budgets, payments, and financial reporting',
  [EXECUTIVE_BOARD_ROLES.TOUR_MANAGER]: 'Coordinate tours, travel arrangements, and logistics',
  [EXECUTIVE_BOARD_ROLES.ROAD_MANAGER]: 'Manage equipment, transportation, and on-site logistics',
  [EXECUTIVE_BOARD_ROLES.MERCHANDISE_MANAGER]: 'Oversee merchandise sales, inventory, and fulfillment',
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_COORDINATOR]: 'Lead marketing, social media, and public relations',
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_CO_MANAGER_1]: 'Support PR coordinator, assist with marketing initiatives',
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_CO_MANAGER_2]: 'Support PR coordinator, assist with marketing initiatives',
  [EXECUTIVE_BOARD_ROLES.HISTORIAN]: 'Club history, documentation, and archival management',
  [EXECUTIVE_BOARD_ROLES.ALUMNAE_LIAISON]: 'Primary connection with alumnae community',
  [EXECUTIVE_BOARD_ROLES.ALUMNAE_CORRESPONDENT]: 'Manage alumnae communications and newsletters',
  [EXECUTIVE_BOARD_ROLES.CO_LIBRARIAN_1]: 'Organize and manage sheet music library',
  [EXECUTIVE_BOARD_ROLES.CO_LIBRARIAN_2]: 'Organize and manage sheet music library',
  [EXECUTIVE_BOARD_ROLES.CO_WARDROBE_MISTRESS_1]: 'Manage performance attire and wardrobe coordination',
  [EXECUTIVE_BOARD_ROLES.CO_WARDROBE_MISTRESS_2]: 'Manage performance attire and wardrobe coordination',
  [EXECUTIVE_BOARD_ROLES.CHAPLAIN]: 'Spiritual guidance, reflection, and member support',
  [EXECUTIVE_BOARD_ROLES.SET_UP_CREW_MANAGER]: 'Coordinate stage and equipment setup for performances',
  [EXECUTIVE_BOARD_ROLES.STAGE_MANAGER]: 'Manage performance logistics and backstage coordination',
  [EXECUTIVE_BOARD_ROLES.CHIEF_OF_STAFF]: 'Administrative operations, system management, and executive support - has admin-level access to all systems',
  [EXECUTIVE_BOARD_ROLES.DATA_ANALYST]: 'Analyze club data, metrics, and provide insights for decision-making',
};

// Define which dashboard modules each executive board role has access to
export const EXEC_BOARD_MODULE_PERMISSIONS: Record<ExecutiveBoardRole, string[]> = {
  // Artistic Leadership
  [EXECUTIVE_BOARD_ROLES.STUDENT_CONDUCTOR]: ['youtube_management', 'send_emails', 'handbook'],
  [EXECUTIVE_BOARD_ROLES.SOPRANO_1_SECTION_LEADER]: ['send_emails', 'handbook'],
  [EXECUTIVE_BOARD_ROLES.SOPRANO_2_SECTION_LEADER]: ['send_emails', 'handbook'],
  [EXECUTIVE_BOARD_ROLES.ALTO_1_SECTION_LEADER]: ['send_emails', 'handbook'],
  [EXECUTIVE_BOARD_ROLES.ALTO_2_SECTION_LEADER]: ['send_emails', 'handbook'],
  
  // Managing Leadership / Executive Officers
  [EXECUTIVE_BOARD_ROLES.PRESIDENT]: [
    'hero_management',
    'dashboard_settings',
    'youtube_management',
    'budget_creation',
    'contracts',
    'send_emails',
    'manage_permissions',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.VICE_PRESIDENT]: [
    'budget_creation',
    'contracts',
    'send_emails',
    'youtube_management',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.SECRETARY]: [
    'send_emails',
    'contracts',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.TREASURER]: [
    'budget_creation',
    'contracts',
    'send_emails',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.TOUR_MANAGER]: [
    'budget_creation',
    'contracts',
    'send_emails',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.ROAD_MANAGER]: [
    'send_emails',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.MERCHANDISE_MANAGER]: [
    'budget_creation',
    'send_emails',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_COORDINATOR]: [
    'hero_management',
    'send_emails',
    'youtube_management',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_CO_MANAGER_1]: [
    'hero_management',
    'send_emails',
    'youtube_management',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_CO_MANAGER_2]: [
    'hero_management',
    'send_emails',
    'youtube_management',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.HISTORIAN]: [
    'youtube_management',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.ALUMNAE_LIAISON]: [
    'send_emails',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.ALUMNAE_CORRESPONDENT]: [
    'send_emails',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.CO_LIBRARIAN_1]: ['handbook'],
  [EXECUTIVE_BOARD_ROLES.CO_LIBRARIAN_2]: ['handbook'],
  [EXECUTIVE_BOARD_ROLES.CO_WARDROBE_MISTRESS_1]: ['handbook'],
  [EXECUTIVE_BOARD_ROLES.CO_WARDROBE_MISTRESS_2]: ['handbook'],
  [EXECUTIVE_BOARD_ROLES.CHAPLAIN]: [
    'send_emails',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.SET_UP_CREW_MANAGER]: [
    'dashboard_settings',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.STAGE_MANAGER]: [
    'dashboard_settings',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.CHIEF_OF_STAFF]: [
    'hero_management',
    'dashboard_settings',
    'youtube_management',
    'budget_creation',
    'contracts',
    'send_emails',
    'manage_permissions',
    'admin_panel',
    'user_management',
    'system_settings',
    'handbook',
  ],
  [EXECUTIVE_BOARD_ROLES.DATA_ANALYST]: [
    'dashboard_settings',
    'handbook',
  ],
};

// Role hierarchy for inheritance (higher roles can act with permissions of lower roles)
export const ROLE_HIERARCHY: Record<ExecutiveBoardRole, ExecutiveBoardRole[]> = {
  [EXECUTIVE_BOARD_ROLES.PRESIDENT]: [
    EXECUTIVE_BOARD_ROLES.VICE_PRESIDENT,
    EXECUTIVE_BOARD_ROLES.CHIEF_OF_STAFF,
    EXECUTIVE_BOARD_ROLES.TREASURER,
    EXECUTIVE_BOARD_ROLES.SECRETARY,
  ],
  [EXECUTIVE_BOARD_ROLES.VICE_PRESIDENT]: [
    EXECUTIVE_BOARD_ROLES.SECRETARY,
  ],
  [EXECUTIVE_BOARD_ROLES.CHIEF_OF_STAFF]: [
    EXECUTIVE_BOARD_ROLES.TREASURER,
    EXECUTIVE_BOARD_ROLES.SECRETARY,
  ],
  [EXECUTIVE_BOARD_ROLES.STUDENT_CONDUCTOR]: [
    EXECUTIVE_BOARD_ROLES.SOPRANO_1_SECTION_LEADER,
    EXECUTIVE_BOARD_ROLES.SOPRANO_2_SECTION_LEADER,
    EXECUTIVE_BOARD_ROLES.ALTO_1_SECTION_LEADER,
    EXECUTIVE_BOARD_ROLES.ALTO_2_SECTION_LEADER,
  ],
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_COORDINATOR]: [
    EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_CO_MANAGER_1,
    EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_CO_MANAGER_2,
  ],
  [EXECUTIVE_BOARD_ROLES.ALUMNAE_LIAISON]: [
    EXECUTIVE_BOARD_ROLES.ALUMNAE_CORRESPONDENT,
  ],
  // All other roles with no hierarchy
  [EXECUTIVE_BOARD_ROLES.SOPRANO_1_SECTION_LEADER]: [],
  [EXECUTIVE_BOARD_ROLES.SOPRANO_2_SECTION_LEADER]: [],
  [EXECUTIVE_BOARD_ROLES.ALTO_1_SECTION_LEADER]: [],
  [EXECUTIVE_BOARD_ROLES.ALTO_2_SECTION_LEADER]: [],
  [EXECUTIVE_BOARD_ROLES.SECRETARY]: [],
  [EXECUTIVE_BOARD_ROLES.TREASURER]: [],
  [EXECUTIVE_BOARD_ROLES.TOUR_MANAGER]: [],
  [EXECUTIVE_BOARD_ROLES.ROAD_MANAGER]: [],
  [EXECUTIVE_BOARD_ROLES.MERCHANDISE_MANAGER]: [],
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_CO_MANAGER_1]: [],
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_CO_MANAGER_2]: [],
  [EXECUTIVE_BOARD_ROLES.HISTORIAN]: [],
  [EXECUTIVE_BOARD_ROLES.ALUMNAE_CORRESPONDENT]: [],
  [EXECUTIVE_BOARD_ROLES.CO_LIBRARIAN_1]: [],
  [EXECUTIVE_BOARD_ROLES.CO_LIBRARIAN_2]: [],
  [EXECUTIVE_BOARD_ROLES.CO_WARDROBE_MISTRESS_1]: [],
  [EXECUTIVE_BOARD_ROLES.CO_WARDROBE_MISTRESS_2]: [],
  [EXECUTIVE_BOARD_ROLES.CHAPLAIN]: [],
  [EXECUTIVE_BOARD_ROLES.SET_UP_CREW_MANAGER]: [],
  [EXECUTIVE_BOARD_ROLES.STAGE_MANAGER]: [],
  [EXECUTIVE_BOARD_ROLES.DATA_ANALYST]: [],
};

// Quick actions for each role
export const ROLE_QUICK_ACTIONS: Record<ExecutiveBoardRole, Array<{
  action: string;
  label: string;
  description: string;
}>> = {
  // Artistic Leadership
  [EXECUTIVE_BOARD_ROLES.STUDENT_CONDUCTOR]: [
    { action: 'schedule_rehearsal', label: 'Schedule Rehearsal', description: 'Plan practice sessions' },
    { action: 'manage_music', label: 'Manage Music', description: 'Organize sheet music and repertoire' },
  ],
  [EXECUTIVE_BOARD_ROLES.SOPRANO_1_SECTION_LEADER]: [
    { action: 'section_meeting', label: 'Section Meeting', description: 'Coordinate with section members' },
  ],
  [EXECUTIVE_BOARD_ROLES.SOPRANO_2_SECTION_LEADER]: [
    { action: 'section_meeting', label: 'Section Meeting', description: 'Coordinate with section members' },
  ],
  [EXECUTIVE_BOARD_ROLES.ALTO_1_SECTION_LEADER]: [
    { action: 'section_meeting', label: 'Section Meeting', description: 'Coordinate with section members' },
  ],
  [EXECUTIVE_BOARD_ROLES.ALTO_2_SECTION_LEADER]: [
    { action: 'section_meeting', label: 'Section Meeting', description: 'Coordinate with section members' },
  ],
  
  // Managing Leadership / Executive Officers
  [EXECUTIVE_BOARD_ROLES.PRESIDENT]: [
    { action: 'create_event', label: 'Create Event', description: 'Create new events' },
    { action: 'create_budget', label: 'Create Budget', description: 'Create new budgets' },
    { action: 'create_event_with_budget', label: 'Create Event with Budget', description: 'Create event and budget together' },
    { action: 'manage_permissions', label: 'Manage Permissions', description: 'Assign module access to members' },
    { action: 'system_overview', label: 'System Overview', description: 'View system health and metrics' },
    { action: 'send_announcements', label: 'Send Announcements', description: 'Communicate with all members' },
  ],
  [EXECUTIVE_BOARD_ROLES.VICE_PRESIDENT]: [
    { action: 'create_event', label: 'Create Event', description: 'Create new events' },
    { action: 'create_budget', label: 'Create Budget', description: 'Set up new project budget' },
    { action: 'create_event_with_budget', label: 'Create Event with Budget', description: 'Create event and budget together' },
    { action: 'schedule_event', label: 'Schedule Event', description: 'Plan upcoming events' },
  ],
  [EXECUTIVE_BOARD_ROLES.SECRETARY]: [
    { action: 'create_event', label: 'Create Event', description: 'Create new events' },
    { action: 'send_emails', label: 'Send Emails', description: 'Email club communications' },
    { action: 'create_contracts', label: 'Create Contracts', description: 'Draft member agreements' },
    { action: 'member_records', label: 'Member Records', description: 'Maintain member information' },
  ],
  [EXECUTIVE_BOARD_ROLES.TREASURER]: [
    { action: 'create_budget', label: 'Create Budget', description: 'Set up financial budgets' },
    { action: 'create_event_with_budget', label: 'Create Event with Budget', description: 'Create event and budget together' },
    { action: 'track_payments', label: 'Track Payments', description: 'Monitor financial transactions' },
    { action: 'financial_reports', label: 'Financial Reports', description: 'Generate financial summaries' },
  ],
  [EXECUTIVE_BOARD_ROLES.TOUR_MANAGER]: [
    { action: 'plan_tour', label: 'Plan Tour', description: 'Organize tour logistics' },
    { action: 'create_budget', label: 'Create Budget', description: 'Plan tour budgets' },
  ],
  [EXECUTIVE_BOARD_ROLES.ROAD_MANAGER]: [
    { action: 'equipment_check', label: 'Equipment Check', description: 'Manage equipment and logistics' },
  ],
  [EXECUTIVE_BOARD_ROLES.MERCHANDISE_MANAGER]: [
    { action: 'manage_inventory', label: 'Manage Inventory', description: 'Track merchandise stock' },
    { action: 'create_budget', label: 'Create Budget', description: 'Plan merchandise budgets' },
  ],
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_COORDINATOR]: [
    { action: 'update_homepage', label: 'Update Homepage', description: 'Manage hero content' },
    { action: 'social_media', label: 'Social Media', description: 'Post announcements' },
    { action: 'promotional_content', label: 'Promotional Content', description: 'Create marketing materials' },
  ],
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_CO_MANAGER_1]: [
    { action: 'social_media', label: 'Social Media', description: 'Assist with social media content' },
    { action: 'promotional_content', label: 'Promotional Content', description: 'Support marketing efforts' },
  ],
  [EXECUTIVE_BOARD_ROLES.PUBLIC_RELATIONS_CO_MANAGER_2]: [
    { action: 'social_media', label: 'Social Media', description: 'Assist with social media content' },
    { action: 'promotional_content', label: 'Promotional Content', description: 'Support marketing efforts' },
  ],
  [EXECUTIVE_BOARD_ROLES.HISTORIAN]: [
    { action: 'archive_content', label: 'Archive Content', description: 'Preserve club history' },
    { action: 'youtube_archive', label: 'YouTube Archive', description: 'Organize video history' },
  ],
  [EXECUTIVE_BOARD_ROLES.ALUMNAE_LIAISON]: [
    { action: 'alumni_outreach', label: 'Alumni Outreach', description: 'Connect with alumni' },
    { action: 'alumni_events', label: 'Alumni Events', description: 'Plan alumni gatherings' },
  ],
  [EXECUTIVE_BOARD_ROLES.ALUMNAE_CORRESPONDENT]: [
    { action: 'newsletter', label: 'Newsletter', description: 'Create alumni communications' },
    { action: 'alumni_updates', label: 'Alumni Updates', description: 'Send regular updates' },
  ],
  [EXECUTIVE_BOARD_ROLES.CO_LIBRARIAN_1]: [
    { action: 'organize_music', label: 'Organize Music', description: 'Manage sheet music library' },
  ],
  [EXECUTIVE_BOARD_ROLES.CO_LIBRARIAN_2]: [
    { action: 'organize_music', label: 'Organize Music', description: 'Manage sheet music library' },
  ],
  [EXECUTIVE_BOARD_ROLES.CO_WARDROBE_MISTRESS_1]: [
    { action: 'wardrobe_check', label: 'Wardrobe Check', description: 'Coordinate performance attire' },
  ],
  [EXECUTIVE_BOARD_ROLES.CO_WARDROBE_MISTRESS_2]: [
    { action: 'wardrobe_check', label: 'Wardrobe Check', description: 'Coordinate performance attire' },
  ],
  [EXECUTIVE_BOARD_ROLES.CHAPLAIN]: [
    { action: 'spiritual_guidance', label: 'Spiritual Guidance', description: 'Provide spiritual support' },
    { action: 'send_reflections', label: 'Send Reflections', description: 'Share spiritual messages' },
  ],
  [EXECUTIVE_BOARD_ROLES.SET_UP_CREW_MANAGER]: [
    { action: 'setup_coordination', label: 'Setup Coordination', description: 'Plan stage and equipment setup' },
  ],
  [EXECUTIVE_BOARD_ROLES.STAGE_MANAGER]: [
    { action: 'performance_logistics', label: 'Performance Logistics', description: 'Manage backstage operations' },
  ],
  [EXECUTIVE_BOARD_ROLES.CHIEF_OF_STAFF]: [
    { action: 'admin_panel', label: 'Admin Panel', description: 'Access full admin functionality' },
    { action: 'manage_users', label: 'Manage Users', description: 'Manage all user accounts' },
    { action: 'system_settings', label: 'System Settings', description: 'Configure system-wide settings' },
    { action: 'create_budget', label: 'Create Budget', description: 'Create new budgets' },
    { action: 'create_event', label: 'Create Event', description: 'Create new events' },
    { action: 'manage_permissions', label: 'Manage Permissions', description: 'Assign and manage all permissions' },
  ],
  [EXECUTIVE_BOARD_ROLES.DATA_ANALYST]: [
    { action: 'generate_reports', label: 'Generate Reports', description: 'Create data analysis reports' },
    { action: 'track_metrics', label: 'Track Metrics', description: 'Monitor club performance metrics' },
  ],
};