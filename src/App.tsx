import { useState, useEffect, lazy, Suspense, ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { FanRoute } from "@/components/routes/FanRoute";
import { AlumnaeRoute } from "@/components/routes/AlumnaeRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TooltipProvider as CustomTooltipProvider } from "@/contexts/TooltipContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext";
import { GlobalMusicPlayer } from "@/components/music/GlobalMusicPlayer";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import { DesignSystemEnforcer } from "@/components/ui/design-system-enforcer";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { SplashWrapper } from "@/components/splash/SplashWrapper";
import { LiveInvitePopup } from "@/components/glee-lounge/LiveInvitePopup";

import { HomeRoute } from "@/components/routing/HomeRoute";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import MusicTheoryFundamentals from "./pages/MusicTheoryFundamentals";
import ChoralConductingLiterature from "./pages/ChoralConductingLiterature";
import Mus210 from "./pages/Mus210";
import Mus210Page from "./pages/Mus210Page";
import NotationBasics from "./pages/music-theory/NotationBasics";
import GleeAcademy from "./pages/GleeAcademy";
import GleeCamGallery from "./pages/GleeCamGallery";
import InstructorAdmin from "./pages/InstructorAdmin";

import Index from "./pages/Index";
import DirectoryPage from "./pages/DirectoryPage";
import Auth from "./pages/Auth";
import AuthPage from "./pages/AuthPage";
import AuditionApplicationPage from "./pages/AuditionApplicationPage";
import FanDashboard from "./pages/FanDashboard";
// import AdminDashboard from "./pages/AdminDashboard";
import { DuesManagement } from "./pages/DuesManagement";
import PermissionsPage from "./pages/admin/Permissions";
import WeekPage from "./pages/music-theory/WeekPage";

import ContractSigning from "./pages/ContractSigning";
import AdminSigning from "./pages/AdminSigning";
import ActivityLogs from "./pages/ActivityLogs";
import W9FormPage from "./pages/W9FormPage";
import NotFound from "./pages/NotFound";
import Accounting from "./pages/Accounting";
import { UnifiedDashboard } from "./components/dashboard/UnifiedDashboard";
import TestBuilderPage from "./pages/mus240/TestBuilderPage";
import TestBuilderEdit from "./pages/TestBuilderEdit";
import TestPreview from "./pages/TestPreview";
import StudentTestPage from "./pages/StudentTestPage";
import TestScoresPage from "./pages/TestScoresPage";
import PollViewPage from "./pages/PollViewPage";

import AuditionerDashboardPage from "./pages/AuditionerDashboardPage";
import Mus240Auth from "./pages/Mus240Auth";

import EventPlanner from "./pages/EventPlanner";
import BudgetApprovals from "./pages/BudgetApprovals";
import { Shop } from "./pages/Shop";
import { AlumnaeShop } from "./pages/AlumnaeShop";
import { CheckoutPage } from "./pages/CheckoutPage";
import { OrderConfirmationPage } from "./pages/OrderConfirmationPage";
import Payments from "./pages/Payments";
import Profile from "./pages/Profile";
import ProfileSetup from "./pages/ProfileSetup";
import Calendar from "./pages/Calendar";
import { AppointmentAdminDashboard } from "./components/admin/AppointmentAdminDashboard";

import PublicCalendar from "./pages/PublicCalendar";
import PressKit from "./pages/PressKit";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import OnboardingInfo from "./pages/OnboardingInfo";
import MemberRegistration from "./pages/MemberRegistration";
import ResetPassword from "./pages/ResetPassword";
import MusicLibraryPage from "./pages/member/MusicLibraryPage";
import SightReadingPage from "./pages/member/SightReadingPage";
import MemberCalendarPage from "./pages/member/MemberCalendarPage";
import AttendancePage from "./pages/member/AttendancePage";
import WardrobePage from "./pages/member/WardrobePage";
import Announcements from "./pages/Announcements";
import CreateAnnouncement from "./pages/admin/CreateAnnouncement";
import EditAnnouncement from "./pages/admin/EditAnnouncement";
import About from "./pages/About";
import AttendanceTestPage from "./pages/AttendanceTestPage";
import AttendanceScanPage from "./pages/AttendanceScanPage";
// Existing AttendancePage (legacy)
import AttendancePageLegacy from "./pages/AttendancePage";
// Existing MusicLibraryPage (legacy)
import MusicLibraryPageLegacy from "./pages/MusicLibrary";

import Budgets from "./pages/Budgets";
import Treasurer from "./pages/Treasurer";

import PerformanceSuite from "./pages/PerformanceSuite";
import WellnessSuite from "./pages/WellnessSuite";
import { FeedbackDashboard } from "./modules/rehearsals/feedback-dashboard/FeedbackDashboard";
import AlumnaeLanding from "./pages/AlumnaeLanding";
import AlumnaeAdmin from "./pages/admin/AlumnaeAdmin";
import AlumnaeManagement from "./pages/AlumnaeManagement";
import AlumnaePageView from "./pages/AlumnaePageView";
import SendNotificationPage from "./pages/SendNotificationPage";
import AuditionPage from "./pages/AuditionPage";
import Handbook from "./pages/Handbook";
import ScholarshipHub from "./pages/ScholarshipHub";
import AdminScholarships from "./pages/AdminScholarships";
import AdminProducts from "./pages/AdminProducts";
import { SectionLeaderDashboard } from "./pages/SectionLeaderDashboard";
import { SectionalManagement } from "./pages/SectionalManagement";
import ExecutiveBoardMonitor from "./pages/admin/ExecutiveBoardMonitor";
import { ExecutiveBoardPermissionPanel } from '@/components/admin/ExecutiveBoardPermissionPanel';
import { SRFManagement } from "./pages/SRFManagement";
import { MemberViewDashboard } from "@/components/member-view/MemberViewDashboard";
import GleeClubContactsManagement from "./pages/GleeClubContactsManagement";

// Admin module pages
import FinancialManagement from "./pages/admin/FinancialManagement";
import EventManagement from "./pages/admin/EventManagement";
import MediaLibrary from "./pages/admin/MediaLibrary";
import Communications from "./pages/admin/Communications";
import InventoryShop from "./pages/admin/InventoryShop";
import Analytics from "./pages/admin/Analytics";
import Settings from "./pages/Settings";
import SystemSettings from "./pages/admin/SystemSettings";
import AccessControl from "./pages/admin/AccessControl";
import DatabaseAdmin from "./pages/admin/DatabaseAdmin";
import ExecutiveBoard from "./pages/admin/ExecutiveBoard";
import DocumentsForms from "./pages/admin/DocumentsForms";
import { StudentConductorDashboard } from "./pages/StudentConductorDashboard";
import TourPlanner from "./pages/TourPlanner";
import BookingRequest from "./pages/BookingRequest";
import BookingForms from "./pages/BookingForms";
import Wardrobe from "./pages/Wardrobe";
import { WardrobeManagementHub } from "./components/wardrobe/WardrobeManagementHub";
import { ProductManagement } from "./pages/ProductManagement";
import PRHubPage from "./pages/PRHubPage";
import ModulesDirectory from "./pages/ModulesDirectory";
const SharedAnnotation = lazy(() => import("./pages/SharedAnnotation").then(m => ({ default: m.SharedAnnotation })));
import MobileScoring from "./pages/MobileScoring";
import MemberDirectory from "./pages/MemberDirectory";
import UserManagement from "./pages/UserManagement";
import ExitInterviewsPage from "./pages/ExitInterviewsPage";
import { AmazonShoppingModule } from "./components/shopping/AmazonShoppingModule";
import { RadioStationPage } from "./components/radio/RadioStationPage";
import { AuditionsManagement } from "./components/admin/AuditionsManagement";
import SoundCloudSearch from "./pages/SoundCloudSearch";
import { ShoutcastManagement } from "./pages/admin/ShoutcastManagement";
import { ReceiptsPage } from "./pages/ReceiptsPage";
import ApprovalSystemPage from "./pages/ApprovalSystemPage";
import GroupUpdatesPresentation from './pages/mus240/GroupUpdatesPresentation';
import GroupPresentationView from './pages/mus240/GroupPresentationView';
import SightReadingSubmission from "./pages/SightReadingSubmission";
import SightReadingPreview from "./pages/SightReadingPreview";
import SightReadingGeneratorPage from "./pages/SightReadingGenerator";
import AssignmentCreatorPage from "./pages/AssignmentCreator";
import KaraokeChallenge from "./pages/KaraokeChallenge";
import PracticeStudioPage from "./pages/PracticeStudioPage";
import { MemberSightReadingStudioPage } from "./pages/MemberSightReadingStudioPage";
import SchedulingPage from "./pages/SchedulingPage";
import BookingPage from "./pages/BookingPage";
import { MessagingInterface } from "./components/messaging/MessagingInterface";
import CommunityHub from "./pages/CommunityHub";
import UnifiedBookingPage from "./pages/UnifiedBookingPage";
import ServiceSelection from "./pages/booking/ServiceSelection";
import DateTimeSelection from "./pages/booking/DateTimeSelection";
import RecurringOptions from "./pages/booking/RecurringOptions";
import CustomerInfo from "./pages/booking/CustomerInfo";
import BookingConfirmation from "./pages/booking/BookingConfirmation";
import ExecutiveBoardDashboard from "./pages/ExecutiveBoardDashboard";
import ExecutiveBoardMemberDashboard from "./pages/ExecutiveBoardMemberDashboard";
import GoogleDocsPage from "./pages/GoogleDocs";
import LibrarianDashboardPage from "./pages/LibrarianDashboardPage";
import QRGeneratorPage from "./pages/QRGenerator";
import QRAnalytics from "./pages/QRAnalytics";
import ModuleAccess from "./pages/admin/ModuleAccess";
import Appointments from "./pages/Appointments";
import WardrobeAppointments from "./pages/WardrobeAppointments";
import ProviderAppointments from "./pages/ProviderAppointments";
import { ProviderRoutes } from "./routes/ProviderRoutes";
import SearchPage from "./pages/SearchPage";
import FirstYearHub from "./pages/FirstYearHub";
import FirstYearConsolePage from "./pages/console/FirstYearConsolePage";
import SetupCrewPage from "./pages/SetupCrewPage";
import { Onboarding } from "./pages/Onboarding";
import AcademyStudentRegistration from "./pages/AcademyStudentRegistration";
import { ProviderDashboard } from "./components/providers/ProviderDashboard";
import { AdminOnlyRoute } from "./components/auth/AdminOnlyRoute";
import { Mus240EnrollmentRoute } from "./components/auth/Mus240EnrollmentRoute";
import { Mus240StaffRoute } from "./components/auth/Mus240StaffRoute";
import TimesheetPage from "./pages/TimesheetPage";
import BownaScholarLanding from "./pages/BownaScholarLanding";
import SMSTest from "./pages/SMSTest";
import MemberExitInterview from "./pages/MemberExitInterview";
import ExecBoardExitInterview from "./pages/ExecBoardExitInterview";
import GleeLounge from "./pages/GleeLounge";

import ClassLanding from "./pages/mus240/ClassLanding";
import SyllabusPage from "./pages/mus240/SyllabusPage";
import AssignmentWeek from "./pages/mus240/AssignmentWeek";
import ListeningHub from "./pages/mus240/ListeningHub";
import WeekDetail from "./pages/mus240/WeekDetail";
import AssignmentJournal from "./pages/mus240/AssignmentJournal";
import Resources from "./pages/mus240/Resources";
import Groups from "./pages/mus240/Groups";
import GroupDetail from "./pages/mus240/GroupDetail";
import GroupUpdateForm from "./pages/mus240/GroupUpdateForm";
import ResourcesAdmin from "./pages/mus240/admin/ResourcesAdmin";
import { Mus240AdminPage } from "./pages/mus240/admin/Mus240AdminPage";
import { InstructorConsole } from "./pages/mus240/InstructorConsole";
import { StudentMidtermGrading } from "./pages/mus240/StudentMidtermGrading";
import { StudentWorkOverview } from "./pages/mus240/StudentWorkOverview";
import { Mus240GradesPage } from "./pages/mus240/Mus240GradesPage";
import { StudentDashboard } from "./pages/mus240/StudentDashboard";
import { BulkJournalGradingPage } from "./pages/mus240/BulkJournalGradingPage";
import { PeerReviewBrowserPage } from "./pages/mus240/PeerReviewBrowserPage";
import { JournalReviewPage } from "./pages/mus240/JournalReviewPage";
import { InstructorJournalsPage } from "./pages/mus240/InstructorJournalsPage";
import JournalSubmissionGradingPage from "./pages/mus240/JournalSubmissionGradingPage";
import { StudentJournalGradePage } from "./pages/mus240/StudentJournalGradePage";
import MidtermExam from "./pages/mus240/MidtermExam";
import SMUS100MidtermExamPage from "./pages/SMUS100MidtermExamPage";
import CourseStatistics from "./pages/admin/CourseStatistics";
import MUS100SightSingingPage from "./pages/MUS100SightSingingPage";
import { PaymentSuccess } from "./pages/dues-management/PaymentSuccess";

import WritingGraderPage from "./pages/writing/WritingGraderPage";
import ChildrenGoAudition from "./pages/ChildrenGoAudition";
import ChildrenGoAuditionsAdmin from "./pages/admin/ChildrenGoAuditionsAdmin";
import ConcertTicketRequest from "./pages/ConcertTicketRequest";
import ConcertTicketAdmin from "./pages/admin/ConcertTicketAdmin";

import GrandStaves from "./pages/GrandStaves";
import GrandStaffClassroom from "./pages/GrandStaffClassroom";
import { Mus240PollPage } from "./pages/Mus240PollPage";
import MySubmissionsPage from "./pages/student/MySubmissionsPage";
import JazzPage from "./pages/mus240/JazzPage";
import Tour2026Page from "./pages/Tour2026Page";
import ExecutiveBoardWorkshopPage from "./pages/ExecutiveBoardWorkshopPage";
import ExecBoardTrainingVideosPage from "./pages/ExecBoardTrainingVideosPage";
import MeetingAgendasPage from "./pages/exec-board/MeetingAgendasPage";
import TransitionDocumentsPage from "./pages/exec-board/TransitionDocumentsPage";
import PolicyManualPage from "./pages/exec-board/PolicyManualPage";

// Grading System
import InstructorDashboard from "./pages/grading/instructor/InstructorDashboard";
import GradingAdminDashboard from "./pages/grading/admin/GradingAdminDashboard";
import CoursePage from "./pages/grading/instructor/CoursePage";
import AssignmentSubmissionsPage from "./pages/grading/instructor/AssignmentSubmissionsPage";
import SubmissionGradingPage from "./pages/grading/instructor/SubmissionGradingPage";
import GradebookPage from "./pages/grading/instructor/GradebookPage";
import ManageStudents from "./pages/grading/instructor/ManageStudents";
import GradingStudentDashboard from "./pages/grading/student/StudentDashboard";
import StudentCoursePage from "./pages/grading/student/StudentCoursePage";
import StudentAssignmentPage from "./pages/grading/student/StudentAssignmentPage";

// Preview triggers disabled to prevent accidental email sends during development

// Legacy MUS240 redirect component
const LegacyMus240Redirect = () => {
  const location = useLocation();
  const newPath = location.pathname.replace('/classes/mus240', '/mus-240');
  return <Navigate to={newPath} replace />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
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
      if (currentPath !== '/auth' && currentPath !== '/' && !currentPath.startsWith('/auth')) {
        sessionStorage.setItem('redirectAfterAuth', currentPath);
      }
      return <Navigate to="/auth" replace />;
    }
  
    return <>{children}</>;
  } catch (error) {
    console.error('ProtectedRoute error:', error);
    return <Navigate to="/auth" replace />;
  }
};

