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
  BarChart,
  Music,
  Eye,
  Megaphone,
  Camera,
  GraduationCap,
  Radio,
  Mic2,
  QrCode,
  Layout,
  Crown,
  TreePine,
  Armchair,
} from 'lucide-react';

// Import core module components
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
import { PermissionsModule } from '@/components/modules/PermissionsModule';
import { AuditionsModule } from '@/components/modules/AuditionsModule';
import { WardrobeModule } from '@/components/modules/WardrobeModule';
import { EmailManagementModule } from '@/components/modules/EmailManagementModule';
import { BucketsOfLoveModule } from '@/components/modules/BucketsOfLoveModule';
import { SchedulingModule } from '@/components/modules/SchedulingModule';
import { CalendarManagementModule } from '@/components/modules/CalendarManagementModule';
import { TourManagerModule } from '@/components/modules/TourManagerModule';
import { BookingFormsModule } from '@/components/modules/BookingFormsModule';
import { AlumnaePortalModule } from '@/components/modules/AlumnaePortalModule';
import { AlumnaeManagementModule } from '@/components/modules/AlumnaeManagementModule';
import { ContractsModule } from '@/components/modules/ContractsModule';
import { DuesCollectionModule } from '@/components/modules/DuesCollectionModule';
import { WellnessModule } from '@/components/modules/WellnessModule';
import { GleeWritingWidget } from '@/components/writing/GleeWritingWidget';
import { ExecutiveModule } from '@/components/dashboard/modules/ExecutiveModule';
import { FanEngagementModule } from '@/components/modules/FanEngagementModule';
import { KaraokeModule } from '@/components/modules/KaraokeModule';
import { HeroManagerModule } from '@/components/modules/HeroManagerModule';
import { DashboardHeroManagerModule } from '@/components/modules/DashboardHeroManagerModule';
import { PressKitsModule } from '@/components/modules/PressKitsModule';
import { FirstYearConsoleModule } from '@/components/modules/FirstYearConsoleModule';
import { AIToolsModule } from '@/components/modules/AIToolsModule';
import { LibrarianModule } from '@/components/modules/LibrarianModule';
import { AppointmentServiceManager } from '@/components/appointments/AppointmentServiceManager';
import { AppointmentSchedulingModule } from '@/components/modules/AppointmentSchedulingModule';
import MediaLibrary from '@/pages/admin/MediaLibrary';
import { RadioManagement } from '@/components/admin/RadioManagement';
import { TheoryPollModule } from '@/components/modules/TheoryPollModule';
import { ProductManagement } from '@/pages/ProductManagement';
import { BowmanScholarsModule } from '@/components/modules/BowmanScholarsModule';
import { PRManagerModule } from '@/components/modules/PRManagerModule';
import { SightReadingGeneratorModule } from '@/components/modules/SightReadingGeneratorModule';
import { MemberSightReadingModule } from '@/components/modules/MemberSightReadingModule';
import { SightSingingPreviewModule } from '@/components/modules/SightSingingPreviewModule';
import GleeAcademy from '@/pages/GleeAcademy';
import { QRCodeManagementModule } from '@/components/modules/QRCodeManagementModule';
import { ProviderAppointmentModule } from '@/components/modules/ProviderAppointmentModule';
import { AssignableAppointmentModule } from '@/components/modules/AssignableAppointmentModule';
import { ServiceProviderManagementModule } from '@/components/modules/ServiceProviderManagementModule';
import { Mus240GroupsModule } from '@/components/modules/Mus240GroupsModule';
import { AnnouncementsModule } from '@/components/modules/AnnouncementsModule';
import { TestBuilderModule } from '@/components/modules/TestBuilderModule';
import { GleeLedgerModule } from '@/components/admin/financial/GleeLedgerModule';
import { GradingModule } from '@/components/modules/GradingModule';
import { ConcertTicketRequestsModule } from '@/components/modules/ConcertTicketRequestsModule';
import ExitInterviewsModule from '@/components/modules/ExitInterviewsModule';
import ExecBoardInterviewsModule from '@/components/modules/ExecBoardInterviewsModule';
import TreeLightingSurveyModule from '@/components/modules/TreeLightingSurveyModule';
import { GleeLoungeAnalyticsModule } from '@/components/modules/GleeLoungeAnalyticsModule';

