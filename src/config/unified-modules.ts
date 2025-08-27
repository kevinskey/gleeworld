import { UnifiedModule, UnifiedModuleCategory } from '@/types/unified-modules';
import {
  Users, 
  Shield, 
  Bell,
  Mail,
  Heart,
  Clock,
  Calendar,
  Calculator,
  ClipboardCheck,
  Music,
  Eye,
  Settings
} from 'lucide-react';

// Import core module components only
import { MusicLibraryInlineModule } from '@/components/modules/MusicLibraryInlineModule';
import { CommunityHubModule } from '@/components/modules/CommunityHubModule';
import { CheckInCheckOutModule } from '@/components/modules/CheckInCheckOutModule';
import { CalendarModule } from '@/components/modules/CalendarModule';
import { AttendanceModule } from '@/components/modules/AttendanceModule';
import { StudentConductorModule } from '@/components/modules/StudentConductorModule';
import { SectionLeaderModule } from '@/components/modules/SectionLeaderModule';
import { SightSingingModule } from '@/components/modules/SightSingingModule';
import { NotificationsModule } from '@/components/modules/NotificationsModule';
import { BudgetsModule } from '@/components/modules/BudgetsModule';
import { SettingsModule } from '@/components/modules/SettingsModule';

// Simplified core modules only
export const UNIFIED_MODULES: UnifiedModule[] = [
  // Core Member modules
  {
    id: "community-hub",
    name: "community-hub",
    title: "Community Hub",
    description: "Central space for community discussions and interactions",
    icon: Users,
    iconColor: "emerald",
    category: "member-management",
    isActive: true,
    component: CommunityHubModule,
    dbFunctionName: "community-hub"
  },
  {
    id: "music-library",
    name: "music-library", 
    title: "Music Library",
    description: "Manage sheet music, recordings, and musical resources",
    icon: Music,
    iconColor: "pink",
    category: "musical-leadership",
    isActive: true,
    component: MusicLibraryInlineModule,
    dbFunctionName: "music-library"
  },
  {
    id: "calendar",
    name: "calendar",
    title: "Calendar",
    description: "View upcoming events, rehearsals, and important dates",
    icon: Calendar,
    iconColor: "purple",
    category: "member-management",
    isActive: true,
    component: CalendarModule,
    dbFunctionName: "calendar"
  },
  {
    id: "attendance",
    name: "attendance",
    title: "Attendance",
    description: "View your attendance records and status",
    icon: ClipboardCheck,
    iconColor: "green",
    category: "member-management",
    isActive: true,
    component: AttendanceModule,
    dbFunctionName: "attendance"
  },
  {
    id: "check-in-check-out",
    name: "check-in-check-out",
    title: "Check In/Check Out",
    description: "Track arrival and departure times for events and rehearsals",
    icon: Clock,
    iconColor: "cyan",
    category: "member-management",
    isActive: true,
    component: CheckInCheckOutModule,
    dbFunctionName: "check-in-check-out"
  },
  {
    id: "notifications",
    name: "notifications",
    title: "Notifications",
    description: "Manage system notifications and alerts",
    icon: Bell,
    iconColor: "yellow",
    category: "communications",
    isActive: true,
    component: NotificationsModule,
    dbFunctionName: "notifications"
  },
  {
    id: "student-conductor",
    name: "student-conductor",
    title: "Student Conductor",
    description: "Manage section leaders, sight singing, sheet music annotations, and sectional coordination",
    icon: Music,
    iconColor: "purple",
    category: "musical-leadership",
    isActive: true,
    component: StudentConductorModule,
    dbFunctionName: "student-conductor"
  },
  {
    id: "section-leader",
    name: "section-leader",
    title: "Section Leader",
    description: "Manage section rosters, plan sectionals, communicate with members, and create setlists",
    icon: Users,
    iconColor: "green",
    category: "musical-leadership",
    isActive: true,
    component: SectionLeaderModule,
    dbFunctionName: "section-leader"
  },
  {
    id: "sight-singing-management",
    name: "sight-singing-management",
    title: "Sight Singing Management",
    description: "Manage sight singing exercises and track progress",
    icon: Eye,
    iconColor: "blue",
    category: "musical-leadership",
    isActive: true,
    component: SightSingingModule,
    dbFunctionName: "sight-singing-management"
  },
  {
    id: "budgets",
    name: "budgets",
    title: "Budgets & Planning",
    description: "Financial planning and budget management",
    icon: Calculator,
    iconColor: "green",
    category: "finances",
    isActive: true,
    component: BudgetsModule,
    dbFunctionName: "budgets"
  },
  {
    id: "settings",
    name: "settings",
    title: "System Settings",
    description: "Platform configuration and settings",
    icon: Settings,
    iconColor: "gray",
    category: "system",
    isActive: true,
    component: SettingsModule,
    dbFunctionName: "settings"
  }
];

// Simplified categories
export const UNIFIED_MODULE_CATEGORIES: UnifiedModuleCategory[] = [
  {
    id: "member-management", 
    title: "Member Management",
    description: "User management, attendance, and member tools",
    icon: Users,
    color: "cyan",
    modules: UNIFIED_MODULES.filter(m => m.category === "member-management")
  },
  {
    id: "musical-leadership",
    title: "Musical Leadership",
    description: "Student conductor, section leaders, sight singing, and music library",
    icon: Music,
    color: "purple",
    modules: UNIFIED_MODULES.filter(m => m.category === "musical-leadership")
  },
  {
    id: "communications",
    title: "Communications",
    description: "Notifications and messaging",
    icon: Mail,
    color: "blue",
    modules: UNIFIED_MODULES.filter(m => m.category === "communications")
  },
  {
    id: "finances",
    title: "Financial Management",
    description: "Budget management",
    icon: Calculator,
    color: "green",
    modules: UNIFIED_MODULES.filter(m => m.category === "finances")
  },
  {
    id: "system",
    title: "System Administration",
    description: "Platform settings and administrative tools",
    icon: Settings,
    color: "gray",
    modules: UNIFIED_MODULES.filter(m => m.category === "system")
  }
];

// Utility functions
export const getUnifiedModuleById = (moduleId: string): UnifiedModule | null => {
  return UNIFIED_MODULES.find(m => m.id === moduleId) || null;
};

export const getUnifiedModuleByName = (name: string): UnifiedModule | null => {
  return UNIFIED_MODULES.find(m => m.name === name) || null;
};

export const getUnifiedCategoryById = (categoryId: string): UnifiedModuleCategory | null => {
  return UNIFIED_MODULE_CATEGORIES.find(c => c.id === categoryId) || null;
};

export const getActiveModules = (): UnifiedModule[] => {
  return UNIFIED_MODULES.filter(m => m.isActive);
};

export const getModulesByCategory = (categoryId: string): UnifiedModule[] => {
  return UNIFIED_MODULES.filter(m => m.category === categoryId && m.isActive);
};