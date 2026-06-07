import React from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNavigate } from 'react-router-dom';

interface ModuleGateProps {
  moduleId: string;
  children: React.ReactNode;
  /** Optional custom fallback. If omitted, renders a standard "upgrade" panel. */
  fallback?: React.ReactNode;
  /** If true, hide entirely when no access (no upgrade panel). Use for nav items. */
  silent?: boolean;
}

/**
 * Wraps content that requires a paid module. Renders children if the tenant has
 * the module; otherwise shows an upgrade panel (or hides, with silent=true).
 */
export function ModuleGate({ moduleId, children, fallback, silent }: ModuleGateProps) {
  const { isLoading, hasAccess } = useModuleAccess(moduleId);
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const navigate = useNavigate();

  // Super admins bypass module gating — they can open any addon without
  // going through Stripe (for inspection or tenant support).
  if (userProfile?.is_super_admin) return <>{children}</>;
  if (isLoading) return null;
  if (hasAccess) return <>{children}</>;
  if (silent) return null;
  if (fallback) return <>{fallback}</>;

  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center max-w-md mx-auto my-12">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">This feature is an add-on</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Activate this module to unlock the feature for your organization.
      </p>
      <Button onClick={() => navigate('/settings/modules')} className="w-full">
        View available add-ons
      </Button>
    </div>
  );
}
