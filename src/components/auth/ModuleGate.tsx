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
 * Wraps content that belongs to a module.
 *
 * DURING THE FREE PERIOD (decided 2026-08-06) every tenant gets every
 * feature — nobody has picked a tier yet, so v_tenant_active_modules admits
 * all active modules and this gate should essentially never fire. What can
 * still reach it: a module switched off platform-wide with is_active=false,
 * or the brief moment before the module list loads.
 *
 * The copy therefore no longer talks about add-ons or activation. It used to
 * say "This feature is an add-on — activate this module", which was the old
 * per-module billing model and read as a paywall to people whose plan already
 * included the feature. When tiers start gating features, the honest message
 * will be about the plan, not about buying a module — and it belongs here.
 */
export function ModuleGate({ moduleId, children, fallback, silent }: ModuleGateProps) {
  const { isLoading, hasAccess } = useModuleAccess(moduleId);
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const navigate = useNavigate();

  // Super admins bypass gating entirely, for inspection and tenant support.
  // Worth remembering when testing: a super admin CANNOT reproduce what a
  // member sees, so a gate that is broken for everyone else looks fine.
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
      <h3 className="text-lg font-semibold mb-2">This feature isn&rsquo;t available yet</h3>
      <p className="text-sm text-muted-foreground mb-6">
        It isn&rsquo;t switched on for your workspace right now. If you expected to see
        it here, let us know and we&rsquo;ll take a look.
      </p>
      <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
        Back to the dashboard
      </Button>
    </div>
  );
}
