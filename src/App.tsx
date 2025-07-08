
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useRoleBasedRedirect } from "@/hooks/useRoleBasedRedirect";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import System from "./pages/System";
import ContractSigning from "./pages/ContractSigning";
import AdminSigning from "./pages/AdminSigning";
import ActivityLogs from "./pages/ActivityLogs";
import W9FormPage from "./pages/W9FormPage";
import NotFound from "./pages/NotFound";
import Accounting from "./pages/Accounting";
import UserDashboard from "./pages/UserDashboard";
import ContentCreator from "./pages/ContentCreator";

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
      <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 flex items-center justify-center">
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
  const { userProfile } = useRoleBasedRedirect();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }
  
  if (user && userProfile) {
    // Role-based redirect happens in useRoleBasedRedirect hook
    return null;
  }
  
  return <>{children}</>;
};

// Root route handler for authenticated users
const RootRoute = () => {
  const { user, loading } = useAuth();
  const { userProfile } = useRoleBasedRedirect();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Let useRoleBasedRedirect handle the redirect
  return <Index />;
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
                path="/content-creator" 
                element={
                  <ProtectedRoute>
                    <ContentCreator />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <RootRoute />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
