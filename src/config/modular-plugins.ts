import { LucideIcon } from 'lucide-react';
import { 
  Users, 
  Calendar, 
  Music, 
  Mail, 
  DollarSign, 
  FileText, 
  Shield, 
  BarChart3,
  MessageSquare,
  GraduationCap,
  Star,
  Settings
} from 'lucide-react';

// Define what makes a module truly modular and pluggable
export interface ModularPlugin {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  category: 'communication' | 'academic' | 'administrative' | 'financial' | 'performance' | 'social';
  
  // Core plugin properties for true modularity
  isActive: boolean;
  isNew?: boolean;
  
  // Flexible component system - can render anywhere
  component: React.ComponentType<any>;
  fullPageComponent?: React.ComponentType<any>;
  previewComponent?: React.ComponentType<any>;
  componentPath: string; // Path for dynamic loading
  
  // Permission system that works with our database
  requiredRoles?: string[];
  requiredPermissions?: string[];
  dbFunctionName?: string;
  
  // Admin control settings
  adminConfigurable: boolean;
  lockFromChanges: boolean; // When true, requires password to modify
  
  // Auto-integration capabilities
  sendEmails?: boolean;
  sendNotifications?: boolean;
  integratesWithAuth?: boolean;
  registersUsers?: boolean;
}

// All modules are designed to work anywhere - true plugin architecture
export const MODULAR_PLUGINS: ModularPlugin[] = [
  {
    id: 'email-communication',
    name: 'Email Communication',
    title: 'Email & Messaging',
    description: 'Send emails, SMS, and internal messages',
    icon: Mail,
    iconColor: 'text-blue-600',
    category: 'communication',
    isActive: true,
    component: (() => null) as any, // Will be loaded dynamically
    componentPath: '@/components/modules/EmailModule',
    adminConfigurable: true,
    lockFromChanges: false,
    sendEmails: true,
    sendNotifications: true,
    integratesWithAuth: true,
    dbFunctionName: 'email_communication'
  },
  {
    id: 'user-management',
    name: 'User Management',
    title: 'User Administration',
    description: 'Manage users, roles, and permissions',
    icon: Users,
    iconColor: 'text-green-600',
    category: 'administrative',
    isActive: true,
    component: (() => null) as any, // Will be loaded dynamically
    componentPath: '@/components/modules/UserManagementModule',
    requiredRoles: ['admin', 'super-admin'],
    adminConfigurable: true,
    lockFromChanges: true, // Protected - requires password
    integratesWithAuth: true,
    registersUsers: true,
    dbFunctionName: 'user_management'
  },
  {
    id: 'audition-system',
    name: 'Audition System',
    title: 'Audition Management',
    description: 'Handle audition applications and registrations',
    icon: Music,
    iconColor: 'text-purple-600',
    category: 'academic',
    isActive: true,
    component: (() => null) as any, // Will be loaded dynamically
    componentPath: '@/components/modules/AuditionModule',
    adminConfigurable: true,
    lockFromChanges: true, // Public-facing, should be locked
    sendEmails: true,
    sendNotifications: true,
    integratesWithAuth: true,
    registersUsers: true, // Registers auditioners
    dbFunctionName: 'audition_management'
  },
  {
    id: 'calendar-events',
    name: 'Calendar & Events',
    title: 'Event Calendar',
    description: 'Manage events, rehearsals, and performances',
    icon: Calendar,
    iconColor: 'text-orange-600',
    category: 'administrative',
    isActive: true,
    component: (() => null) as any, // Will be loaded dynamically
    componentPath: '@/components/modules/CalendarModule',
    adminConfigurable: true,
    lockFromChanges: false,
    sendNotifications: true,
    dbFunctionName: 'calendar_management'
  },
  {
    id: 'financial-management',
    name: 'Financial Management',
    title: 'Finance & Budget',
    description: 'Manage budgets, payments, and financial records',
    icon: DollarSign,
    iconColor: 'text-green-500',
    category: 'financial',
    isActive: true,
    component: (() => null) as any, // Will be loaded dynamically
    componentPath: '@/components/modules/FinancialModule',
    requiredRoles: ['admin', 'super-admin', 'treasurer'],
    adminConfigurable: true,
    lockFromChanges: true, // Financial data should be protected
    dbFunctionName: 'financial_management'
  },
  {
    id: 'music-library',
    name: 'Music Library',
    title: 'Sheet Music & Audio',
    description: 'Manage sheet music, recordings, and musical resources',
    icon: Music,
    iconColor: 'text-pink-600',
    category: 'academic',
    isActive: true,
    component: (() => null) as any, // Will be loaded dynamically
    componentPath: '@/components/modules/MusicLibraryModule',
    adminConfigurable: true,
    lockFromChanges: false,
    dbFunctionName: 'music_library'
  },
  {
    id: 'analytics-reporting',
    name: 'Analytics & Reporting',
    title: 'Analytics Dashboard',
    description: 'View reports, analytics, and system metrics',
    icon: BarChart3,
    iconColor: 'text-indigo-600',
    category: 'administrative',
    isActive: true,
    component: (() => null) as any, // Will be loaded dynamically
    componentPath: '@/components/modules/AnalyticsModule',
    requiredRoles: ['admin', 'super-admin'],
    adminConfigurable: true,
    lockFromChanges: false,
    dbFunctionName: 'analytics_reporting'
  },
  {
    id: 'communications-hub',
    name: 'Communications Hub',
    title: 'Internal Communications',
    description: 'Announcements, messages, and internal communication',
    icon: MessageSquare,
    iconColor: 'text-cyan-600',
    category: 'communication',
    isActive: true,
    component: (() => null) as any, // Will be loaded dynamically
    componentPath: '@/components/modules/CommunicationsModule',
    adminConfigurable: true,
    lockFromChanges: false,
    sendEmails: true,
    sendNotifications: true,
    dbFunctionName: 'communications_hub'
  }
];

