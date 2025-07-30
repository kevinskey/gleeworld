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

import Index from "./pages/Index";
import Auth from "./pages/Auth";

import { GleeWorldLanding } from "./pages/GleeWorldLanding";
import { TestLandingPage } from "./components/debug/TestLandingPage";
import { SimpleHomePage } from "./components/debug/SimpleHomePage";
import ContractSigning from "./pages/ContractSigning";
import AdminSigning from "./pages/AdminSigning";
import ActivityLogs from "./pages/ActivityLogs";
import W9FormPage from "./pages/W9FormPage";
import NotFound from "./pages/NotFound";
import Accounting from "./pages/Accounting";
import UserDashboard from "./pages/UserDashboard";
import { MemberViewDashboard } from "./components/member-view/MemberViewDashboard";

import EventPlanner from "./pages/EventPlanner";
import BudgetApprovals from "./pages/BudgetApprovals";
import { Shop } from "./pages/Shop";
import { CheckoutPage } from "./pages/CheckoutPage";
import { OrderConfirmationPage } from "./pages/OrderConfirmationPage";
import Payments from "./pages/Payments";
import Profile from "./pages/Profile";
import ProfileSetup from "./pages/ProfileSetup";
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
import MusicLibraryPage from "./pages/MusicLibrary";
import NotificationCenter from "./pages/NotificationCenter";
import Budgets from "./pages/Budgets";
import Treasurer from "./pages/Treasurer";
import TourManager from "./pages/TourManager";
import PerformanceSuite from "./pages/PerformanceSuite";
import WellnessSuite from "./pages/WellnessSuite";
import { FeedbackDashboard } from "./modules/rehearsals/feedback-dashboard/FeedbackDashboard";
import AlumnaeLanding from "./pages/AlumnaeLanding";
import AlumnaeAdmin from "./pages/admin/AlumnaeAdmin";
import SendNotificationPage from "./pages/SendNotificationPage";
import AuditionPage from "./pages/AuditionPage";
import Handbook from "./pages/Handbook";
import ScholarshipHub from "./pages/ScholarshipHub";
import AdminScholarships from "./pages/AdminScholarships";
import AdminProducts from "./pages/AdminProducts";
import { ExecutiveBoardDashboard } from "./pages/ExecutiveBoardDashboard";
import { SectionLeaderDashboard } from "./pages/SectionLeaderDashboard";
import { SectionalManagement } from "./pages/SectionalManagement";
import { SRFManagement } from "./pages/SRFManagement";
import { StudentConductorDashboard } from "./pages/StudentConductorDashboard";
import TourPlanner from "./pages/TourPlanner";
import BookingRequest from "./pages/BookingRequest";
import Wardrobe from "./pages/Wardrobe";
import { ProductManagement } from "./pages/ProductManagement";
import PRHubPage from "./pages/PRHubPage";

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
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
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

// Root route handler - shows public landing page for everyone
const RootRoute = () => {
  const { loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Initializing authentication..." />
      </div>
    );
  }
  
  return <GleeWorldLanding />;
};

const App = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <CustomTooltipProvider>
              <MusicPlayerProvider>
                <div>
                  <Toaster />
                  <Sonner />
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
                  path="/profile/setup" 
                  element={
                    <ProtectedRoute>
                      <ProfileSetup />
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
                     path="/music-library" 
                     element={
                       <ProtectedRoute>
                         <MusicLibraryPage />
                       </ProtectedRoute>
                     } 
                   />
                    <Route 
                      path="/notification-center" 
                      element={
                        <ProtectedRoute>
                          <NotificationCenter />
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
                         path="/tour-manager" 
                         element={
                           <ProtectedRoute>
                             <TourManager />
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
                           <ProtectedRoute>
                             <AlumnaeLanding />
                           </ProtectedRoute>
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
                             path="/dashboard/executive-board" 
                             element={
                               <ProtectedRoute>
                                 <ExecutiveBoardDashboard />
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
                               path="/tour-planner" 
                               element={
                                 <ProtectedRoute>
                                   <TourPlanner />
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
                </div>
              </MusicPlayerProvider>
            </CustomTooltipProvider>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
