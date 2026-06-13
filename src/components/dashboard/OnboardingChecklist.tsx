// First-run checklist for new tenant admins: shows setup steps until the
// tenant has a logo, members, an event, and an announcement (or is dismissed).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, X, Rocket, ChevronRight } from 'lucide-react';

const TENANT_SLUG =
  (typeof window !== 'undefined' && (window as any).__TENANT_CONFIG__?.tenant) || 'main';
const DISMISS_KEY = `gw-onboarding-dismissed:${TENANT_SLUG}`;

export function OnboardingChecklist() {
  const { profile } = useUserRole();
  const { settings: branding, isLoading: brandingLoading } = useBrandingSettings();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

  const isAdmin =
    !!profile &&
    (profile.is_super_admin || profile.is_admin || profile.role === 'admin' || profile.role === 'super-admin');

  const { data: counts } = useQuery({
    queryKey: ['onboarding-checklist-counts'],
    enabled: isAdmin && !dismissed,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [members, events, announcements, site] = await Promise.all([
        supabase.from('gw_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('gw_events').select('id', { count: 'exact', head: true }),
        supabase.from('gw_announcements').select('id', { count: 'exact', head: true }),
        supabase.from('gw_public_sites').select('is_published').maybeSingle(),
      ]);
      return {
        members: members.count ?? 0,
        events: events.count ?? 0,
        announcements: announcements.count ?? 0,
        sitePublished: !!site.data?.is_published,
      };
    },
  });

  if (!isAdmin || dismissed || brandingLoading || !counts) return null;

  const items = [
    {
      label: 'Brand your site',
      detail: 'Upload your logo and set your colors',
      to: '/admin/public-page',
      done: !!branding.logo_url,
    },
    {
      label: 'Invite your members',
      detail: 'Import a roster CSV or add people one at a time',
      to: '/user-management',
      done: counts.members > 1,
    },
    {
      label: 'Schedule your first event',
      detail: 'Add a rehearsal or performance to the calendar',
      to: '/calendar',
      done: counts.events > 0,
    },
    {
      label: 'Publish your public page',
      detail: 'Build a public website for your choir from ready-made blocks',
      to: '/admin/public-page',
      done: counts.sitePublished,
    },
    {
      label: 'Post an announcement',
      detail: 'Welcome your members with your first post',
      to: '/admin/create-announcement',
      done: counts.announcements > 0,
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="max-w-3xl mx-auto px-3 pt-4 w-full">
    <Card className="bg-card border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Rocket className="h-5 w-5 text-primary" />
              Get {branding.short_name || branding.org_name || 'your site'} up and running
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {doneCount} of {items.length} steps complete
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1" onClick={dismiss} aria-label="Dismiss setup checklist">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={(doneCount / items.length) * 100} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.label}>
              <Link
                to={item.to}
                className="flex items-center gap-3 py-2.5 px-1 -mx-1 rounded-md hover:bg-muted/60 transition-colors group"
              >
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${item.done ? 'text-muted-foreground line-through' : ''}`}>
                    {item.label}
                  </div>
                  {!item.done && <div className="text-xs text-muted-foreground">{item.detail}</div>}
                </div>
                {!item.done && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground shrink-0" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
    </div>
  );
}