// Comprehensive modules list for super admin access
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
    isActive: true,
    component: GleeWritingWidget,
    dbFunctionName: "glee-writing"
  },
  {
    id: "fan-engagement",
    name: "fan-engagement",
    title: "Fan Engagement",
    description: "Manage fan community, bulletin posts, and exclusive content",
    icon: Heart,
    iconColor: "pink",
    category: "communications",
    isActive: true,
    component: FanEngagementModule,
    dbFunctionName: "fan-engagement"
  },
  {
    id: "concert-ticket-requests",
    name: "concert-ticket-requests",
    title: "Concert Tickets",
    description: "Manage concert ticket requests and reservations",
    icon: FileCheck,
    iconColor: "orange",
    category: "communications",
    isActive: true,
    component: ConcertTicketRequestsModule,
    dbFunctionName: "concert-ticket-requests"
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
    component: AppointmentServiceManager,
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
  {
    id: "appointments",
    name: "appointments",
    title: "Appointment System",
    description: "Comprehensive appointment booking and management system",
    icon: Calendar,
    iconColor: "blue",
    category: "communications",
    isActive: true,
    component: AppointmentSchedulingModule,
    dbFunctionName: "appointments"
  },
  {
    id: "provider-appointments",
    name: "provider-appointments",
    title: "Provider Calendar",
    description: "Personal appointment calendar for service providers with external sync capabilities",
    icon: Calendar,
    iconColor: "green",
    category: "communications",
    isActive: true,
    component: ProviderAppointmentModule,
    dbFunctionName: "provider-appointments"
  },
  {
    id: "assignable-appointments",
    name: "assignable-appointments", 
    title: "My Appointments",
    description: "Personal appointment management for assigned service providers",
    icon: Calendar,
    iconColor: "green",
    category: "communications",
    isActive: true,
    component: AssignableAppointmentModule,
    dbFunctionName: "assignable-appointments",
    requiredRoles: ["service-provider"]
  },
  {
    id: "service-provider-management",
    name: "service-provider-management",
    title: "Service Provider Management", 
    description: "Assign and manage users as appointment service providers",
    icon: Users,
    iconColor: "purple",
    category: "communications",
    isActive: true,
    component: ServiceProviderManagementModule,
    dbFunctionName: "service-provider-management",
    requiredRoles: ["admin"]
  },

  // Attendance & Member Management modules
  {
    id: "attendance-management",
    name: "attendance-management",
    title: "Attendance Management",
    description: "Track attendance, manage QR codes, process excuses, and generate reports",
    icon: ClipboardCheck,
    iconColor: "green",
    category: "member-management",
    isActive: true,
    component: AttendanceModule,
    dbFunctionName: "attendance-management"
  },
  {
    id: "user-management",
    name: "user-management",
    title: "User Management",
    description: "Manage user accounts, roles, and permissions",
    icon: Users,
    iconColor: "blue",
    category: "member-management",
    isActive: true,
    component: PermissionsModule,
    dbFunctionName: "user-management"
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
    component: AlumnaePortalModule,
    dbFunctionName: "alumnae-portal"
  },
  {
    id: "bowman-scholars",
    name: "bowman-scholars",
    title: "Bowman Scholars",
    description: "Academic excellence program for distinguished students",
    icon: GraduationCap,
    iconColor: "gold",
    category: "member-management",
    isActive: false,
    component: BowmanScholarsModule,
    dbFunctionName: "bowman-scholars"
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

  // Tours modules
  {
    id: "tour-management",
    name: "tour-management",
    title: "Tour Manager",
    description: "Comprehensive tour planning, logistics, and management system",
    icon: Route,
    iconColor: "blue",
    category: "communications",
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
    category: "communications",
    isActive: true,
    component: BookingFormsModule,
    dbFunctionName: "booking-forms"
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
    id: "radio-management",
    name: "radio-management",
    title: "Radio Management",
    description: "Manage Glee World Radio station, commercials, and broadcasting",
    icon: Radio,
    iconColor: "blue",
    category: "musical-leadership",
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
    category: "musical-leadership",
    isActive: true,
    component: MediaLibrary,
    dbFunctionName: "media-library"
  },
  {
    id: "karaoke",
    name: "karaoke",
    title: "Karaoke Studio",
    description: "Record over backing tracks and save mixes",
    icon: Mic2,
    iconColor: "pink",
    category: "musical-leadership",
    isActive: true,
    component: KaraokeModule,
    dbFunctionName: "karaoke"
  },
  {
    id: "librarian",
    name: "librarian",
    title: "Music Librarian",
    description: "Manage sheet music collection, PDFs, and hard copy scores",
    icon: BookOpen,
    iconColor: "purple",
    category: "musical-leadership",
    isActive: true,
    component: LibrarianModule,
    dbFunctionName: "librarian"
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
    id: "check-requests",
    name: "check-requests",
    title: "Check Requests",
    description: "Process and track check requests",
    icon: Printer,
    iconColor: "red",
    category: "finances",
    isActive: true,
    component: BudgetsModule, // Placeholder for check requests
    dbFunctionName: "check-requests"
  },
  {
    id: "merch-store",
    name: "merch-store",
    title: "Glee Merch Store",
    description: "Manage merchandise sales, inventory, and orders",
    icon: ShoppingCart,
    iconColor: "yellow",
    category: "finances",
    isActive: true,
    component: ProductManagement,
    dbFunctionName: "merch-store"
  },
  {
    id: "receipts-records",
    name: "receipts-records",
    title: "Receipts & Records",
    description: "Manage receipts, financial records, and expense tracking",
    icon: Receipt,
    iconColor: "orange",
    category: "finances",
    isActive: true,
    component: BudgetsModule, // Placeholder for receipts
    dbFunctionName: "receipts-records"
  },
  {
    id: "approval-system",
    name: "approval-system", 
    title: "Approval System",
    description: "Manage approval workflows and requests",
    icon: CheckCircle,
    iconColor: "green",
    category: "finances",
    isActive: true,
    component: BudgetsModule, // Placeholder for approval system
    dbFunctionName: "approval-system"
  },
  {
    id: "glee-ledger",
    name: "glee-ledger",
    title: "Glee Ledger",
    description: "Comprehensive financial ledger and accounting",
    icon: Database,
    iconColor: "blue",
    category: "finances",
    isActive: true,
    component: GleeLedgerModule,
    dbFunctionName: "glee-ledger"
  },
  {
    id: "monthly-statements",
    name: "monthly-statements",
    title: "Monthly Statements",
    description: "Generate and manage monthly financial statements",
    icon: FileText,
    iconColor: "purple",
    category: "finances",
    isActive: true,
    component: BudgetsModule, // Placeholder for statements
    dbFunctionName: "monthly-statements"
  },
  {
    id: "pr-coordinator",
    name: "pr-coordinator",
    title: "PR Coordinator",
    description: "Public relations and marketing coordination",
    icon: Megaphone,
    iconColor: "pink",
    category: "communications",
    isActive: true,
    component: EmailManagementModule, // PR communications
    dbFunctionName: "pr-coordinator"
  },
  {
    id: "communications",
    name: "communications",
    title: "Communications Hub",
    description: "Central communications management and coordination",
    icon: MessageSquare,
    iconColor: "blue",
    category: "communications",
    isActive: true,
    component: EmailManagementModule, // Communications hub
    dbFunctionName: "communications"
  },
  {
    id: "admin-tools",
    name: "admin-tools",
    title: "Admin Tools",
    description: "Administrative tools and system management",
    icon: Settings,
    iconColor: "red",
    category: "system",
    isActive: true,
    component: PermissionsModule, // Admin tools
    dbFunctionName: "admin-tools"
  },
  {
    id: "system-settings",
    name: "system-settings",
    title: "System Settings",
    description: "Advanced system configuration and settings",
    icon: Settings,
    iconColor: "gray",
    category: "system",
    isActive: true,
    component: SettingsModule,
    dbFunctionName: "system-settings"
  },
  {
    id: "executive-board",
    name: "executive-board",
    title: "Executive Board",
    description: "Executive board management and leadership tools",
    icon: Users,
    iconColor: "gold",
    category: "member-management",
    isActive: true,
    component: ExecutiveModule,
    dbFunctionName: "executive-board"
  },


  // Tools & Administration
  {
    id: "ai-tools",
    name: "ai-tools",
    title: "AI Tools",
    description: "Artificial intelligence powered tools and assistance",
    icon: Brain,
    iconColor: "purple",
    category: "system",
    isActive: true,
    component: AIToolsModule,
    dbFunctionName: "ai-tools"
  },
  {
    id: "hero-manager",
    name: "hero-manager",
    title: "Hero Manager",
    description: "Manage hero images and carousel content",
    icon: Camera,
    iconColor: "blue",
    category: "communications",
    isActive: true,
    component: HeroManagerModule,
    dbFunctionName: "hero-manager"
  },
  {
    id: "press-kits",
    name: "press-kits",
    title: "Press Kits",
    description: "Manage press kits and media materials",
    icon: FileText,
    iconColor: "green",
    category: "communications",
    isActive: true,
    component: PressKitsModule,
    dbFunctionName: "press-kits"
  },
  {
    id: "first-year-console",
    name: "first-year-console",
    title: "First Year Console",
    description: "Tools and resources for first-year management",
    icon: GraduationCap,
    iconColor: "cyan",
    category: "member-management",
    isActive: true,
    component: FirstYearConsoleModule,
    dbFunctionName: "first-year-console"
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
  },
  {
    id: "executive",
    name: "executive",
    title: "Executive Board",
    description: "Executive board functions and leadership tools",
    icon: Users,
    iconColor: "gold",
    category: "member-management",
    isActive: true,
    component: ExecutiveModule,
    dbFunctionName: "executive-board-management"
  },
  {
    id: "executive-functions",
    name: "executive-functions",
    title: "Executive Functions",
    description: "Core executive board functions and operations",
    icon: Users,
    iconColor: "blue",
    category: "member-management",
    isActive: true,
    component: ExecutiveModule,
    dbFunctionName: "executive-functions"
  },
  {
    id: "theory-poll",
    name: "theory-poll",
    title: "Theory Poll System",
    description: "Interactive music theory polling and education system",
    icon: BarChart,
    iconColor: "purple",
    category: "musical-leadership",
    isActive: true,
    component: TheoryPollModule,
    dbFunctionName: "theory-poll",
    requiredRoles: ["super-admin", "admin"]
  },
  {
    id: "internal-communications",
    name: "internal-communications",
    title: "Internal Communications",
    description: "Internal messaging and communication tools",
    icon: MessageSquare,
    iconColor: "indigo",
    category: "communications",
    isActive: true,
    component: EmailManagementModule,
    dbFunctionName: "internal-communications"
  },
  {
    id: "announcements",
    name: "announcements",
    title: "Announcements",
    description: "Create and manage club announcements",
    icon: Megaphone,
    iconColor: "amber",
    category: "communications",
    isActive: true,
    component: AnnouncementsModule,
    dbFunctionName: "announcements",
    requiredRoles: ["super-admin", "admin", "exec-board"]
  },
  {
    id: "pr-manager",
    name: "pr-manager",
    title: "PR Manager",
    description: "Public relations and marketing management",
    icon: Megaphone,
    iconColor: "pink",
    category: "communications",
    isActive: true,
    component: PRManagerModule,
    dbFunctionName: "pr-manager"
  },
  {
    id: "executive-board-management",
    name: "executive-board-management",
    title: "Executive Board Management",
    description: "Executive board functions and leadership tools",
    icon: Users,
    iconColor: "gold",
    category: "member-management",
    isActive: true,
    component: ExecutiveModule,
    dbFunctionName: "executive-board-management"
  },
  {
    id: "sight-reading-generator",
    name: "sight-reading-generator",
    title: "Sight Reading Generator",
    description: "Create AI-graded sight reading assignments for students",
    icon: Music,
    iconColor: "blue",
    category: "musical-leadership",
    isActive: true,
    component: SightReadingGeneratorModule,
    dbFunctionName: "sight-reading-generator"
  },
  {
    id: "member-sight-reading-studio",
    name: "member-sight-reading-studio",
    title: "Member Sight Reading Studio",
    description: "Complete assignments, practice sight reading, and track progress",
    icon: Music,
    iconColor: "purple",
    category: "musical-leadership",
    isActive: true,
    component: MemberSightReadingModule,
    dbFunctionName: "member-sight-reading-studio"
  },
  {
    id: "sight-reading-preview",
    name: "sight-reading-preview",
    title: "Sight Reading Preview",
    description: "Preview and navigate to sight reading tools",
    icon: Eye,
    iconColor: "cyan",
    category: "musical-leadership",
    isActive: true,
    component: SightSingingPreviewModule,
    dbFunctionName: "sight-reading-preview"
  },
  {
    id: "ai-financial",
    name: "ai-financial",
    title: "AI Financial Planning",
    description: "AI-powered financial planning and analysis tools",
    icon: Brain,
    iconColor: "green",
    category: "finances",
    isActive: true,
    component: BudgetsModule, // Using existing budget module as placeholder
    dbFunctionName: "ai-financial"
  },
  {
    id: "glee-academy",
    name: "glee-academy",
    title: "Glee Academy",
    description: "Music education platform with courses and private lessons",
    icon: GraduationCap,
    iconColor: "blue",
    category: "education",
    isActive: true,
    component: GleeAcademy,
    dbFunctionName: "glee-academy"
  },
  {
    id: "qr-code-management",
    name: "qr-code-management",
    title: "QR Code Management",
    description: "Generate and manage attendance QR codes for any event or class",
    icon: QrCode,
    iconColor: "purple",
    category: "system",
    isActive: true,
    component: QRCodeManagementModule,
    dbFunctionName: "qr-code-management"
  },
  {
    id: "mus240-groups",
    name: "mus240-groups",
    title: "MUS240 Groups",
    description: "Manage MUS240 course groups and assignments",
    icon: Users,
    iconColor: "green",
    category: "musical-leadership",
    isActive: true,
    component: Mus240GroupsModule,
    dbFunctionName: "mus240-groups"
  },
  {
    id: "test-builder",
    name: "test-builder",
    title: "Glee Academy Test Maker",
    description: "Create and manage tests, quizzes, and assessments for Glee Academy courses",
    icon: GraduationCap,
    iconColor: "indigo",
    category: "education",
    isActive: true,
    component: TestBuilderModule,
    dbFunctionName: "test-builder"
  },
  {
    id: "grading",
    name: "grading",
    title: "Classroom & Grading",
    description: "Manage courses, assignments, and student grades. Students view assignments and progress.",
    icon: GraduationCap,
    iconColor: "blue",
    category: "education",
    isActive: true,
    component: GradingModule,
    dbFunctionName: "grading"
  },
  {
    id: "alumnae-management",
    name: "alumnae-management",
    title: "Alumnae Page Management",
    description: "Comprehensive CMS for managing /alumnae page: hero slides, page builder, newsletters, interviews, forms, and user management",
    icon: Layout,
    iconColor: "rose",
    category: "communications",
    isActive: true,
    component: AlumnaeManagementModule,
    fullPageComponent: AlumnaeManagementModule,
    dbFunctionName: "alumnae-management",
    requiredRoles: ["admin", "super-admin"]
  },
  {
    id: "exit-interviews",
    name: "exit-interviews",
    title: "Exit Interviews",
    description: "View and manage member end-of-semester exit interview submissions",
    icon: ClipboardCheck,
    iconColor: "emerald",
    category: "member-management",
    isActive: true,
    component: ExitInterviewsModule,
    dbFunctionName: "exit-interviews",
    requiredRoles: ["admin", "super-admin"]
  },
  {
    id: "exec-board-interviews",
    name: "exec-board-interviews",
    title: "Exec Board Interviews",
    description: "View and manage executive board end-of-semester interview submissions",
    icon: Crown,
    iconColor: "amber",
    category: "member-management",
    isActive: true,
    component: ExecBoardInterviewsModule,
    dbFunctionName: "exec-board-interviews",
    requiredRoles: ["admin", "super-admin"]
  },
  {
    id: "survey-module",
    name: "survey-module",
    title: "Survey Module",
    description: "View and manage survey responses",
    icon: TreePine,
    iconColor: "green",
    category: "member-management",
    isActive: true,
    component: TreeLightingSurveyModule,
    dbFunctionName: "survey-module",
    requiredRoles: ["admin", "super-admin"]
  },
  {
    id: "glee-lounge-analytics",
    name: "glee-lounge-analytics",
    title: "Glee Lounge Analytics",
    description: "Usage data, engagement metrics, and management tools for Glee Lounge",
    icon: Armchair,
    iconColor: "purple",
    category: "member-management",
    isActive: true,
    component: GleeLoungeAnalyticsModule,
    dbFunctionName: "glee-lounge-analytics",
    requiredRoles: ["admin", "super-admin", "exec"]
  }
];

// Categories with modules grouped
export const UNIFIED_MODULE_CATEGORIES: UnifiedModuleCategory[] = [
  {
    id: "communications",
    title: "Communications & Events",
    description: "Notifications, emails, messaging, scheduling, tours, and event management",
    icon: MessageSquare,
    color: "blue",
    modules: UNIFIED_MODULES.filter(m => m.category === "communications")
  },
  {
    id: "member-management", 
    title: "Member Management",
    description: "User management, attendance, executive board, auditions, permissions, and wellness",
    icon: Users,
    color: "cyan",
    modules: UNIFIED_MODULES.filter(m => m.category === "member-management")
  },
  {
    id: "musical-leadership",
    title: "Musical Leadership & Resources",
    description: "Student conductor, section leaders, sight singing, music library, and media resources",
    icon: Music,
    color: "purple",
    modules: UNIFIED_MODULES.filter(m => m.category === "musical-leadership")
  },
  {
    id: "finances",
    title: "Financial Management",
    description: "Budgets, dues collection, contracts, and merchandise store",
    icon: DollarSign,
    color: "green",
    modules: UNIFIED_MODULES.filter(m => m.category === "finances")
  },
  {
    id: "system",
    title: "System Administration",
    description: "Platform settings, AI tools, and administrative tools",
    icon: Settings,
    color: "gray",
    modules: UNIFIED_MODULES.filter(m => m.category === "system")
  },
  {
    id: "education",
    title: "Education & Learning",
    description: "Glee Academy courses, tests, and educational resources",
    icon: GraduationCap,
    color: "indigo",
    modules: UNIFIED_MODULES.filter(m => m.category === "education")
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