import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { DashboardTemplate } from "./DashboardTemplate";
import { AdminDashboard } from "./dashboards/AdminDashboard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { supabase } from '@/integrations/supabase/client';

export const AdminViewDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Debug logging
  console.log('AdminViewDashboard - loading:', loading);
  console.log('AdminViewDashboard - user:', user);
  console.log('AdminViewDashboard - user role:', user?.role);

  // Note: Removed automatic redirect to allow admin setup

  if (loading) {
    console.log('AdminViewDashboard - showing loading spinner');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading admin dashboard..." />
      </div>
    );
  }

  if (!user) {
    console.log('AdminViewDashboard - no user, showing auth required');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState
          title="Authentication Required"
          message="Please sign in to access the admin dashboard"
          onRetry={() => navigate('/auth')}
        />
      </div>
    );
  }

  if (user.role !== 'admin' && user.role !== 'super-admin') {
    console.log('AdminViewDashboard - user not admin, showing make admin button');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold mb-4">Become Admin</h2>
          <p className="text-muted-foreground mb-4">Click below to grant yourself admin privileges.</p>
          <Button 
            onClick={async () => {
              try {
                console.log('Making user admin...', user.id, user.email);
                
                // Update profiles table (only use existing columns)
                const { error: profilesError } = await supabase
                  .from('profiles')
                  .upsert({
                    id: user.id,
                    email: user.email,
                    role: 'admin',
                    full_name: user.email?.split('@')[0] || 'Admin User'
                  });
                
                if (profilesError) {
                  console.error('Profiles table error:', profilesError);
                  throw profilesError;
                }
                
                console.log('Admin role assigned successfully!');
                alert('Admin role assigned successfully! Reloading page...');
                window.location.reload();
              } catch (error) {
                console.error('Error making admin:', error);
                alert('Error: ' + (error as any).message);
              }
            }}
            className="mr-4"
          >
            <Shield className="mr-2 h-4 w-4" />
            Make Me Admin
          </Button>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Use admin background
  const backgroundImage = "/lovable-uploads/7f76a692-7ffc-414c-af69-fc6585338524.png";

  const getTitle = () => {
    return user.role === 'super-admin' ? 'Super Admin Dashboard' : 'Admin Dashboard';
  };

  const getSubtitle = () => {
    return 'Manage the Spelman College Glee Club platform';
  };

  return (
    <DashboardTemplate
      user={user}
      title={getTitle()}
      subtitle={getSubtitle()}
      backgroundImage={backgroundImage}
      headerActions={
        <Button onClick={() => navigate('/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      }
    >
      <AdminDashboard user={user} />
    </DashboardTemplate>
  );
};