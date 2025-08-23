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
    path: "/attendance",
    element: <AttendancePage />,
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
    path: "/admin/exec-board-monitor",
    element: (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Executive Board Monitor</h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 font-semibold">✅ Route is working correctly!</p>
              <p className="text-green-700 mt-1">The page is now loading successfully.</p>
            </div>
            <div className="space-y-4">
              <p className="text-lg text-gray-700">This is the Executive Board Monitor page.</p>
              <p className="text-gray-600">
                This page allows administrators to monitor executive board member dashboards and access levels.
              </p>
              <div className="flex gap-4 mt-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex-1">
                  <h3 className="font-semibold text-blue-900">Status</h3>
                  <p className="text-blue-700">Active and functioning</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 flex-1">
                  <h3 className="font-semibold text-purple-900">Route</h3>
                  <p className="text-purple-700">/admin/exec-board-monitor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
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
  {
    path: "*",
    element: <NotFound />,
  },
]);