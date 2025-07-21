
import { createBrowserRouter } from "react-router-dom";
import Index from "@/pages/Index";
import Profile from "@/pages/Profile";
import ContractSigning from "@/pages/ContractSigning";
import AdminSigning from "@/pages/AdminSigning";
import SheetMusic from "@/pages/SheetMusic";
import SheetMusicReader from "@/pages/SheetMusicReader";
import SheetMusicViewer from "@/pages/SheetMusicViewer";
import UserManagement from "@/pages/UserManagement";
import AttendanceTracker from "@/pages/AttendanceTracker";
import VideoLibrary from "@/pages/VideoLibrary";
import MusicLibrary from "@/pages/MusicLibrary";
import TaskManager from "@/pages/TaskManager";
import Notifications from "@/pages/Notifications";
import SMSTest from "@/pages/SMSTest";
import NotificationPreferences from "@/components/notifications/NotificationPreferences";
import { EventManagement } from "@/pages/EventManagement";
import { BudgetManagement } from "@/pages/BudgetManagement";
import { FinanceManagement } from "@/pages/FinanceManagement";
import { Calendar } from "@/pages/Calendar";
import { ActivityDashboard } from "@/pages/ActivityDashboard";
import ContractManagement from "@/pages/ContractManagement";
import ContractBuilder from "@/pages/ContractBuilder";
import { ContractCreation } from "@/pages/ContractCreation";
import { ContractCreationV2 } from "@/pages/ContractCreationV2";
import { ContractEditor } from "@/pages/ContractEditor";
import { ContractEmailSender } from "@/pages/ContractEmailSender";
import { PaymentManagement } from "@/pages/PaymentManagement";
import { AnnouncementManagement } from "@/pages/AnnouncementManagement";
import { ReportsGeneration } from "@/pages/ReportsGeneration";
import { BackupRestore } from "@/pages/BackupRestore";
import { Settings } from "@/pages/Settings";
import { AppointmentScheduling } from "@/pages/AppointmentScheduling";
import { MusicUpload } from "@/pages/MusicUpload";
import { MusicPlayer } from "@/pages/MusicPlayer";
import { PlaylistManagement } from "@/pages/PlaylistManagement";
import { SetlistManagement } from "@/pages/SetlistManagement";
import { W9Management } from "@/pages/W9Management";
import { NotFound } from "@/pages/NotFound";

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
    path: "/sheet-music",
    element: <SheetMusic />,
  },
  {
    path: "/sheet-music-reader",
    element: <SheetMusicReader />,
  },
  {
    path: "/sheet-music-viewer/:id",
    element: <SheetMusicViewer />,
  },
  {
    path: "/user-management",
    element: <UserManagement />,
  },
  {
    path: "/attendance-tracker",
    element: <AttendanceTracker />,
  },
  {
    path: "/video-library",
    element: <VideoLibrary />,
  },
  {
    path: "/music-library",
    element: <MusicLibrary />,
  },
  {
    path: "/task-manager",
    element: <TaskManager />,
  },
  {
    path: "/notifications",
    element: <Notifications />,
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
    path: "/event-management",
    element: <EventManagement />,
  },
  {
    path: "/budget-management",
    element: <BudgetManagement />,
  },
  {
    path: "/finance-management",
    element: <FinanceManagement />,
  },
  {
    path: "/calendar",
    element: <Calendar />,
  },
  {
    path: "/activity-dashboard",
    element: <ActivityDashboard />,
  },
  {
    path: "/contract-management",
    element: <ContractManagement />,
  },
  {
    path: "/contract-builder",
    element: <ContractBuilder />,
  },
  {
    path: "/contract-creation",
    element: <ContractCreation />,
  },
  {
    path: "/contract-creation-v2",
    element: <ContractCreationV2 />,
  },
  {
    path: "/contract-editor/:id",
    element: <ContractEditor />,
  },
  {
    path: "/contract-email-sender",
    element: <ContractEmailSender />,
  },
  {
    path: "/payment-management",
    element: <PaymentManagement />,
  },
  {
    path: "/announcement-management",
    element: <AnnouncementManagement />,
  },
  {
    path: "/reports-generation",
    element: <ReportsGeneration />,
  },
  {
    path: "/backup-restore",
    element: <BackupRestore />,
  },
  {
    path: "/settings",
    element: <Settings />,
  },
  {
    path: "/appointment-scheduling",
    element: <AppointmentScheduling />,
  },
  {
    path: "/music-upload",
    element: <MusicUpload />,
  },
  {
    path: "/music-player",
    element: <MusicPlayer />,
  },
  {
    path: "/playlist-management",
    element: <PlaylistManagement />,
  },
  {
    path: "/setlist-management",
    element: <SetlistManagement />,
  },
  {
    path: "/w9-management",
    element: <W9Management />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);
