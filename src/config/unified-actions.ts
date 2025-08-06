import { 
  Mail, 
  MessageSquare, 
  Bell, 
  DollarSign, 
  FileText, 
  MapPin, 
  Mic, 
  Calendar,
  Users,
  Music,
  Folder,
  Download,
  Radio,
  Heart,
  GraduationCap,
  Settings,
  Shield,
  Newspaper,
  Clock,
  FileImage,
  Building,
  CreditCard,
  School,
  UserCheck
} from 'lucide-react';
import { UnifiedAction, UnifiedActionCategory } from '@/types/unified-actions';
import { BudgetCreator } from '@/components/budget/BudgetCreator';

// Action definitions based on user requirements
export const UNIFIED_ACTIONS: UnifiedAction[] = [
  // Communication Actions
  {
    id: 'send-email',
    title: 'Send Email',
    description: 'Compose and send emails to members, fans, or alumnae',
    icon: Mail,
    iconColor: 'text-blue-600',
    category: 'communication',
    type: 'modal',
    isActive: true,
    dbFunctionName: 'email_management'
  },
  {
    id: 'send-sms',
    title: 'Send SMS',
    description: 'Send text messages to members for urgent notifications',
    icon: MessageSquare,
    iconColor: 'text-green-600',
    category: 'communication',
    type: 'modal',
    isActive: true,
    dbFunctionName: 'sms_management'
  },
  {
    id: 'internal-notifications',
    title: 'Internal Notifications',
    description: 'Send internal notifications to executive board or members',
    icon: Bell,
    iconColor: 'text-yellow-600',
    category: 'communication',
    type: 'modal',
    isActive: true,
    dbFunctionName: 'notification_management'
  },
  {
    id: 'newsletters',
    title: 'Newsletters',
    description: 'Create and manage newsletters for community updates',
    icon: Newspaper,
    iconColor: 'text-purple-600',
    category: 'communication',
    type: 'navigation',
    route: '/newsletters',
    isActive: true,
    dbFunctionName: 'newsletter_management'
  },

  // Financial Actions
  {
    id: 'budget-management',
    title: 'Budget',
    description: 'Create and manage budgets for tours, events, and operations',
    icon: DollarSign,
    iconColor: 'text-green-700',
    category: 'financial',
    type: 'modal',
    modalComponent: BudgetCreator,
    isActive: true,
    dbFunctionName: 'budget_management'
  },
  {
    id: 'contracts',
    title: 'Contracts',
    description: 'Manage performance contracts and legal documents',
    icon: FileText,
    iconColor: 'text-blue-700',
    category: 'financial',
    type: 'navigation',
    route: '/contracts',
    isActive: true,
    dbFunctionName: 'contract_management'
  },
  {
    id: 'finances',
    title: 'Financial Reports',
    description: 'View and generate financial reports and statements',
    icon: CreditCard,
    iconColor: 'text-indigo-600',
    category: 'financial',
    type: 'navigation',
    route: '/finances',
    isActive: true,
    dbFunctionName: 'financial_reporting'
  },

  // Events Actions
  {
    id: 'tour-planning',
    title: 'Tour Planning',
    description: 'Plan and coordinate tours, travel, and accommodations',
    icon: MapPin,
    iconColor: 'text-red-600',
    category: 'events',
    type: 'navigation',
    route: '/tour-planning',
    isActive: true,
    dbFunctionName: 'tour_management'
  },
  {
    id: 'booking-forms',
    title: 'Booking Forms',
    description: 'Manage performance booking requests and forms',
    icon: Building,
    iconColor: 'text-orange-600',
    category: 'events',
    type: 'navigation',
    route: '/booking-forms',
    isActive: true,
    dbFunctionName: 'booking_management'
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'View and manage events, rehearsals, and performances',
    icon: Calendar,
    iconColor: 'text-blue-500',
    category: 'events',
    type: 'navigation',
    route: '/calendar',
    isActive: true,
    dbFunctionName: 'calendar_management'
  },
  {
    id: 'scheduling',
    title: 'Scheduling',
    description: 'Schedule rehearsals, meetings, and time-sensitive activities',
    icon: Clock,
    iconColor: 'text-teal-600',
    category: 'events',
    type: 'modal',
    isActive: true,
    dbFunctionName: 'scheduling_management'
  },

  // Members Actions
  {
    id: 'auditions',
    title: 'Auditions',
    description: 'Manage audition process and candidate evaluations',
    icon: Mic,
    iconColor: 'text-pink-600',
    category: 'members',
    type: 'navigation',
    route: '/auditions',
    isActive: true,
    dbFunctionName: 'audition_management'
  },
  {
    id: 'attendance',
    title: 'Attendance',
    description: 'Track and manage member attendance for rehearsals and events',
    icon: UserCheck,
    iconColor: 'text-emerald-600',
    category: 'members',
    type: 'modal',
    isActive: true,
    dbFunctionName: 'attendance_management'
  },
  {
    id: 'user-management',
    title: 'User Management',
    description: 'Manage user accounts, roles, and member information',
    icon: Users,
    iconColor: 'text-gray-600',
    category: 'members',
    type: 'navigation',
    route: '/user-management',
    isActive: true,
    dbFunctionName: 'user_management',
    requiredRoles: ['admin', 'super_admin']
  },
  {
    id: 'permissions',
    title: 'Permissions',
    description: 'Configure user permissions and access controls',
    icon: Shield,
    iconColor: 'text-red-700',
    category: 'members',
    type: 'navigation',
    route: '/permissions',
    isActive: true,
    dbFunctionName: 'permission_management',
    requiredRoles: ['admin', 'super_admin']
  },
  {
    id: 'musical-leadership',
    title: 'Musical Leadership',
    description: 'Coordinate musical direction and leadership activities',
    icon: School,
    iconColor: 'text-violet-600',
    category: 'members',
    type: 'navigation',
    route: '/musical-leadership',
    isActive: true,
    dbFunctionName: 'musical_leadership'
  },

  // Media Actions
  {
    id: 'music-library',
    title: 'Music Library',
    description: 'Access and manage sheet music, recordings, and musical resources',
    icon: Music,
    iconColor: 'text-purple-500',
    category: 'media',
    type: 'navigation',
    route: '/music-library',
    isActive: true,
    dbFunctionName: 'music_library'
  },
  {
    id: 'media-folder',
    title: 'Media Folder',
    description: 'Organize photos, videos, and digital media assets',
    icon: Folder,
    iconColor: 'text-amber-600',
    category: 'media',
    type: 'navigation',
    route: '/media-folder',
    isActive: true,
    dbFunctionName: 'media_management'
  },
  {
    id: 'press-kit',
    title: 'Press Kit',
    description: 'Access press materials, photos, and promotional content',
    icon: FileImage,
    iconColor: 'text-cyan-600',
    category: 'media',
    type: 'navigation',
    route: '/press-kit',
    isActive: true,
    dbFunctionName: 'press_kit_management'
  },
  {
    id: 'pdf-viewer',
    title: 'PDF Viewer',
    description: 'View and manage PDF documents and sheet music',
    icon: Download,
    iconColor: 'text-slate-600',
    category: 'media',
    type: 'modal',
    isActive: true,
    dbFunctionName: 'document_viewer'
  },
  {
    id: 'media-hub',
    title: 'Media Hub',
    description: 'Central hub for all media content and distribution',
    icon: Radio,
    iconColor: 'text-rose-600',
    category: 'media',
    type: 'navigation',
    route: '/media-hub',
    isActive: true,
    dbFunctionName: 'media_hub'
  },

  // Community Actions
  {
    id: 'fans',
    title: 'Fan Engagement',
    description: 'Engage with fans and manage fan community interactions',
    icon: Heart,
    iconColor: 'text-pink-500',
    category: 'community',
    type: 'navigation',
    route: '/fans',
    isActive: true,
    dbFunctionName: 'fan_management'
  },
  {
    id: 'alumnae',
    title: 'Alumnae Portal',
    description: 'Connect with alumnae and manage alumni relationships',
    icon: GraduationCap,
    iconColor: 'text-indigo-500',
    category: 'community',
    type: 'navigation',
    route: '/alumnae',
    isActive: true,
    dbFunctionName: 'alumnae_management'
  },
  {
    id: 'community-hub',
    title: 'Community Hub',
    description: 'Central space for community discussions and interactions',
    icon: Users,
    iconColor: 'text-emerald-500',
    category: 'community',
    type: 'navigation',
    route: '/community-hub',
    isActive: true,
    dbFunctionName: 'community_management'
  },
  {
    id: 'radio',
    title: 'Radio',
    description: 'Manage radio appearances and broadcasting activities',
    icon: Radio,
    iconColor: 'text-orange-500',
    category: 'community',
    type: 'navigation',
    route: '/radio',
    isActive: true,
    dbFunctionName: 'radio_management'
  }
];

