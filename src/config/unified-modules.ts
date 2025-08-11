import { UnifiedModule, UnifiedModuleCategory } from '@/types/unified-modules';
import {
  Users, 
  Shirt, 
  ScanLine, 
  Shield, 
  UserPlus,
  MessageSquare,
  Bell,
  Mail,
  Heart,
  Edit3,
  Clock,
  Calendar,
  DollarSign,
  FileCheck,
  Calculator,
  Database,
  CreditCard,
  Wallet,
  Receipt,
  Brain,
  CheckCircle,
  FileText,
  Printer,
  ShoppingCart,
  BookOpen,
  Settings,
  ClipboardCheck,
  Route,
  Music,
  Eye,
  Megaphone,
  Camera,
  GraduationCap,
  Radio,
  Mic2
} from 'lucide-react';

// Import all module components
import { MusicLibraryInlineModule } from '@/components/modules/MusicLibraryInlineModule';

// Import all module components
import { UserManagementModule } from '@/components/modules/UserManagementModule';
import { WardrobeModule } from '@/components/modules/WardrobeModule';
import { AuditionsModule } from '@/components/modules/AuditionsModule';
import { PermissionsModule } from '@/components/modules/PermissionsModule';
import { StudentIntakeModule } from '@/components/modules/StudentIntakeModule';
import { AttendanceModule } from '@/components/modules/AttendanceModule';
import { TermManagerModule } from '@/components/modules/TermManagerModule';
import { TourManagerModule } from '@/components/modules/TourManagerModule';
import { BookingFormsModule } from '@/components/modules/BookingFormsModule';
import { StudentConductorModule } from '@/components/modules/StudentConductorModule';
import { SectionLeaderModule } from '@/components/modules/SectionLeaderModule';
import { SightSingingModule } from '@/components/modules/SightSingingModule';
import { SightReadingPreviewModule } from '@/components/modules/SightReadingPreviewModule';
import { PRCoordinatorHub } from '@/components/pr-coordinator/PRCoordinatorHub';
import { NotificationsModule } from '@/components/modules/NotificationsModule';
import { EmailManagementModule } from '@/components/modules/EmailManagementModule';
import { BucketsOfLoveModule } from '@/components/modules/BucketsOfLoveModule';
import { SchedulingModule } from '@/components/modules/SchedulingModule';
import ServiceManagement from '@/components/admin/ServiceManagement';
import { BudgetsModule } from '@/components/modules/BudgetsModule';
import { DuesCollectionModule } from '@/components/modules/DuesCollectionModule';
import { ContractsModule } from '@/components/modules/ContractsModule';
import { ApprovalSystemModule } from '@/components/modules/ApprovalSystemModule';
import { GleeLedgerModule } from '@/components/admin/financial/GleeLedgerModule';
import { RadioManagement } from '@/components/admin/RadioManagement';
import { CalendarManagementModule } from '@/components/modules/CalendarManagementModule';
import { ReceiptsModule } from "@/components/receipts/ReceiptsModule";
import { ReimbursementsManager } from "@/components/reimbursements/ReimbursementsManager";
import { AIFinancialPlanningModule } from "@/components/financial/AIFinancialPlanningModule";
import { WellnessModule } from '@/components/modules/WellnessModule';
import { GleeWritingWidget } from '@/components/writing/GleeWritingWidget';
import MediaLibrary from '@/pages/admin/MediaLibrary';
import { KaraokeModule } from '@/components/modules/KaraokeModule';

