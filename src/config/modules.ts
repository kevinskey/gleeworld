import { ReceiptsModule } from "@/components/receipts/ReceiptsModule";
import { ReimbursementsManager } from "@/components/reimbursements/ReimbursementsManager";
import { AIFinancialPlanningModule } from "@/components/financial/AIFinancialPlanningModule";
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
  Radio
} from 'lucide-react';

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
import { ModuleCategory } from '@/types/modules';

export const moduleCategories: ModuleCategory[] = [
  {
    id: "communications",
    title: "Communications",
    icon: MessageSquare,
    color: "blue",
    description: "Notifications, emails, community hub, and messaging tools",
    modules: [
      {
        id: "notifications",
        title: "Notifications",
        description: "Manage system notifications and alerts",
        icon: Bell,
        iconColor: "yellow",
        category: "communications",
        component: NotificationsModule,
      },
      {
        id: "email-management",
        title: "Email Management",
        description: "Configure and send emails to members",
        icon: Mail,
        iconColor: "blue",
        category: "communications",
        component: EmailManagementModule,
      },
      {
        id: "buckets-of-love",
        title: "Buckets of Love",
        description: "Manage community support and encouragement",
        icon: Heart,
        iconColor: "pink",
        category: "communications",
        component: BucketsOfLoveModule,
      },
      {
        id: "glee-writing",
        title: "Glee Writing Widget",
        description: "Content creation and writing tools",
        icon: Edit3,
        iconColor: "indigo",
        category: "communications",
        isNew: true,
        component: UserManagementModule, // Placeholder - replace with actual component
      },
      {
        id: "internal-communications",
        title: "Internal Communications",
        description: "Internal messaging and announcements",
        icon: MessageSquare,
        iconColor: "green",
        category: "communications",
        component: UserManagementModule, // Placeholder - replace with actual component
      },
      {
        id: "pr-coordinator",
        title: "PR & Media Hub",
        description: "Public relations, social media management, and press releases",
        icon: Megaphone,
        iconColor: "orange",
        category: "communications",
        component: PRCoordinatorHub,
        requiredPermissions: ["pr_coordinator", "admin"],
      },
      {
        id: "scheduling-module",
        title: "Scheduling Module",
        description: "Schedule and manage rehearsals and events",
        icon: Clock,
        iconColor: "cyan",
        category: "communications",
        component: SchedulingModule,
      },
      {
        id: "service-management",
        title: "Service Management",
        description: "Manage scheduler services, badges, and booking settings",
        icon: Settings,
        iconColor: "blue",
        category: "communications",
        component: ServiceManagement,
      },
      {
        id: "calendar-management",
        title: "Calendar Management",
        description: "Manage events and calendar integrations",
        icon: Calendar,
        iconColor: "purple",
        category: "communications",
        component: UserManagementModule, // Placeholder - replace with actual component
      }
    ]
  },
  {
    id: "attendance",
    title: "Attendance",
    icon: ClipboardCheck,
    color: "green",
    description: "Attendance tracking, QR codes, excuse management, and reporting",
    modules: [
      {
        id: "attendance-management",
        title: "Attendance Management",
        description: "Track attendance, manage QR codes, process excuses, and generate reports",
        icon: ClipboardCheck,
        iconColor: "green",
        category: "attendance",
        component: AttendanceModule,
      }
    ]
  },
  {
    id: "tours",
    title: "Tours and Concert Logistics",
    icon: Route,
    color: "blue",
    description: "Tour planning, concert logistics, scheduling, and management",
    modules: [
      {
        id: "tour-management",
        title: "Tour Manager",
        description: "Comprehensive tour planning, logistics, and management system",
        icon: Route,
        iconColor: "blue",
        category: "tours",
        component: TourManagerModule,
      },
      {
        id: "booking-forms",
        title: "Booking Forms",
        description: "Manage performance requests and booking inquiries from external organizations",
        icon: FileText,
        iconColor: "cyan",
        category: "tours",
        component: BookingFormsModule,
      }
    ]
  },
  {
    id: "member-management",
    title: "Member Management",
    icon: Users,
    color: "cyan",
    description: "User management, executive board, auditions, permissions, and statistics",
    modules: [
      {
        id: "user-management",
        title: "User Management",
        description: "Manage user accounts, roles, and permissions",
        icon: Users,
        iconColor: "blue",
        category: "member-management",
        component: UserManagementModule,
      },
      {
        id: "executive-board-management",
        title: "Executive Board Management",
        description: "Manage executive board positions, assignments, and responsibilities",
        icon: Users,
        iconColor: "indigo",
        category: "member-management",
        component: UserManagementModule, // TODO: Replace with actual ExecBoardModule
      },
      {
        id: "alumnae-portal",
        title: "Alumnae Portal",
        description: "Alumni engagement, mentorship, memories, and reunion management",
        icon: GraduationCap,
        iconColor: "purple",
        category: "member-management",
        component: UserManagementModule, // TODO: Replace with AlumnaePortal component
        requiredPermissions: ["alumni", "admin"],
      },
      {
        id: "executive-functions",
        title: "Executive Functions",
        description: "Role-specific executive board functions and responsibilities",
        icon: Shield,
        iconColor: "purple",
        category: "member-management",
        component: UserManagementModule, // TODO: Replace with actual ExecFunctionsModule
      },
      {
        id: "auditions",
        title: "Auditions",
        description: "Manage audition sessions, applications, and evaluations",
        icon: ScanLine,
        iconColor: "purple",
        category: "member-management",
        component: AuditionsModule,
      },
      {
        id: "permissions",
        title: "Permissions",
        description: "Configure user roles, permissions, and access controls",
        icon: Shield,
        iconColor: "red",
        category: "member-management",
        component: PermissionsModule,
      }
    ]
  },
  {
    id: "musical-leadership",
    title: "Musical Leadership",
    icon: Music,
    color: "purple",
    description: "Student conductor oversight, section leader management, and sight singing coordination",
    modules: [
      {
        id: "student-conductor",
        title: "Student Conductor",
        description: "Manage section leaders, sight singing, sheet music annotations, and sectional coordination",
        icon: Music,
        iconColor: "purple",
        category: "musical-leadership",
        component: StudentConductorModule,
      },
      {
        id: "section-leader",
        title: "Section Leader",
        description: "Manage section rosters, plan sectionals, communicate with members, and create setlists",
        icon: Users,
        iconColor: "green",
        category: "musical-leadership",
        component: SectionLeaderModule,
      },
      {
        id: "sight-singing-management",
        title: "Sight Singing Management",
        description: "Manage sight singing exercises and track progress",
        icon: Eye,
        iconColor: "blue",
        category: "musical-leadership",
        component: SightSingingModule,
      },
      {
        id: "sight-reading-preview",
        title: "Sight Reading Generator",
        description: "Preview and analyze MusicXML sheet music with professional notation",
        icon: Music,
        iconColor: "purple",
        category: "musical-leadership",
        component: SightReadingPreviewModule,
      }
    ]
  },
  {
    id: "finances",
    title: "Finances",
    icon: DollarSign,
    color: "green",
    description: "Financial management, budgets, dues, and glee merch store",
    modules: [
      {
        id: "contracts",
        title: "Contracts Management",
        description: "Create and manage contracts",
        icon: FileCheck,
        iconColor: "blue",
        category: "finances",
        component: ContractsModule,
      },
      {
        id: "budgets",
        title: "Budgets & Planning",
        description: "Financial planning and budget management",
        icon: Calculator,
        iconColor: "green",
        category: "finances",
        component: BudgetsModule,
      },
      {
        id: "glee-ledger",
        title: "Glee Ledger",
        description: "Google Sheets integration for financial ledger management",
        icon: Database,
        iconColor: "orange",
        category: "finances",
        component: GleeLedgerModule,
      },
      {
        id: "dues-collection",
        title: "Dues Collection",
        description: "Collect and track member dues",
        icon: CreditCard,
        iconColor: "purple",
        category: "finances",
        component: DuesCollectionModule,
      },
      {
        id: "receipts-records",
        title: "Receipts & Records",
        description: "Upload and manage receipts and financial records",
        icon: Receipt,
        iconColor: "indigo",
        category: "finances",
        component: ReceiptsModule,
      },
      {
        id: "ai-financial",
        title: "AI Financial Planning",
        description: "AI-powered financial insights and planning",
        icon: Brain,
        iconColor: "pink",
        category: "finances",
        component: AIFinancialPlanningModule,
      },
      {
        id: "approval-system",
        title: "Approval System",
        description: "Financial approval workflows",
        icon: CheckCircle,
        iconColor: "emerald",
        category: "finances",
        component: ApprovalSystemModule,
      },
      {
        id: "monthly-statements",
        title: "Monthly Statements",
        description: "Generate and manage monthly financial statements",
        icon: FileText,
        iconColor: "gray",
        category: "finances",
        component: UserManagementModule, // Placeholder - replace with actual component
      },
      {
        id: "check-requests",
        title: "Reimbursements",
        description: "Process and track reimbursement requests",
        icon: Printer,
        iconColor: "red",
        category: "finances",
        component: ReimbursementsManager,
      },
      {
        id: "merch-store",
        title: "Glee Merch Store",
        description: "Manage merchandise sales and inventory",
        icon: ShoppingCart,
        iconColor: "yellow",
        category: "finances",
        component: UserManagementModule, // Placeholder - replace with actual component
      }
    ]
  },
  {
    id: "libraries",
    title: "Libraries",
    icon: BookOpen,
    color: "emerald",
    description: "PDF sheet music, MP3 audio files, picture collections, and radio management",
    modules: [
      {
        id: "radio-management",
        title: "Radio Management",
        description: "Manage Glee World Radio station, commercials, and broadcasting",
        icon: Radio,
        iconColor: "blue",
        category: "libraries",
        component: RadioManagement,
      }
    ]
  },
  {
    id: "system",
    title: "System",
    icon: Settings,
    color: "gray",
    description: "Platform settings, logs, and administrative tools",
    modules: []
  }
];

export const getModuleById = (moduleId: string) => {
  for (const category of moduleCategories) {
    const module = category.modules.find(m => m.id === moduleId);
    if (module) return module;
  }
  return null;
};

export const getCategoryById = (categoryId: string) => {
  return moduleCategories.find(c => c.id === categoryId) || null;
};