// Action categories
export const UNIFIED_ACTION_CATEGORIES: UnifiedActionCategory[] = [
  {
    id: 'communication',
    title: 'Communication',
    description: 'Email, SMS, notifications, and newsletters',
    icon: Mail,
    color: 'blue',
    actions: UNIFIED_ACTIONS.filter(action => action.category === 'communication')
  },
  {
    id: 'financial',
    title: 'Financial',
    description: 'Budget, contracts, and financial management',
    icon: DollarSign,
    color: 'green',
    actions: UNIFIED_ACTIONS.filter(action => action.category === 'financial')
  },
  {
    id: 'events',
    title: 'Events',
    description: 'Tours, bookings, calendar, and scheduling',
    icon: Calendar,
    color: 'purple',
    actions: UNIFIED_ACTIONS.filter(action => action.category === 'events')
  },
  {
    id: 'members',
    title: 'Members',
    description: 'User management, attendance, and permissions',
    icon: Users,
    color: 'orange',
    actions: UNIFIED_ACTIONS.filter(action => action.category === 'members')
  },
  {
    id: 'media',
    title: 'Media',
    description: 'Music library, media files, and digital assets',
    icon: Music,
    color: 'pink',
    actions: UNIFIED_ACTIONS.filter(action => action.category === 'media')
  },
  {
    id: 'community',
    title: 'Community',
    description: 'Fans, alumnae, and community engagement',
    icon: Heart,
    color: 'red',
    actions: UNIFIED_ACTIONS.filter(action => action.category === 'community')
  }
];

// Helper functions
export const getUnifiedActionById = (id: string): UnifiedAction | null => {
  return UNIFIED_ACTIONS.find(action => action.id === id) || null;
};

export const getUnifiedActionByTitle = (title: string): UnifiedAction | null => {
  return UNIFIED_ACTIONS.find(action => action.title === title) || null;
};

export const getUnifiedActionCategoryById = (id: string): UnifiedActionCategory | null => {
  return UNIFIED_ACTION_CATEGORIES.find(category => category.id === id) || null;
};

export const getActionsByCategory = (categoryId: string): UnifiedAction[] => {
  return UNIFIED_ACTIONS.filter(action => action.category === categoryId);
};

export const getActionsByType = (type: string): UnifiedAction[] => {
  return UNIFIED_ACTIONS.filter(action => action.type === type);
};