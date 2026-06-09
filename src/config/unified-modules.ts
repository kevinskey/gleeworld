import { UnifiedModule, UnifiedModuleCategory } from '@/types/unified-modules';
import {
  Users, Shirt, ScanLine, Shield, UserPlus, MessageSquare, Bell, Mail, Heart,
  Edit3, Clock, Calendar, DollarSign, FileCheck, Calculator, Database, CreditCard,
  Wallet, Receipt, Brain, CheckCircle, FileText, Printer, ShoppingCart, BookOpen,
  Settings, ClipboardCheck, Route, BarChart, Music, Eye, Megaphone, Camera,
  GraduationCap, Radio, Mic2, QrCode, Layout, Crown, TreePine, Armchair, Wand2,
  Youtube, HeartHandshake, Star, CalendarDays, CalendarClock, UserCog, Landmark,
  Mic, LibraryBig, Package, Volume2, AudioLines, Speech, ListChecks, NotebookPen,
  PenTool, TrendingUp, Inbox, ScrollText, BadgeCheck, Folder, SquareUser, Newspaper,
  ImagePlus, Clapperboard, BookMarked, PencilRuler, Award, MessageCircle, Layers,
  Presentation, MicVocal, Wrench, Contact, ClipboardList,
  Rss, Activity,
} from 'lucide-react';

// Import core module components
import { MusicLibraryInlineModule } from '@/components/modules/MusicLibraryInlineModule';
import { PartTracksModule } from '@/components/modules/PartTracksModule';
import { CheckInCheckOutModule } from '@/components/modules/CheckInCheckOutModule';
import { CalendarModule } from '@/components/modules/CalendarModule';
import { AttendanceModule } from '@/components/modules/AttendanceModule';
import { CourseAttendanceLedger } from '@/components/attendance/CourseAttendanceLedger';
// Hubs are lazy-loaded so a runtime issue in one hub's sub-modules
// doesn't crash the whole module config evaluation.
import { lazy } from 'react';
const SightReadingHub = lazy(() => import('@/components/modules/SightReadingHub').then(m => ({ default: m.SightReadingHub })));
// EnsemblesPage default-exports as a route component; wrap to match the inline-module signature.
const ProgramHealthModule = lazy(() => import('@/pages/admin/Ensembles'));
const CommunicationsHub = lazy(() => import('@/components/modules/CommunicationsHub').then(m => ({ default: m.CommunicationsHub })));
const FinanceHub = lazy(() => import('@/components/modules/FinanceHub').then(m => ({ default: m.FinanceHub })));
import { LazyPermissionsModule } from '@/components/modules/LazyPermissionsModule';
import { AuditionsModule } from '@/components/modules/AuditionsModule';
import { WardrobeModule } from '@/components/modules/WardrobeModule';
import { BucketsOfLoveModule } from '@/components/modules/BucketsOfLoveModule';

import { CalendarManagementModule } from '@/components/modules/CalendarManagementModule';
import { TourManagerModule } from '@/components/modules/TourManagerModule';

import { GraduatesPortalModule } from '@/components/modules/GraduatesPortalModule';
import { GraduatesManagementModule } from '@/components/modules/GraduatesManagementModule';
import { ContractsModule } from '@/components/modules/ContractsModule';

import { HeroManagerModule } from '@/components/modules/HeroManagerModule';
// (DashboardHeroManagerModule was deleted during the 2026-05-31 hero
// consolidation — its functionality now lives in the universal SliderManager.)
const PRHub = lazy(() => import('@/components/modules/PRHub').then(m => ({ default: m.PRHub })));
const AssessmentHub = lazy(() => import('@/components/modules/AssessmentHub').then(m => ({ default: m.AssessmentHub })));
const AIHub = lazy(() => import('@/components/modules/AIHub').then(m => ({ default: m.AIHub })));
import { LibrarianModule } from '@/components/modules/LibrarianModule';
const AppointmentsHub = lazy(() => import('@/components/modules/AppointmentsHub').then(m => ({ default: m.AppointmentsHub })));

import MediaLibrary from '@/pages/admin/MediaLibrary';
import { ProductManagement } from '@/pages/ProductManagement';
import { BowmanScholarsModule } from '@/components/modules/BowmanScholarsModule';
import GleeAcademy from '@/pages/GleeAcademy';
import { QRCodeManagementModule } from '@/components/modules/QRCodeManagementModule';

