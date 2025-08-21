import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { RoleTransitionManager } from '@/components/admin/RoleTransitionManager';

const RoleManager = () => {
  const { user } = useAuth();
  const { userProfile, loading } = useUserProfile(user);

  // Basic SEO
  useEffect(() => {
    document.title = 'Role Manager — Access Control | GleeWorld';
    const desc = 'Manage user role transitions, promotions, and audit history.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  const isAdmin = Boolean(userProfile?.is_admin || userProfile?.is_super_admin);
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Role Manager"
        description="Transition roles, promote auditioners, and review role change history"
        showBackButton
        backTo="/admin/access"
        backgroundVariant="gradient"
      >
        <a href="/admin/access" className="inline-flex items-center">
          <Shield className="mr-2 h-4 w-4" />
          Access Control
        </a>
      </PageHeader>

      <main>
        <section aria-labelledby="role-manager-section">
          <h2 id="role-manager-section" className="sr-only">User Role Transitions</h2>
          <Card>
            <CardContent className="p-0">
              <RoleTransitionManager />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default RoleManager;
