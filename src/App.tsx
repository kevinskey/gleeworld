
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/components/routing/ProtectedRoute";
import { HomeRoute } from "@/components/routing/HomeRoute";
import AuthPage from "@/pages/AuthPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import DashboardPage from "@/pages/DashboardPage";
import AuditionerDashboardPage from "@/pages/AuditionerDashboardPage";
import { ROUTES } from "@/constants/routes";

// Lazy load other pages
import { lazy, Suspense } from "react";

const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const ShopPage = lazy(() => import("@/pages/ShopPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const ShopSuccessPage = lazy(() => import("@/pages/ShopSuccessPage"));
const EventPlannerPage = lazy(() => import("@/pages/EventPlannerPage"));
const TourManagerPage = lazy(() => import("@/pages/TourManagerPage"));
const AttendancePage = lazy(() => import("@/pages/AttendancePage"));
const AppointmentScheduler = lazy(() => import("@/pages/AppointmentScheduler"));
const SightReadingSubmissionPage = lazy(() => import("@/pages/SightReadingSubmissionPage"));
const SightReadingPreviewPage = lazy(() => import("@/pages/SightReadingPreviewPage"));
const SightReadingGeneratorPage = lazy(() => import("@/pages/SightReadingGeneratorPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path={ROUTES.HOME} element={<HomeRoute />} />
              <Route path={ROUTES.AUTH} element={<AuthPage />} />
              <Route path={ROUTES.AUDITIONER_DASHBOARD} element={<AuditionerDashboardPage />} />
              
              <Route path={ROUTES.ADMIN} element={
                <ProtectedRoute>
                  <AdminDashboardPage />
                </ProtectedRoute>
              } />
              
              <Route path={ROUTES.DASHBOARD} element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />

              <Route path={ROUTES.CALENDAR} element={
                <Suspense fallback={<div>Loading...</div>}>
                  <CalendarPage />
                </Suspense>
              } />

              <Route path={ROUTES.SHOP} element={
                <Suspense fallback={<div>Loading...</div>}>
                  <ShopPage />
                </Suspense>
              } />

              <Route path={ROUTES.CHECKOUT} element={
                <Suspense fallback={<div>Loading...</div>}>
                  <CheckoutPage />
                </Suspense>
              } />

              <Route path={ROUTES.SHOP_SUCCESS} element={
                <Suspense fallback={<div>Loading...</div>}>
                  <ShopSuccessPage />
                </Suspense>
              } />

              <Route path={ROUTES.EVENT_PLANNER} element={
                <ProtectedRoute>
                  <Suspense fallback={<div>Loading...</div>}>
                    <EventPlannerPage />
                  </Suspense>
                </ProtectedRoute>
              } />

              <Route path={ROUTES.TOUR_MANAGER} element={
                <ProtectedRoute>
                  <Suspense fallback={<div>Loading...</div>}>
                    <TourManagerPage />
                  </Suspense>
                </ProtectedRoute>
              } />

              <Route path={ROUTES.ATTENDANCE} element={
                <ProtectedRoute>
                  <Suspense fallback={<div>Loading...</div>}>
                    <AttendancePage />
                  </Suspense>
                </ProtectedRoute>
              } />

              <Route path={ROUTES.APPOINTMENTS} element={
                <ProtectedRoute>
                  <Suspense fallback={<div>Loading...</div>}>
                    <AppointmentScheduler />
                  </Suspense>
                </ProtectedRoute>
              } />

              <Route path={ROUTES.SIGHT_READING_SUBMISSION} element={
                <ProtectedRoute>
                  <Suspense fallback={<div>Loading...</div>}>
                    <SightReadingSubmissionPage />
                  </Suspense>
                </ProtectedRoute>
              } />

              <Route path={ROUTES.SIGHT_READING_PREVIEW} element={
                <ProtectedRoute>
                  <Suspense fallback={<div>Loading...</div>}>
                    <SightReadingPreviewPage />
                  </Suspense>
                </ProtectedRoute>
              } />

              <Route path={ROUTES.SIGHT_READING_GENERATOR} element={
                <ProtectedRoute>
                  <Suspense fallback={<div>Loading...</div>}>
                    <SightReadingGeneratorPage />
                  </Suspense>
                </ProtectedRoute>
              } />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
