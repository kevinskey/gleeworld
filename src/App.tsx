import { useState, useEffect, lazy, Suspense, ReactNode } from "react";
import { AudioCompanionProvider } from "@/contexts/AudioCompanionContext";
import { TenantFavicon } from "@/components/TenantFavicon";
import { Toaster } from "@/components/ui/toaster";
import { FanRoute } from "@/components/routes/FanRoute";
import { GraduatesRoute } from "@/components/routes/GraduatesRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import GlobalDictation from "@/components/voice/GlobalDictation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TooltipProvider as CustomTooltipProvider } from "@/contexts/TooltipContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/query-core";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext";
import { Mus240SemesterProvider } from "@/contexts/Mus240SemesterContext";
import { CourseProvider } from "@/contexts/CourseContext";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import { DesignSystemEnforcer } from "@/components/ui/design-system-enforcer";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { ServiceWorkerUpdateNotifier } from "@/components/pwa/ServiceWorkerUpdateNotifier";
import { DemoBar } from "@/components/demo/DemoBar";
import { installDemoWriteInterceptor } from "@/lib/demoSession";

// Global fallback that converts read-only-demo RLS rejections into a
// friendly DemoBar toast. No-ops for non-demo sessions (event has no listener).
if (typeof window !== 'undefined') installDemoWriteInterceptor();


import { MessengerProvider } from "@/contexts/MessengerContext";
import { ActiveMeetingProvider } from "@/contexts/ActiveMeetingContext";
import { IosCalendarAutoPull } from "@/components/app/IosCalendarAutoPull";
import { isNativeCalendarAvailable } from "@/plugins/gwCalendar";

import { HomeRoute } from "@/components/routing/HomeRoute";
import { ControlCenterRedirect } from "@/components/routing/ControlCenterRedirect";
import { ScrollToTop } from "@/components/routing/ScrollToTop";

// Heavy dashboard-only globals — gated behind useAuth() so public landing
// visitors don't download their chunks. Each lazy() boundary splits the
// component into its own JS chunk, fetched only after auth resolves a user.
const MessengerModal = lazy(() => import("@/components/messenger/MessengerModal").then((m) => ({ default: m.MessengerModal })));
const PersistentMeetingOverlay = lazy(() => import("@/components/video/PersistentMeetingOverlay").then((m) => ({ default: m.PersistentMeetingOverlay })));
const GlobalMusicPlayer = lazy(() => import("@/components/music/GlobalMusicPlayer").then((m) => ({ default: m.GlobalMusicPlayer })));
const NativePushBridge = lazy(() => import("@/hooks/useNativePush").then((m) => ({ default: m.NativePushBridge })));
import { ModuleRouteRedirect } from "@/components/routing/module-route-redirect";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { NativeTenantGate } from "@/components/native/NativeTenantGate";
import { UsageTracker } from "@/components/tracking/UsageTracker";
const TryDemo = lazy(() => import("./pages/TryDemo"));
const ModulesSettings = lazy(() => import("./pages/admin/ModulesSettings"));
const LandingEditor = lazy(() => import("./pages/admin/LandingEditor"));
const AIRehearsalAssistant = lazy(() => import("./pages/admin/AIRehearsalAssistant"));
const StudentsList = lazy(() => import("./pages/admin/StudentsList"));
const StudentDetail = lazy(() => import("./pages/admin/StudentDetail"));
const RehearsalPlans = lazy(() => import("./pages/admin/RehearsalPlans"));
const Prospects = lazy(() => import("./pages/admin/Prospects"));
const PracticeLog = lazy(() => import("./pages/PracticeLog"));
const AcademyHome = lazy(() => import("./pages/academy/AcademyHome"));
import { AcademyShell } from "./components/academy/AcademyShell";
import { AcademyComingSoon } from "./components/academy/AcademyComingSoon";
const NewCoursePage = lazy(() => import("./pages/academy/NewCoursePage"));
const TourSandbox = lazy(() => import("./sandbox/tour/TourSandbox"));
const GradingQueuePage = lazy(() => import("./pages/academy/GradingQueuePage"));
const CourseStorePage = lazy(() => import("./pages/academy/CourseStorePage"));
const StudentGradesPage = lazy(() => import("./pages/academy/StudentGradesPage"));
const ReportsPage = lazy(() => import("./pages/academy/ReportsPage"));
const CourseAddonsPage = lazy(() => import("./pages/academy/CourseAddonsPage"));
const CourseSettingsPage = lazy(() => import("./pages/academy/CourseSettingsPage"));
const QuizQuestionsPage = lazy(() => import("./pages/academy/QuizQuestionsPage"));
const QuizTakingPage = lazy(() => import("./pages/academy/QuizTakingPage"));
const QuizAttemptsPage = lazy(() => import("./pages/academy/QuizAttemptsPage"));
const QuizAttemptDetailPage = lazy(() => import("./pages/academy/QuizAttemptDetailPage"));
const WorkspaceUsersPage = lazy(() => import("./pages/dashboard/WorkspaceUsersPage"));
const WorkspaceSettingsPage = lazy(() => import("./pages/dashboard/WorkspaceSettingsPage"));
const WorkspaceAnalyticsPage = lazy(() => import("./pages/dashboard/WorkspaceAnalyticsPage"));
const FundraisingPage = lazy(() => import("./pages/dashboard/FundraisingPage"));
const DiscussionThreadPage = lazy(() => import("./pages/academy/DiscussionThreadPage"));
const StudentOnboarding = lazy(() => import("./pages/admin/StudentOnboarding"));
const JoinCourse = lazy(() => import("./pages/JoinCourse"));
const EnrollLanding = lazy(() => import("./pages/EnrollLanding"));
import AuthCallback from "./pages/AuthCallback";
const LtiComplete = lazy(() => import("./pages/auth/LtiComplete"));
const DeepLinkPicker = lazy(() => import("./pages/lti/DeepLinkPicker"));
const LtiPlatforms = lazy(() => import("./pages/admin/LtiPlatforms"));
const CanvasAcademy = lazy(() => import("./pages/academy/CanvasAcademy"));
const CanvasCourseDetail = lazy(() => import("./pages/academy/CanvasCourseDetail"));
const CanvasAssignmentDetail = lazy(() => import("./pages/academy/CanvasAssignmentDetail"));
const CanvasCourseGrades = lazy(() => import("./pages/academy/CanvasCourseGrades"));
const CanvasDiscussionTopic = lazy(() => import("./pages/academy/CanvasDiscussionTopic"));
const CanvasInbox = lazy(() => import("./pages/academy/CanvasInbox"));
const CanvasGradebook = lazy(() => import("./pages/academy/CanvasGradebook"));
const CanvasCalendar = lazy(() => import("./pages/academy/CanvasCalendar"));
const CanvasSpeedGrader = lazy(() => import("./pages/academy/CanvasSpeedGrader"));
const CanvasPeerReview = lazy(() => import("./pages/academy/CanvasPeerReview"));
const CanvasCourseAnalytics = lazy(() => import("./pages/academy/CanvasCourseAnalytics"));
const CanvasQuizEditor = lazy(() => import("./pages/academy/CanvasQuizEditor"));
const CanvasRubricsPage = lazy(() => import("./pages/academy/CanvasRubricsPage"));
const CanvasOutcomes = lazy(() => import("./pages/academy/CanvasOutcomes"));
const CanvasBlueprint = lazy(() => import("./pages/academy/CanvasBlueprint"));
const StudioHome = lazy(() => import("./pages/studio/StudioHome"));
const StudioEditor = lazy(() => import("./pages/studio/StudioEditor"));
const VideoLibrary = lazy(() => import("./pages/video/VideoLibrary"));
const VideoPlayer = lazy(() => import("./pages/video/VideoPlayer"));
const Messenger = lazy(() => import("./pages/admin/Messenger"));
import { Terms, Privacy } from "./pages/Legal";
const ThankYou = lazy(() => import("./pages/ThankYou"));
const RehearsalTonight = lazy(() => import("./pages/academy/RehearsalTonight"));
const CourseShell = lazy(() => import("./pages/academy/CourseShell"));
const TemplateCoursePage = lazy(() => import("./pages/academy/TemplateCoursePage"));
const MusicTheoryFundamentals = lazy(() => import("./pages/MusicTheoryFundamentals"));
const ChoralConductingLiterature = lazy(() => import("./pages/ChoralConductingLiterature"));
const Mus210 = lazy(() => import("./pages/Mus210"));
const Mus210Page = lazy(() => import("./pages/Mus210Page"));
const GleeClubCoursePage = lazy(() => import("./pages/GleeClubCoursePage"));
const NotationBasics = lazy(() => import("./pages/music-theory/NotationBasics"));
const GleeAcademy = lazy(() => import("./pages/GleeAcademy"));
const Contact = lazy(() => import("./pages/Contact"));
const GleeCamGallery = lazy(() => import("./pages/GleeCamGallery"));
const PhotoGalleryPage = lazy(() => import("./pages/PhotoGalleryPage"));
const CourseSelection = lazy(() => import("./pages/CourseSelection"));

// Unified Course Pages
const Mus070Page = lazy(() => import("./pages/courses/Mus070Page"));
const Mus070SyllabusPage = lazy(() => import("./pages/Mus070SyllabusPage"));
const Mus210SyllabusPage = lazy(() => import("./pages/Mus210SyllabusPage"));
const Mus101Page = lazy(() => import("./pages/courses/Mus101Page"));
const Mus001Page = lazy(() => import("./pages/courses/Mus001Page"));
const Mus000Page = lazy(() => import("./pages/courses/Mus000Page"));
const Glee101Page = lazy(() => import("./pages/courses/Glee101Page"));
const AcademyCoursePage = lazy(() => import("./pages/academy/AcademyCoursePage"));
const CourseOnboarding = lazy(() => import("./pages/academy/CourseOnboarding"));
const AcademyCoursesAdmin = lazy(() => import("./pages/admin/AcademyCoursesAdmin"));
const CourseInstructorConsole = lazy(() => import("./pages/courses/CourseInstructorConsole"));
const LH100BowmanScholars = lazy(() => import("./pages/academy/LH100BowmanScholars"));
const PrintableSyllabiPage = lazy(() => import("./pages/academy/PrintableSyllabiPage"));


