
import { createBrowserRouter } from "react-router-dom";
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

import AlumnaeLanding from "@/pages/AlumnaeLanding";
import AlumnaeLegacyLounge from "@/pages/AlumnaeLegacyLounge";
import AlumnaeStorySubmission from "@/pages/AlumnaeStorySubmission";
import AlumnaeMessages from "@/pages/AlumnaeMessages";
import AlumnaeAdmin from "@/pages/admin/AlumnaeAdmin";
import { Shop } from "@/pages/Shop";
import { Checkout } from "@/pages/Checkout";
import { Success } from "@/pages/shop/Success";
import BookingRequest from "@/pages/BookingRequest";
import TourPlanner from "@/pages/TourPlanner";
import SendNotificationPage from "@/pages/SendNotificationPage";
import LibrarianServices from "@/pages/executive-services/LibrarianServices";
import TreasurerServices from "@/pages/executive-services/TreasurerServices";
import TourManagerServices from "@/pages/executive-services/TourManagerServices";
import PRCoordinatorServices from "@/pages/executive-services/PRCoordinatorServices";
import ExecutiveServicesDirectory from "@/pages/ExecutiveServicesDirectory";


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
    element: <Calendar />,
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
    path: "/budget-approvals",
    element: <BudgetApprovals />,
  },
  {
    path: "/w9-form",
    element: <W9FormPage />,
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
    path: "/executive-services",
    element: <ExecutiveServicesDirectory />,
  },
  {
    path: "/executive-services/librarian",
    element: <LibrarianServices />,
  },
  {
    path: "/executive-services/treasurer",
    element: <TreasurerServices />,
  },
  {
    path: "/executive-services/tour-manager", 
    element: <TourManagerServices />,
  },
  {
    path: "/executive-services/pr-coordinator",
    element: <PRCoordinatorServices />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);
