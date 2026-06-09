import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import { useTenantModules } from '@/hooks/useModuleAccess';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Shield, Database, Search, Eye } from 'lucide-react';

interface ControlCenterProps {
  onModuleSelect: (moduleId: string) => void;
}

export const ControlCenter = ({ onModuleSelect }: ControlCenterProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const isSuperAdmin = !!userProfile?.is_super_admin;
  const [query, setQuery] = useState('');
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const { data: tenantModules = [] } = useTenantModules();
  const activeBillingSlugs = useMemo(() => new Set(tenantModules.map(m => m.module_id)), [tenantModules]);

  async function activateAddon(billingId: string) {
    setActivatingId(billingId);
    try {
      const { data, error } = await supabase.functions.invoke('create-module-checkout', {
        body: { module_id: billingId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error('No checkout URL returned');
    } catch (e: any) {
      toast({ title: 'Could not start checkout', description: e.message, variant: 'destructive' });
      setActivatingId(null);
    }
  }
  const filteredModules = useMemo(() => {
    const active = UNIFIED_MODULES.filter((m) => m.isActive !== false);
    const q = query.trim().toLowerCase();
    if (!q) return active;
    return active.filter(
      (m) => m.title.toLowerCase().includes(q) || m.id.includes(q) || m.description.toLowerCase().includes(q)
    );
  }, [query]);

  // UI module id → gw_billing_modules.id (Stripe-gated add-on).
  const UI_TO_BILLING: Record<string, string> = {
    'finance-hub': 'finance',
    'tour-management': 'tour',
    'assessment-hub': 'ai_grading',
    'usage-analytics': 'analytics',
    'wardrobe': 'wardrobe',
    'sight-reading': 'sight_reading',
    'graduates-management': 'alumni',
    'ai-hub': 'ai_hub',
    'concert-ticket-requests': 'tickets',
    'appointments-hub': 'appointments',
    'graduates-portal': 'alumni_portal',
    'merch-store': 'merch',
    'feed-control': 'feeds',
    'part-tracks': 'part_tracks',
    'program-health': 'program_health',
  };
  const ADDON_MODULE_IDS = new Set(Object.keys(UI_TO_BILLING));

  // Priority order of what a music director uses most often → least often.
  // Anything not listed falls after this list, before the add-ons.
  const PRIORITY_ORDER = [
    'glee-academy',
    'communications-hub',
    'calendar-management',
    'attendance',
    'auditions',
    'music-library',
    'media-library',
    'librarian',
    'announcements',
    'pr-hub',
    'ai-hub',
    'hero-manager',
    'youtube-management',
    'concert-ticket-requests',
    'appointments-hub',
    'buckets-of-love',
  ];
  const priorityIndex = (id: string) => {
    const i = PRIORITY_ORDER.indexOf(id);
    return i === -1 ? 999 : i;
  };

  const { installedModules, addonModules } = useMemo(() => {
    const byPriority = (a: typeof UNIFIED_MODULES[number], b: typeof UNIFIED_MODULES[number]) =>
      priorityIndex(a.id) - priorityIndex(b.id);
    const installed = filteredModules.filter((m) => !ADDON_MODULE_IDS.has(m.id)).sort(byPriority);
    const addons = filteredModules.filter((m) => ADDON_MODULE_IDS.has(m.id)).sort(byPriority);
    return { installedModules: installed, addonModules: addons };
  }, [filteredModules]);

  return (
    <div className="space-y-6">
      {/* Compact header — literal dark slate colors so it reads on the cream page bg */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Control Center</h1>
          <p className="text-sm text-slate-700">Admin command center — manage every part of the app.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // ?preview=1 bypasses the role-redirect so super-admins can view the public landing
              window.open('/?preview=1', '_blank', 'noopener');
            }}
            title="Open your public landing in a new tab"
          >
            <Eye className="h-4 w-4 mr-2" />
            View public site
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/database')}>
            <Database className="h-4 w-4 mr-2" />
            Database
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/permissions')}>
            <Shield className="h-4 w-4 mr-2" />
            Permissions
          </Button>
        </div>
      </div>

      {/* Search bar — applies to both sections */}
      <div className="flex items-center justify-end mb-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search modules..."
            className="pl-8 h-9 text-white placeholder:text-slate-400 bg-slate-800 border-slate-700"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Installed modules */}
      {installedModules.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900 mb-3">
            Installed modules <span className="text-slate-500">({installedModules.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {installedModules.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => onModuleSelect(m.id)}
                  className="text-left flex items-start gap-2 p-2.5 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-slate-500 transition-colors"
                >
                  <Icon className="h-4 w-4 mt-0.5 text-slate-300 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white truncate">{m.title}</span>
                      {m.isNew && <Badge variant="secondary" className="text-[10px] px-1 py-0">NEW</Badge>}
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-1">{m.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Add-ons */}
      {addonModules.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700 mb-3">
            Add-ons <span className="text-amber-600/80">({addonModules.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {addonModules.map((m) => {
              const Icon = m.icon;
              const billingId = UI_TO_BILLING[m.id];
              const isSubscribed = isSuperAdmin || (billingId && activeBillingSlugs.has(billingId));
              const isActivating = activatingId === billingId;

              return (
                <div key={m.id} className="rounded-md border-2 border-amber-500/40 bg-white p-3 flex flex-col gap-2 shadow-sm">
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 mt-0.5 text-amber-700 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 truncate">{m.title}</span>
                        {isSubscribed && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-emerald-500 text-emerald-700">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-700 line-clamp-2 mt-0.5">{m.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {isSubscribed ? (
                      <Button size="sm" variant="default" onClick={() => onModuleSelect(m.id)}>Open</Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white border-0"
                        disabled={isActivating || !billingId}
                        onClick={() => billingId && activateAddon(billingId)}
                      >
                        {isActivating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                        Activate
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default ControlCenter;