// Single source of truth for all modules
export const UNIFIED_MODULES: UnifiedModule[] = [
  // Communications modules
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
    id: "email-management",
    name: "email-management",
    title: "Email Management",
    description: "Configure and send emails to members",
    icon: Mail,
    iconColor: "blue",
    category: "communications",
    isActive: true,
    component: EmailManagementModule,
    dbFunctionName: "email-management"
  },
  {
    id: "buckets-of-love",
    name: "buckets-of-love",
    title: "Buckets of Love",
    description: "Manage community support and encouragement",
    icon: Heart,
    iconColor: "pink",
    category: "communications",
    isActive: true,
    component: BucketsOfLoveModule,
    dbFunctionName: "buckets-of-love"
  },
  {
    id: "glee-writing",
    name: "glee-writing",
    title: "Glee Writing Widget",
    description: "Content creation and writing tools",
    icon: Edit3,
    iconColor: "indigo",
    category: "communications",
    isNew: true,
    isActive: true,
    component: GleeWritingWidget,
    dbFunctionName: "glee-writing"
  },
  {
    id: "internal-communications",
    name: "internal-communications", 
    title: "Internal Communications",
    description: "Internal messaging and announcements",
    icon: MessageSquare,
    iconColor: "green",
    category: "communications",
    isActive: true,
    component: UserManagementModule, // TODO: Replace with actual component
    dbFunctionName: "internal-communications"
  },
  {
    id: "pr-coordinator",
    name: "pr-coordinator",
    title: "PR & Media Hub",
    description: "Public relations, social media management, and press releases",
    icon: Megaphone,
    iconColor: "orange",
    category: "communications",
    isActive: true,
    component: PRCoordinatorHub,
    dbFunctionName: "pr-coordinator",
    requiredRoles: ["pr_coordinator", "admin"]
  },
  {
    id: "scheduling-module",
    name: "scheduling-module",
    title: "Scheduling Module",
    description: "Schedule and manage rehearsals and events",
    icon: Clock,
    iconColor: "cyan",
    category: "communications",
    isActive: true,
    component: SchedulingModule,
    dbFunctionName: "scheduling-module"
  },
  {
    id: "service-management",
    name: "service-management",
    title: "Service Management",
    description: "Manage scheduler services, badges, and booking settings",
    icon: Settings,
    iconColor: "blue",
    category: "communications",
    isActive: true,
    component: ServiceManagement,
    dbFunctionName: "service-management"
  },
  {
    id: "calendar-management",
    name: "calendar-management",
    title: "Master Calendar",
    description: "Schedule events, block dates, and manage appointments",
    icon: Calendar,
    iconColor: "purple",
    category: "communications",
    isActive: true,
    component: CalendarManagementModule,
    dbFunctionName: "calendar-management"
  },

  // Attendance modules
  {
    id: "attendance-management",
    name: "attendance-management",
    title: "Attendance Management",
    description: "Track attendance, manage QR codes, process excuses, and generate reports",
    icon: ClipboardCheck,
    iconColor: "green",
    category: "attendance",
    isActive: true,
    component: AttendanceModule,
    dbFunctionName: "attendance-management"
  },

  // Tours modules
  {
    id: "tour-management",
    name: "tour-management",
    title: "Tour Manager",
    description: "Comprehensive tour planning, logistics, and management system",
    icon: Route,
    iconColor: "blue",
    category: "tours",
    isActive: true,
    component: TourManagerModule,
    dbFunctionName: "tour-management"
  },
  {
    id: "booking-forms",
    name: "booking-forms",
    title: "Booking Forms",
    description: "Manage performance requests and booking inquiries from external organizations",
    icon: FileText,
    iconColor: "cyan",
    category: "tours",
    isActive: true,
    component: BookingFormsModule,
    dbFunctionName: "booking-forms"
  },

  // Member Management modules
  {
    id: "user-management",
    name: "user-management",
    title: "User Management",
    description: "Manage user accounts, roles, and permissions",
    icon: Users,
    iconColor: "blue",
    category: "member-management",
    isActive: true,
    component: UserManagementModule,
    dbFunctionName: "user-management"
  },
  {
    id: "executive-board-management",
    name: "executive-board-management",
    title: "Executive Board Management",
    description: "Manage executive board positions, assignments, and responsibilities",
    icon: Users,
    iconColor: "indigo",
    category: "member-management",
    isActive: true,
    component: UserManagementModule, // TODO: Replace with actual ExecBoardModule
    dbFunctionName: "executive-board-management"
  },
  {
    id: "alumnae-portal",
    name: "alumnae-portal",
    title: "Alumnae Portal",
    description: "Alumni engagement, mentorship, memories, and reunion management",
    icon: GraduationCap,
    iconColor: "purple",
    category: "member-management",
    isActive: true,
    component: UserManagementModule, // TODO: Replace with AlumnaePortal component
    dbFunctionName: "alumnae-portal",
    requiredRoles: ["alumni", "admin"]
  },
  {
    id: "executive-functions",
    name: "executive-functions",
    title: "Executive Functions",
    description: "Role-specific executive board functions and responsibilities",
    icon: Shield,
    iconColor: "purple",
    category: "member-management",
    isActive: true,
    component: UserManagementModule, // TODO: Replace with actual ExecFunctionsModule
    dbFunctionName: "executive-functions"
  },
  {
    id: "auditions",
    name: "auditions",
    title: "Auditions",
    description: "Manage audition sessions, applications, and evaluations",
    icon: ScanLine,
    iconColor: "purple",
    category: "member-management",
    isActive: true,
    component: AuditionsModule,
    dbFunctionName: "auditions"
  },
  {
    id: "permissions",
    name: "permissions",
    title: "Permissions",
    description: "Configure user roles, permissions, and access controls",
    icon: Shield,
    iconColor: "red",
    category: "member-management",
    isActive: true,
    component: PermissionsModule,
    dbFunctionName: "permissions"
  },
  {
    id: "wellness",
    name: "wellness",
    title: "Wellness",
    description: "Wellness & mental health tools for members",
    icon: Heart,
    iconColor: "rose",
    category: "member-management",
    isActive: true,
    component: WellnessModule,
    dbFunctionName: "wellness"
  },
  {
    id: "wardrobe",
    name: "wardrobe",
    title: "Wardrobe",
    description: "Manage costumes, fittings, and inventory",
    icon: Shirt,
    iconColor: "purple",
    category: "member-management",
    isActive: true,
    component: WardrobeModule,
    dbFunctionName: "wardrobe"
  },

  // Musical Leadership modules
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
    id: "sight-reading-preview",
    name: "sight-reading-preview",
    title: "Sight Reading Generator",
    description: "Preview and analyze MusicXML sheet music with professional notation",
    icon: Music,
    iconColor: "purple",
    category: "musical-leadership",
    isActive: true,
    component: SightReadingPreviewModule,
    dbFunctionName: "sight-reading-preview"
  },

  // Finance modules
  {
    id: "contracts",
    name: "contracts",
    title: "Contracts Management",
    description: "Create and manage contracts",
    icon: FileCheck,
    iconColor: "blue",
    category: "finances",
    isActive: true,
    component: ContractsModule,
    dbFunctionName: "contracts"
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
    id: "glee-ledger",
    name: "glee-ledger",
    title: "Glee Ledger",
    description: "Google Sheets integration for financial ledger management",
    icon: Database,
    iconColor: "orange",
    category: "finances",
    isActive: true,
    component: GleeLedgerModule,
    dbFunctionName: "glee-ledger"
  },
  {
    id: "dues-collection",
    name: "dues-collection",
    title: "Dues Collection",
    description: "Collect and track member dues",
    icon: CreditCard,
    iconColor: "purple",
    category: "finances",
    isActive: true,
    component: DuesCollectionModule,
    dbFunctionName: "dues-collection"
  },
  {
    id: "receipts-records",
    name: "receipts-records",
    title: "Receipts & Records",
    description: "Upload and manage receipts and financial records",
    icon: Receipt,
    iconColor: "indigo",
    category: "finances",
    isActive: true,
    component: ReceiptsModule,
    dbFunctionName: "receipts-records"
  },
  {
    id: "ai-financial",
    name: "ai-financial",
    title: "AI Financial Planning",
    description: "AI-powered financial insights and planning",
    icon: Brain,
    iconColor: "pink",
    category: "finances",
    isActive: true,
    component: AIFinancialPlanningModule,
    dbFunctionName: "ai-financial"
  },
  {
    id: "approval-system",
    name: "approval-system",
    title: "Approval System",
    description: "Financial approval workflows",
    icon: CheckCircle,
    iconColor: "emerald",
    category: "finances",
    isActive: true,
    component: ApprovalSystemModule,
    dbFunctionName: "approval-system"
  },
  {
    id: "monthly-statements",
    name: "monthly-statements",
    title: "Monthly Statements",
    description: "Generate and manage monthly financial statements",
    icon: FileText,
    iconColor: "gray",
    category: "finances",
    isActive: true,
    component: UserManagementModule, // TODO: Replace with actual component
    dbFunctionName: "monthly-statements"
  },
  {
    id: "check-requests",
    name: "check-requests",
    title: "Reimbursements",
    description: "Process and track reimbursement requests",
    icon: Printer,
    iconColor: "red",
    category: "finances",
    isActive: true,
    component: ReimbursementsManager,
    dbFunctionName: "check-requests"
  },
  {
    id: "merch-store",
    name: "merch-store",
    title: "Glee Merch Store",
    description: "Manage merchandise sales and inventory",
    icon: ShoppingCart,
    iconColor: "yellow",
    category: "finances",
    isActive: true,
    component: UserManagementModule, // TODO: Replace with actual component
    dbFunctionName: "merch-store"
  },

  // Libraries modules
  {
    id: "music-library",
    name: "music-library", 
    title: "Music Library",
    description: "Manage sheet music, recordings, and musical resources",
    icon: Music,
    iconColor: "pink",
    category: "libraries",
    isActive: true,
    component: MusicLibraryInlineModule,
    dbFunctionName: "music-library"
  },
  {
    id: "radio-management",
    name: "radio-management",
    title: "Radio Management",
    description: "Manage Glee World Radio station, commercials, and broadcasting",
    icon: Radio,
    iconColor: "blue",
    category: "libraries",
    isActive: true,
    component: RadioManagement,
    dbFunctionName: "radio-management"
  },
  {
    id: "media-library",
    name: "media-library",
    title: "Media Library",
    description: "Manage images, audio, videos, and documents",
    icon: Camera,
    iconColor: "pink",
    category: "libraries",
    isActive: true,
    component: MediaLibrary,
    dbFunctionName: "media-library",
    requiredRoles: ["admin"]
  },
  {
    id: "karaoke",
    name: "karaoke",
    title: "Karaoke Studio",
    description: "Record over backing tracks and save mixes",
    icon: Mic2,
    iconColor: "pink",
    category: "libraries",
    isActive: true,
    component: KaraokeModule,
    dbFunctionName: "karaoke"
  }
];

