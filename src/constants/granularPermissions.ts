// COMPREHENSIVE FUNCTION LIST FOR GLEEWORLD PERMISSIONS SYSTEM
// This file contains EVERY coded function in the system, whether active or inactive

export interface FunctionCategory {
  name: string;
  description: string;
  functions: PermissionFunction[];
}

export interface PermissionFunction {
  id: string;
  name: string;
  description: string;
  location: string;
  isActive: boolean;
  requiredRole?: string;
  component?: string;
  category: string;
}

export const COMPREHENSIVE_FUNCTIONS_LIST: PermissionFunction[] = [
  // ========== COMMUNITY HUB (FREE FOR ALL LOGGED-IN USERS) ==========
  {
    id: 'view_announcements',
    name: 'View Announcements',
    description: 'Access to community announcements and updates',
    location: '/announcements',
    isActive: true,
    category: 'Community Hub'
  },
  {
    id: 'view_public_calendar',
    name: 'View Public Calendar',
    description: 'Access to public events calendar',
    location: '/calendar',
    isActive: true,
    category: 'Community Hub'
  },
  {
    id: 'view_library',
    name: 'View Music Library',
    description: 'Access to music library and resources',
    location: '/library',
    isActive: true,
    category: 'Community Hub'
  },
  {
    id: 'view_member_directory',
    name: 'View Member Directory',
    description: 'Access to member contact directory',
    location: '/member-directory',
    isActive: true,
    category: 'Community Hub'
  },
  {
    id: 'view_handbook',
    name: 'View Handbook',
    description: 'Access to official Glee Club handbook',
    location: '/handbook',
    isActive: true,
    category: 'Community Hub'
  },
  {
    id: 'view_profile',
    name: 'View Own Profile',
    description: 'Access to personal profile page',
    location: '/profile',
    isActive: true,
    category: 'Community Hub'
  },
  {
    id: 'update_profile',
    name: 'Update Own Profile',
    description: 'Edit personal profile information',
    location: '/profile',
    isActive: true,
    category: 'Community Hub'
  },
  {
    id: 'view_notifications',
    name: 'View Notifications',
    description: 'Access to personal notifications',
    location: '/notifications',
    isActive: true,
    category: 'Community Hub'
  },

  // ========== CONTRACT MANAGEMENT ==========
  {
    id: 'view_own_contracts',
    name: 'View Own Contracts',
    description: 'View contracts assigned to user',
    location: 'ContractsList',
    isActive: true,
    category: 'Contract Management'
  },
  {
    id: 'sign_contracts',
    name: 'Sign Contracts',
    description: 'Digital signature capability for contracts',
    location: 'ContractSigning',
    isActive: true,
    category: 'Contract Management'
  },
  {
    id: 'create_contracts',
    name: 'Create Contracts',
    description: 'Create new contracts from templates',
    location: 'ContractCreationCollapsible',
    isActive: true,
    category: 'Contract Management'
  },
  {
    id: 'view_all_contracts',
    name: 'View All Contracts',
    description: 'View all contracts in system',
    location: 'AdminPanel',
    isActive: true,
    category: 'Contract Management'
  },
  {
    id: 'admin_sign_contracts',
    name: 'Admin Sign Contracts',
    description: 'Administrative signature on behalf of organization',
    location: 'AdminSigning',
    isActive: true,
    category: 'Contract Management'
  },
  {
    id: 'manage_contract_templates',
    name: 'Manage Contract Templates',
    description: 'Create and edit contract templates',
    location: 'ContractTemplates',
    isActive: true,
    category: 'Contract Management'
  },
  {
    id: 'send_contracts',
    name: 'Send Contracts',
    description: 'Send contracts to recipients via email',
    location: 'SendContractDialog',
    isActive: true,
    category: 'Contract Management'
  },
  {
    id: 'bulk_contract_operations',
    name: 'Bulk Contract Operations',
    description: 'Perform bulk operations on multiple contracts',
    location: 'AdminPanel',
    isActive: true,
    category: 'Contract Management'
  },

  // ========== FINANCIAL MANAGEMENT ==========
  {
    id: 'view_own_payments',
    name: 'View Own Payments',
    description: 'View personal payment history',
    location: 'Payments',
    isActive: true,
    category: 'Financial Management'
  },
  {
    id: 'view_all_payments',
    name: 'View All Payments',
    description: 'View all payment records',
    location: 'AdminPanel',
    isActive: true,
    category: 'Financial Management'
  },
  {
    id: 'manage_stipends',
    name: 'Manage Stipends',
    description: 'Create and manage student stipends',
    location: 'useAdminStipends',
    isActive: true,
    category: 'Financial Management'
  },
  {
    id: 'create_budgets',
    name: 'Create Budgets',
    description: 'Create project and event budgets',
    location: 'Budgets',
    isActive: true,
    category: 'Financial Management'
  },
  {
    id: 'approve_budgets_treasurer',
    name: 'Approve Budgets (Treasurer)',
    description: 'Treasurer approval level for budgets',
    location: 'BudgetApprovals',
    isActive: true,
    category: 'Financial Management'
  },
  {
    id: 'approve_budgets_super_admin',
    name: 'Approve Budgets (Super Admin)',
    description: 'Super admin approval level for budgets',
    location: 'BudgetApprovals',
    isActive: true,
    category: 'Financial Management'
  },
  {
    id: 'manage_receipts',
    name: 'Manage Receipts',
    description: 'Upload and manage expense receipts',
    location: 'ReceiptsManagement',
    isActive: true,
    category: 'Financial Management'
  },
  {
    id: 'view_financial_overview',
    name: 'View Financial Overview',
    description: 'Access to comprehensive financial dashboards',
    location: 'useAdminFinancialOverview',
    isActive: true,
    category: 'Financial Management'
  },
  {
    id: 'manage_accounting',
    name: 'Manage Accounting',
    description: 'Full accounting system access',
    location: 'Accounting',
    isActive: true,
    category: 'Financial Management'
  },

  // ========== USER & MEMBER MANAGEMENT ==========
  {
    id: 'manage_users',
    name: 'Manage Users',
    description: 'Create, edit, and manage user accounts',
    location: 'EnhancedUserManagement',
    isActive: true,
    category: 'User Management'
  },
  {
    id: 'delete_users',
    name: 'Delete Users',
    description: 'Permanently delete user accounts',
    location: 'EnhancedUserManagement',
    isActive: true,
    category: 'User Management'
  },
  {
    id: 'bulk_user_operations',
    name: 'Bulk User Operations',
    description: 'Perform operations on multiple users',
    location: 'BulkAssignmentPage',
    isActive: true,
    category: 'User Management'
  },
  {
    id: 'auto_enroll_users',
    name: 'Auto Enroll Users',
    description: 'Automatically enroll new users',
    location: 'useAutoEnrollUser',
    isActive: true,
    category: 'User Management'
  },
  {
    id: 'manage_exec_board',
    name: 'Manage Executive Board',
    description: 'Assign and manage executive board positions',
    location: 'ExecutiveBoardManager',
    isActive: true,
    category: 'User Management'
  },
  {
    id: 'bulk_exec_assignment',
    name: 'Bulk Executive Assignment',
    description: 'Assign executive roles in bulk',
    location: 'BulkExecBoardAssignment',
    isActive: true,
    category: 'User Management'
  },
  {
    id: 'view_user_analytics',
    name: 'View User Analytics',
    description: 'Access to user engagement analytics',
    location: 'AdminSummaryStats',
    isActive: true,
    category: 'User Management'
  },
  {
    id: 'manage_member_permissions',
    name: 'Manage Member Permissions',
    description: 'Set individual member permissions',
    location: 'PermissionsPanel',
    isActive: true,
    category: 'User Management'
  },

  // ========== W9 & TAX FORMS ==========
  {
    id: 'view_own_w9_forms',
    name: 'View Own W9 Forms',
    description: 'Access personal W9 tax forms',
    location: 'W9FormsList',
    isActive: true,
    category: 'Tax Forms'
  },
  {
    id: 'submit_w9_forms',
    name: 'Submit W9 Forms',
    description: 'Submit new W9 tax forms',
    location: 'W9Form',
    isActive: true,
    category: 'Tax Forms'
  },
  {
    id: 'manage_all_w9_forms',
    name: 'Manage All W9 Forms',
    description: 'View and manage all W9 forms',
    location: 'useAdminW9Forms',
    isActive: true,
    category: 'Tax Forms'
  },
  {
    id: 'bulk_w9_email',
    name: 'Bulk W9 Email',
    description: 'Send W9 reminder emails in bulk',
    location: 'BulkW9EmailDialog',
    isActive: true,
    category: 'Tax Forms'
  },
  {
    id: 'w9_conversion',
    name: 'W9 Conversion',
    description: 'Convert W9 forms between formats',
    location: 'BatchW9ConversionDialog',
    isActive: true,
    category: 'Tax Forms'
  },
  {
    id: 'generate_combined_pdf',
    name: 'Generate Combined PDF',
    description: 'Create combined contract and W9 PDFs',
    location: 'generate-combined-pdf function',
    isActive: true,
    category: 'Tax Forms'
  },

  // ========== CALENDAR & EVENT MANAGEMENT ==========
  {
    id: 'view_calendar',
    name: 'View Calendar',
    description: 'Access to calendar views',
    location: 'Calendar',
    isActive: true,
    category: 'Calendar & Events'
  },
  {
    id: 'manage_calendar',
    name: 'Manage Calendar',
    description: 'Create and edit calendar events',
    location: 'CalendarManagement',
    isActive: true,
    category: 'Calendar & Events'
  },
  {
    id: 'calendar_admin_controls',
    name: 'Calendar Admin Controls',
    description: 'Administrative calendar management',
    location: 'CalendarControlsAdmin',
    isActive: true,
    category: 'Calendar & Events'
  },
  {
    id: 'export_calendar',
    name: 'Export Calendar',
    description: 'Export calendar to various formats',
    location: 'export-calendar function',
    isActive: true,
    category: 'Calendar & Events'
  },
  {
    id: 'event_planning',
    name: 'Event Planning',
    description: 'Plan and organize events',
    location: 'EventPlanner',
    isActive: true,
    category: 'Calendar & Events'
  },
  {
    id: 'event_budgeting',
    name: 'Event Budgeting',
    description: 'Create budgets for events',
    location: 'useEventBudgetWorksheet',
    isActive: true,
    category: 'Calendar & Events'
  },
  {
    id: 'booking_requests',
    name: 'Booking Requests',
    description: 'Manage performance booking requests',
    location: 'BookingRequest',
    isActive: true,
    category: 'Calendar & Events'
  },

  // ========== COMMUNICATION ==========
  // Email CRUD Operations
  {
    id: 'create_email',
    name: 'Create Email',
    description: 'Create and compose new emails',
    location: 'EmailComposer',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'view_emails',
    name: 'View Emails',
    description: 'View email history and drafts',
    location: 'EmailHistory',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'edit_email',
    name: 'Edit Email',
    description: 'Edit email drafts and templates',
    location: 'EmailEditor',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'delete_email',
    name: 'Delete Email',
    description: 'Delete email drafts and sent emails',
    location: 'EmailManagement',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'send_emails',
    name: 'Send Emails',
    description: 'Send emails to members and groups',
    location: 'useCommunication',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'create_email_template',
    name: 'Create Email Template',
    description: 'Create reusable email templates',
    location: 'EmailTemplateCreator',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'edit_email_template',
    name: 'Edit Email Template',
    description: 'Modify existing email templates',
    location: 'EmailTemplateEditor',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'delete_email_template',
    name: 'Delete Email Template',
    description: 'Remove email templates',
    location: 'EmailTemplateManagement',
    isActive: true,
    category: 'Communication'
  },

  // SMS CRUD Operations
  {
    id: 'create_sms',
    name: 'Create SMS',
    description: 'Create and compose new SMS messages',
    location: 'SMSComposer',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'view_sms',
    name: 'View SMS',
    description: 'View SMS history and drafts',
    location: 'SMSHistory',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'edit_sms',
    name: 'Edit SMS',
    description: 'Edit SMS drafts and templates',
    location: 'SMSEditor',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'delete_sms',
    name: 'Delete SMS',
    description: 'Delete SMS drafts and sent messages',
    location: 'SMSManagement',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'send_sms',
    name: 'Send SMS',
    description: 'Send SMS messages to members',
    location: 'gw-send-sms function',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'create_sms_template',
    name: 'Create SMS Template',
    description: 'Create reusable SMS templates',
    location: 'SMSTemplateCreator',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'edit_sms_template',
    name: 'Edit SMS Template',
    description: 'Modify existing SMS templates',
    location: 'SMSTemplateEditor',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'delete_sms_template',
    name: 'Delete SMS Template',
    description: 'Remove SMS templates',
    location: 'SMSTemplateManagement',
    isActive: true,
    category: 'Communication'
  },

  // Internal Messaging CRUD Operations
  {
    id: 'create_message',
    name: 'Create Message',
    description: 'Create internal messages',
    location: 'MessageComposer',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'view_messages',
    name: 'View Messages',
    description: 'View received and sent messages',
    location: 'MessageCenter',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'edit_message',
    name: 'Edit Message',
    description: 'Edit draft messages',
    location: 'MessageEditor',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'delete_message',
    name: 'Delete Message',
    description: 'Delete messages and drafts',
    location: 'MessageManagement',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'view_all_messages',
    name: 'View All Messages',
    description: 'Admin access to view all internal messages',
    location: 'AdminMessageCenter',
    isActive: true,
    category: 'Communication'
  },

  // Legacy Communication Functions
  {
    id: 'create_announcements',
    name: 'Create Announcements',
    description: 'Create community announcements',
    location: 'CreateAnnouncement',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'manage_announcements',
    name: 'Manage Announcements',
    description: 'Edit and manage all announcements',
    location: 'AnnouncementManagement',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'send_notifications',
    name: 'Send Notifications',
    description: 'Send system notifications to users',
    location: 'SendNotificationPage',
    isActive: true,
    category: 'Communication'
  },
  {
    id: 'auto_notifications',
    name: 'Auto Notifications',
    description: 'Automated notification system',
    location: 'AutoNotificationService',
    isActive: true,
    category: 'Communication'
  },

  // ========== TOUR MANAGEMENT ==========
  {
    id: 'plan_tours',
    name: 'Plan Tours',
    description: 'Create and plan tour itineraries',
    location: 'TourPlanner',
    isActive: true,
    category: 'Tour Management'
  },
  {
    id: 'manage_tours',
    name: 'Manage Tours',
    description: 'Full tour management capabilities',
    location: 'TourManager',
    isActive: true,
    category: 'Tour Management'
  },
  {
    id: 'tour_manager_services',
    name: 'Tour Manager Services',
    description: 'Executive board tour management tools',
    location: 'TourManagerServices',
    isActive: true,
    category: 'Tour Management'
  },
  {
    id: 'google_places_lookup',
    name: 'Google Places Lookup',
    description: 'Search for tour locations',
    location: 'google-places-lookup function',
    isActive: true,
    category: 'Tour Management'
  },

  // ========== MUSIC & LIBRARY MANAGEMENT ==========
  {
    id: 'music_library_access',
    name: 'Music Library Access',
    description: 'Access to music library',
    location: 'MusicLibraryPage',
    isActive: true,
    category: 'Music & Library'
  },
  {
    id: 'manage_music_library',
    name: 'Manage Music Library',
    description: 'Add and organize music library content',
    location: 'MusicManagement',
    isActive: true,
    category: 'Music & Library'
  },
  {
    id: 'librarian_services',
    name: 'Librarian Services',
    description: 'Executive board librarian tools',
    location: 'LibrarianServices',
    isActive: true,
    category: 'Music & Library'
  },
  {
    id: 'librarian_dashboard',
    name: 'Librarian Dashboard',
    description: 'Dedicated librarian dashboard',
    location: 'LibrarianDashboard',
    isActive: true,
    category: 'Music & Library'
  },
  {
    id: 'pronunciation_guide',
    name: 'Pronunciation Guide',
    description: 'Generate pronunciation guides for pieces',
    location: 'generate-pronunciation function',
    isActive: true,
    category: 'Music & Library'
  },
  {
    id: 'music_annotations',
    name: 'Music Annotations',
    description: 'Annotate and share musical scores',
    location: 'SharedAnnotation',
    isActive: true,
    category: 'Music & Library'
  },
  {
    id: 'sectional_management',
    name: 'Sectional Management',
    description: 'Manage sectional rehearsals',
    location: 'SectionalManagement',
    isActive: true,
    category: 'Music & Library'
  },
  {
    id: 'srf_management',
    name: 'SRF Management',
    description: 'Sight Reading assignments',
    location: 'SRFManagement',
    isActive: true,
    category: 'Music & Library'
  },

  // ========== PERFORMANCE MANAGEMENT ==========
  {
    id: 'performance_suite',
    name: 'Performance Suite',
    description: 'Performance tracking and management',
    location: 'PerformanceSuite',
    isActive: true,
    category: 'Performance'
  },
  {
    id: 'attendance_tracking',
    name: 'Attendance Tracking',
    description: 'Track member attendance',
    location: 'AttendancePage',
    isActive: true,
    category: 'Performance'
  },
  {
    id: 'mobile_scoring',
    name: 'Mobile Scoring',
    description: 'Mobile performance scoring',
    location: 'MobileScoring',
    isActive: true,
    category: 'Performance'
  },
  {
    id: 'audition_management',
    name: 'Audition Management',
    description: 'Manage member auditions',
    location: 'AuditionPage',
    isActive: true,
    category: 'Performance'
  },
  {
    id: 'student_conductor_tools',
    name: 'Student Conductor Tools',
    description: 'Tools for student conductors',
    location: 'StudentConductorDashboard',
    isActive: true,
    category: 'Performance'
  },

  // ========== WARDROBE MANAGEMENT ==========
  {
    id: 'wardrobe_access',
    name: 'Wardrobe Access',
    description: 'Access to wardrobe system',
    location: 'Wardrobe',
    isActive: true,
    category: 'Wardrobe'
  },
  {
    id: 'wardrobe_checkout',
    name: 'Wardrobe Checkout',
    description: 'Check out wardrobe items',
    location: 'Wardrobe checkout system',
    isActive: true,
    category: 'Wardrobe'
  },
  {
    id: 'wardrobe_management',
    name: 'Wardrobe Management',
    description: 'Manage wardrobe inventory',
    location: 'Wardrobe management system',
    isActive: true,
    category: 'Wardrobe'
  },

  // ========== MERCHANDISE & SHOP ==========
  {
    id: 'shop_access',
    name: 'Shop Access',
    description: 'Access to merchandise shop',
    location: 'Shop',
    isActive: true,
    category: 'Merchandise'
  },
  {
    id: 'manage_products',
    name: 'Manage Products',
    description: 'Add and edit shop products',
    location: 'ProductManagement',
    isActive: true,
    category: 'Merchandise'
  },
  {
    id: 'admin_products',
    name: 'Admin Products',
    description: 'Administrative product management',
    location: 'AdminProducts',
    isActive: true,
    category: 'Merchandise'
  },
  {
    id: 'product_manager',
    name: 'Product Manager',
    description: 'Advanced product management tools',
    location: 'ProductManager',
    isActive: true,
    category: 'Merchandise'
  },
  {
    id: 'stripe_checkout',
    name: 'Stripe Checkout',
    description: 'Process payments via Stripe',
    location: 'create-stripe-checkout function',
    isActive: true,
    category: 'Merchandise'
  },
  {
    id: 'calculate_shipping',
    name: 'Calculate Shipping',
    description: 'Calculate shipping costs',
    location: 'calculate-shipping function',
    isActive: true,
    category: 'Merchandise'
  },

  // ========== PRESS & PR MANAGEMENT ==========
  {
    id: 'press_kit_access',
    name: 'Press Kit Access',
    description: 'Access to press kit materials',
    location: 'PressKit',
    isActive: true,
    category: 'Press & PR'
  },
  {
    id: 'pr_hub_access',
    name: 'PR Hub Access',
    description: 'Access to PR coordination hub',
    location: 'PRHubPage',
    isActive: true,
    category: 'Press & PR'
  },
  {
    id: 'pr_coordinator_services',
    name: 'PR Coordinator Services',
    description: 'Executive board PR tools',
    location: 'PRCoordinatorServices',
    isActive: true,
    category: 'Press & PR'
  },
  {
    id: 'generate_press_content',
    name: 'Generate Press Content',
    description: 'AI-generated press materials',
    location: 'generate-press-kit-content function',
    isActive: true,
    category: 'Press & PR'
  },
  {
    id: 'event_descriptions',
    name: 'Generate Event Descriptions',
    description: 'AI-generated event descriptions',
    location: 'generate-event-description function',
    isActive: true,
    category: 'Press & PR'
  },

  // ========== ALUMNAE MANAGEMENT ==========
  {
    id: 'alumnae_portal',
    name: 'Alumnae Portal',
    description: 'Access to alumnae portal',
    location: 'AlumnaeLanding',
    isActive: true,
    category: 'Alumnae'
  },
  {
    id: 'alumnae_admin',
    name: 'Alumnae Admin',
    description: 'Administrative alumnae management',
    location: 'AlumnaeAdmin',
    isActive: true,
    category: 'Alumnae'
  },

  // ========== SYSTEM ADMINISTRATION ==========
  {
    id: 'view_system_settings',
    name: 'View System Settings',
    description: 'Access to system configuration',
    location: 'SystemSettings',
    isActive: true,
    category: 'System Administration'
  },
  {
    id: 'manage_system_settings',
    name: 'Manage System Settings',
    description: 'Edit system configuration',
    location: 'SystemSettings',
    isActive: true,
    category: 'System Administration'
  },
  {
    id: 'view_activity_logs',
    name: 'View Activity Logs',
    description: 'Access to system activity logs',
    location: 'ActivityLogs',
    isActive: true,
    category: 'System Administration'
  },
  {
    id: 'manage_hero_content',
    name: 'Manage Hero Content',
    description: 'Edit homepage hero sections',
    location: 'Hero management system',
    isActive: true,
    category: 'System Administration'
  },
  {
    id: 'dashboard_settings',
    name: 'Dashboard Settings',
    description: 'Configure dashboard appearance',
    location: 'Dashboard settings system',
    isActive: true,
    category: 'System Administration'
  },
  {
    id: 'youtube_management',
    name: 'YouTube Management',
    description: 'Sync and manage YouTube content',
    location: 'YouTube management system',
    isActive: true,
    category: 'System Administration'
  },
  {
    id: 'manage_username_permissions',
    name: 'Manage Username Permissions',
    description: 'Set individual user permissions',
    location: 'PermissionsPanel',
    isActive: true,
    category: 'System Administration'
  },

  // ========== WELLNESS & SUPPORT ==========
  {
    id: 'wellness_suite',
    name: 'Wellness Suite',
    description: 'Member wellness and support tools',
    location: 'WellnessSuite',
    isActive: true,
    category: 'Wellness & Support'
  },
  {
    id: 'scholarship_hub',
    name: 'Scholarship Hub',
    description: 'Access to scholarship information',
    location: 'ScholarshipHub',
    isActive: true,
    category: 'Wellness & Support'
  },
  {
    id: 'admin_scholarships',
    name: 'Admin Scholarships',
    description: 'Manage scholarship programs',
    location: 'AdminScholarships',
    isActive: true,
    category: 'Wellness & Support'
  },
  {
    id: 'chaplain_services',
    name: 'Chaplain Services',
    description: 'Executive board chaplain tools',
    location: 'ChaplainServices',
    isActive: true,
    category: 'Wellness & Support'
  },

  // ========== EXECUTIVE BOARD SPECIFIC ==========
  {
    id: 'executive_dashboard',
    name: 'Executive Dashboard',
    description: 'Executive board member dashboard',
    location: 'ExecutiveBoardDashboard',
    isActive: true,
    category: 'Executive Board'
  },
  {
    id: 'section_leader_dashboard',
    name: 'Section Leader Dashboard',
    description: 'Section leader specific tools',
    location: 'SectionLeaderDashboard',
    isActive: true,
    category: 'Executive Board'
  },
  {
    id: 'historian_dashboard',
    name: 'Historian Dashboard',
    description: 'Historian specific tools',
    location: 'HistorianDashboard',
    isActive: true,
    category: 'Executive Board'
  },
  {
    id: 'president_services',
    name: 'President Services',
    description: 'Executive board president tools',
    location: 'PresidentServices',
    isActive: true,
    category: 'Executive Board'
  },
  {
    id: 'vice_president_services',
    name: 'Vice President Services',
    description: 'Executive board VP tools',
    location: 'VicePresidentServices',
    isActive: true,
    category: 'Executive Board'
  },
  {
    id: 'secretary_services',
    name: 'Secretary Services',
    description: 'Executive board secretary tools',
    location: 'SecretaryServices',
    isActive: true,
    category: 'Executive Board'
  },
  {
    id: 'treasurer_services',
    name: 'Treasurer Services',
    description: 'Executive board treasurer tools',
    location: 'TreasurerServices',
    isActive: true,
    category: 'Executive Board'
  },
  {
    id: 'setup_crew_services',
    name: 'Setup Crew Services',
    description: 'Setup crew manager tools',
    location: 'SetUpCrewManagerServices',
    isActive: true,
    category: 'Executive Board'
  },
  {
    id: 'exec_services_directory',
    name: 'Executive Services Directory',
    description: 'Directory of all executive services',
    location: 'ExecutiveServicesDirectory',
    isActive: true,
    category: 'Executive Board'
  },
  {
    id: 'exec_navigation_hub',
    name: 'Executive Navigation Hub',
    description: 'Navigation hub for executive board',
    location: 'ExecutiveBoardNavigationPage',
    isActive: true,
    category: 'Executive Board'
  },

  // ========== TECHNICAL FUNCTIONS ==========
  {
    id: 'file_upload',
    name: 'File Upload',
    description: 'Upload files to system',
    location: 'DocumentUpload',
    isActive: true,
    category: 'Technical'
  },
  {
    id: 'pdf_viewing',
    name: 'PDF Viewing',
    description: 'View PDF documents',
    location: 'PDFViewer',
    isActive: true,
    category: 'Technical'
  },
  {
    id: 'signature_capture',
    name: 'Signature Capture',
    description: 'Digital signature capture',
    location: 'SignatureCanvas',
    isActive: true,
    category: 'Technical'
  },
  {
    id: 'image_conversion',
    name: 'Image Conversion',
    description: 'Convert image formats (HEIC to JPEG)',
    location: 'convert-heic-to-jpeg function',
    isActive: true,
    category: 'Technical'
  },
  {
    id: 'sso_token_generation',
    name: 'SSO Token Generation',
    description: 'Generate single sign-on tokens',
    location: 'gw-generate-sso-token function',
    isActive: true,
    category: 'Technical'
  },
  {
    id: 'sso_token_validation',
    name: 'SSO Token Validation',
    description: 'Validate single sign-on tokens',
    location: 'gw-validate-sso-token function',
    isActive: true,
    category: 'Technical'
  },
  {
    id: 'google_maps_integration',
    name: 'Google Maps Integration',
    description: 'Access Google Maps functionality',
    location: 'get-google-maps-config function',
    isActive: true,
    category: 'Technical'
  },

  // ========== INACTIVE/PLACEHOLDER FUNCTIONS ==========
  {
    id: 'ai_music_analysis',
    name: 'AI Music Analysis',
    description: 'AI-powered music analysis tools',
    location: 'Not yet implemented',
    isActive: false,
    category: 'Future Features'
  },
  {
    id: 'virtual_rehearsal',
    name: 'Virtual Rehearsal',
    description: 'Virtual rehearsal platform',
    location: 'Not yet implemented',
    isActive: false,
    category: 'Future Features'
  },
  {
    id: 'alumni_networking',
    name: 'Alumni Networking',
    description: 'Alumni networking features',
    location: 'Partially implemented',
    isActive: false,
    category: 'Future Features'
  },
  {
    id: 'performance_recording',
    name: 'Performance Recording',
    description: 'Record and archive performances',
    location: 'Not yet implemented',
    isActive: false,
    category: 'Future Features'
  },
  {
    id: 'social_media_integration',
    name: 'Social Media Integration',
    description: 'Integrate with social media platforms',
    location: 'Not yet implemented',
    isActive: false,
    category: 'Future Features'
  }
];