// Plugin categories for organization
export const PLUGIN_CATEGORIES = {
  communication: {
    id: 'communication',
    title: 'Communication',
    description: 'Email, messaging, and notifications',
    icon: Mail,
    color: 'text-blue-600'
  },
  academic: {
    id: 'academic',
    title: 'Academic',
    description: 'Music, education, and learning resources',
    icon: GraduationCap,
    color: 'text-purple-600'
  },
  administrative: {
    id: 'administrative',
    title: 'Administrative',
    description: 'User management, calendar, and admin tools',
    icon: Shield,
    color: 'text-green-600'
  },
  financial: {
    id: 'financial',
    title: 'Financial',
    description: 'Budgets, payments, and financial tracking',
    icon: DollarSign,
    color: 'text-emerald-600'
  },
  performance: {
    id: 'performance',
    title: 'Performance',
    description: 'Concerts, rehearsals, and performance management',
    icon: Star,
    color: 'text-orange-600'
  },
  social: {
    id: 'social',
    title: 'Social',
    description: 'Community features and member interaction',
    icon: Users,
    color: 'text-pink-600'
  }
};

// Helper functions for the plugin system
export const getPluginById = (id: string): ModularPlugin | undefined => {
  return MODULAR_PLUGINS.find(plugin => plugin.id === id);
};

export const getPluginsByCategory = (category: string): ModularPlugin[] => {
  return MODULAR_PLUGINS.filter(plugin => plugin.category === category);
};

export const getActivePlugins = (): ModularPlugin[] => {
  return MODULAR_PLUGINS.filter(plugin => plugin.isActive);
};

export const getAdminConfigurablePlugins = (): ModularPlugin[] => {
  return MODULAR_PLUGINS.filter(plugin => plugin.adminConfigurable);
};

export const getPluginsRequiringPassword = (): ModularPlugin[] => {
  return MODULAR_PLUGINS.filter(plugin => plugin.lockFromChanges);
};