// Public route wrapper - no auth check needed
const PublicRoute = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};


const App = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <TooltipProvider>
              <CustomTooltipProvider>
                <MusicPlayerProvider>
                  <SplashWrapper>
                  <div>
                  <Toaster />
                  <Sonner />
                  <LiveInvitePopup />
                  <DesignSystemEnforcer />
                  <Suspense fallback={<LoadingSpinner size="lg" text="Loading..." />}>
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
              <Route 
                path="/auth" 
                element={
                  <PublicRoute>
                    <AuthPage />
                  </PublicRoute>
                } 
              />
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
              <Route 
                path="/reset-password" 
                element={
                  <PublicRoute>
                    <ResetPassword />
                  </PublicRoute>
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
              
              {/* MUS 210 - Choral Conducting */}
              <Route 
                path="/mus-210" 
                element={
                  <PublicRoute>
                    <Mus210Page />
                  </PublicRoute>
                }
              />
              {/* Legacy redirects */}
              <Route path="/choral-conducting-literature" element={<Navigate to="/mus-210" replace />} />
              <Route path="/classes/mus210" element={<Navigate to="/mus-210" replace />} />
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
               {/* MUS100 Sight Singing Practice */}
               <Route 
                 path="/mus100-sight-singing" 
                 element={
                   <PublicRoute>
                     <MUS100SightSingingPage />
                   </PublicRoute>
                 } 
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
              {/* Glee Lounge - Digital Student Union */}
              <Route 
                path="/glee-lounge" 
                element={
                  <ProtectedRoute>
                    <UniversalLayout>
                      <GleeLounge />
                    </UniversalLayout>
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
               {/* Admin routes - place before dashboard routes for proper matching */}
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute>
                      <AdminOnlyRoute>
                        <UniversalLayout>
                          <UnifiedDashboard />
                        </UniversalLayout>
                      </AdminOnlyRoute>
                    </ProtectedRoute>
                   } 
                 />
                 <Route 
                   path="/admin/appointments" 
                   element={
                     <ProtectedRoute>
                       <AdminOnlyRoute>
                         <UniversalLayout>
                           <AppointmentAdminDashboard />
                         </UniversalLayout>
                       </AdminOnlyRoute>
                     </ProtectedRoute>
                    } 
                  />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <UniversalLayout>
                        <UnifiedDashboard />
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
                   path="/dashboard/executive-board/member/:userId" 
                   element={
                     <ProtectedRoute>
                       <UniversalLayout>
                         <ExecutiveBoardMemberDashboard />
                       </UniversalLayout>
                     </ProtectedRoute>
                    } 
                  />
               <Route 
                 path="/fan" 
                 element={
                   <ProtectedRoute>
                     <FanDashboard />
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
                    <Profile />
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
                    <ProtectedRoute>
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
                   path="/community-hub" 
                   element={
                     <ProtectedRoute>
                       <CommunityHub />
                     </ProtectedRoute>
                   } 
                  />
                 <Route
                   path="/community" 
                   element={
                     <ProtectedRoute>
                       <CommunityHub />
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
                    path="/admin/announcements/edit/:id" 
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
                  path="/shop" 
                  element={
                    <PublicRoute>
                      <Shop />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/alumnae-shop" 
                  element={
                    <AlumnaeRoute>
                      <AlumnaeShop />
                    </AlumnaeRoute>
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
                  path="/order-confirmation" 
                  element={
                    <PublicRoute>
                      <OrderConfirmationPage />
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
                  element={
                    <ProtectedRoute>
                      <Calendar />
                    </ProtectedRoute>
                  } 
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
                  path="/executive-board-workshop" 
                  element={
                    <ProtectedRoute>
                      <ExecutiveBoardWorkshopPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/exec-board-training-videos" 
                  element={
                    <ProtectedRoute>
                      <ExecBoardTrainingVideosPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/exec-board/meeting-agendas" 
                  element={
                    <ProtectedRoute>
                      <MeetingAgendasPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/exec-board/transition-documents" 
                  element={
                    <ProtectedRoute>
                      <TransitionDocumentsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/exec-board/policy-manual" 
                  element={
                    <ProtectedRoute>
                      <PolicyManualPage />
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
                      path="/attendance-scan" 
                      element={<AttendanceScanPage />} 
                    />
                   <Route 
                     path="/music-library" 
                     element={
                       <PublicRoute>
                         <MusicLibraryPageLegacy />
                       </PublicRoute>
                     } 
                    />
                      <Route 
                        path="/librarian-dashboard" 
                        element={
                          <ProtectedRoute>
                            <LibrarianDashboardPage />
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
                           path="/alumnae" 
                           element={
                             <PublicRoute>
                               <AlumnaePageView />
                             </PublicRoute>
                           } 
                         />
                         <Route 
                           path="/admin/alumnae" 
                           element={
                             <ProtectedRoute>
                               <AlumnaeAdmin />
                             </ProtectedRoute>
                           } 
                         />
                         <Route 
                           path="/alumnae-management" 
                           element={
                             <ProtectedRoute>
                               <AlumnaeManagement />
                             </ProtectedRoute>
                           } 
                         />
                         <Route 
                           path="/admin/exec-board-monitor" 
                           element={
                             <ProtectedRoute>
                               <ExecutiveBoardMonitor />
                             </ProtectedRoute>
                           } 
                          />
                         <Route 
                           path="/admin/executive-board" 
                           element={
                             <ProtectedRoute>
                               <ExecutiveBoardPermissionPanel />
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
                                path="/admin/media" 
                                element={
                                  <ProtectedRoute>
                                    <MediaLibrary />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/communications" 
                                element={
                                  <ProtectedRoute>
                                    <Communications />
                                  </ProtectedRoute>
                                } 
                              />
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
                                path="/admin/executive" 
                                element={
                                  <ProtectedRoute>
                                    <ExecutiveBoard />
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
                    <UserManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/exit-interviews" 
                element={
                  <ProtectedRoute>
                    <ExitInterviewsPage />
                  </ProtectedRoute>
                } 
              />
                              <Route 
                                path="/amazon-shopping" 
                                element={
                                  <ProtectedRoute>
                                    <AmazonShoppingModule />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route
                               path="/dashboard/pr-hub" 
                               element={
                                 <ProtectedRoute>
                                   <PRHubPage />
                                 </ProtectedRoute>
                               } 
                             />
                             <Route 
                               path="/dashboard/section-leader" 
                               element={
                                 <ProtectedRoute>
                                   <SectionLeaderDashboard />
                                 </ProtectedRoute>
                              } 
                             />
                            <Route 
                              path="/dashboard/student-conductor" 
                              element={
                                <ProtectedRoute>
                                  <StudentConductorDashboard />
                                </ProtectedRoute>
                              } 
                              />
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
                                    <TourPlanner />
                                  </ProtectedRoute>
                                } 
                               />
                               <Route 
                                 path="/tour-manager" 
                                 element={
                                   <ProtectedRoute>
                                     <TourPlanner />
                                   </ProtectedRoute>
                                 } 
                               />
                               <Route 
                                 path="/appointments" 
                                 element={
                                   <ProtectedRoute>
                                     <Appointments />
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
                                 {/* Provider Routes - Protected for service providers only */}
                                 <Route 
                                   path="/appointments/provider/*" 
                                   element={<ProviderRoutes />} 
                                 />
                                 {/* Alias for plural path to prevent 404s */}
                                 <Route 
                                   path="/appointments/providers/*" 
                                   element={<ProviderRoutes />} 
                                 />
                                 <Route 
                                   path="/provider-appointments" 
                                   element={
                                     <ProtectedRoute>
                                       <ProviderAppointments />
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
                                 path="/handbook" 
                                 element={
                                   <ProtectedRoute>
                                     <Handbook />
                                   </ProtectedRoute>
                                 } 
                                />
                                <Route 
                                  path="/radio" 
                                  element={
                                    <ProtectedRoute>
                                      <RadioStationPage />
                                    </ProtectedRoute>
                                  } 
                                 />
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
                  path="/exec-board-exit-interview" 
                  element={
                    <ProtectedRoute>
                      <ExecBoardExitInterview />
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
                                 <Route 
                                   path="/console/first-year" 
                                   element={
                                     <ProtectedRoute>
                                       <FirstYearConsolePage />
                                     </ProtectedRoute>
                                   } 
                                 />
                                
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
                                    path="/pr-hub" 
                                    element={
                                      <ProtectedRoute>
                                        <PRHubPage />
                                      </ProtectedRoute>
                                    } 
                                  />
                                   <Route 
                                     path="/sight-reading-submission" 
                                     element={
                                       <ProtectedRoute>
                                         <SightReadingSubmission />
                                       </ProtectedRoute>
                                     } 
                                   />
                                   <Route 
                                     path="/sight-reading-preview" 
                                     element={
                                       <ProtectedRoute>
                                         <SightReadingPreview />
                                       </ProtectedRoute>
                                     } 
                                   />
                                       <Route 
                                        path="/sight-reading-generator" 
                                        element={
                                          <ProtectedRoute>
                                            <SightReadingGeneratorPage />
                                          </ProtectedRoute>
                                        } 
                                      />
                                      <Route 
                                        path="/karaoke-challenge" 
                                        element={
                                          <ProtectedRoute>
                                            <KaraokeChallenge />
                                          </ProtectedRoute>
                                        } 
                                      />
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
                                        element={
                                          <ProtectedRoute>
                                            <MemberSightReadingStudioPage />
                                          </ProtectedRoute>
                                        } 
                                      />
                                     <Route 
                                       path="/scheduling" 
                                       element={
                                         <ProtectedRoute>
                                           <SchedulingPage />
                                         </ProtectedRoute>
                                       } 
                                      />
                                      <Route 
                                        path="/booking" 
                                        element={
                                          <PublicRoute>
                                            <UnifiedBookingPage />
                                          </PublicRoute>
                                        } 
                                      />
                                      <Route 
                                        path="/booking-old" 
                                        element={
                                          <PublicRoute>
                                            <BookingPage />
                                          </PublicRoute>
                                        } 
                                      />
                                     <Route 
                                       path="/booking/service-selection" 
                                       element={
                                         <PublicRoute>
                                           <ServiceSelection />
                                         </PublicRoute>
                                       } 
                                     />
                                     <Route 
                                       path="/booking/datetime" 
                                       element={
                                         <PublicRoute>
                                           <DateTimeSelection />
                                         </PublicRoute>
                                       } 
                                     />
                                     <Route 
                                       path="/booking/recurring" 
                                       element={
                                         <PublicRoute>
                                           <RecurringOptions />
                                         </PublicRoute>
                                       } 
                                      />
                                      <Route 
                                         path="/booking/customer-info" 
                                         element={
                                           <PublicRoute>
                                             <CustomerInfo />
                                           </PublicRoute>
                                         } 
                                      />
                                      <Route 
                                         path="/booking/confirmation" 
                                         element={
                                           <PublicRoute>
                                             <BookingConfirmation />
                                           </PublicRoute>
                                         } 
                                       />
                                           <Route 
                                             path="/executive-board-dashboard" 
                                             element={<Navigate to="/dashboard" replace />} 
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
                             element={
                               <ProtectedRoute>
                                 <UniversalLayout>
                                   <SightReadingPage />
                                 </UniversalLayout>
                               </ProtectedRoute>
                             } 
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
                               element={
                                 <ProtectedRoute>
                                   <UniversalLayout>
                                     <SystemSettings />
                                  </UniversalLayout>
                                </ProtectedRoute>
                              } 
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
                                  element={
                                    <ProtectedRoute>
                                      <Mus240EnrollmentRoute>
                                        <StudentDashboard />
                                      </Mus240EnrollmentRoute>
                                    </ProtectedRoute>
                                   }
                                  />
                                  <Route 
                                   path="/mus-240/student-dashboard" 
                                   element={<Navigate to="/mus-240/student/dashboard" replace />}
                                  />
                                 <Route 
                                  path="/mus-240/student/journal/:journal_id/grade" 
                                  element={
                                    <ProtectedRoute>
                                      <Mus240EnrollmentRoute>
                                        <StudentJournalGradePage />
                                      </Mus240EnrollmentRoute>
                                    </ProtectedRoute>
                                  }
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
                                 path="/mus-240/assignments" 
                               element={
                                   <Mus240EnrollmentRoute>
                                     <AssignmentWeek />
                                   </Mus240EnrollmentRoute>
                               }
                               />
                               <Route 
                                 path="/mus-240/assignments/:assignmentId" 
                                element={
                                   <Mus240EnrollmentRoute>
                                     <AssignmentJournal />
                                   </Mus240EnrollmentRoute>
                                }
                               />
                               <Route 
                                 path="/mus-240/my-submissions" 
                                 element={
                                   <ProtectedRoute>
                                     <Mus240EnrollmentRoute>
                                       <MySubmissionsPage />
                                     </Mus240EnrollmentRoute>
                                   </ProtectedRoute>
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
                                 path="/mus-240/grades"
                                element={
                                  <Mus240EnrollmentRoute>
                                    <Mus240GradesPage />
                                  </Mus240EnrollmentRoute>
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
                                  <Route 
                                    path="/mus-240/admin" 
                                    element={<Navigate to="/mus-240/instructor/console" replace />}
                                  />
                                  <Route 
                                    path="/mus-240/instructor" 
                                    element={<Navigate to="/mus-240/instructor/console" replace />}
                                  />
                                  <Route 
                                    path="/mus-240/instructor/console" 
                                    element={
                                      <ProtectedRoute>
                                        <Mus240StaffRoute>
                                          <InstructorConsole />
                                        </Mus240StaffRoute>
                                      </ProtectedRoute>
                                    } 
                                  />
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
                                  <Route 
                                    path="/mus-240/instructor/bulk-grading" 
                                    element={
                                      <ProtectedRoute>
                                        <Mus240StaffRoute>
                                          <BulkJournalGradingPage />
                                        </Mus240StaffRoute>
                                      </ProtectedRoute>
                                    } 
                                  />
                                  <Route 
                                    path="/mus-240/peer-review" 
                                    element={
                                      <ProtectedRoute>
                                        <PeerReviewBrowserPage />
                                      </ProtectedRoute>
                                    } 
                                  />
                                  <Route 
                                    path="/mus-240/journal/:journalId/review" 
                                    element={
                                      <ProtectedRoute>
                                        <JournalReviewPage />
                                      </ProtectedRoute>
                                    } 
                                  />
                                  <Route 
                                    path="/mus-240/instructor/journals" 
                                    element={
                                      <ProtectedRoute>
                                        <InstructorJournalsPage />
                                      </ProtectedRoute>
                                    } 
                                  />
                                  <Route 
                                    path="/mus-240/instructor/journal/:journal_id/grade" 
                                    element={
                                      <ProtectedRoute>
                                        <JournalSubmissionGradingPage />
                                      </ProtectedRoute>
                                    } 
                                  />
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
                                    <Route 
                                      path="/test/:testId/preview"
                                      element={
                                        <ProtectedRoute>
                                          <TestPreview />
                                        </ProtectedRoute>
                                      } 
                                    />
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
                                    
                                      {/* Grading System Routes */}
                                      <Route 
                                        path="/instructor/admin/:courseId" 
                                        element={
                                          <ProtectedRoute>
                                            <InstructorAdmin />
                                          </ProtectedRoute>
                                        } 
                                      />
                                      <Route 
                                        path="/instructor/admin" 
                                        element={
                                          <ProtectedRoute>
                                            <InstructorAdmin />
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
                                     path="/grading/student/dashboard" 
                                     element={
                                       <ProtectedRoute>
                                         <GradingStudentDashboard />
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
                                   {/* Catch-all route for 404 */}
                                   <Route path="*" element={<NotFound />} />
                               </Routes>
                      </Suspense>
                    <GlobalMusicPlayer />
                    <PWAInstallPrompt />
                   </div>
                   </SplashWrapper>
                  </MusicPlayerProvider>
                </CustomTooltipProvider>
              </TooltipProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
  );
};

export default App;