import Index from "./pages/Index";
const YouTubeChannel = lazy(() => import("./pages/YouTubeChannel"));
const DirectoryPage = lazy(() => import("./pages/DirectoryPage"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ForcePasswordChange = lazy(() => import("./pages/ForcePasswordChange"));
const AuditionApplicationPage = lazy(() => import("./pages/AuditionApplicationPage"));
const FanDashboard = lazy(() => import("./pages/FanDashboard"));
// import AdminDashboard from "./pages/AdminDashboard";
const DuesManagement = lazy(() => import("./pages/DuesManagement").then(m => ({ default: m.DuesManagement })));
const PermissionsPage = lazy(() => import("./pages/admin/Permissions"));
const WeekPage = lazy(() => import("./pages/music-theory/WeekPage"));

const ContractSigning = lazy(() => import("./pages/ContractSigning"));
const AdminSigning = lazy(() => import("./pages/AdminSigning"));
const ActivityLogs = lazy(() => import("./pages/ActivityLogs"));
const W9FormPage = lazy(() => import("./pages/W9FormPage"));
const ParentPermissionSlip = lazy(() => import("./pages/ParentPermissionSlip"));
import NotFound from "./pages/NotFound";
const Accounting = lazy(() => import("./pages/Accounting"));
const DocsArchitecture = lazy(() => import("./pages/DocsArchitecture"));
const DocsApp = lazy(() => import("./features/docs/DocsApp"));
const SavedFeed = lazy(() => import("./pages/SavedFeed"));
const FeedControl = lazy(() => import("./pages/FeedControl"));
const UnifiedDashboard = lazy(() => import("./components/dashboard/UnifiedDashboard").then(m => ({ default: m.UnifiedDashboard })));
const TestBuilderPage = lazy(() => import("./pages/mus240/TestBuilderPage"));
const TestBuilderEdit = lazy(() => import("./pages/TestBuilderEdit"));
// (TestPreview page deleted with the radio purge 2026-05-31 — was the only consumer of useRadioPlayer.)
const StudentTestPage = lazy(() => import("./pages/StudentTestPage"));
const TestScoresPage = lazy(() => import("./pages/TestScoresPage"));
const PollViewPage = lazy(() => import("./pages/PollViewPage"));

const AuditionerDashboardPage = lazy(() => import("./pages/AuditionerDashboardPage"));
const Mus240Auth = lazy(() => import("./pages/Mus240Auth"));

const EventPlanner = lazy(() => import("./pages/EventPlanner"));
const BudgetApprovals = lazy(() => import("./pages/BudgetApprovals"));
const Shop = lazy(() => import("./pages/Shop").then(m => ({ default: m.Shop })));
const PointOfSale = lazy(() => import("./pages/PointOfSale"));
const GraduatesShop = lazy(() => import("./pages/GraduatesShop").then(m => ({ default: m.GraduatesShop })));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage").then(m => ({ default: m.CheckoutPage })));
const StoreSuccess = lazy(() => import("./pages/StoreSuccess").then(m => ({ default: m.StoreSuccess })));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation").then(m => ({ default: m.OrderConfirmation })));
const Payments = lazy(() => import("./pages/Payments"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const Calendar = lazy(() => import("./pages/Calendar"));
import { CalendarViews } from "./components/calendar/CalendarViews";
// Note: Messenger is imported once at line 43 from pages/admin/Messenger (the merged
// Communications hub). The old pages/Messenger.tsx is unused and should be deleted.

const PublicCalendar = lazy(() => import("./pages/PublicCalendar"));
const PressKit = lazy(() => import("./pages/PressKit"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Messages = lazy(() => import("./pages/Messages"));
const EmailComposerPage = lazy(() => import("./pages/EmailComposerPage"));
const OnboardingInfo = lazy(() => import("./pages/OnboardingInfo"));
const MemberRegistration = lazy(() => import("./pages/MemberRegistration"));
const ParentRegistration = lazy(() => import("./pages/ParentRegistration"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const MusicLibraryPage = lazy(() => import("./pages/member/MusicLibraryPage"));
const NewMusicLibraryPage = lazy(() => import("./pages/dashboard/MusicLibraryPage"));
const PartTracksPage = lazy(() => import("./pages/dashboard/PartTracksPage"));
const RepertoirePage = lazy(() => import("./pages/dashboard/RepertoirePage"));
const SeatingChartsDashboardPage = lazy(() => import("./pages/seating-charts/DashboardPage"));
const SeatingChartEditorPage = lazy(() => import("./pages/seating-charts/EditorPage"));
const SeatingChartViewPage = lazy(() => import("./pages/seating-charts/ViewPage"));
const ViewerPage = lazy(() => import("./pages/dashboard/ViewerPage"));
const MusicToolsPage = lazy(() => import("./pages/dashboard/MusicToolsPage"));
const NewMediaLibraryPage = lazy(() => import("./pages/dashboard/MediaLibraryPage"));
const SightReadingStudio = lazy(() => import("./pages/sightReading/SightReadingStudio"));
const ReadingMusicPage = lazy(() => import("./pages/dashboard/ReadingMusicPage"));
const NotationEditorPage = lazy(() => import("./pages/notation/NotationEditorPage"));
const BoxOfficePage = lazy(() => import("./pages/dashboard/BoxOfficePage"));
const BoxOfficeEventPage = lazy(() => import("./pages/dashboard/BoxOfficeEventPage"));
const BoxOfficeCheckinPage = lazy(() => import("./pages/dashboard/BoxOfficeCheckinPage"));
const BoxOfficeWillCallPage = lazy(() => import("./pages/dashboard/BoxOfficeWillCallPage"));
const ConcertTicketsPublicPage = lazy(() => import("./pages/public/ConcertTicketsPublicPage"));
const TicketsOrderPage = lazy(() => import("./pages/public/TicketsOrderPage"));
const BoxOfficeIndexPage = lazy(() => import("./pages/public/BoxOfficeIndexPage"));
const ConcertPlannerPage = lazy(() => import("./pages/dashboard/ConcertPlannerPage"));
const SongwritingLibraryPage = lazy(() => import("./pages/songwriting/SongwritingLibraryPage"));
const SongwritingEditorPage = lazy(() => import("./pages/songwriting/SongwritingEditorPage"));
const PlannerPage = lazy(() => import("./pages/planner/PlannerPage"));
const LiturgyPlannerPage = lazy(() => import("./pages/dashboard/LiturgyPlannerPage"));
const ConcertPlannerEditorPage = lazy(() => import("./pages/dashboard/ConcertPlannerEditorPage"));
const PublicConcertProgramPage = lazy(() => import("./pages/public/PublicConcertProgramPage"));
const AuditionsModule = lazy(() => import("./components/modules/AuditionsModule").then(m => ({ default: m.AuditionsModule })));
const PRHubModule = lazy(() => import("./components/modules/PRHubModule").then(m => ({ default: m.PRHubModule })));
const MemberCalendarPage = lazy(() => import("./pages/member/MemberCalendarPage"));
const AttendancePage = lazy(() => import("./pages/member/AttendancePage"));
const WardrobePage = lazy(() => import("./pages/member/WardrobePage"));
const Announcements = lazy(() => import("./pages/Announcements"));
const CreateAnnouncement = lazy(() => import("./pages/admin/CreateAnnouncement"));
const EditAnnouncement = lazy(() => import("./pages/admin/EditAnnouncement"));
const About = lazy(() => import("./pages/About"));
const AttendanceTestPage = lazy(() => import("./pages/AttendanceTestPage"));
const AttendanceScanPage = lazy(() => import("./pages/AttendanceScanPage"));
const AttendancePinPage = lazy(() => import("./pages/AttendancePinPage"));
// Existing AttendancePage (legacy)
const AttendancePageLegacy = lazy(() => import("./pages/AttendancePage"));

// Redirect that carries the query string along. Bare <Navigate to="/x" />
// clears location.search, which silently breaks deep links like
// /music-library?view=<scoreId> (assistant open-score) and
// /messenger?join=<room> (meeting invites).
const RedirectWithSearch = ({ to }: { to: string }) => {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search }} replace />;
};

const Budgets = lazy(() => import("./pages/Budgets"));
const Treasurer = lazy(() => import("./pages/Treasurer"));

const PerformanceSuite = lazy(() => import("./pages/PerformanceSuite"));
const WellnessSuite = lazy(() => import("./pages/WellnessSuite"));
const FeedbackDashboard = lazy(() => import("./modules/rehearsals/feedback-dashboard/FeedbackDashboard").then(m => ({ default: m.FeedbackDashboard })));
const GraduatesLanding = lazy(() => import("./pages/GraduatesLanding"));
const GraduatesAdmin = lazy(() => import("./pages/admin/GraduatesAdmin"));
const GraduatesManagement = lazy(() => import("./pages/GraduatesManagement"));
const GraduatesPageView = lazy(() => import("./pages/GraduatesPageView"));
const CopyrightPolicy = lazy(() => import("./pages/policies/CopyrightPolicy"));
const TermsOfService = lazy(() => import("./pages/policies/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/policies/PrivacyPolicy"));
const TrustCenter = lazy(() => import("./pages/policies/Security"));
const DataProcessingAddendum = lazy(() => import("./pages/policies/DataProcessingAddendum"));
const GraduatesManagementModule = lazy(() => import("./components/modules/GraduatesManagementModule").then((m) => ({ default: (m as any).GraduatesManagementModule ?? (m as any).default })));
const SendNotificationPage = lazy(() => import("./pages/SendNotificationPage"));
const AuditionPage = lazy(() => import("./pages/AuditionPage"));
const Handbook = lazy(() => import("./pages/Handbook"));
const ScholarshipHub = lazy(() => import("./pages/ScholarshipHub"));
const AdminScholarships = lazy(() => import("./pages/AdminScholarships"));
const AdminProducts = lazy(() => import("./pages/AdminProducts"));
const SectionalManagement = lazy(() => import("./pages/SectionalManagement").then(m => ({ default: m.SectionalManagement })));
const SRFManagement = lazy(() => import("./pages/SRFManagement").then(m => ({ default: m.SRFManagement })));
import { MemberViewDashboard } from "@/components/member-view/MemberViewDashboard";
const GleeClubContactsManagement = lazy(() => import("./pages/GleeClubContactsManagement"));

// Admin module pages
const FinancialManagement = lazy(() => import("./pages/admin/FinancialManagement"));
const EventManagement = lazy(() => import("./pages/admin/EventManagement"));
const EnsemblesPage = lazy(() => import("./pages/admin/Ensembles"));
const MediaLibrary = lazy(() => import("./pages/admin/MediaLibrary"));
const InventoryShop = lazy(() => import("./pages/admin/InventoryShop"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));
const SystemSettings = lazy(() => import("./pages/admin/SystemSettings"));
const AccessControl = lazy(() => import("./pages/admin/AccessControl"));
const DatabaseAdmin = lazy(() => import("./pages/admin/DatabaseAdmin"));
const DocumentsForms = lazy(() => import("./pages/admin/DocumentsForms"));
const TourPlanner = lazy(() => import("./pages/TourPlanner"));
const Weather = lazy(() => import("./pages/Weather"));
const BookingRequest = lazy(() => import("./pages/BookingRequest"));
const BookingForms = lazy(() => import("./pages/BookingForms"));
const Wardrobe = lazy(() => import("./pages/Wardrobe"));
const WardrobeManagementHub = lazy(() => import("./components/wardrobe/WardrobeManagementHub").then(m => ({ default: m.WardrobeManagementHub })));
const ProductManagement = lazy(() => import("./pages/ProductManagement").then(m => ({ default: m.ProductManagement })));
const PRHubPage = lazy(() => import("./pages/PRHubPage"));
const ModulesDirectory = lazy(() => import("./pages/ModulesDirectory"));
const SharedAnnotation = lazy(() => import("./pages/SharedAnnotation").then(m => ({ default: m.SharedAnnotation })));
const ReadMusic = lazy(() => import("./features/read-music/ReadMusic"));
const PublicPageEditor = lazy(() => import("./pages/admin/PublicPageEditor"));
const FanPageEditor = lazy(() => import("./pages/admin/FanPageEditor"));
const FanPage = lazy(() => import("./pages/FanPage"));
const PlatformTenantsPortal = lazy(() => import("./pages/admin/PlatformTenantsPortal"));
const HouseHome = lazy(() => import("./pages/dashboard/HouseHome"));
const PeopleHub = lazy(() => import("./pages/dashboard/PeopleHub"));
const PracticeRecordingsReview = lazy(() => import("./pages/dashboard/PracticeRecordingsReview"));
const MusicToolkitPage = lazy(() => import("./pages/dashboard/MusicToolkitPage"));
const OfficeHoursPage = lazy(() => import("./pages/dashboard/OfficeHoursPage"));
const DashboardShell = lazy(() => import("./components/dashboard/DashboardShell").then(m => ({ default: m.DashboardShell })));
import { TenantThemeRoot } from "@/components/theme/TenantThemeRoot";
const PublicSitePage = lazy(() => import("./pages/PublicSitePage"));
const TrialExpiredPage = lazy(() => import("./pages/TrialExpiredPage"));
import { TrialGuard } from "@/components/routes/TrialGuard";
const MobileScoring = lazy(() => import("./pages/MobileScoring"));
const MemberDirectory = lazy(() => import("./pages/MemberDirectory"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const AuditionsManagement = lazy(() => import("./components/admin/AuditionsManagement").then(m => ({ default: m.AuditionsManagement })));
const SoundCloudSearch = lazy(() => import("./pages/SoundCloudSearch"));
const ShoutcastManagement = lazy(() => import("./pages/admin/ShoutcastManagement").then(m => ({ default: m.ShoutcastManagement })));
const ReceiptsPage = lazy(() => import("./pages/ReceiptsPage").then(m => ({ default: m.ReceiptsPage })));
const ApprovalSystemPage = lazy(() => import("./pages/ApprovalSystemPage"));
import GroupUpdatesPresentation from './pages/mus240/GroupUpdatesPresentation';
import GroupPresentationView from './pages/mus240/GroupPresentationView';
const AssignmentCreatorPage = lazy(() => import("./pages/AssignmentCreator"));
const PracticeStudioPage = lazy(() => import("./pages/PracticeStudioPage"));
const MessagingInterface = lazy(() => import("./components/messaging/MessagingInterface").then(m => ({ default: m.MessagingInterface })));

const BookAppointmentPage = lazy(() => import("./pages/BookAppointmentPage"));
const GoogleDocsPage = lazy(() => import("./pages/GoogleDocs"));
const LibrarianDashboardPage = lazy(() => import("./pages/LibrarianDashboardPage"));
const QRGeneratorPage = lazy(() => import("./pages/QRGenerator"));
const QRScannerPage = lazy(() => import("./pages/QRScanner"));
const QRAnalytics = lazy(() => import("./pages/QRAnalytics"));
const ModuleAccess = lazy(() => import("./pages/admin/ModuleAccess"));
const WardrobeAppointments = lazy(() => import("./pages/WardrobeAppointments"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const FirstYearHub = lazy(() => import("./pages/FirstYearHub"));
const SetupCrewPage = lazy(() => import("./pages/SetupCrewPage"));
const Onboarding = lazy(() => import("./pages/Onboarding").then(m => ({ default: m.Onboarding })));
const AcademyStudentRegistration = lazy(() => import("./pages/AcademyStudentRegistration"));
const ProviderDashboard = lazy(() => import("./components/providers/ProviderDashboard").then(m => ({ default: m.ProviderDashboard })));
import { AdminOnlyRoute } from "./components/auth/AdminOnlyRoute";
import { Mus240EnrollmentRoute } from "./components/auth/Mus240EnrollmentRoute";
import { ProfileCompletionGuard } from "./components/auth/ProfileCompletionGuard";
const TimesheetPage = lazy(() => import("./pages/TimesheetPage"));
const BownaScholarLanding = lazy(() => import("./pages/BownaScholarLanding"));
const SMSTest = lazy(() => import("./pages/SMSTest"));
const MemberExitInterview = lazy(() => import("./pages/MemberExitInterview"));


const ClassLanding = lazy(() => import("./pages/mus240/ClassLanding"));
const SyllabusPage = lazy(() => import("./pages/mus240/SyllabusPage"));
const ListeningHub = lazy(() => import("./pages/mus240/ListeningHub"));
const WeekDetail = lazy(() => import("./pages/mus240/WeekDetail"));
const Resources = lazy(() => import("./pages/mus240/Resources"));
const Groups = lazy(() => import("./pages/mus240/Groups"));
const GroupDetail = lazy(() => import("./pages/mus240/GroupDetail"));
const GroupUpdateForm = lazy(() => import("./pages/mus240/GroupUpdateForm"));
const ResourcesAdmin = lazy(() => import("./pages/mus240/admin/ResourcesAdmin"));

const StudentMidtermGrading = lazy(() => import("./pages/mus240/StudentMidtermGrading").then(m => ({ default: m.StudentMidtermGrading })));
const StudentWorkOverview = lazy(() => import("./pages/mus240/StudentWorkOverview").then(m => ({ default: m.StudentWorkOverview })));
const StudentDashboard = lazy(() => import("./pages/mus240/StudentDashboard").then(m => ({ default: m.StudentDashboard })));
const PeerReviewBrowserPage = lazy(() => import("./pages/mus240/PeerReviewBrowserPage").then(m => ({ default: m.PeerReviewBrowserPage })));
const MidtermExam = lazy(() => import("./pages/mus240/MidtermExam"));
const SMUS100MidtermExamPage = lazy(() => import("./pages/SMUS100MidtermExamPage"));
const CourseStatistics = lazy(() => import("./pages/admin/CourseStatistics"));
const PartnersAdmin = lazy(() => import("./pages/admin/PartnersAdmin"));
const PartnerInviteRedeem = lazy(() => import("./pages/partner/PartnerInviteRedeem"));
const PartnerPortal = lazy(() => import("./pages/partner/PartnerPortal"));
const PartnerProfile = lazy(() => import("./pages/partner/PartnerProfile"));
const PartnerScoresList = lazy(() => import("./pages/partner/PartnerScoresList"));
const PartnerScoreUpload = lazy(() => import("./pages/partner/PartnerScoreUpload"));
const PaymentSuccess = lazy(() => import("./pages/dues-management/PaymentSuccess").then(m => ({ default: m.PaymentSuccess })));

const WritingGraderPage = lazy(() => import("./pages/writing/WritingGraderPage"));
const ChildrenGoAudition = lazy(() => import("./pages/ChildrenGoAudition"));
const EventCheckinPage = lazy(() => import("./pages/EventCheckinPage"));
const ChildrenGoAuditionsAdmin = lazy(() => import("./pages/admin/ChildrenGoAuditionsAdmin"));
const ConcertTicketRequest = lazy(() => import("./pages/ConcertTicketRequest"));
const ConcertTicketAdmin = lazy(() => import("./pages/admin/ConcertTicketAdmin"));
const RegistrationThankYou = lazy(() => import("./pages/RegistrationThankYou"));

const GrandStaves = lazy(() => import("./pages/GrandStaves"));
const GrandStaffClassroom = lazy(() => import("./pages/GrandStaffClassroom"));
const Mus240PollPage = lazy(() => import("./pages/Mus240PollPage").then(m => ({ default: m.Mus240PollPage })));
const JazzPage = lazy(() => import("./pages/mus240/JazzPage"));
const Tour2026Page = lazy(() => import("./pages/Tour2026Page"));
const BusInformation = lazy(() => import("./pages/BusInformation"));
const StudentSchedulesPage = lazy(() => import("./pages/StudentSchedulesPage"));

// Grading System
const InstructorDashboard = lazy(() => import("./pages/grading/instructor/InstructorDashboard"));
const GradingAdminDashboard = lazy(() => import("./pages/grading/admin/GradingAdminDashboard"));
const CoursePage = lazy(() => import("./pages/grading/instructor/CoursePage"));
const AssignmentSubmissionsPage = lazy(() => import("./pages/grading/instructor/AssignmentSubmissionsPage"));
const SubmissionGradingPage = lazy(() => import("./pages/grading/instructor/SubmissionGradingPage"));
const GradebookPage = lazy(() => import("./pages/grading/instructor/GradebookPage"));
const ManageStudents = lazy(() => import("./pages/grading/instructor/ManageStudents"));
const GradingStudentDashboard = lazy(() => import("./pages/grading/student/StudentDashboard"));
const StudentCoursePage = lazy(() => import("./pages/grading/student/StudentCoursePage"));
const StudentAssignmentPage = lazy(() => import("./pages/grading/student/StudentAssignmentPage"));
const CourseAudioPage = lazy(() => import("./pages/courses/CourseAudioPage"));
const GlobalMiniPlayer = lazy(() => import("./components/audio/GlobalMiniPlayer").then((m) => ({ default: m.GlobalMiniPlayer })));
import { ModuleGate } from "./components/auth/ModuleGate";
import { StoreShell } from "./pages/store/StoreShell";
const StorePage = lazy(() => import("./pages/store/StorePage"));
const StoreScoreDetail = lazy(() => import("./pages/store/StoreScoreDetail"));
const StorePartnerPage = lazy(() => import("./pages/store/StorePartnerPage"));
const StoreThanksPage = lazy(() => import("./pages/store/StoreThanksPage"));

// Legacy MUS240 redirect component
const LegacyMus240Redirect = () => {
  const location = useLocation();
  const newPath = location.pathname.replace('/classes/mus240', '/mus-240');
  return <Navigate to={newPath} replace />;
};

// /dashboard/part-tracks briefly redirected to /studio after the old
// editor retired (2026-07-29); it now hosts the PartTrack rehearsal-track
// pipeline (PR #335).

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Treat data as fresh for 60s so route revisits / sibling components
      // sharing a queryKey reuse the cache instead of refetching on every
      // mount. gcTime keeps unused entries for 5 min before eviction so
      // back-nav restores instantly. Real-time consumers (Messenger, etc.)
      // override these with `staleTime: 0` at the useQuery site.
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    },
  },
});

// Check if user needs forced password change (Jan 13-17, 2026)
// Protected route wrapper with profile completion check
const ProtectedRoute = ({ children, skipProfileCheck = false }: { children: ReactNode; skipProfileCheck?: boolean }) => {
  const location = useLocation();
  
  try {
    const { user, loading } = useAuth();
  
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <LoadingSpinner size="lg" text="Loading..." />
        </div>
      );
    }
  
    if (!user) {
      const currentPath = window.location.pathname + window.location.search;
      if (sessionStorage.getItem('explicit-signout') === '1') {
        // User just signed out on this page — don't replay it on next login.
        sessionStorage.removeItem('explicit-signout');
      } else if (currentPath !== '/auth' && currentPath !== '/' && !currentPath.startsWith('/auth')) {
        sessionStorage.setItem('redirectAfterAuth', currentPath);
      }
      return <Navigate to="/auth" replace />;
    }
    
    // Provisioned admins arrive with a temp password: the superadmin API sets
    // must_change_password at user creation and ForcePasswordChange clears it.
    if (
      user.user_metadata?.must_change_password === true &&
      location.pathname !== '/force-password-change'
    ) {
      return <Navigate to="/force-password-change" replace />;
    }

    // Skip profile check for specific pages
    if (skipProfileCheck) {
      return <TrialGuard>{children}</TrialGuard>;
    }

    return <ProfileCompletionGuard><TrialGuard>{children}</TrialGuard></ProfileCompletionGuard>;
  } catch (error) {
    console.error('ProtectedRoute error:', error);
    return <Navigate to="/auth" replace />;
  }
};

// Redirect /instructor/:courseCode → /:courseCode/instructor/console
const InstructorRedirect = () => {
  const { courseCode } = useParams<{ courseCode: string }>();
  return <Navigate to={`/${courseCode}/instructor/console`} replace />;
};

// Public route wrapper - no auth check needed
const PublicRoute = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};


// Gated wrapper for the heavy global components — only mounted (and their
// JS chunks fetched) once a user session exists. Public landing visitors
// never download MessengerModal / GlobalMusicPlayer / GlobalMiniPlayer /
// PersistentMeetingOverlay / NativePushBridge code.
function AuthenticatedGlobals() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Suspense fallback={null}>
      <NativePushBridge />
      <PersistentMeetingOverlay />
      <MessengerModal />
      <GlobalMiniPlayer />
    </Suspense>
  );
}

const App = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <QueryClientProvider client={queryClient}>
        <TenantThemeRoot />
        <NativeTenantGate>
        <AuthProvider>
          {isNativeCalendarAvailable() && <IosCalendarAutoPull />}
          <ThemeProvider>
            <TooltipProvider>
              <CustomTooltipProvider>
                <MusicPlayerProvider>
                  <Mus240SemesterProvider>
                  <CourseProvider>
                  <MessengerProvider>
                  <ActiveMeetingProvider>
                  <AudioCompanionProvider>
                  <div>
                  <TenantFavicon />
                  <Toaster />
                  <Sonner />
                  <GlobalDictation />
                  <ServiceWorkerUpdateNotifier />

                  <AuthenticatedGlobals />
                  <DesignSystemEnforcer />
                  <UsageTracker>
                  <DemoBar />
                  <Suspense
                    fallback={
                      <div className="min-h-screen bg-background flex items-center justify-center">
                        <LoadingSpinner size="lg" text="Loading..." />
                      </div>
                    }
                  >
                    <Routes>
                    {/* Root route */}
                    <Route 
                      path="/"
                      element={
                        <PublicRoute>
                          <HomeRoute />
                        </PublicRoute>
                      }
                    />
              <Route path="/terms" element={<PublicRoute><TermsOfService /></PublicRoute>} />
              <Route path="/terms-of-service" element={<PublicRoute><TermsOfService /></PublicRoute>} />
              <Route path="/privacy" element={<PublicRoute><PrivacyPolicy /></PublicRoute>} />
              <Route path="/privacy-policy" element={<PublicRoute><PrivacyPolicy /></PublicRoute>} />
              <Route path="/copyright-policy" element={<PublicRoute><CopyrightPolicy /></PublicRoute>} />
              <Route path="/security" element={<PublicRoute><TrustCenter /></PublicRoute>} />
              <Route path="/trust" element={<PublicRoute><TrustCenter /></PublicRoute>} />
              <Route path="/dpa" element={<PublicRoute><DataProcessingAddendum /></PublicRoute>} />
              <Route path="/data-processing-addendum" element={<PublicRoute><DataProcessingAddendum /></PublicRoute>} />
              <Route path="/thank-you" element={<PublicRoute><ThankYou /></PublicRoute>} />
              <Route
                path="/academy/:courseCode/rehearsal-today"
                element={
                  <ProtectedRoute>
                    <RehearsalTonight />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academy/c/:code"
                element={
                  <ProtectedRoute>
                    <CourseShell />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academy/templates/:courseId"
                element={
                  <ProtectedRoute>
                    <TemplateCoursePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/auth"
                element={
                  <PublicRoute>
                    <AuthPage />
                  </PublicRoute>
                }
              />
              {/* Paywall — reached when TrialGuard redirects an expired
                  tenant. Registered publicly (no ProtectedRoute) so the guard
                  can't loop back through itself. The page itself checks
                  useAuth to decide whether to show a sign-out or sign-in
                  link, and bounces back home if the trial is not actually
                  expired (stale link, superadmin fixed it, etc). */}
              <Route path="/paywall" element={<TrialExpiredPage />} />
              {/* Sandbox: animated cursor + spotlight tour over a mock Command Center.
                  Gated by ?key=preview inside the component itself. */}
              <Route path="/tour-sandbox" element={<TourSandbox />} />
              {/* One-click prospect demo entry — mints a read-only Director session. */}
              <Route path="/try" element={<TryDemo />} />
              <Route 
                path="/auth/mus240" 
                element={
                  <PublicRoute>
                    <Mus240Auth />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/onboarding" 
                element={
                  <PublicRoute>
                    <Onboarding />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/registration-thank-you" 
                element={
                  <PublicRoute>
                    <RegistrationThankYou />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/onboarding-info" 
                element={
                  <PublicRoute>
                    <OnboardingInfo />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/join" 
                element={
                  <PublicRoute>
                    <MemberRegistration />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/concert-ticket-request" 
                element={
                  <PublicRoute>
                    <ConcertTicketRequest />
                  </PublicRoute>
                } 
              />
              {/* Event Check-in via QR Code */}
              <Route 
                path="/event-checkin/:token" 
                element={
                  <PublicRoute>
                    <EventCheckinPage />
                  </PublicRoute>
                } 
              />
              {/* Attendance PIN Entry (fallback for QR) */}
              <Route 
                path="/attendance/pin" 
                element={
                  <ProtectedRoute>
                    <AttendancePinPage />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/register/parent"
                element={
                  <PublicRoute>
                    <ParentRegistration />
                  </PublicRoute>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <PublicRoute>
                    <ResetPassword />
                  </PublicRoute>
                }
              />
              <Route 
                path="/force-password-change"
                element={
                  <ProtectedRoute skipProfileCheck>
                    <ForcePasswordChange />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/audition-application" 
                element={
                  <PublicRoute>
                    <AuditionApplicationPage />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/academy-student-registration" 
                element={
                  <PublicRoute>
                    <AcademyStudentRegistration />
                  </PublicRoute>
                } 
              />
              {/* Glee Academy page */}
              <Route 
                path="/glee-academy" 
                element={
                  <PublicRoute>
                    <GleeAcademy />
                  </PublicRoute>
                } 
              />
              {/* Contact page */}
              <Route 
                path="/contact" 
                element={
                  <PublicRoute>
                    <Contact />
                  </PublicRoute>
                } 
              />
              {/* Architecture documentation - publicly accessible */}
              <Route
                path="/docs/architecture"
                element={<DocsArchitecture />}
              />
              {/* User manual / help center - publicly accessible */}
              <Route
                path="/docs/*"
                element={<DocsApp />}
              />
              {/* Glee Cam Gallery */}
              <Route 
                path="/glee-cam/:categorySlug" 
                element={<GleeCamGallery />} 
              />
              {/* MUS 100 - Music Theory Fundamentals */}
              <Route 
                path="/mus-100" 
                element={
                  <PublicRoute>
                    <MusicTheoryFundamentals />
                  </PublicRoute>
                } 
              />
              {/* Legacy redirect */}
              <Route path="/music-theory-fundamentals" element={<Navigate to="/mus-100" replace />} />
              
              {/* MUS 210 - Legacy redirects to academy */}
              <Route path="/mus-210" element={<Navigate to="/academy/mus-210" replace />} />
              <Route path="/choral-conducting-literature" element={<Navigate to="/academy/mus-210" replace />} />
              <Route path="/classes/mus210" element={<Navigate to="/academy/mus-210" replace />} />
              
              {/* /academy base — Academy environment dashboard (role-aware). */}
              <Route
                path="/academy"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <AcademyShell><AcademyHome /></AcademyShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              {/* Academy sub-routes — placeholders for the teacher tools. */}
              <Route
                path="/academy/grading"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <AcademyShell><GradingQueuePage /></AcademyShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academy/reports"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <AcademyShell><ReportsPage /></AcademyShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academy/store"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <AcademyShell><CourseStorePage /></AcademyShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academy/grades"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <AcademyShell><StudentGradesPage /></AcademyShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academy/new"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <AcademyShell><NewCoursePage /></AcademyShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academy/c/:code/addons"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <AcademyShell><CourseAddonsPage /></AcademyShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academy/c/:code/settings"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <AcademyShell><CourseSettingsPage /></AcademyShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academy/c/:code/test/:testId/questions"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <AcademyShell><QuizQuestionsPage /></AcademyShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academy/c/:code/test/:testId/take"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <AcademyShell><QuizTakingPage /></AcademyShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academy/c/:code/test/:testId/attempts"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <AcademyShell><QuizAttemptsPage /></AcademyShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academy/c/:code/test/:testId/attempts/:attemptId"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <AcademyShell><QuizAttemptDetailPage /></AcademyShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/users"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <DashboardShell><WorkspaceUsersPage /></DashboardShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/workspace"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <DashboardShell><WorkspaceSettingsPage /></DashboardShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/analytics"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <DashboardShell><WorkspaceAnalyticsPage /></DashboardShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/fundraising"
                element={
                  <ProtectedRoute>
                    <FundraisingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students/onboard"
                element={
                  <ProtectedRoute>
                    <UniversalLayout>
                      <StudentOnboarding />
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/join/:code" element={<PublicRoute><JoinCourse /></PublicRoute>} />
              <Route path="/enroll" element={<PublicRoute><EnrollLanding /></PublicRoute>} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/lti" element={<LtiComplete />} />
              <Route path="/lti/deep-link" element={<ProtectedRoute><DeepLinkPicker /></ProtectedRoute>} />
              <Route path="/dashboard/lti-platforms" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><LtiPlatforms /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasAcademy /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/courses/:courseId" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasCourseDetail /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/courses/:courseId/assignments/:assignmentId" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasAssignmentDetail /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/courses/:courseId/grades" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasCourseGrades /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/courses/:courseId/discussions/:topicId" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasDiscussionTopic /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/inbox" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasInbox /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/inbox/:conversationId" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasInbox /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/courses/:courseId/gradebook" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasGradebook /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/calendar" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasCalendar /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/courses/:courseId/assignments/:assignmentId/grade" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasSpeedGrader /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/courses/:courseId/assignments/:assignmentId/peer-review/:userId" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasPeerReview /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/courses/:courseId/analytics" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasCourseAnalytics /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/courses/:courseId/quizzes/:quizId/edit" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasQuizEditor /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/courses/:courseId/rubrics" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasRubricsPage /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/courses/:courseId/outcomes" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasOutcomes /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/academy/canvas/courses/:courseId/blueprint" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><CanvasBlueprint /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/studio" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><StudioHome /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/studio/sessions/:id" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><StudioEditor /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/video" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><YouTubeChannel /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              {/* Legacy Studio recording library (upload/render pipeline) — kept
                  accessible from Studio; the main /video route is now the shared
                  library. */}
              <Route path="/studio/videos" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><VideoLibrary /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              <Route path="/studio/videos/:id" element={<ProtectedRoute><UniversalLayout showHeader={false} showFooter={false} containerized={false}><DashboardShell><VideoPlayer /></DashboardShell></UniversalLayout></ProtectedRoute>} />
              {/* Legacy /video/:id → studio player (backward compat). */}
              <Route path="/video/:id" element={<Navigate to="/studio/videos" replace />} />
              <Route
                path="/academy/c/:code/discuss/:threadId"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <AcademyShell><DiscussionThreadPage /></AcademyShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />

              {/* Printable Syllabi Page - must be before wildcard route */}
              <Route
                path="/academy/printable-syllabi"
                element={
                  <ProtectedRoute>
                    <PrintableSyllabiPage />
                  </ProtectedRoute>
                }
              />
              
              {/* Course Audio Page - must be before wildcard route */}
              <Route 
                path="/academy/:courseCode/audio" 
                element={
                  <ProtectedRoute>
                    <CourseAudioPage />
                  </ProtectedRoute>
                }
              />
              
              {/* Course Onboarding Page - for non-enrolled users (must be before wildcard route) */}
              <Route 
                path="/academy/:courseCode/onboarding" 
                element={
                  <PublicRoute>
                    <CourseOnboarding />
                  </PublicRoute>
                }
              />
              
              {/* LH 100 Bowman Scholars - Uses unified course template */}
              <Route 
                path="/academy/lh-100/*" 
                element={
                  <PublicRoute>
                    <AcademyCoursePage />
                  </PublicRoute>
                }
              />
              
              {/* Dynamic Academy Course Page - handles all courses */}
              <Route 
                path="/academy/:courseCode/*" 
                element={
                  <PublicRoute>
                    <AcademyCoursePage />
                  </PublicRoute>
                }
              />
              
              {/* Dynamic Instructor Console - handles all courses */}
              <Route 
                path="/:courseCode/instructor/console" 
                element={
                  <ProtectedRoute>
                    <CourseInstructorConsole />
                  </ProtectedRoute>
                }
              />
              {/* Shorthand /instructor/:courseCode → canonical /:courseCode/instructor/console */}
              <Route 
                path="/instructor/:courseCode" 
                element={<InstructorRedirect />}
              />
              
              {/* Legacy course lounge redirect - now goes to dashboard */}
              <Route path="/course-lounge/:courseId" element={<Navigate to="/dashboard" replace />} />
              
              {/* Legacy booking page — now redirects into the dashboard shell so
                  every link / bookmark in the wild lands on the redesigned UI. */}
              <Route path="/book-appointment" element={<Navigate to="/dashboard/office-hours" replace />} />
              {/* Control Center retired for tenants — every tenant uses the
                  Command Center at /dashboard now. But the platform owner's
                  old /control-center bookmarks should land on the mother
                  site (/admin/tenants), not an ordinary tenant dashboard —
                  ControlCenterRedirect branches on role. */}
              <Route
                path="/control-center"
                element={
                  <ProtectedRoute>
                    <ControlCenterRedirect />
                  </ProtectedRoute>
                }
              />
              {/* Read Music — practice studio (add-on module) */}
              <Route
                path="/read-music/*"
                element={
                  <ProtectedRoute>
                    <UniversalLayout>
                      <ReadMusic />
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              {/* Legacy site-setup route: the page builder is now the single
                  source of truth for branding + theme + blocks. */}
              <Route path="/admin/site-setup" element={<Navigate to="/admin/public-page" replace />} />
              {/* Public landing page builder for tenants — inside the dashboard
                  shell so the sidebar + topbar (and the way back to Command
                  Center) render alongside the editor. */}
              <Route
                path="/admin/public-page"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <DashboardShell><PublicPageEditor /></DashboardShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              {/* Fan landing page builder (signed-in fans see the published version at /fan) */}
              <Route
                path="/admin/fan-page"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <DashboardShell><FanPageEditor /></DashboardShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              {/* Platform Home — the mother site's landing page (pickDestination()
                  sends the platform owner here straight after login). Force
                  DashboardShell explicitly: UniversalLayout only auto-renders it
                  for tenant subdomains, and on the main tenant this route would
                  otherwise fall back to the public marketing chrome instead of
                  the app sidebar/nav Kevin expects on "his dash". */}
              <Route
                path="/admin/tenants"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <DashboardShell>
                        <PlatformTenantsPortal />
                      </DashboardShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              {/* Published tenant public sites — no auth */}
              <Route path="/sites/:slug" element={<PublicSitePage />} />
              <Route
                path="/admin/ai-rehearsal"
                element={
                  <ProtectedRoute>
                    <UniversalLayout>
                      <AIRehearsalAssistant />
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students"
                element={
                  <ProtectedRoute>
                    <UniversalLayout>
                      <StudentsList />
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students/:id"
                element={
                  <ProtectedRoute>
                    <UniversalLayout>
                      <StudentDetail />
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/rehearsal-plans"
                element={
                  <ProtectedRoute>
                    <UniversalLayout>
                      <RehearsalPlans />
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/prospects"
                element={
                  <ProtectedRoute>
                    <UniversalLayout>
                      <Prospects />
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/practice/log"
                element={
                  <ProtectedRoute>
                    <UniversalLayout>
                      <PracticeLog />
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messenger"
                element={<RedirectWithSearch to="/dashboard/messenger" />}
              />
              <Route
                path="/admin/communications"
                element={<Navigate to="/communications" replace />}
              />
              <Route
                path="/communications"
                element={
                  <ProtectedRoute>
                    <UniversalLayout>
                      <Messenger />
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              {/* Modules catalog + add-on activation */}
              <Route
                path="/settings/modules"
                element={
                  <ProtectedRoute>
                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                      <DashboardShell><ModulesSettings /></DashboardShell>
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
              {/* Landing page editor (admin) */}
              <Route
                path="/admin/landing-editor"
                element={
                  <ProtectedRoute>
                    <UniversalLayout>
                      <LandingEditor />
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />

              {/* Legacy redirects to new academy structure */}
              <Route path="/glee-club-course" element={<Navigate to="/academy/mus-070" replace />} />
              <Route path="/mus-070" element={<Navigate to="/academy/mus-070" replace />} />
              <Route path="/mus-070/syllabus" element={<Mus070SyllabusPage />} />
              <Route path="/academy/mus-070/syllabus" element={<Mus070SyllabusPage />} />
              <Route path="/mus-210/syllabus" element={<Mus210SyllabusPage />} />
              <Route path="/academy/mus-210/syllabus" element={<Mus210SyllabusPage />} />
              <Route path="/mus-101" element={<Navigate to="/academy/mus-101" replace />} />
              <Route path="/mus-001" element={<Navigate to="/academy/mus-001" replace />} />
              <Route path="/mus-000" element={<Navigate to="/academy/mus-000" replace />} />
              <Route path="/glee-101" element={<Navigate to="/academy/glee-101" replace />} />
              <Route path="/mus-240" element={<Navigate to="/academy/mus-240" replace />} />
              <Route path="/bowman-scholars" element={<Navigate to="/academy/lh-100" replace />} />
              <Route path="/lh-100" element={<Navigate to="/academy/lh-100" replace />} />
              {/* Grand Staff Classroom page */}
              <Route 
                path="/grand-staff-classroom" 
                element={
                  <PublicRoute>
                    <GrandStaffClassroom />
                  </PublicRoute>
                } 
              />
              {/* Notation Basics page */}
              <Route 
                path="/music-theory/notation-basics" 
                element={
                  <PublicRoute>
                    <NotationBasics />
                  </PublicRoute>
                } 
              />
              {/* Music Theory Week pages */}
              <Route 
                path="/music-theory/week/:weekNumber" 
                element={
                  <PublicRoute>
                    <WeekPage />
                  </PublicRoute>
                } 
              />
              {/* Writing Grader page */}
              <Route 
                path="/writing-grader" 
                element={
                  <PublicRoute>
                    <WritingGraderPage />
                  </PublicRoute>
                } 
               />
               {/* Grand Staves page */}
               <Route 
                 path="/grand-staves" 
                 element={
                   <PublicRoute>
                     <GrandStaves />
                   </PublicRoute>
                 } 
               />
               {/* SMUS-100 Midterm Exam */}
               <Route 
                 path="/smus100-midterm-exam" 
                 element={
                   <PublicRoute>
                     <SMUS100MidtermExamPage />
                   </PublicRoute>
                 } 
               />
               {/* MUS100 Sight Singing Practice - retired, redirects to canonical sight-reading studio */}
               <Route
                 path="/mus100-sight-singing"
                 element={<Navigate to="/dashboard/sight-reading" replace />}
               />
              {/* MUS 240 Poll System */}
              <Route 
                path="/mus240-polls" 
                element={
                  <ProtectedRoute>
                    <Mus240EnrollmentRoute>
                      <Mus240PollPage />
                    </Mus240EnrollmentRoute>
                  </ProtectedRoute>
                } 
              />
              {/* Poll View Page - accessible to authenticated users */}
              <Route 
                path="/polls/:pollId" 
                element={
                  <ProtectedRoute>
                    <PollViewPage />
                  </ProtectedRoute>
                } 
              />
              {/* Legacy routes - redirect to dashboard */}
              <Route 
                path="/glee-lounge" 
                element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" replace />
                  </ProtectedRoute>
                } 
              />
              {/* /community-hub route removed with Community Hub module. */}
              <Route 
                path="/community" 
                element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" replace />
                  </ProtectedRoute>
                } 
              />
              {/* Contract signing should be accessible without authentication */}
              <Route 
                path="/contract-signing/:contractId" 
                element={<ContractSigning />} 
              />
              {/* W9 form should be accessible without authentication */}
              <Route 
                path="/w9-form" 
                element={<W9FormPage />} 
              />
              <Route 
                path="/admin-signing" 
                element={
                  <ProtectedRoute>
                    <AdminSigning />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/activity-logs" 
                element={
                  <ProtectedRoute>
                    <ActivityLogs />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/accounting" 
                element={
                  <ProtectedRoute>
                    <Accounting />
                  </ProtectedRoute>
                } 
               />
               {/* /admin routes — only deep links below, no bare /admin home. */}
                 <Route
                   path="/admin/partners"
                   element={
                     <ProtectedRoute>
                       <AdminOnlyRoute>
                         <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                           <DashboardShell><PartnersAdmin /></DashboardShell>
                         </UniversalLayout>
                       </AdminOnlyRoute>
                     </ProtectedRoute>
                   }
                 />
                 <Route
                   path="/partner/invite/:token"
                   element={
                     <ProtectedRoute>
                       <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                         <DashboardShell><PartnerInviteRedeem /></DashboardShell>
                       </UniversalLayout>
                     </ProtectedRoute>
                   }
                 />
                 <Route
                   path="/partner"
                   element={
                     <ProtectedRoute>
                       <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                         <DashboardShell><PartnerPortal /></DashboardShell>
                       </UniversalLayout>
                     </ProtectedRoute>
                   }
                 >
                   <Route index element={<PartnerProfile />} />
                   <Route path="profile" element={<PartnerProfile />} />
                   <Route path="scores" element={<PartnerScoresList />} />
                   <Route path="scores/new" element={<PartnerScoreUpload />} />
                 </Route>
                 <Route
                   path="/admin/academy-courses" 
                   element={
                     <ProtectedRoute>
                       <AdminOnlyRoute>
                         <UniversalLayout>
                           <AcademyCoursesAdmin />
                         </UniversalLayout>
                       </AdminOnlyRoute>
                     </ProtectedRoute>
                   } 
                 />
                <Route 
                  path="/course-selection" 
                  element={
                    <ProtectedRoute>
                      <CourseSelection />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <HouseHome />
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/people"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <PeopleHub />
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                {/* In-shell module routes — render each module's page inside
                    the dashboard sidebar so navigation stays put. */}
                <Route
                  path="/dashboard/messenger"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><Messenger /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/calendar"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><CalendarViews /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/practice-recordings"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><PracticeRecordingsReview /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/academy"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><AcademyHome /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/music-toolkit"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><MusicToolkitPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/music-library"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><NewMusicLibraryPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/repertoire"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><RepertoirePage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/seating-charts"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><SeatingChartsDashboardPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/seating-charts/:chartId/edit"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><SeatingChartEditorPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/seating-charts/:chartId"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><SeatingChartEditorPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/seating-charts/:chartId/view"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><SeatingChartViewPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/music-tools"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><MusicToolsPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/viewer"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><ViewerPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/viewer/:scoreId"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><ViewerPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/reading-music"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><ReadingMusicPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/sight-reading"
                  element={<RedirectWithSearch to="/dashboard/reading-music" />}
                />
                <Route
                  path="/dashboard/sight-reading/:rest"
                  element={<RedirectWithSearch to="/dashboard/reading-music" />}
                />
                <Route
                  path="/dashboard/sight-reading/editor/:exerciseId?"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><NotationEditorPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/box-office"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><BoxOfficePage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/box-office/event/:id"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><BoxOfficeEventPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/box-office/event/:id/checkin"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><BoxOfficeCheckinPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/box-office/event/:id/willcall"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><BoxOfficeWillCallPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/part-tracks"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><PartTracksPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/concert-planner"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell>
                          <ConcertPlannerPage />
                        </DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/concert-planner/:id"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell>
                          <ConcertPlannerEditorPage />
                        </DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                {/* Songwriting — addon module 'songwriting'. */}
                <Route
                  path="/songwriting"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell>
                          <ModuleGate moduleId="songwriting"><SongwritingLibraryPage /></ModuleGate>
                        </DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/songwriting/:songId"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell>
                          <ModuleGate moduleId="songwriting"><SongwritingEditorPage /></ModuleGate>
                        </DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                {/* GleeWorld Planner (nav label "Notes") — addon module 'planner'.
                    One stateful workspace; view + note selection live in URL params. */}
                <Route
                  path="/planner"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell>
                          <ModuleGate moduleId="planner"><PlannerPage /></ModuleGate>
                        </DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/planner/:noteId"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell>
                          <ModuleGate moduleId="planner"><PlannerPage /></ModuleGate>
                        </DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                {/* Liturgy Planner — Catholic Mass planning (addon module 'liturgy_planner'). */}
                <Route
                  path="/dashboard/liturgy"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell>
                          <LiturgyPlannerPage />
                        </DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/liturgy/:massId"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell>
                          <LiturgyPlannerPage />
                        </DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                {/* Anonymous public program — gated server-side by the
                    anon RLS policy that requires published_at IS NOT NULL. */}
                <Route
                  path="/program/:slug"
                  element={
                    <PublicRoute>
                      <PublicConcertProgramPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/dashboard/auditions"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell>
                          <div className="max-w-6xl mx-auto px-6 py-6">
                            <AuditionsModule isFullPage />
                          </div>
                        </DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/librarian"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><LibrarianDashboardPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/pr-hub"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell>
                          <div className="max-w-6xl mx-auto px-6 py-6">
                            <PRHubModule isFullPage />
                          </div>
                        </DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/media-library"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><NewMediaLibraryPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/alumni"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><GraduatesManagementModule /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/finance"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><FinancialManagement /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/shop"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        {/* Sidebar "Store" entry → the editable backend
                            (Products, Categories, Inventory, Orders, etc).
                            The public-facing /shop has its own route. */}
                        <DashboardShell><ProductManagement /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/feeds"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><FeedControl /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/office-hours"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><OfficeHoursPage /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/quick-cam"
                  element={<Navigate to="/dashboard/quick-cam/glee-cam-pics" replace />}
                />
                <Route
                  path="/dashboard/quick-cam/:categorySlug"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                        <DashboardShell><GleeCamGallery /></DashboardShell>
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/legacy-dashboard"
                  element={
                    <ProtectedRoute>
                      <UniversalLayout>
                        <UnifiedDashboard />
                      </UniversalLayout>
                    </ProtectedRoute>
                  }
                />
                 <Route
                   path="/saved-feed"
                   element={
                     <ProtectedRoute>
                       <UniversalLayout>
                         <SavedFeed />
                       </UniversalLayout>
                     </ProtectedRoute>
                   } 
                 />
                 <Route 
                   path="/dashboard/member" 
                   element={
                     <ProtectedRoute>
                       <UniversalLayout containerized={false}>
                         <UnifiedDashboard />
                       </UniversalLayout>
                     </ProtectedRoute>
                    }
                 />
                  <Route 
                   path="/dashboard/student" 
                   element={
                     <ProtectedRoute>
                       <UniversalLayout containerized={false}>
                         <UnifiedDashboard />
                       </UniversalLayout>
                     </ProtectedRoute>
                  } 
                 />
                  <Route 
                   path="/dashboard/fan" 
                   element={
                     <ProtectedRoute>
                       <UniversalLayout>
                         <UnifiedDashboard />
                       </UniversalLayout>
                     </ProtectedRoute>
                  } 
                 />
                <Route
                  path="/dashboard/mus240" 
                  element={
                    <ProtectedRoute>
                      <UniversalLayout>
                        <UnifiedDashboard />
                      </UniversalLayout>
                    </ProtectedRoute>
                   } 
                 />
                 <Route 
                  path="/dashboard/public" 
                  element={
                    <ProtectedRoute>
                      <UniversalLayout>
                        <UnifiedDashboard />
                      </UniversalLayout>
                    </ProtectedRoute>
                   } 
                  />
               <Route
                 path="/fan"
                 element={
                   <ProtectedRoute>
                     <FanPage />
                   </ProtectedRoute>
                 }
               />
                <Route 
                  path="/dashboard/member-view/:userId" 
                  element={
                    <ProtectedRoute>
                      <MemberViewDashboard />
                    </ProtectedRoute>
                  } 
                />
               <Route 
                 path="/dashboard/auditioner" 
                 element={<Navigate to="/auditioner" replace />} 
               />
               <Route 
                 path="/auditioner" 
                 element={<AuditionerDashboardPage />} 
               />
              <Route 
                path="/event-planner" 
                element={
                  <ProtectedRoute>
                    <EventPlanner />
                  </ProtectedRoute>
                } 
                /> 
               {/* Email/SMS Composer */}
               <Route 
                 path="/compose" 
                 element={
                   <ProtectedRoute>
                     <EmailComposerPage />
                   </ProtectedRoute>
                 } 
               />
              <Route 
                path="/budget-approvals" 
                element={
                  <ProtectedRoute>
                    <BudgetApprovals />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/payments" 
                element={
                  <ProtectedRoute>
                    <Payments />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <UniversalLayout><Profile /></UniversalLayout>
                  </ProtectedRoute>
                }
                />
                <Route
                  path="/timesheet" 
                  element={
                    <ProtectedRoute>
                      <TimesheetPage />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/profile/setup" 
                  element={
                    <ProtectedRoute skipProfileCheck>
                      <ProfileSetup />
                    </ProtectedRoute>
                  } 
                 />
                <Route
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } 
                 />
                <Route
                  path="/notifications" 
                  element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute>
                  } 
                  />
                 <Route
                   path="/messages" 
                   element={
                     <ProtectedRoute>
                       <Messages />
                     </ProtectedRoute>
                   } 
                   />
                 <Route
                   path="/notifications/send" 
                   element={
                     <ProtectedRoute>
                       <SendNotificationPage />
                     </ProtectedRoute>
                   } 
                  />
                 <Route
                   path="/announcements" 
                   element={
                     <ProtectedRoute>
                       <Announcements />
                     </ProtectedRoute>
                   } 
                 />
                 <Route
                   path="/messages" 
                   element={
                     <ProtectedRoute>
                       <Navigate to="/community?tab=messages" replace />
                     </ProtectedRoute>
                   } 
                  />
                 <Route
                   path="/direct-messages" 
                   element={
                     <ProtectedRoute>
                       <Navigate to="/community?tab=messages" replace />
                     </ProtectedRoute>
                   } 
                  />
                  <Route
                    path="/admin/announcements/new" 
                    element={
                      <ProtectedRoute>
                        <CreateAnnouncement />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="/admin/create-announcement" 
                    element={
                      <ProtectedRoute>
                        <CreateAnnouncement />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="/admin/announcements/edit/:id" 
                    element={
                      <ProtectedRoute>
                        <EditAnnouncement />
                      </ProtectedRoute>
                    } 
                  />
                  <Route
                    path="/admin/edit-announcement/:id" 
                    element={
                      <ProtectedRoute>
                        <EditAnnouncement />
                      </ProtectedRoute>
                    } 
                  />
                <Route
                  path="/admin/announcements/:id/edit" 
                  element={
                    <ProtectedRoute>
                      <EditAnnouncement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/pos" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <PointOfSale />
                    </Suspense>
                  } 
                />
                <Route 
                  path="/shop" 
                  element={
                    <PublicRoute>
                      <Shop />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/graduates-shop" 
                  element={
                    <GraduatesRoute>
                      <GraduatesShop />
                    </GraduatesRoute>
                  } 
                />
                <Route
                  path="/checkout"
                  element={
                    <PublicRoute>
                      <CheckoutPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/shop/success"
                  element={
                    <PublicRoute>
                      <StoreSuccess />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/order-confirmation"
                  element={
                    <PublicRoute>
                      <OrderConfirmation />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/qr-generator" 
                  element={
                    <PublicRoute>
                      <QRGeneratorPage />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/qr-analytics" 
                  element={
                    <ProtectedRoute>
                      <QRAnalytics />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/calendar"
                  element={<RedirectWithSearch to="/dashboard/calendar" />}
                />
                <Route
                  path="/public-calendar"
                  element={
                    <PublicRoute>
                      <PublicCalendar />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/concert-tickets/:slug"
                  element={
                    <PublicRoute>
                      <ConcertTicketsPublicPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/box-office"
                  element={
                    <PublicRoute>
                      <BoxOfficeIndexPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/concert-tickets"
                  element={
                    <PublicRoute>
                      <BoxOfficeIndexPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/tickets/:token"
                  element={
                    <PublicRoute>
                      <TicketsOrderPage />
                    </PublicRoute>
                  }
                />
                <Route 
                  path="/children-go-rap-audition" 
                  element={
                    <PublicRoute>
                      <ChildrenGoAudition />
                    </PublicRoute>
                  } 
                />
               <Route 
                 path="/events" 
                 element={
                   <ProtectedRoute>
                     <Calendar />
                   </ProtectedRoute>
                 } 
               />
               <Route 
                 path="/press-kit" 
                 element={
                   <PublicRoute>
                     <PressKit />
                   </PublicRoute>
                 } 
                 />
                <Route 
                  path="/shared-annotation/:shareToken" 
                  element={
                    <PublicRoute>
                      <SharedAnnotation />
                    </PublicRoute>
                  } 
                 />
                {/* /youtube collapsed into /video (see route above). Kept as a
                    redirect so old links and search hits still land somewhere. */}
                <Route path="/youtube" element={<Navigate to="/video" replace />} />
                <Route 
                  path="/about" 
                  element={
                    <PublicRoute>
                      <About />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/2026-tour" 
                  element={
                    <ProtectedRoute>
                      <Tour2026Page />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/bus-information" 
                  element={
                    <ProtectedRoute>
                      <BusInformation />
                    </ProtectedRoute>
                  } 
                />
               <Route 
                 path="/contracts"
                 element={
                   <ProtectedRoute>
                     <Index />
                   </ProtectedRoute>
                 } 
                />
                 <Route 
                   path="/attendance-test" 
                   element={
                     <ProtectedRoute>
                       <AttendanceTestPage />
                     </ProtectedRoute>
                   } 
                 />
                  <Route 
                    path="/attendance" 
                    element={
                      <ProtectedRoute>
                        <AttendancePageLegacy />
                      </ProtectedRoute>
                    } 
                   />
                    <Route 
                      path="/attendance/scan" 
                      element={<AttendanceScanPage />} 
                    />
                    <Route 
                      path="/attendance-scan" 
                      element={<AttendanceScanPage />} 
                    />
                    <Route
                      path="/qr-scanner"
                      element={
                        <ProtectedRoute>
                          <QRScannerPage />
                        </ProtectedRoute>
                      }
                    />
                   <Route
                     path="/music-library"
                     element={<RedirectWithSearch to="/dashboard/music-library" />}
                    />
                      <Route 
                        path="/librarian-dashboard" 
                        element={
                          <ProtectedRoute>
                            <UniversalLayout>
                              <LibrarianDashboardPage />
                            </UniversalLayout>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/budgets" 
                        element={
                          <ProtectedRoute>
                            <Budgets />
                          </ProtectedRoute>
                        } 
                      />
                     <Route 
                       path="/treasurer" 
                       element={
                         <ProtectedRoute>
                           <Treasurer />
                         </ProtectedRoute>
                       } 
                      />
                       <Route 
                         path="/dues-management" 
                         element={
                           <ProtectedRoute>
                             <DuesManagement />
                           </ProtectedRoute>
                         } 
                       />
                       <Route 
                         path="/dues-management/success" 
                         element={
                           <ProtectedRoute>
                             <PaymentSuccess />
                           </ProtectedRoute>
                         } 
                       />
                        <Route 
                          path="/performance" 
                          element={
                            <ProtectedRoute>
                              <PerformanceSuite />
                            </ProtectedRoute>
                          } 
                        />
                         <Route 
                           path="/wellness" 
                           element={
                             <ProtectedRoute>
                               <WellnessSuite />
                             </ProtectedRoute>
                           } 
                         />
                         <Route 
                           path="/rehearsals/feedback-dashboard" 
                           element={
                             <ProtectedRoute>
                               <FeedbackDashboard />
                             </ProtectedRoute>
                           } 
                         />
                        <Route
                           path="/alumni"
                           element={
                             <PublicRoute>
                               <GraduatesPageView />
                             </PublicRoute>
                           }
                         />
                        {/* Legacy alias — old code/links to /graduates still work. */}
                        <Route
                           path="/graduates"
                           element={
                             <PublicRoute>
                               <GraduatesPageView />
                             </PublicRoute>
                           }
                         />
                         <Route 
                           path="/admin/graduates" 
                           element={
                             <ProtectedRoute>
                               <GraduatesAdmin />
                             </ProtectedRoute>
                           } 
                         />
                         <Route 
                           path="/graduates-management" 
                           element={
                             <ProtectedRoute>
                               <GraduatesManagement />
                             </ProtectedRoute>
                           } 
                         />
                           <Route
                            path="/auditions" 
                            element={
                              <PublicRoute>
                                <AuditionPage />
                              </PublicRoute>
                            } 
                          />
                         <Route 
                           path="/scholarships" 
                           element={
                             <ProtectedRoute>
                               <ScholarshipHub />
                             </ProtectedRoute>
                           } 
                          />
                          <Route 
                            path="/admin/scholarships" 
                            element={
                              <ProtectedRoute>
                                <AdminScholarships />
                              </ProtectedRoute>
                            } 
                          />
                           <Route 
                             path="/admin/products" 
                             element={
                               <ProtectedRoute>
                                 <AdminProducts />
                               </ProtectedRoute>
                             } 
                            />
                            <Route 
                              path="/admin/glee-club-contacts" 
                              element={
                                <ProtectedRoute>
                                  <AdminOnlyRoute>
                                    <GleeClubContactsManagement />
                                  </AdminOnlyRoute>
                                </ProtectedRoute>
                              } 
                            />
                            <Route 
                              path="/admin/children-go-auditions" 
                              element={
                                <ProtectedRoute>
                                  <AdminOnlyRoute>
                                    <ChildrenGoAuditionsAdmin />
                                  </AdminOnlyRoute>
                                </ProtectedRoute>
                              } 
                            />
                            <Route 
                              path="/admin/concert-tickets" 
                              element={
                                <ProtectedRoute>
                                  <AdminOnlyRoute>
                                    <ConcertTicketAdmin />
                                  </AdminOnlyRoute>
                                </ProtectedRoute>
                              } 
                            />
                               {/* Admin module routes */}
                              <Route 
                                path="/admin/finance" 
                                element={
                                  <ProtectedRoute>
                                    <FinancialManagement />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route
                                path="/admin/events"
                                element={
                                  <ProtectedRoute>
                                    <EventManagement />
                                  </ProtectedRoute>
                                }
                              />
                              <Route
                                path="/admin/ensembles"
                                element={
                                  <ProtectedRoute>
                                    <EnsemblesPage />
                                  </ProtectedRoute>
                                }
                              />
                              {/* Legacy /admin/media route — superseded by the
                                  Command Center /dashboard/media-library page.
                                  Redirect so stale bookmarks land on the current
                                  Media Library instead of the orphan UI. */}
                              <Route
                                path="/admin/media"
                                element={<Navigate to="/dashboard/media-library" replace />}
                              />
                              <Route 
                                path="/photo-gallery" 
                                element={
                                  <ProtectedRoute>
                                    <PhotoGalleryPage />
                                  </ProtectedRoute>
                                } 
                              />
                              {/* /admin/communications redirects to merged /communications above. */}
                              <Route 
                                path="/admin/inventory" 
                                element={
                                  <ProtectedRoute>
                                    <InventoryShop />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/course-statistics" 
                                element={
                                  <ProtectedRoute>
                                    <AdminOnlyRoute>
                                      <CourseStatistics />
                                    </AdminOnlyRoute>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/analytics" 
                                element={
                                  <ProtectedRoute>
                                    <Analytics />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/settings" 
                                element={
                                  <ProtectedRoute>
                                    <SystemSettings />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/access" 
                                element={
                                  <ProtectedRoute>
                                    <AccessControl />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/permissions" 
                                element={
                                  <ProtectedRoute>
                                    <PermissionsPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/module-access" 
                                element={
                                  <ProtectedRoute>
                                    <ModuleAccess />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/database" 
                                element={
                                  <ProtectedRoute>
                                    <DatabaseAdmin />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/documents" 
                                element={
                                  <ProtectedRoute>
                                    <DocumentsForms />
                                  </ProtectedRoute>
                                 } 
                               />
                               <Route 
                                 path="/admin/auditions" 
                                 element={
                                   <ProtectedRoute>
                                     <AuditionsManagement />
                                   </ProtectedRoute>
                                 } 
                               />
                               <Route 
                                 path="/admin/student-schedules" 
                                 element={
                                   <ProtectedRoute>
                                     <StudentSchedulesPage />
                                   </ProtectedRoute>
                                 } 
                               />
              <Route 
                path="/member-directory" 
                element={
                  <ProtectedRoute>
                    <MemberDirectory />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/user-management"
                element={
                  <ProtectedRoute>
                    <UniversalLayout>
                      <UserManagement />
                    </UniversalLayout>
                  </ProtectedRoute>
                }
              />
                              {/* /amazon-shopping route removed with Amazon Affiliate module. */}
                              <Route
                               path="/dashboard/pr-hub" 
                               element={
                                 <ProtectedRoute>
                                   <PRHubPage />
                                 </ProtectedRoute>
                               } 
                             />
                            {/* Section Leader, Student Conductor, and Karaoke routes removed. */}
                             <Route 
                               path="/sectional-management" 
                               element={
                                 <ProtectedRoute>
                                   <SectionalManagement />
                                 </ProtectedRoute>
                               } 
                              />
                             <Route 
                               path="/srf-management" 
                               element={
                                 <ProtectedRoute>
                                   <SRFManagement />
                                 </ProtectedRoute>
                               } 
                              />
                           <Route 
                             path="/booking-request" 
                             element={
                               <PublicRoute>
                                 <BookingRequest />
                               </PublicRoute>
                             } 
                            />
                              <Route 
                                path="/booking-forms" 
                                element={
                                  <ProtectedRoute>
                                    <BookingForms />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route
                                path="/tour-planner"
                                element={
                                  <ProtectedRoute>
                                    <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                                      <DashboardShell><TourPlanner /></DashboardShell>
                                    </UniversalLayout>
                                  </ProtectedRoute>
                                }
                               />
                               <Route
                                 path="/tour-manager"
                                 element={
                                   <ProtectedRoute>
                                     <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                                       <DashboardShell><TourPlanner /></DashboardShell>
                                     </UniversalLayout>
                                   </ProtectedRoute>
                                 }
                                />
                                <Route
                                  path="/travel-manager"
                                  element={
                                    <ProtectedRoute>
                                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                                        <DashboardShell><TourPlanner /></DashboardShell>
                                      </UniversalLayout>
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/travel-planner"
                                  element={
                                    <ProtectedRoute>
                                      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                                        <DashboardShell><TourPlanner /></DashboardShell>
                                      </UniversalLayout>
                                    </ProtectedRoute>
                                  }
                                />
                                <Route 
                                  path="/weather" 
                                  element={
                                    <ProtectedRoute>
                                      <Weather />
                                    </ProtectedRoute>
                                  } 
                                />
                                <Route 
                                  path="/wardrobe-appointments" 
                                  element={
                                    <ProtectedRoute>
                                      <WardrobeAppointments />
                                    </ProtectedRoute>
                                  } 
                                />
                                <Route 
                                  path="/provider-dashboard" 
                                  element={
                                    <ProtectedRoute>
                                      <UniversalLayout>
                                        <ProviderDashboard />
                                      </UniversalLayout>
                                    </ProtectedRoute>
                                  } 
                                />
                               <Route 
                                 path="/wardrobe" 
                                 element={
                                  <ProtectedRoute>
                                    <Wardrobe />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/wardrobe-management" 
                                element={
                                  <ProtectedRoute>
                                    <UniversalLayout>
                                      <WardrobeManagementHub />
                                    </UniversalLayout>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/product-management" 
                                element={
                                  <ProtectedRoute>
                                    <ProductManagement />
                                  </ProtectedRoute>
                                } 
                               />
                               <Route
                                path="/store/products"
                                element={
                                  <ProtectedRoute>
                                    <ProductManagement />
                                  </ProtectedRoute>
                                }
                               />
                               <Route
                                 path="/store"
                                 element={
                                   <ProtectedRoute>
                                     <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                                       <DashboardShell>
                                         <StoreShell><StorePage /></StoreShell>
                                       </DashboardShell>
                                     </UniversalLayout>
                                   </ProtectedRoute>
                                 }
                               />
                               <Route
                                 path="/store/scores/:id"
                                 element={
                                   <ProtectedRoute>
                                     <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                                       <DashboardShell>
                                         <StoreShell><StoreScoreDetail /></StoreShell>
                                       </DashboardShell>
                                     </UniversalLayout>
                                   </ProtectedRoute>
                                 }
                               />
                               <Route
                                 path="/store/partners/:id"
                                 element={
                                   <ProtectedRoute>
                                     <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                                       <DashboardShell>
                                         <StoreShell><StorePartnerPage /></StoreShell>
                                       </DashboardShell>
                                     </UniversalLayout>
                                   </ProtectedRoute>
                                 }
                               />
                               <Route
                                 path="/store/thanks"
                                 element={
                                   <ProtectedRoute>
                                     <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
                                       <DashboardShell>
                                         <StoreShell><StoreThanksPage /></StoreShell>
                                       </DashboardShell>
                                     </UniversalLayout>
                                   </ProtectedRoute>
                                 }
                               />
                               <Route
                                 path="/handbook" 
                                 element={
                                   <ProtectedRoute>
                                     <Handbook />
                                   </ProtectedRoute>
                                 } 
                                />
                                {/* /radio route + RadioStationPage removed 2026-05-31 — Radio.co integration deleted. */}
                                 <Route 
                                   path="/soundcloud" 
                                   element={
                                     <ProtectedRoute>
                                       <SoundCloudSearch />
                                     </ProtectedRoute>
                                   } 
                                  />
                                  <Route 
                                    path="/receipts" 
                                    element={
                                      <ProtectedRoute>
                                        <ReceiptsPage />
                                      </ProtectedRoute>
                                    } 
                />
                <Route 
                  path="/member-exit-interview" 
                  element={
                    <ProtectedRoute>
                      <MemberExitInterview />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/bowna-scholar" 
                  element={
                    <ProtectedRoute>
                      <BownaScholarLanding />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/bowman-scholars" 
                  element={
                    <ProtectedRoute>
                      <BownaScholarLanding />
                    </ProtectedRoute>
                  } 
                />
                                  <Route 
                                    path="/admin/approval-system" 
                                    element={
                                      <ProtectedRoute>
                                        <ApprovalSystemPage />
                                      </ProtectedRoute>
                                    } 
                                   />
                                   <Route 
                                     path="/admin/shoutcast" 
                                     element={
                                       <ProtectedRoute>
                                         <ShoutcastManagement />
                                       </ProtectedRoute>
                                      } 
                                    />
                       <Route 
                         path="/directory" 
                         element={
                           <PublicRoute>
                             <DirectoryPage />
                           </PublicRoute>
                         } 
                       />
                    <Route 
                      path="/admin" 
                      element={
                        <ProtectedRoute>
                          <Navigate to="/dashboard" replace />
                        </ProtectedRoute>
                      } 
                    />
                                <Route 
                                  path="/mobile-scoring" 
                                  element={
                                    <ProtectedRoute>
                                      <MobileScoring />
                                    </ProtectedRoute>
                                  } 
                                />
                                
                                {/* Site-wide Search */}
                                 <Route 
                                   path="/search" 
                                   element={
                                     <PublicRoute>
                                       <UniversalLayout>
                                         <SearchPage />
                                       </UniversalLayout>
                                     </PublicRoute>
                                   } 
                                 />
                                 <Route 
                                   path="/first-year" 
                                   element={
                                     <ProtectedRoute>
                                       <FirstYearHub />
                                     </ProtectedRoute>
                                   } 
                                 />
                                 {/* /console/first-year route removed with First Year Console module. */}

                                  <Route 
                                    path="/modules" 
                                    element={
                                      <ProtectedRoute>
                                        <UniversalLayout>
                                          <ModulesDirectory />
                                        </UniversalLayout>
                                      </ProtectedRoute>
                                    } 
                                  />
                                  <Route
                                    path="/modules/:moduleId"
                                    element={
                                      <ProtectedRoute>
                                        <ModuleRouteRedirect />
                                      </ProtectedRoute>
                                    }
                                  />
                                  <Route 
                                    path="/pr-hub" 
                                    element={
                                      <ProtectedRoute>
                                        <PRHubPage />
                                      </ProtectedRoute>
                                    } 
                                  />
                                  <Route 
                                    path="/feed-control" 
                                    element={
                                      <ProtectedRoute>
                                        <UniversalLayout>
                                          <FeedControl />
                                        </UniversalLayout>
                                      </ProtectedRoute>
                                    } 
                                  />
                                   <Route
                                     path="/sight-reading-submission"
                                     element={<Navigate to="/dashboard/sight-reading" replace />}
                                   />
                                   <Route
                                     path="/sight-reading-preview"
                                     element={<Navigate to="/dashboard/sight-reading" replace />}
                                   />
                                       <Route 
                                        path="/sight-reading-generator"
                                        element={<Navigate to="/dashboard/sight-reading" replace />}
                                      />
                                      {/* /karaoke-challenge route removed with Karaoke module. */}
                                      <Route 
                                        path="/assignment-creator"
                                        element={
                                          <ProtectedRoute>
                                            <AssignmentCreatorPage />
                                          </ProtectedRoute>
                                        } 
                                      />
                                      <Route 
                                        path="/practice-studio" 
                                        element={
                                          <ProtectedRoute>
                                            <PracticeStudioPage />
                                          </ProtectedRoute>
                                        }
                                      />
                                      <Route 
                                        path="/member-sight-reading-studio"
                                        element={<Navigate to="/dashboard/sight-reading" replace />}
                                      />
                                           <Route 
                                             path="/setup-crews" 
                                             element={
                                               <ProtectedRoute>
                                                 <SetupCrewPage />
                                               </ProtectedRoute>
                                             } 
                                           />
                                          <Route 
                                            path="/google-docs" 
                                            element={
                                              <ProtectedRoute>
                                                <GoogleDocsPage />
                                              </ProtectedRoute>
                                            } 
                           />
                           {/* New Member Pages */}
                           <Route 
                             path="/member/music-library" 
                             element={
                               <FanRoute>
                                 <UniversalLayout>
                                   <MusicLibraryPage />
                                 </UniversalLayout>
                               </FanRoute>
                             } 
                           />
                           <Route 
                             path="/member/sight-reading"
                             element={<Navigate to="/dashboard/sight-reading" replace />}
                           />
                           <Route 
                             path="/member/calendar" 
                             element={
                               <ProtectedRoute>
                                 <UniversalLayout>
                                   <MemberCalendarPage />
                                 </UniversalLayout>
                               </ProtectedRoute>
                             } 
                           />
                           <Route 
                             path="/member/attendance" 
                             element={
                               <ProtectedRoute>
                                 <UniversalLayout>
                                   <AttendancePage />
                                 </UniversalLayout>
                               </ProtectedRoute>
                             } 
                           />
                            <Route 
                              path="/member/wardrobe" 
                              element={
                                <ProtectedRoute>
                                  <UniversalLayout>
                                    <WardrobePage />
                                  </UniversalLayout>
                                </ProtectedRoute>
                              } 
                            />
                            <Route 
                              path="/member/member-management" 
                              element={
                                <ProtectedRoute>
                                  <UniversalLayout>
                                    <UserManagement />
                                  </UniversalLayout>
                                </ProtectedRoute>
                              } 
                            />
                             <Route 
                               path="/member/notifications" 
                               element={
                                 <ProtectedRoute>
                                   <UniversalLayout>
                                     <Notifications />
                                   </UniversalLayout>
                                 </ProtectedRoute>
                               } 
                             />
                             <Route 
                               path="/sms-test" 
                               element={
                                 <ProtectedRoute>
                                   <SMSTest />
                                 </ProtectedRoute>
                               } 
                             />
                             <Route
                               path="/member/settings"
                               element={<Navigate to="/settings" replace />}
                            />
                            <Route 
                              path="/member/profile" 
                              element={
                                <ProtectedRoute>
                                  <UniversalLayout>
                                    <Profile />
                                  </UniversalLayout>
                                </ProtectedRoute>
                              } 
                             />
                              {/* MUS 240 - Survey of African American Music */}
                               <Route 
                                path="/mus-240" 
                                element={<ClassLanding />}
                                />
                                {/* Legacy redirects - catch all subroutes */}
                                <Route path="/classes/mus240/*" element={<LegacyMus240Redirect />} />
                                <Route path="/classes/mus240" element={<Navigate to="/mus-240" replace />} />
                                <Route path="/mus240" element={<Navigate to="/mus-240" replace />} />
                               
                                 <Route 
                                  path="/mus-240/student/dashboard" 
                                  element={<Navigate to="/academy/mus-240" replace />}
                                  />
                                  <Route 
                                   path="/mus-240/student-dashboard" 
                                   element={<Navigate to="/academy/mus-240" replace />}
                                  />
                                 <Route 
                                  path="/mus-240/student/journal/:journal_id/grade" 
                                  element={<Navigate to="/academy/mus-240" replace />}
                                 />
                              <Route 
                               path="/mus-240/syllabus" 
                                element={
                                  <Mus240EnrollmentRoute>
                                    <SyllabusPage />
                                  </Mus240EnrollmentRoute>
                                }
                             />
                               <Route 
                                 path="/mus-240/listening" 
                                element={
                                  <Mus240EnrollmentRoute>
                                    <ListeningHub />
                                  </Mus240EnrollmentRoute>
                                }
                               />
                              <Route 
                                path="/mus-240/listening/:week" 
                               element={
                                 <Mus240EnrollmentRoute>
                                   <WeekDetail />
                                 </Mus240EnrollmentRoute>
                               }
                              />
                               <Route 
                                 path="/mus-240/groups" 
                               element={
                                 <Mus240EnrollmentRoute>
                                   <Groups />
                                 </Mus240EnrollmentRoute>
                               }
                               />
                                <Route 
                                  path="/mus-240/groups/update" 
                                 element={
                                   <Mus240EnrollmentRoute>
                                     <GroupUpdateForm />
                                   </Mus240EnrollmentRoute>
                                 }
                                 />
                                  <Route 
                                    path="/mus-240/groups/presentation" 
                                   element={
                                     <Mus240EnrollmentRoute>
                                       <GroupUpdatesPresentation />
                                     </Mus240EnrollmentRoute>
                                   }
                                  />
                                  <Route 
                                    path="/mus-240/groups/presentation/:id" 
                                   element={
                                     <Mus240EnrollmentRoute>
                                       <GroupPresentationView />
                                     </Mus240EnrollmentRoute>
                                   }
                                  />
                                <Route 
                                  path="/mus-240/groups/:groupId" 
                                 element={
                                   <Mus240EnrollmentRoute>
                                     <GroupDetail />
                                   </Mus240EnrollmentRoute>
                                 }
                                />
                               <Route 
                                 path="/mus-240/resources" 
                                element={
                                  <Mus240EnrollmentRoute>
                                    <Resources />
                                  </Mus240EnrollmentRoute>
                                }
                               />
                               <Route 
                                 path="/mus-240/resources/admin" 
                                 element={
                                   <ProtectedRoute>
                                     <AdminOnlyRoute>
                                       <ResourcesAdmin />
                                     </AdminOnlyRoute>
                                   </ProtectedRoute>
                                 } 
                                />
                                 <Route 
                                  path="/mus-240/midterm" 
                                  element={
                                    <ProtectedRoute>
                                      <Mus240EnrollmentRoute>
                                        <MidtermExam />
                                      </Mus240EnrollmentRoute>
                                    </ProtectedRoute>
                                  } 
                                 />
                                 <Route 
                                  path="/mus-240/midterm-exam" 
                                  element={
                                    <ProtectedRoute>
                                      <Mus240EnrollmentRoute>
                                        <MidtermExam />
                                      </Mus240EnrollmentRoute>
                                    </ProtectedRoute>
                                  } 
                                 />
                               
                                <Route 
                                  path="/mus-240/jazz"
                                  element={
                                    <Mus240EnrollmentRoute>
                                      <JazzPage />
                                    </Mus240EnrollmentRoute>
                                  }
                                />
                                  {/* Legacy MUS-240 instructor routes → redirect to universal console */}
                                  <Route 
                                    path="/mus-240/admin" 
                                    element={<Navigate to="/instructor/mus-240" replace />}
                                  />
                                  <Route 
                                    path="/mus-240/instructor" 
                                    element={<Navigate to="/instructor/mus-240" replace />}
                                  />
                                  {/* /mus-240/instructor/console is now handled by /:courseCode/instructor/console */}
                                  <Route 
                                    path="/mus-240/instructor/student/:studentId" 
                                    element={
                                      <ProtectedRoute>
                                        <AdminOnlyRoute>
                                          <StudentWorkOverview />
                                        </AdminOnlyRoute>
                                      </ProtectedRoute>
                                    } 
                                  />
                                  <Route 
                                    path="/mus-240/instructor/student/:studentId/midterm" 
                                    element={
                                      <ProtectedRoute>
                                        <AdminOnlyRoute>
                                          <StudentMidtermGrading />
                                        </AdminOnlyRoute>
                                      </ProtectedRoute>
                                    } 
                                  />
                                  {/* Removed journal/grading routes - journals removed from curriculum */}
                                  <Route path="/mus-240/instructor/bulk-grading" element={<Navigate to="/instructor/mus-240" replace />} />
                                  <Route path="/mus-240/journal/:journalId/review" element={<Navigate to="/academy/mus-240" replace />} />
                                  <Route path="/mus-240/instructor/journals" element={<Navigate to="/instructor/mus-240" replace />} />
                                  <Route path="/mus-240/instructor/journal/:journal_id/grade" element={<Navigate to="/instructor/mus-240" replace />} />
                                   <Route path="/mus-240/peer-review" element={<Navigate to="/academy/mus-240" replace />} />
                                   <Route 
                                     path="/test-builder"
                                     element={
                                       <ProtectedRoute>
                                         <TestBuilderPage />
                                       </ProtectedRoute>
                                     } 
                                   />
                                   <Route 
                                     path="/test-builder/:testId" 
                                     element={
                                       <ProtectedRoute>
                                         <TestBuilderEdit />
                                       </ProtectedRoute>
                                     } 
                                    />
                                    <Route 
                                      path="/test/:testId" 
                                      element={
                                        <ProtectedRoute>
                                          <StudentTestPage />
                                        </ProtectedRoute>
                                      } 
                                    />
                                    {/* /test/:testId/preview route removed with TestPreview page (radio purge 2026-05-31). */}
                                    <Route 
                                      path="/test/:testId/take" 
                                      element={
                                        <ProtectedRoute>
                                          <StudentTestPage />
                                        </ProtectedRoute>
                                      } 
                                    />
                                    <Route 
                                      path="/test/:testId/scores" 
                                      element={
                                        <ProtectedRoute>
                                          <TestScoresPage />
                                        </ProtectedRoute>
                                      } 
                                    />
                                    
                                      {/* Grading System Routes - Redirect to instructor dashboard */}
                                      <Route 
                                        path="/instructor/admin/:courseId" 
                                        element={
                                          <ProtectedRoute>
                                            <Navigate to="/grading/instructor/dashboard" replace />
                                          </ProtectedRoute>
                                        } 
                                      />
                                      <Route 
                                        path="/instructor/admin" 
                                        element={
                                          <ProtectedRoute>
                                            <Navigate to="/grading/instructor/dashboard" replace />
                                          </ProtectedRoute>
                                        } 
                                      />
                                     <Route 
                                       path="/grading/admin/dashboard" 
                                       element={
                                         <ProtectedRoute>
                                           <GradingAdminDashboard />
                                         </ProtectedRoute>
                                       } 
                                     />
                                    <Route 
                                      path="/grading/instructor/dashboard" 
                                      element={
                                        <ProtectedRoute>
                                          <InstructorDashboard />
                                        </ProtectedRoute>
                                      } 
                                    />
                                   <Route 
                                     path="/grading/instructor/course/:course_id" 
                                     element={
                                       <ProtectedRoute>
                                         <CoursePage />
                                       </ProtectedRoute>
                                     } 
                                   />
                                   <Route 
                                     path="/grading/instructor/assignment/:assignment_id/submissions" 
                                     element={
                                       <ProtectedRoute>
                                         <AssignmentSubmissionsPage />
                                       </ProtectedRoute>
                                     } 
                                   />
                                   <Route 
                                     path="/grading/instructor/submission/:submission_id" 
                                     element={
                                       <ProtectedRoute>
                                         <SubmissionGradingPage />
                                       </ProtectedRoute>
                                     } 
                                   />
                                    <Route 
                                      path="/grading/instructor/course/:course_id/gradebook" 
                                      element={
                                        <ProtectedRoute>
                                          <GradebookPage />
                                        </ProtectedRoute>
                                      } 
                                    />
                                    <Route 
                                      path="/grading/instructor/course/:course_id/students" 
                                      element={
                                        <ProtectedRoute>
                                          <ManageStudents />
                                        </ProtectedRoute>
                                      } 
                                    />
                                   <Route 
                                     path="/grading/student/course/:course_id" 
                                     element={
                                       <ProtectedRoute>
                                         <StudentCoursePage />
                                       </ProtectedRoute>
                                     } 
                                   />
                                   <Route 
                                     path="/grading/student/assignment/:assignment_id" 
                                     element={
                                       <ProtectedRoute>
                                         <StudentAssignmentPage />
                                       </ProtectedRoute>
                                     } 
                                   />
                                   {/* Public parent-facing permission slip — no auth required */}
                                   <Route
                                     path="/parent/permission-slip"
                                     element={<ParentPermissionSlip />}
                                   />
                                   {/* Catch-all route for 404 */}
                                   <Route path="*" element={<NotFound />} />
                               </Routes>
                      </Suspense>
                      </UsageTracker>
                    <GlobalMusicPlayer />
                    <PWAInstallPrompt />
                   </div>
                   </AudioCompanionProvider>
                  </ActiveMeetingProvider>
                  </MessengerProvider>
                  </CourseProvider>
                  </Mus240SemesterProvider>
                  </MusicPlayerProvider>
                </CustomTooltipProvider>
              </TooltipProvider>
            </ThemeProvider>
          </AuthProvider>
        </NativeTenantGate>
        </QueryClientProvider>
      </BrowserRouter>
  );
};

export default App;
