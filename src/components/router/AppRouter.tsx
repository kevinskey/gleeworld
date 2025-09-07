import { createBrowserRouter, Navigate } from "react-router-dom";
import Index from "@/pages/Index";
import Profile from "@/pages/Profile";
import ContractSigning from "@/pages/ContractSigning";
import AdminSigning from "@/pages/AdminSigning";
import MusicLibrary from "@/pages/MusicLibrary";
import Notifications from "@/pages/Notifications";
import SMSTest from "@/pages/SMSTest";
import NotificationPreferences from "@/components/notifications/NotificationPreferences";
import Calendar from "@/pages/Calendar";
import AttendancePage from "@/pages/AttendancePage";
import FullAttendanceRecordPage from "@/pages/member/FullAttendanceRecordPage";
import AttendancePolicyPage from "@/pages/handbook/AttendancePolicyPage";
import EventPlanner from "@/pages/EventPlanner";
import Payments from "@/pages/Payments";
import Announcements from "@/pages/Announcements";

import BudgetApprovals from "@/pages/BudgetApprovals";
import W9FormPage from "@/pages/W9FormPage";
import NotFound from "@/pages/NotFound";
import UserManagement from "@/pages/UserManagement";

import AlumnaeLanding from "@/pages/AlumnaeLanding";
import AlumnaeLegacyLounge from "@/pages/AlumnaeLegacyLounge";
import AlumnaeStorySubmission from "@/pages/AlumnaeStorySubmission";
import AlumnaeMessages from "@/pages/AlumnaeMessages";
import AlumnaeAdmin from "@/pages/admin/AlumnaeAdmin";
import { Shop } from "@/pages/Shop";
import { Checkout } from "@/pages/Checkout";
import { Success } from "@/pages/shop/Success";
import { UnifiedDashboard } from "@/components/dashboard/UnifiedDashboard";
import BookingRequest from "@/pages/BookingRequest";
import Appointments from "@/pages/Appointments";
import TourPlanner from "@/pages/TourPlanner";
import SendNotificationPage from "@/pages/SendNotificationPage";

import SetupAdmin from "@/pages/SetupAdmin";
import PublicCalendar from "@/pages/PublicCalendar";
import VoiceRangeAssessmentPage from "@/pages/VoiceRangeAssessmentPage";
import ExecutiveBoardDashboard from "@/pages/ExecutiveBoardDashboard";
import MemberSightReadingStudioPage from "@/pages/MemberSightReadingStudio";
import LibrarianDashboardPage from "@/pages/LibrarianDashboardPage";
import { Onboarding } from "@/pages/Onboarding";
import { MessagingInterface } from '@/components/messaging/MessagingInterface';
import StudentRegistration from "@/pages/StudentRegistration";

// MUS240 Pages
import ClassLanding from "@/pages/mus240/ClassLanding";
import AssignmentJournal from "@/pages/mus240/AssignmentJournal";
import Resources from "@/pages/mus240/Resources";
import ResourcesAdmin from "@/pages/mus240/admin/ResourcesAdmin";
import ListeningHub from "@/pages/mus240/ListeningHub";
import AssignmentWeek from "@/pages/mus240/AssignmentWeek";
import WeekDetail from "@/pages/mus240/WeekDetail";
import SyllabusPage from "@/pages/mus240/SyllabusPage";
import { Mus240GradesPage } from "@/pages/mus240/Mus240GradesPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/profile",
    element: <Profile />,
  },
  {
    path: "/contract-signing",
    element: <ContractSigning />,
  },
  {
    path: "/contract-signing/:id",
    element: <ContractSigning />,
  },
  {
    path: "/admin-signing",
    element: <AdminSigning />,
  },
  {
    path: "/music-library",
    element: <MusicLibrary />,
  },
  {
    path: "/notifications",
    element: <Notifications />,
  },
  {
    path: "/notifications/send",
    element: <SendNotificationPage />,
  },
  {
    path: "/sms-test",
    element: <SMSTest />,
  },
  {
    path: "/notification-preferences",
    element: <NotificationPreferences />,
  },
  {
    path: "/calendar",
    element: <PublicCalendar />,
  },
  {
    path: "/public-calendar",
    element: <PublicCalendar />,
  },
  {
    path: "/attendance",
    element: <AttendancePage />,
  },
  {
    path: "/member/attendance/full-record",
    element: <FullAttendanceRecordPage />,
  },
  {
    path: "/handbook/attendance-policy",
    element: <AttendancePolicyPage />,
  },
  {
    path: "/events",
    element: <EventPlanner />,
  },
  {
    path: "/payments",
    element: <Payments />,
  },
  {
    path: "/announcements",
    element: <Announcements />,
  },
  {
    path: "/messages",
    element: <MessagingInterface />,
  },
  {
    path: "/budget-approvals",
    element: <BudgetApprovals />,
  },
  {
    path: "/w9-form",
    element: <W9FormPage />,
  },
  {
    path: "/user-management",
    element: <UserManagement />,
  },
  {
    path: "/alumnae",
    element: <AlumnaeLanding />,
  },
  {
    path: "/alumnae/legacy-lounge",
    element: <AlumnaeLegacyLounge />,
  },
  {
    path: "/alumnae/story-submission",
    element: <AlumnaeStorySubmission />,
  },
  {
    path: "/alumnae/messages",
    element: <AlumnaeMessages />,
  },
  {
    path: "/admin/alumnae",
    element: <AlumnaeAdmin />,
  },
  {
    path: "/setup-admin",
    element: <SetupAdmin />,
  },
  {
    path: "/shop",
    element: <Shop />,
  },
  {
    path: "/checkout",
    element: <Checkout />,
  },
  {
    path: "/shop/success",
    element: <Success />,
  },
  {
    path: "/booking-request",
    element: <BookingRequest />,
  },
  {
    path: "/booking",
    element: <Appointments />,
  },
  {
    path: "/voice-assessment",
    element: <VoiceRangeAssessmentPage />,
  },
  {
    path: "/member-sight-reading-studio",
    element: <MemberSightReadingStudioPage />,
  },
  {
    path: "/dashboard",
    element: <UnifiedDashboard />,
  },
  {
    path: "/executive-board-dashboard", 
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/librarian-dashboard",
    element: <LibrarianDashboardPage />,
  },
  {
    path: "/onboarding",
    element: <Onboarding />,
  },
  {
    path: "/student-registration",
    element: <StudentRegistration />,
  },
  // MUS240 Routes
  {
    path: "/classes/mus240",
    element: <ClassLanding />,
  },
  {
    path: "/classes/mus240/syllabus",
    element: <SyllabusPage />,
  },
  {
    path: "/classes/mus240/listening",
    element: <ListeningHub />,
  },
  {
    path: "/classes/mus240/listening/:weekNumber",
    element: <WeekDetail />,
  },
  {
    path: "/classes/mus240/assignments",
    element: <AssignmentWeek />,
  },
  {
    path: "/classes/mus240/assignments/:assignmentId",
    element: <AssignmentJournal />,
  },
  {
    path: "/classes/mus240/grades",
    element: <Mus240GradesPage />,
  },
  {
    path: "/classes/mus240/resources",
    element: <Resources />,
  },
      {
        path: "/classes/mus240/resources/admin",
        element: <ResourcesAdmin />,
      },
  {
    path: "*",
    element: <NotFound />,
  },
]);