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
  Route
} from 'lucide-react';

import { UserManagementModule } from '@/components/modules/UserManagementModule';
import { WardrobeModule } from '@/components/modules/WardrobeModule';
import { AuditionsModule } from '@/components/modules/AuditionsModule';
import { PermissionsModule } from '@/components/modules/PermissionsModule';
import { StudentIntakeModule } from '@/components/modules/StudentIntakeModule';
import { AttendanceModule } from '@/components/modules/AttendanceModule';
import { TermManagerModule } from '@/components/modules/TermManagerModule';
import { TourManagerModule } from '@/components/modules/TourManagerModule';
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
        component: UserManagementModule, // Placeholder - replace with actual component
      },
      {
        id: "email-management",
        title: "Email Management",
        description: "Configure and send emails to members",
        icon: Mail,
        iconColor: "blue",
        category: "communications",
        component: UserManagementModule, // Placeholder - replace with actual component
      },
      {
        id: "buckets-of-love",
        title: "Buckets of Love",
        description: "Manage community support and encouragement",
        icon: Heart,
        iconColor: "pink",
        category: "communications",
        component: UserManagementModule, // Placeholder - replace with actual component
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
        id: "scheduling-module",
        title: "Scheduling Module",
        description: "Schedule and manage rehearsals and events",
        icon: Clock,
        iconColor: "cyan",
        category: "communications",
        component: UserManagementModule, // Placeholder - replace with actual component
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
    title: "Tours",
    icon: Route,
    color: "blue",
    description: "Tour planning, logistics, scheduling, and management",
    modules: [
      {
        id: "tour-management",
        title: "Tour Manager",
        description: "Comprehensive tour planning, logistics, and management system",
        icon: Route,
        iconColor: "blue",
        category: "tours",
        component: TourManagerModule,
      }
    ]
  },
  {
    id: "wardrobe",
    title: "Wardrobe",
    icon: Shirt,
    color: "purple",
    description: "Costume management, fitting schedules, and inventory",
    modules: [
      {
        id: "wardrobe-management",
        title: "Wardrobe Management",
        description: "Manage costumes, fittings, inventory, and garment distribution",
        icon: Shirt,
        iconColor: "purple",
        category: "wardrobe",
        component: WardrobeModule,
      },
      {
        id: "student-intake",
        title: "Student Intake",
        description: "Process new student registrations and onboarding",
        icon: UserPlus,
        iconColor: "orange",
        category: "wardrobe",
        component: StudentIntakeModule,
      },
      {
        id: "term-management",
        title: "Term Management",
        description: "Manage academic terms, schedules, and term-based planning",
        icon: BookOpen,
        iconColor: "indigo",
        category: "wardrobe",
        component: TermManagerModule,
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
        component: UserManagementModule, // Placeholder - replace with actual component
      },
      {
        id: "budgets",
        title: "Budgets & Planning",
        description: "Financial planning and budget management",
        icon: Calculator,
        iconColor: "green",
        category: "finances",
        component: UserManagementModule, // Placeholder - replace with actual component
      },
      {
        id: "google-ledger",
        title: "Google Ledger",
        description: "Integration with Google Sheets for financial tracking",
        icon: Database,
        iconColor: "orange",
        category: "finances",
        component: UserManagementModule, // Placeholder - replace with actual component
      },
      {
        id: "dues-collection",
        title: "Dues Collection",
        description: "Collect and track member dues",
        icon: CreditCard,
        iconColor: "purple",
        category: "finances",
        component: UserManagementModule, // Placeholder - replace with actual component
      },
      {
        id: "student-payments",
        title: "Student Payments",
        description: "Process student payments and fees",
        icon: Wallet,
        iconColor: "cyan",
        category: "finances",
        component: UserManagementModule, // Placeholder - replace with actual component
      },
      {
        id: "receipts-records",
        title: "Receipts & Records",
        description: "Manage receipts and financial records",
        icon: Receipt,
        iconColor: "indigo",
        category: "finances",
        component: UserManagementModule, // Placeholder - replace with actual component
      },
      {
        id: "ai-financial",
        title: "AI Financial Planning",
        description: "AI-powered financial insights and planning",
        icon: Brain,
        iconColor: "pink",
        category: "finances",
        component: UserManagementModule, // Placeholder - replace with actual component
      },
      {
        id: "approval-system",
        title: "Approval System",
        description: "Financial approval workflows",
        icon: CheckCircle,
        iconColor: "emerald",
        category: "finances",
        component: UserManagementModule, // Placeholder - replace with actual component
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
        title: "Check Requests",
        description: "Process and track check requests",
        icon: Printer,
        iconColor: "red",
        category: "finances",
        component: UserManagementModule, // Placeholder - replace with actual component
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
    description: "PDF sheet music, MP3 audio files, and picture collections",
    modules: []
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