// Group functions by category
export const FUNCTION_CATEGORIES: FunctionCategory[] = [
  {
    name: 'Community Hub',
    description: 'Functions available to ALL logged-in users',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Community Hub')
  },
  {
    name: 'Contract Management',
    description: 'Contract creation, signing, and management',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Contract Management')
  },
  {
    name: 'Financial Management',
    description: 'Budgets, payments, and financial operations',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Financial Management')
  },
  {
    name: 'User Management',
    description: 'User accounts and member management',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'User Management')
  },
  {
    name: 'Tax Forms',
    description: 'W9 forms and tax documentation',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Tax Forms')
  },
  {
    name: 'Calendar & Events',
    description: 'Event planning and calendar management',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Calendar & Events')
  },
  {
    name: 'Communication',
    description: 'Email, SMS, and announcement systems',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Communication')
  },
  {
    name: 'Tour Management',
    description: 'Tour planning and logistics',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Tour Management')
  },
  {
    name: 'Music & Library',
    description: 'Music library and educational tools',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Music & Library')
  },
  {
    name: 'Performance',
    description: 'Performance tracking and management',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Performance')
  },
  {
    name: 'Wardrobe',
    description: 'Wardrobe and costume management',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Wardrobe')
  },
  {
    name: 'Merchandise',
    description: 'Shop and product management',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Merchandise')
  },
  {
    name: 'Press & PR',
    description: 'Press kit and public relations',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Press & PR')
  },
  {
    name: 'Alumnae',
    description: 'Alumni-specific features',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Alumnae')
  },
  {
    name: 'System Administration',
    description: 'System settings and configuration',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'System Administration')
  },
  {
    name: 'Wellness & Support',
    description: 'Member wellness and support services',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Wellness & Support')
  },
  {
    name: 'Executive Board',
    description: 'Executive board specific tools',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Executive Board')
  },
  {
    name: 'Technical',
    description: 'Technical infrastructure functions',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Technical')
  },
  {
    name: 'Future Features',
    description: 'Planned or partially implemented features',
    functions: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === 'Future Features')
  }
];

// Quick stats
export const FUNCTION_STATS = {
  total: COMPREHENSIVE_FUNCTIONS_LIST.length,
  active: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.isActive).length,
  inactive: COMPREHENSIVE_FUNCTIONS_LIST.filter(f => !f.isActive).length,
  categories: FUNCTION_CATEGORIES.length,
  communityHubFunctions: FUNCTION_CATEGORIES.find(c => c.name === 'Community Hub')?.functions.length || 0
};