import { AssignableAppointmentModule } from '@/components/modules/AssignableAppointmentModule';
import { ConcertTicketRequestsModule } from '@/components/modules/ConcertTicketRequestsModule';
import { UsageAnalyticsModule } from '@/components/modules/UsageAnalyticsModule';
import { YouTubeManagement } from '@/components/admin/YouTubeManagement';
import FeedControl from '@/pages/FeedControl';
const FeedControlModule = FeedControl;

// Import alumni-specific modules
import {
  DonationsModule,
  NetworkingMarketplaceModule
} from '@/components/modules/alumni';

// Additional icons for alumni modules
import { 
  Home, 
  PartyPopper, 
  Sparkles, 
  Plane, 
  Globe, 
  Briefcase 
} from 'lucide-react';

// Comprehensive modules list for super admin access
export const UNIFIED_MODULES: UnifiedModule[] = [
  // Core Member modules — Community Hub removed.
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
    id: "part-tracks",
    name: "part-tracks",
    title: "Part Tracks",
    description: "Upload MP3 practice tracks per voice part on each piece",
    icon: Mic,
    iconColor: "purple",
    category: "musical-leadership",
    isActive: true,
    component: PartTracksModule,
    dbFunctionName: "part-tracks"
  },
  {
    // Ensembles + nightly stability scores + AI action plans. The page
    // itself self-gates on the program_health feature flag (redirects to
    // /admin if off), so no extra gating is needed here.
    id: "program-health",
    name: "program-health",
    title: "Program Health",
    description: "Ensembles, stability scores, action plans",
    icon: Activity,
    iconColor: "green",
    category: "musical-leadership",
    isActive: true,
    component: ProgramHealthModule,
    dbFunctionName: "program-health"
  },
  {
    // Member-facing Calendar view. Admins get the full management UI via
    // the calendar-management module entry below.
    id: "calendar",
    name: "calendar",
    title: "Calendar",
    description: "View upcoming events, rehearsals, and important dates",
    icon: Calendar,
    iconColor: "purple",
    category: "member-management",
    isActive: false,
    component: CalendarModule,
    dbFunctionName: "calendar"
  },
  {
    id: "attendance",
    name: "attendance",
    title: "Attendance",
    description: "Track attendance, manage QR codes, process excuses, view records by course",
    icon: ClipboardCheck,
    iconColor: "green",
    category: "member-management",
    isActive: true,
    component: AttendanceModule,
    dbFunctionName: "attendance"
  },
  // Section Assignment removed.

  // Communications Hub — unified entry point (email + announcements + notifications + messenger + sounds)
  {
    id: "communications-hub",
    name: "communications-hub",
    title: "Communications",
    description: "Email, announcements, notifications, messenger, and notification sounds",
    icon: Mail,
    iconColor: "blue",
    category: "communications",
    isActive: true,
    component: CommunicationsHub,
    dbFunctionName: "communications-hub",
    requiredRoles: ["admin", "super-admin"]
  },
  {
    id: "buckets-of-love",
    name: "buckets-of-love",
    title: "Buckets of Love",
    description: "Community support and encouragement (folded into Fan Engagement)",
    icon: HeartHandshake,
    iconColor: "pink",
    category: "communications",
    isActive: false,
    component: BucketsOfLoveModule,
    dbFunctionName: "buckets-of-love"
  },
  // Fan Engagement removed.
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
    id: "appointments-hub",
    name: "appointments-hub",
    title: "Appointments",
    description: "Configure appointment services and manage providers",
    icon: Wrench,
    iconColor: "blue",
    category: "communications",
    isActive: true,
    component: AppointmentsHub,
    dbFunctionName: "appointments-hub",
    requiredRoles: ["admin", "super-admin"]
  },
  {
    // Combined Calendar + Event Scheduler. Admins see create/edit; members see view.
    id: "calendar-management",
    name: "calendar-management",
    title: "Calendar & Events",
    description: "View, create, and manage rehearsals, concerts, and events.",
    icon: CalendarDays,
    iconColor: "purple",
    category: "communications",
    isActive: true,
    component: CalendarManagementModule,
    dbFunctionName: "calendar-management"
  },
  {
    id: "assignable-appointments",
    name: "assignable-appointments",
    title: "My Appointments",
    description: "Merged into Appointments — auto-shown to assigned providers there",
    icon: CalendarClock,
    iconColor: "green",
    category: "communications",
    isActive: false,
    component: AssignableAppointmentModule,
    dbFunctionName: "assignable-appointments",
    requiredRoles: ["service-provider"]
  },

