// MySpacePage — the personal /dashboard/my-space settings screen. Mounts
// MySpaceEditor (Task 3) over the member's own My Tools record, wiring its
// presentation-only callbacks to useMyTools' persistence.
//
// Persists on every change; there is no Save button. useMyTools writes
// optimistically, so edits feel instant on both the shelf and the home
// grid, and an unsaved-changes state on a mobile settings screen is a trap
// (leave the page mid-edit and the change is gone). A toast fires only when
// a save returns false, so a failure is never silent.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §5.4
import { useMemo } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useTenantNavPrefs } from '@/hooks/useTenantNavPrefs';
import { useEffectivePreviewRole } from '@/hooks/useEffectivePreviewRole';
import { useMyTools } from '@/hooks/useMyTools';
import { useToast } from '@/hooks/use-toast';
import { isFacultyProfile } from '@/lib/roles';
import { applyPreviewRole, resolveNav, type NavContext } from '@/lib/navigation/navCatalog';
import { selectShelfEntries } from '@/lib/navigation/myTools';
import { widgetsFor, resolveWidgets } from '@/lib/navigation/homeWidgets';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { MySpaceEditor } from '@/components/dashboard/MySpaceEditor';

// Same fixed key list DashboardShell's Sidebar/MobileNav loop over — a
// gated nav entry with a module key missing here silently hides for every
// consumer, this page included. Hooks must run unconditionally and in
// stable order, so the loop below carries the same rules-of-hooks
// disable DashboardShell uses.
const MODULE_KEYS = ['sight_reading', 'box_office', 'auditions', 'librarian', 'pr_hub', 'alumni', 'finance', 'merch', 'store', 'feeds', 'viewer', 'concert_planner', 'tour', 'liturgy_planner', 'studio', 'songwriting', 'planner', 'all_state'] as const;

export default function MySpacePage() {
  const { toast } = useToast();
  const { profile, canEditMusicLibrary } = useUserRole();
  const userCanLibrarian = typeof canEditMusicLibrary === 'function'
    ? canEditMusicLibrary()
    : !!(profile?.is_admin || profile?.is_super_admin);
  const isTenantAdmin = !!profile?.is_admin || !!profile?.is_super_admin;
  const tenantSlug = (typeof window !== 'undefined' && (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant) || null;
  const isPlatformAdmin = !!profile?.is_super_admin && tenantSlug === 'main';

  const moduleAccess: Record<string, boolean> = {};
  for (const key of MODULE_KEYS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed-length loop over a const array; call order is stable across renders
    moduleAccess[key] = useModuleAccess(key).hasAccess;
  }
  const hiddenNav = useTenantNavPrefs();
  const previewRole = useEffectivePreviewRole();

  // Identical derivation to DashboardShell's Sidebar — an entry the member
  // cannot open must never be offered by the ⊕ picker below.
  const navCtx: NavContext = applyPreviewRole({
    hasModule: (k) => k === 'academy' || !!moduleAccess[k],
    isTenantAdmin, isPlatformAdmin, canLibrarian: userCanLibrarian,
    isPartner: !!profile?.is_partner,
    hiddenRoutes: hiddenNav,
  }, previewRole);
  // resolveNav, NOT buildNavSections — the latter filters to sidebar
  // surfaces and would hide grid-only entries like merch.
  const available = useMemo(() => resolveNav(navCtx), [navCtx]);

  const isFaculty = isFacultyProfile(profile);
  const role: 'student' | 'faculty' = isFaculty ? 'faculty' : 'student';
  const { myTools, loading: toolsLoading, saveMyTools } = useMyTools(role);
  // Until the record has actually landed, myTools is null and tools/widgets
  // would read as empty — mounting the editor against that would let a tap
  // in this window persist an empty/near-empty record over whatever the
  // member really has stored (useMyTools.saveMyTools fills any omitted
  // field from the CURRENT myTools, so a widget toggle fired here writes
  // `tools: []` right over their real 8-tool set). Not ready until loading
  // is done AND a record actually exists.
  const ready = !toolsLoading && myTools != null;
  const tools = useMemo(() => myTools?.tools ?? [], [myTools]);
  const widgetOptions = widgetsFor(role);
  const widgets = useMemo(() => resolveWidgets(role, myTools?.widgets ?? []), [role, myTools]);

  const preview = useMemo(() => selectShelfEntries(available, tools), [available, tools]);

  const handleToolsChange = async (next: string[]) => {
    const ok = await saveMyTools({ tools: next });
    if (!ok) {
      toast({
        title: 'Could not save your tools',
        description: 'Check your connection and try again.',
        variant: 'destructive',
      });
    }
  };

  const handleWidgetsChange = async (next: string[]) => {
    const ok = await saveMyTools({ widgets: next });
    if (!ok) {
      toast({
        title: 'Could not save your widgets',
        description: 'Check your connection and try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardShell>
      <DashboardPageShell
        title="My Space"
        subtitle="Choose the tools and widgets you want close at hand."
      >
        {!ready ? (
          // No editor mounted yet — a null record has nothing safe to save
          // over it, so no handler exists to (mis)fire while this shows.
          <div data-testid="my-space-loading" className="space-y-6" aria-live="polite" aria-busy="true">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Loading your space…</span>
            </div>
            <div className="h-40 rounded-xl bg-muted animate-pulse" />
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
          </div>
        ) : (
          <>
            {/* Live preview strip — a small readout of what's currently in
                the member's space, as keycap-sized glyphs, so the effect of
                an edit below is visible without navigating away to check
                the shelf. */}
            <div data-testid="my-space-preview" className="flex flex-wrap gap-2">
              {preview.length === 0 ? (
                <span className="text-sm text-muted-foreground">Nothing chosen yet.</span>
              ) : (
                preview.map((entry) => (
                  <span
                    key={entry.key}
                    className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-muted text-xs font-medium"
                  >
                    <entry.icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    {entry.label}
                  </span>
                ))
              )}
            </div>

            <MySpaceEditor
              available={available}
              tools={tools}
              onToolsChange={handleToolsChange}
              widgetOptions={widgetOptions}
              widgets={widgets}
              onWidgetsChange={handleWidgetsChange}
            />
          </>
        )}
      </DashboardPageShell>
    </DashboardShell>
  );
}
