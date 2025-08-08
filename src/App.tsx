import React, { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { DesignSystemEnforcer } from "@/components/ui/design-system-enforcer";

import { HomeRoute } from "@/components/routing/HomeRoute";

import Index from "./pages/Index";
import DirectoryPage from "./pages/DirectoryPage";
import Auth from "./pages/Auth";
import FanDashboard from "./pages/FanDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { DuesManagement } from "./pages/DuesManagement";

import { GleeWorldLanding } from "./pages/GleeWorldLanding";
import { TestLandingPage } from "./components/debug/TestLandingPage";
import { SimpleHomePage } from "./components/debug/SimpleHomePage";
import ContractSigning from "./pages/ContractSigning";
import AdminSigning from "./pages/AdminSigning";
import ActivityLogs from "./pages/ActivityLogs";
import W9FormPage from "./pages/W9FormPage";
import NotFound from "./pages/NotFound";
import Accounting from "./pages/Accounting";
import { UnifiedDashboard } from "./components/dashboard/UnifiedDashboard";
import { MemberViewDashboard } from "./components/member-view/MemberViewDashboard";
import AuditionerDashboardPage from "./pages/AuditionerDashboardPage";

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

import Budgets from "./pages/Budgets";
import Treasurer from "./pages/Treasurer";

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
import { SectionLeaderDashboard } from "./pages/SectionLeaderDashboard";
import { SectionalManagement } from "./pages/SectionalManagement";
import { SRFManagement } from "./pages/SRFManagement";

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
import Wardrobe from "./pages/Wardrobe";
import { ProductManagement } from "./pages/ProductManagement";
import PRHubPage from "./pages/PRHubPage";
import { SharedAnnotation } from "./pages/SharedAnnotation";
import MobileScoring from "./pages/MobileScoring";
import MemberDirectory from "./pages/MemberDirectory";
import { AmazonShoppingModule } from "./components/shopping/AmazonShoppingModule";
import { RadioStationPage } from "./components/radio/RadioStationPage";
import { AuditionsManagement } from "./components/admin/AuditionsManagement";
import { ShoutcastManagement } from "./pages/admin/ShoutcastManagement";
import { ReceiptsPage } from "./pages/ReceiptsPage";
import ApprovalSystemPage from "./pages/ApprovalSystemPage";
import SightReadingSubmission from "./pages/SightReadingSubmission";
import SightReadingPreview from "./pages/SightReadingPreview";
import SightReadingGenerator from "./pages/SightReadingGenerator";
import SchedulingPage from "./pages/SchedulingPage";
import BookingPage from "./pages/BookingPage";
import ServiceSelection from "./pages/booking/ServiceSelection";
import DateTimeSelection from "./pages/booking/DateTimeSelection";
import RecurringOptions from "./pages/booking/RecurringOptions";
import CustomerInfo from "./pages/booking/CustomerInfo";
import BookingConfirmation from "./pages/booking/BookingConfirmation";
import ExecutiveBoardDashboard from "./pages/ExecutiveBoardDashboard";
import GoogleDocsPage from "./pages/GoogleDocs";

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
    // Store the current path to redirect back after login, but only if it's not the root path
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/auth' && currentPath !== '/' && !currentPath.startsWith('/auth')) {
      console.log('ProtectedRoute: Storing redirect path:', currentPath);
      sessionStorage.setItem('redirectAfterAuth', currentPath);
    }
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// Public route wrapper - no auth check needed
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
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
                  <DesignSystemEnforcer />
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
                    <UnifiedDashboard />
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
                element={
                  <PublicRoute>
                    <AuditionerDashboardPage />
                  </PublicRoute>
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
                     <PublicCalendar />
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
                                  path="/radio" 
                                  element={
                                    <ProtectedRoute>
                                      <RadioStationPage />
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
                          <AdminDashboard />
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
                                          <SightReadingGenerator />
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
                                         <ProtectedRoute>
                                           <BookingPage />
                                         </ProtectedRoute>
                                       } 
                                     />
                                     <Route 
                                       path="/booking/service-selection" 
                                       element={
                                         <ProtectedRoute>
                                           <ServiceSelection />
                                         </ProtectedRoute>
                                       } 
                                     />
                                     <Route 
                                       path="/booking/datetime" 
                                       element={
                                         <ProtectedRoute>
                                           <DateTimeSelection />
                                         </ProtectedRoute>
                                       } 
                                     />
                                     <Route 
                                       path="/booking/recurring" 
                                       element={
                                         <ProtectedRoute>
                                           <RecurringOptions />
                                         </ProtectedRoute>
                                        } 
                                      />
                                      <Route 
                                        path="/booking/customer-info" 
                                        element={
                                          <ProtectedRoute>
                                            <CustomerInfo />
                                          </ProtectedRoute>
                                        } 
                                      />
                                      <Route 
                                        path="/booking/confirmation" 
                                        element={
                                          <ProtectedRoute>
                                            <BookingConfirmation />
                                          </ProtectedRoute>
                                         } 
                                       />
                                         <Route 
                                           path="/executive-board-dashboard" 
                                           element={
                                             <ProtectedRoute>
                                               <ExecutiveBoardDashboard />
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