{
    id: "user-management",
    name: "user-management",
    title: "User Management",
    description: "Manage user accounts, roles, and permissions",
    icon: Contact,
    iconColor: "blue",
    category: "member-management",
    isActive: true,
    component: LazyPermissionsModule,
    dbFunctionName: "user-management"
  },
  {
    id: "graduates-portal",
    name: "graduates-portal",
    title: "Alumni Portal",
    description: "Alumni engagement, mentorship, timeline, calendar, and connections",
    icon: Landmark,
    iconColor: "purple",
    category: "member-management",
    isActive: true,
    component: GraduatesPortalModule,
    dbFunctionName: "graduates-portal"
  },
  {
    id: "bowman-scholars",
    name: "bowman-scholars",
    title: "Bowman Scholars",
    description: "Academic excellence program for distinguished students",
    icon: Award,
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
  // Wellness removed.
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

  // Musical Leadership modules — Student Conductor removed.
  // Section Leader removed.
  {
    id: "sight-reading",
    name: "sight-reading",
    title: "Sight Reading",
    description: "Practice, generate exercises, track progress, and run theory polls",
    icon: Eye,
    iconColor: "blue",
    category: "musical-leadership",
    isActive: true,
    component: SightReadingHub,
    dbFunctionName: "sight-reading"
  },
  // (Radio Management module removed 2026-05-31 — Radio.co integration deleted.)
  {
    id: "media-library",
    name: "media-library",
    title: "Media Library",
    description: "Manage images, audio, videos, and documents",
    icon: ImagePlus,
    iconColor: "pink",
    category: "musical-leadership",
    isActive: true,
    component: MediaLibrary,
    dbFunctionName: "media-library"
  },
  // Karaoke Studio removed.
  {
    id: "librarian",
    name: "librarian",
    title: "Music Librarian",
    description: "Manage sheet music collection, PDFs, and hard copy scores",
    icon: LibraryBig,
    iconColor: "purple",
    category: "musical-leadership",
    isActive: true,
    component: LibrarianModule,
    dbFunctionName: "librarian"
  },

  // Finance modules
  // Contracts is now a tab inside Finance, not a standalone module.
  // Finance Hub — unified entry point (ledger + budgets + dues + invoices + stipends + contracts)
  {
    id: "finance-hub",
    name: "finance-hub",
    title: "Finance",
    description: "Ledger, budgets, dues, invoices, and stipends — all in one place",
    icon: Database,
    iconColor: "blue",
    category: "finances",
    isActive: true,
    component: FinanceHub,
    dbFunctionName: "finance-hub",
    requiredRoles: ["admin", "super-admin"]
  },
  {
    id: "merch-store",
    name: "merch-store",
    title: "Merch Store",
    description: "Manage merchandise sales, inventory, and orders",
    icon: ShoppingCart,
    iconColor: "yellow",
    category: "finances",
    isActive: true,
    component: ProductManagement,
    dbFunctionName: "merch-store"
  },


  // Tools & Administration
  {
    id: "hero-manager",
    name: "hero-manager",
    title: "Hero Manager",
    description: "Manage hero images and carousel content",
    icon: Camera,
    iconColor: "blue",
    category: "system",
    isActive: true,
    component: HeroManagerModule,
    dbFunctionName: "hero-manager"
  },
  // Amazon Affiliate removed — not tenant-neutral, niche feature.
  {
    id: "youtube-management",
    name: "youtube-management",
    title: "YouTube Management",
    description: "Manage YouTube video content and playlists",
    icon: Youtube,
    iconColor: "red",
    category: "musical-leadership",
    isActive: true,
    requiredRoles: ["admin", "super-admin"],
    component: YouTubeManagement,
    dbFunctionName: "youtube-management"
  },
  // First Year Console removed.
  // System Settings deleted — its three tabs (module assignments, users, permissions)
  // are already covered by Site Setup, the Users card, and the Permissions card.
  {
    id: "pr-hub",
    name: "pr-hub",
    title: "Public Relations",
    description: "PR operations and downloadable press kits",
    icon: Newspaper,
    iconColor: "pink",
    category: "system",
    isActive: true,
    component: PRHub,
    dbFunctionName: "pr-hub",
    requiredRoles: ["admin", "super-admin"]
  },
  {
    id: "glee-academy",
    name: "glee-academy",
    title: "Glee Academy",
    description: "Classes, lessons, assignments, attendance — the LMS for your program.",
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
    id: "assessment-hub",
    name: "assessment-hub",
    title: "Assessments",
    description: "Reached via Academy → Tools; not shown as a standalone catalog card.",
    icon: ClipboardList,
    iconColor: "indigo",
    category: "education",
    isActive: false,
    component: AssessmentHub,
    dbFunctionName: "assessment-hub",
    requiredRoles: ["admin", "super-admin", "instructor"]
  },
  {
    id: "graduates-management",
    name: "graduates-management",
    title: "Alumni Engagement",
    description: "Graduate engagement add-on — landing page builder, newsletters, interviews, spotlights, and intake forms",
    icon: Layout,
    iconColor: "rose",
    category: "graduates",
    isActive: true,
    component: GraduatesManagementModule,
    fullPageComponent: GraduatesManagementModule,
    dbFunctionName: "graduates-management",
    requiredRoles: ["admin", "super-admin"]
  },
  // Member Dossiers and Survey Module removed.
  {
    id: "usage-analytics",
    name: "usage-analytics",
    title: "Usage Analytics",
    description: "Track student engagement, page views, sessions, and module usage",
    icon: TrendingUp,
    iconColor: "blue",
    category: "member-management",
    isActive: true,
    isNew: true,
    component: UsageAnalyticsModule,
    dbFunctionName: "usage-analytics",
    requiredRoles: ["admin", "super-admin", "instructor"]
  },
  {
    id: "ai-hub",
    name: "ai-hub",
    title: "AI Tools",
    description: "ElevenLabs voice tools, rehearsal transcription, and voice chat with the assistant",
    icon: Wand2,
    iconColor: "purple",
    category: "system",
    isActive: true,
    isNew: true,
    component: AIHub,
    dbFunctionName: "ai-hub",
    requiredRoles: ["admin", "super-admin"]
  },

  // ==================== ALUMNI MODULES ====================
  // Consolidated: alumni-timeline + graduates-connection + graduate-calendar
  // are now sub-sections inside the GraduatesPortalModule. Donations and
  // networking-marketplace remain as standalone modules with distinct flows.
  {
    id: "donations",
    name: "donations",
    title: "Give Back",
    description: "Support the program with your contribution",
    icon: Heart,
    iconColor: "rose",
    category: "graduates",
    isActive: true,
    component: DonationsModule,
    dbFunctionName: "donations",
    requiredRoles: ["alumni", "admin", "super-admin"]
  },
  {
    id: "networking-marketplace",
    name: "networking-marketplace",
    title: "Networking Marketplace",
    description: "Job postings and professional connections",
    icon: Briefcase,
    iconColor: "blue",
    category: "graduates",
    isActive: true,
    component: NetworkingMarketplaceModule,
    dbFunctionName: "networking-marketplace",
    requiredRoles: ["alumni", "admin", "super-admin"]
  },
  {
    id: "feed-control",
    name: "feed-control",
    title: "Feed Control",
    description: "Manage news and scholarship RSS feed sources, filtering, quantity, and timing",
    icon: Rss,
    iconColor: "orange",
    category: "system",
    isNew: true,
    isActive: true,
    component: FeedControlModule,
    dbFunctionName: "feed-control",
    requiredRoles: ["admin", "super-admin"]
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
  },
  {
    id: "graduates",
    title: "Alumni Connection",
    description: "Alumni-specific features, events, networking, and community",
    icon: Heart,
    color: "rose",
    modules: UNIFIED_MODULES.filter(m => m.category === "graduates")
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