// Categories with modules grouped
export const UNIFIED_MODULE_CATEGORIES: UnifiedModuleCategory[] = [
  {
    id: "communications",
    title: "Communications",
    description: "Notifications, emails, community hub, and messaging tools",
    icon: MessageSquare,
    color: "blue",
    modules: UNIFIED_MODULES.filter(m => m.category === "communications")
  },
  {
    id: "attendance",
    title: "Attendance",
    description: "Attendance tracking, QR codes, excuse management, and reporting",
    icon: ClipboardCheck,
    color: "green",
    modules: UNIFIED_MODULES.filter(m => m.category === "attendance")
  },
  {
    id: "tours",
    title: "Tours and Concert Logistics",
    description: "Tour planning, concert logistics, scheduling, and management",
    icon: Route,
    color: "blue",
    modules: UNIFIED_MODULES.filter(m => m.category === "tours")
  },
  {
    id: "member-management",
    title: "Member Management",
    description: "User management, executive board, auditions, permissions, and statistics",
    icon: Users,
    color: "cyan",
    modules: UNIFIED_MODULES.filter(m => m.category === "member-management")
  },
  {
    id: "musical-leadership",
    title: "Musical Leadership",
    description: "Student conductor oversight, section leader management, and sight singing coordination",
    icon: Music,
    color: "purple",
    modules: UNIFIED_MODULES.filter(m => m.category === "musical-leadership")
  },
  {
    id: "finances",
    title: "Finances",
    description: "Financial management, budgets, dues, and glee merch store",
    icon: DollarSign,
    color: "green",
    modules: UNIFIED_MODULES.filter(m => m.category === "finances")
  },
  {
    id: "libraries",
    title: "Libraries",
    description: "PDF sheet music, MP3 audio files, picture collections, and radio management",
    icon: BookOpen,
    color: "emerald",
    modules: UNIFIED_MODULES.filter(m => m.category === "libraries")
  },
  {
    id: "system",
    title: "System",
    description: "Platform settings, logs, and administrative tools",
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