import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TooltipProvider as CustomTooltipProvider } from "@/contexts/TooltipContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext";
import { GlobalMusicPlayer } from "@/components/music/GlobalMusicPlayer";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useRoleBasedRedirect } from "@/hooks/useRoleBasedRedirect";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import System from "./pages/System";
import { GleeWorldLanding } from "./pages/GleeWorldLanding";
import ContractSigning from "./pages/ContractSigning";
import AdminSigning from "./pages/AdminSigning";
import ActivityLogs from "./pages/ActivityLogs";
import W9FormPage from "./pages/W9FormPage";
import NotFound from "./pages/NotFound";
import Accounting from "./pages/Accounting";
import UserDashboard from "./pages/UserDashboard";
import { MemberViewDashboard } from "./components/member-view/MemberViewDashboard";
import ContentCreator from "./pages/ContentCreator";
import EventPlanner from "./pages/EventPlanner";
import { Shop } from "./pages/Shop";
import Payments from "./pages/Payments";
import Profile from "./pages/Profile";
import Calendar from "./pages/Calendar";

import PublicCalendar from "./pages/PublicCalendar";
import PressKit from "./pages/PressKit";
import Notifications from "./pages/Notifications";
import Announcements from "./pages/Announcements";
import CreateAnnouncement from "./pages/admin/CreateAnnouncement";
import EditAnnouncement from "./pages/admin/EditAnnouncement";
import About from "./pages/About";
import AttendanceTestPage from "./pages/AttendanceTestPage";
import AttendancePage from "./pages/AttendancePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  console.log('ProtectedRoute: Checking auth state', { 
    user: user?.id || 'no user', 
    loading, 
    pathname: window.location.pathname 
  });
  
  if (loading) {
    console.log('ProtectedRoute: Still loading auth state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }
  
  if (!user) {
    console.log('ProtectedRoute: No user found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }
  
  console.log('ProtectedRoute: User authenticated, rendering protected content');
  return <>{children}</>;
};

// Public route wrapper with role-based redirect
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }
  
  // Allow public routes to be accessed by anyone
  return <>{children}</>;
};

// Root route handler - shows landing page or redirects authenticated users
const RootRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }
  
  // Show landing page for everyone, authenticated or not
  return <GleeWorldLanding />;
};

const App = () => {
  console.log('=== App Debug Info ===');
  console.log('App: Component mounted');
  console.log('App: Current URL:', window.location.href);
  console.log('App: Current pathname:', window.location.pathname);
  console.log('App: Current search:', window.location.search);
  console.log('App: Current hash:', window.location.hash);
  console.log('=== End App Debug Info ===');
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CustomTooltipProvider>
              <MusicPlayerProvider>
            <Routes>
              <Route 
                path="/auth" 
                element={
                  <PublicRoute>
                    <Auth />
                  </PublicRoute>
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
                path="/system" 
                element={
                  <ProtectedRoute>
                    <System />
                  </ProtectedRoute>
                } 
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
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <UserDashboard />
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
                path="/content-creator" 
                element={
                  <ProtectedRoute>
                    <ContentCreator />
                  </ProtectedRoute>
                }
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
                 path="/notifications" 
                 element={
                   <ProtectedRoute>
                     <Notifications />
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
                  path="/admin/announcements/new" 
                  element={
                    <ProtectedRoute>
                      <CreateAnnouncement />
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
                 path="/calendar" 
                 element={
                   <PublicRoute>
                     <Calendar />
                   </PublicRoute>
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
                 path="/press-kit" 
                 element={
                   <PublicRoute>
                     <PressKit />
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
                       <AttendancePage />
                     </ProtectedRoute>
                   } 
                 />
                <Route 
                  path="/landing"
                  element={
                    <PublicRoute>
                      <GleeWorldLanding />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/" 
                  element={<RootRoute />} 
                />
               <Route path="*" element={<NotFound />} />
            </Routes>
              <GlobalMusicPlayer />
            </MusicPlayerProvider>
          </CustomTooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
